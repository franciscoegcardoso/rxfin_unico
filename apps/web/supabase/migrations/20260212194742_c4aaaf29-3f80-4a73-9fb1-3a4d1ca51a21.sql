
-- =============================================
-- NOTIFICATIONS SYSTEM: Tables + RLS + RPCs
-- =============================================

-- 1. notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'admin',
  priority text NOT NULL DEFAULT 'normal',
  target_user_id uuid NULL,
  action_url text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. notification_reads table
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- 3. notification_dismissals table
CREATE TABLE public.notification_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;

-- notifications: authenticated users can see their own + broadcasts
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (target_user_id = auth.uid() OR target_user_id IS NULL);

-- notifications: only admins can insert
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- notifications: only admins can update
CREATE POLICY "Admins can update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- notifications: only admins can delete
CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- notification_reads: users manage their own
CREATE POLICY "Users can view own reads"
  ON public.notification_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reads"
  ON public.notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reads"
  ON public.notification_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- notification_dismissals: users manage their own
CREATE POLICY "Users can view own dismissals"
  ON public.notification_dismissals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dismissals"
  ON public.notification_dismissals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own dismissals"
  ON public.notification_dismissals FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_notifications_target_user ON public.notifications(target_user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notification_reads_user ON public.notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification ON public.notification_reads(notification_id);
CREATE INDEX idx_notification_dismissals_user ON public.notification_dismissals(user_id);

-- =============================================
-- RPC: get_unread_notification_count
-- =============================================

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications n
  WHERE (n.target_user_id = auth.uid() OR n.target_user_id IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_reads nr
      WHERE nr.notification_id = n.id AND nr.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_dismissals nd
      WHERE nd.notification_id = n.id AND nd.user_id = auth.uid()
    );
$$;

-- =============================================
-- RPC: admin_send_notification
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_send_notification(
  p_title text,
  p_message text,
  p_type text DEFAULT 'admin',
  p_priority text DEFAULT 'normal',
  p_action_url text DEFAULT NULL,
  p_target_emails text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_count integer := 0;
  v_email text;
  v_user_id uuid;
BEGIN
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can send notifications';
  END IF;

  IF p_target_emails IS NULL OR array_length(p_target_emails, 1) IS NULL THEN
    -- Broadcast to all users
    INSERT INTO public.notifications (title, message, type, priority, action_url, target_user_id, created_by, metadata)
    VALUES (p_title, p_message, p_type, p_priority, p_action_url, NULL, v_admin_id,
            jsonb_build_object('broadcast', true));
    v_count := 1;
  ELSE
    -- Send to specific users by email
    FOREACH v_email IN ARRAY p_target_emails LOOP
      SELECT id INTO v_user_id FROM public.profiles WHERE email = TRIM(v_email) LIMIT 1;
      IF v_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (title, message, type, priority, action_url, target_user_id, created_by)
        VALUES (p_title, p_message, p_type, p_priority, p_action_url, v_user_id, v_admin_id);
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('sent', v_count);
END;
$$;

-- =============================================
-- RPC: generate_expiration_notifications
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_expiration_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    SELECT w.id as workspace_id, w.owner_id, w.plan_expires_at, p.name as plan_name,
           EXTRACT(DAY FROM w.plan_expires_at - now())::integer as days_remaining
    FROM public.workspaces w
    LEFT JOIN public.plans p ON w.plan_id = p.id
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
      -- Check for duplicates using metadata
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
$$;

-- =============================================
-- RPC: admin_get_notifications_with_stats (for admin history)
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_get_notifications_with_stats(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_type_filter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT 
      n.id, n.title, n.message, n.type, n.priority,
      n.target_user_id, n.action_url, n.metadata, n.created_at, n.created_by,
      CASE WHEN n.target_user_id IS NULL THEN 'Todos' 
           ELSE (SELECT email FROM public.profiles WHERE id = n.target_user_id LIMIT 1)
      END as target_label,
      (SELECT COUNT(*) FROM public.notification_reads nr WHERE nr.notification_id = n.id)::integer as read_count,
      CASE WHEN n.target_user_id IS NULL 
           THEN (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL)::integer
           ELSE 1
      END as total_targets
    FROM public.notifications n
    WHERE (p_type_filter IS NULL OR n.type = p_type_filter)
    ORDER BY n.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN v_result;
END;
$$;

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
