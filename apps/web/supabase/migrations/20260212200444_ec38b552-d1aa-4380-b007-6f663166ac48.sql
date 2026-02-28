
-- =============================================
-- 1. Tabela notification_templates
-- =============================================
CREATE TABLE public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  title_template text NOT NULL,
  message_template text NOT NULL,
  type text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  action_url_template text,
  available_variables text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notification templates"
  ON public.notification_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert notification templates"
  ON public.notification_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update notification templates"
  ON public.notification_templates FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete notification templates"
  ON public.notification_templates FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- =============================================
-- 2. Seed data
-- =============================================
INSERT INTO public.notification_templates (slug, name, title_template, message_template, type, priority, action_url_template, available_variables) VALUES
  ('payment_confirmed', 'Pagamento Confirmado', 'Pagamento confirmado!', 'Seu pagamento para o plano {{plan_name}} foi confirmado com sucesso.', 'payment', 'normal', '/planos', ARRAY['plan_name']),
  ('expiration_7d', 'Vencimento em 7 dias', 'Seu plano vence em 7 dias', 'O plano {{plan_name}} vence em {{days}} dias. Renove para continuar usando todos os recursos.', 'expiration', 'normal', '/planos', ARRAY['plan_name', 'days']),
  ('expiration_3d', 'Vencimento em 3 dias', 'Seu plano vence em 3 dias', 'O plano {{plan_name}} vence em {{days}} dias. Renove agora para não perder acesso.', 'expiration', 'high', '/planos', ARRAY['plan_name', 'days']),
  ('expiration_today', 'Vencimento Hoje', 'Seu plano vence hoje!', 'O plano {{plan_name}} vence hoje. Renove imediatamente.', 'expiration', 'urgent', '/planos', ARRAY['plan_name']),
  ('expired', 'Plano Vencido', 'Seu plano venceu', 'O plano {{plan_name}} venceu. Renove para restaurar o acesso.', 'expiration', 'urgent', '/planos', ARRAY['plan_name']),
  ('plan_renewed', 'Plano Renovado', 'Plano renovado com sucesso!', 'Seu plano {{plan_name}} foi renovado. Bom uso!', 'payment', 'normal', '/planos', ARRAY['plan_name']),
  ('gift_event_upcoming', 'Presente Próximo', 'Presente próximo: {{event_name}}', 'O evento {{event_name}} acontece em {{days}} dias. Já escolheu os presentes?', 'gift', 'normal', '/presentes', ARRAY['event_name', 'days']),
  ('insurance_expired', 'Seguro Vencido', 'Seguro vencido: {{insurance_type}}', 'Seu seguro {{insurance_name}} ({{insurance_type}}) venceu em {{expiry_date}}. Verifique a renovação.', 'insurance', 'high', '/seguros/{{id}}', ARRAY['insurance_name', 'insurance_type', 'expiry_date', 'id']),
  ('budget_package_started', 'Pacote Iniciado', 'Pacote de orçamento iniciado', 'O pacote ''{{package_name}}'' começou hoje. Acompanhe seus gastos!', 'budget', 'normal', '/orcamento', ARRAY['package_name', 'package_id']),
  ('budget_package_closed', 'Pacote Encerrado', 'Pacote de orçamento encerrado', 'O pacote ''{{package_name}}'' foi encerrado. Confira o resultado.', 'budget', 'normal', '/orcamento', ARRAY['package_name', 'package_id']);

-- =============================================
-- 3. Função IMMUTABLE para extrair date de timestamptz (necessária para o índice)
-- =============================================
CREATE OR REPLACE FUNCTION public.timestamptz_to_date(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = 'public'
AS $$ SELECT (ts AT TIME ZONE 'UTC')::date; $$;

-- Índice anti-spam (dedup por dia)
CREATE UNIQUE INDEX idx_notifications_daily_dedup
  ON public.notifications (target_user_id, (metadata->>'trigger'), (metadata->>'entity_id'), public.timestamptz_to_date(created_at))
  WHERE metadata->>'trigger' IS NOT NULL AND metadata->>'entity_id' IS NOT NULL;

-- =============================================
-- 4. Função replace_template_vars com fallback
-- =============================================
CREATE OR REPLACE FUNCTION public.replace_template_vars(
  template text,
  vars jsonb,
  fallback text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
  result text := template;
  match_record record;
  var_name text;
  var_value text;
BEGIN
  IF template IS NULL THEN RETURN NULL; END IF;
  IF vars IS NULL THEN vars := '{}'::jsonb; END IF;

  FOR match_record IN
    SELECT (regexp_matches(result, '\{\{(\w+)\}\}', 'g'))[1] AS var_key
  LOOP
    var_name := match_record.var_key;
    IF vars ? var_name AND vars->>var_name IS NOT NULL THEN
      var_value := vars->>var_name;
    ELSE
      var_value := fallback;
    END IF;
    result := replace(result, '{{' || var_name || '}}', var_value);
  END LOOP;

  RETURN result;
END;
$$;

-- =============================================
-- 5. Função generate_automatic_notifications
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_automatic_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rec RECORD;
  v_tpl RECORD;
  v_count integer := 0;
  v_vars jsonb;
  v_title text;
  v_message text;
  v_url text;
  v_slug text;
BEGIN
  -- ========== VENCIMENTO DE PLANO (4 tipos) ==========
  FOR v_rec IN
    SELECT w.id as workspace_id, w.owner_id, w.plan_expires_at, p.name as plan_name,
           EXTRACT(DAY FROM w.plan_expires_at - now())::integer as days_remaining
    FROM public.workspaces w
    LEFT JOIN public.plans p ON w.plan_id = p.id
    WHERE w.plan_expires_at IS NOT NULL AND w.is_active = true
      AND EXTRACT(DAY FROM w.plan_expires_at - now())::integer IN (7, 3, 0, -1)
  LOOP
    CASE v_rec.days_remaining
      WHEN 7 THEN v_slug := 'expiration_7d';
      WHEN 3 THEN v_slug := 'expiration_3d';
      WHEN 0 THEN v_slug := 'expiration_today';
      WHEN -1 THEN v_slug := 'expired';
      ELSE CONTINUE;
    END CASE;

    SELECT * INTO v_tpl FROM public.notification_templates WHERE slug = v_slug AND is_active = true;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_vars := jsonb_build_object('plan_name', COALESCE(v_rec.plan_name, ''), 'days', v_rec.days_remaining::text);
    v_title := public.replace_template_vars(v_tpl.title_template, v_vars);
    v_message := public.replace_template_vars(v_tpl.message_template, v_vars);
    v_url := public.replace_template_vars(v_tpl.action_url_template, v_vars);

    INSERT INTO public.notifications (title, message, type, priority, target_user_id, action_url, metadata)
    VALUES (v_title, v_message, v_tpl.type, v_tpl.priority, v_rec.owner_id, v_url,
            jsonb_build_object('trigger', v_slug, 'entity_id', v_rec.workspace_id::text, 'plan_name', v_rec.plan_name))
    ON CONFLICT DO NOTHING;

    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;

  -- ========== SEGURO VENCIDO ==========
  SELECT * INTO v_tpl FROM public.notification_templates WHERE slug = 'insurance_expired' AND is_active = true;
  IF FOUND THEN
    FOR v_rec IN
      SELECT s.id, s.nome, s.tipo, s.data_fim, s.user_id
      FROM public.seguros s
      WHERE s.data_fim IS NOT NULL
        AND s.data_fim::date BETWEEN (CURRENT_DATE - interval '1 day')::date AND CURRENT_DATE
    LOOP
      v_vars := jsonb_build_object(
        'insurance_name', COALESCE(v_rec.nome, ''),
        'insurance_type', COALESCE(v_rec.tipo, ''),
        'expiry_date', COALESCE(to_char(v_rec.data_fim::date, 'DD/MM/YYYY'), ''),
        'id', v_rec.id::text
      );
      v_title := public.replace_template_vars(v_tpl.title_template, v_vars);
      v_message := public.replace_template_vars(v_tpl.message_template, v_vars);
      v_url := public.replace_template_vars(v_tpl.action_url_template, v_vars);

      INSERT INTO public.notifications (title, message, type, priority, target_user_id, action_url, metadata)
      VALUES (v_title, v_message, v_tpl.type, v_tpl.priority, v_rec.user_id, v_url,
              jsonb_build_object('trigger', 'insurance_expired', 'entity_id', v_rec.id::text))
      ON CONFLICT DO NOTHING;

      IF FOUND THEN v_count := v_count + 1; END IF;
    END LOOP;
  END IF;

  -- ========== PRESENTE PRÓXIMO (7 dias) ==========
  SELECT * INTO v_tpl FROM public.notification_templates WHERE slug = 'gift_event_upcoming' AND is_active = true;
  IF FOUND THEN
    FOR v_rec IN
      SELECT ge.id, ge.name as event_name, ge.user_id, ge.event_day, ge.event_month
      FROM public.gift_events ge
      WHERE ge.event_day IS NOT NULL AND ge.event_month IS NOT NULL
        AND (
          CASE
            WHEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, ge.event_month, ge.event_day) >= CURRENT_DATE
            THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, ge.event_month, ge.event_day) - CURRENT_DATE
            ELSE make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, ge.event_month, ge.event_day) - CURRENT_DATE
          END
        )::integer = 7
    LOOP
      v_vars := jsonb_build_object('event_name', COALESCE(v_rec.event_name, ''), 'days', '7');
      v_title := public.replace_template_vars(v_tpl.title_template, v_vars);
      v_message := public.replace_template_vars(v_tpl.message_template, v_vars);
      v_url := public.replace_template_vars(v_tpl.action_url_template, v_vars);

      INSERT INTO public.notifications (title, message, type, priority, target_user_id, action_url, metadata)
      VALUES (v_title, v_message, v_tpl.type, v_tpl.priority, v_rec.user_id, v_url,
              jsonb_build_object('trigger', 'gift_event_upcoming', 'entity_id', v_rec.id::text))
      ON CONFLICT DO NOTHING;

      IF FOUND THEN v_count := v_count + 1; END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('generated', v_count);
END;
$$;

-- =============================================
-- 6. Trigger para budget_packages
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_budget_package_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tpl RECORD;
  v_vars jsonb;
  v_slug text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'active' THEN
      v_slug := 'budget_package_started';
    ELSIF NEW.status IN ('closed', 'completed') THEN
      v_slug := 'budget_package_closed';
    ELSE
      RETURN NEW;
    END IF;

    SELECT * INTO v_tpl FROM public.notification_templates WHERE slug = v_slug AND is_active = true;
    IF NOT FOUND THEN RETURN NEW; END IF;

    v_vars := jsonb_build_object('package_name', COALESCE(NEW.name, ''), 'package_id', NEW.id::text);

    INSERT INTO public.notifications (
      title, message, type, priority, target_user_id, action_url, metadata
    ) VALUES (
      public.replace_template_vars(v_tpl.title_template, v_vars),
      public.replace_template_vars(v_tpl.message_template, v_vars),
      v_tpl.type, v_tpl.priority, NEW.user_id,
      public.replace_template_vars(v_tpl.action_url_template, v_vars),
      jsonb_build_object('trigger', v_slug, 'entity_id', NEW.id::text)
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_budget_package_notify
  AFTER UPDATE ON public.budget_packages
  FOR EACH ROW EXECUTE FUNCTION public.notify_budget_package_change();
