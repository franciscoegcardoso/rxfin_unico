
-- ============================================================
-- FASE 1: Unificar tabela de planos
-- Mover tudo de `plans` para `subscription_plans` como tabela canônica
-- ============================================================

-- 1. Adicionar duration_days à subscription_plans (vindo de plans)
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30;

-- 2. Remover FK de workspaces -> plans
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_plan_id_fkey;

-- 3. Remover FK de expiration_actions -> plans  
ALTER TABLE public.expiration_actions DROP CONSTRAINT IF EXISTS expiration_actions_downgrade_to_plan_id_fkey;

-- 4. Migrar workspaces.plan_id para apontar para subscription_plans
-- Todos os workspaces atuais apontam para "Free Trial" (plans) -> migrar para "Free" (subscription_plans)
UPDATE public.workspaces 
SET plan_id = '2f3a7d3a-be5d-42e3-9fea-7bc99e6bca9b'  -- subscription_plans.free
WHERE plan_id = '359be251-387a-4081-86c3-bfabbb6ba0ea';  -- plans.Free Trial

-- 5. Atualizar expiration_actions.downgrade_to_plan_id para referenciar subscription_plans
UPDATE public.expiration_actions
SET downgrade_to_plan_id = '2f3a7d3a-be5d-42e3-9fea-7bc99e6bca9b'  -- subscription_plans.free
WHERE downgrade_to_plan_id = '359be251-387a-4081-86c3-bfabbb6ba0ea';  -- plans.Free Trial

-- 6. Criar novas FKs apontando para subscription_plans
ALTER TABLE public.workspaces 
ADD CONSTRAINT workspaces_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);

ALTER TABLE public.expiration_actions 
ADD CONSTRAINT expiration_actions_downgrade_to_plan_id_fkey 
FOREIGN KEY (downgrade_to_plan_id) REFERENCES public.subscription_plans(id);

-- 7. Criar função para resolver o slug do plano do usuário via workspace
CREATE OR REPLACE FUNCTION public.get_user_plan_slug(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(sp.slug, 'free')
  FROM public.workspaces w
  JOIN public.workspace_members wm ON wm.workspace_id = w.id
  JOIN public.subscription_plans sp ON sp.id = w.plan_id
  WHERE wm.user_id = _user_id
    AND wm.is_active = true
    AND w.is_active = true
  ORDER BY sp.order_index DESC
  LIMIT 1;
$$;

-- 8. Criar função para verificar se o workspace do usuário tem plano expirado
CREATE OR REPLACE FUNCTION public.is_user_plan_expired(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT w.plan_expires_at < now()
     FROM public.workspaces w
     JOIN public.workspace_members wm ON wm.workspace_id = w.id
     WHERE wm.user_id = _user_id
       AND wm.is_active = true
       AND w.is_active = true
     ORDER BY w.plan_expires_at DESC NULLS LAST
     LIMIT 1),
    false
  );
$$;

-- 9. Atualizar trigger handle_new_user_workspace para usar subscription_plans
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_workspace_id UUID;
  default_plan_id UUID;
BEGIN
  -- Buscar plano free da subscription_plans
  SELECT id INTO default_plan_id 
  FROM public.subscription_plans 
  WHERE slug = 'free' AND is_active = true 
  LIMIT 1;

  INSERT INTO public.workspaces (name, slug, owner_id, plan_id, plan_expires_at, is_active)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Workspace de ' || SPLIT_PART(NEW.email, '@', 1)),
    'ws-' || SUBSTRING(NEW.id::text, 1, 8),
    NEW.id,
    default_plan_id,
    NOW() + INTERVAL '30 days',
    true
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO new_workspace_id;

  IF new_workspace_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at, is_active)
    VALUES (new_workspace_id, NEW.id, 'super_admin', NOW(), true)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    INSERT INTO public.expiration_actions (workspace_id, action_type)
    VALUES (new_workspace_id, 'block_total')
    ON CONFLICT (workspace_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 10. Atualizar generate_expiration_notifications para usar subscription_plans
CREATE OR REPLACE FUNCTION public.generate_expiration_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_rec RECORD;
  v_count integer := 0;
  v_trigger text;
  v_title text;
  v_message text;
  v_priority text;
  v_days_until integer;
BEGIN
  FOR v_rec IN
    SELECT w.id as workspace_id, w.owner_id, w.plan_expires_at, sp.name as plan_name,
           EXTRACT(DAY FROM w.plan_expires_at - now())::integer as days_remaining
    FROM public.workspaces w
    LEFT JOIN public.subscription_plans sp ON w.plan_id = sp.id
    WHERE w.plan_expires_at IS NOT NULL
      AND w.is_active = true
  LOOP
    v_days_until := v_rec.days_remaining;
    v_trigger := NULL;

    IF v_days_until = 7 THEN
      v_trigger := 'expiration_7d';
      v_title := 'Seu plano vence em 7 dias';
      v_message := 'O plano ' || COALESCE(v_rec.plan_name, '') || ' vence em 7 dias. Renove para continuar usando todos os recursos.';
      v_priority := 'normal';
    ELSIF v_days_until = 3 THEN
      v_trigger := 'expiration_3d';
      v_title := 'Seu plano vence em 3 dias';
      v_message := 'O plano ' || COALESCE(v_rec.plan_name, '') || ' vence em 3 dias. Renove agora para não perder acesso.';
      v_priority := 'high';
    ELSIF v_days_until = 0 THEN
      v_trigger := 'expiration_today';
      v_title := 'Seu plano vence hoje!';
      v_message := 'O plano ' || COALESCE(v_rec.plan_name, '') || ' vence hoje. Renove imediatamente.';
      v_priority := 'urgent';
    ELSIF v_days_until = -1 THEN
      v_trigger := 'expired';
      v_title := 'Seu plano venceu';
      v_message := 'O plano ' || COALESCE(v_rec.plan_name, '') || ' venceu. Renove para restaurar o acesso.';
      v_priority := 'urgent';
    END IF;

    IF v_trigger IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE target_user_id = v_rec.owner_id
          AND metadata->>'trigger' = v_trigger
          AND metadata->>'workspace_id' = v_rec.workspace_id::text
          AND created_at > now() - interval '24 hours'
      ) THEN
        INSERT INTO public.notifications (title, message, type, priority, target_user_id, action_url, metadata)
        VALUES (v_title, v_message, 'expiration', v_priority, v_rec.owner_id, '/planos',
                jsonb_build_object('trigger', v_trigger, 'workspace_id', v_rec.workspace_id, 'plan_name', v_rec.plan_name));
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('generated', v_count);
END;
$function$;
