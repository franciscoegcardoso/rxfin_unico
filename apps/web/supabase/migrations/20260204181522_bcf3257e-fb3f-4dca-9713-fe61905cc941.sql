-- =====================================================
-- SECURITY FIX: Resolve all 15 Supabase linter warnings
-- =====================================================

-- =====================================================
-- PART 1: Fix 11 functions missing search_path
-- =====================================================

-- 1. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 2. handle_new_user_workspace
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_workspace_id UUID;
  default_plan_id UUID;
BEGIN
  SELECT id INTO default_plan_id FROM public.plans WHERE is_default = true LIMIT 1;

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

-- 3. generate_email_queue
CREATE OR REPLACE FUNCTION public.generate_email_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  emails_queued INTEGER := 0;
  campaign RECORD;
  target_user RECORD;
  scheduled_time TIMESTAMPTZ;
BEGIN
  FOR campaign IN
    SELECT * FROM public.email_campaigns
    WHERE is_active = true AND is_draft = false
  LOOP
    IF campaign.trigger_type = 'signup_date' THEN
      FOR target_user IN
        SELECT u.id, u.email, u.created_at,
               u.raw_user_meta_data->>'full_name' as full_name
        FROM auth.users u
        WHERE u.created_at <= NOW() - (campaign.days_after_trigger || ' days')::INTERVAL
          AND NOT EXISTS (
            SELECT 1 FROM public.email_campaign_logs
            WHERE campaign_id = campaign.id AND user_id = u.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.email_unsubscribes
            WHERE user_id = u.id
              AND (campaign_id = campaign.id OR unsubscribed_all = true)
          )
        LIMIT 100
      LOOP
        scheduled_time := target_user.created_at + (campaign.days_after_trigger || ' days')::INTERVAL;
        INSERT INTO public.email_queue (campaign_id, user_id, to_email, subject, html_body, scheduled_for)
        VALUES (campaign.id, target_user.id, target_user.email, campaign.subject, campaign.html_body, scheduled_time)
        ON CONFLICT DO NOTHING;
        emails_queued := emails_queued + 1;
      END LOOP;
    END IF;

    IF campaign.trigger_type = 'inactivity' THEN
      FOR target_user IN
        SELECT DISTINCT u.id, u.email
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.sessions s
            WHERE s.user_id = u.id
              AND s.created_at > NOW() - (campaign.days_after_trigger || ' days')::INTERVAL
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.email_campaign_logs
            WHERE campaign_id = campaign.id AND user_id = u.id
              AND sent_at > NOW() - (campaign.days_after_trigger || ' days')::INTERVAL
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.email_unsubscribes
            WHERE user_id = u.id AND (campaign_id = campaign.id OR unsubscribed_all = true)
          )
        LIMIT 100
      LOOP
        INSERT INTO public.email_queue (campaign_id, user_id, to_email, subject, html_body, scheduled_for)
        VALUES (campaign.id, target_user.id, target_user.email, campaign.subject, campaign.html_body, NOW())
        ON CONFLICT DO NOTHING;
        emails_queued := emails_queued + 1;
      END LOOP;
    END IF;

    IF campaign.trigger_type = 'plan_expiration' THEN
      FOR target_user IN
        SELECT u.id, u.email, w.plan_expires_at
        FROM auth.users u
        JOIN public.workspace_members wm ON u.id = wm.user_id
        JOIN public.workspaces w ON wm.workspace_id = w.id
        WHERE w.plan_expires_at IS NOT NULL
          AND w.plan_expires_at BETWEEN NOW() AND NOW() + (ABS(campaign.days_after_trigger) || ' days')::INTERVAL
          AND NOT EXISTS (
            SELECT 1 FROM public.email_campaign_logs
            WHERE campaign_id = campaign.id AND user_id = u.id AND sent_at > NOW() - INTERVAL '1 day'
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.email_unsubscribes
            WHERE user_id = u.id AND (campaign_id = campaign.id OR unsubscribed_all = true)
          )
        LIMIT 100
      LOOP
        scheduled_time := target_user.plan_expires_at - (ABS(campaign.days_after_trigger) || ' days')::INTERVAL;
        INSERT INTO public.email_queue (campaign_id, user_id, to_email, subject, html_body, scheduled_for)
        VALUES (campaign.id, target_user.id, target_user.email, campaign.subject, campaign.html_body, scheduled_time)
        ON CONFLICT DO NOTHING;
        emails_queued := emails_queued + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN emails_queued;
END;
$function$;

-- 4. encrypt_api_key
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key text, encryption_key text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN pgp_sym_encrypt(plain_key, encryption_key);
END;
$function$;

-- 5. decrypt_api_key
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key bytea, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_key, encryption_key);
END;
$function$;

-- 6. process_email_queue
CREATE OR REPLACE FUNCTION public.process_email_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  emails_processed INTEGER := 0;
  queue_item RECORD;
BEGIN
  FOR queue_item IN
    SELECT * FROM public.email_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND retry_count < 3
    ORDER BY scheduled_for ASC
    LIMIT 100
  LOOP
    BEGIN
      UPDATE public.email_queue SET status = 'processing' WHERE id = queue_item.id;
      UPDATE public.email_queue SET status = 'sent', processed_at = NOW() WHERE id = queue_item.id;
      INSERT INTO public.email_campaign_logs (campaign_id, user_id, email, status, sent_at)
      VALUES (queue_item.campaign_id, queue_item.user_id, queue_item.to_email, 'sent', NOW());
      emails_processed := emails_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.email_queue
      SET status = 'failed', retry_count = retry_count + 1, error_message = SQLERRM
      WHERE id = queue_item.id;
      INSERT INTO public.email_campaign_logs (campaign_id, user_id, email, status, error_message, sent_at)
      VALUES (queue_item.campaign_id, queue_item.user_id, queue_item.to_email, 'failed', SQLERRM, NOW());
    END;
  END LOOP;
  RETURN emails_processed;
END;
$function$;

-- 7. check_login_attempts
CREATE OR REPLACE FUNCTION public.check_login_attempts(p_email text, p_ip inet DEFAULT NULL::inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  recent_attempts INT;
BEGIN
  SELECT COUNT(*) INTO recent_attempts
  FROM public.login_attempts
  WHERE email = p_email
    AND (p_ip IS NULL OR ip_address = p_ip)
    AND attempted_at > NOW() - INTERVAL '15 minutes'
    AND success = false;
  RETURN COALESCE(recent_attempts, 0) < 5;
END;
$function$;

-- 8. log_login_attempt
CREATE OR REPLACE FUNCTION public.log_login_attempt(p_email text, p_ip inet, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, attempted_at, success)
  VALUES (p_email, p_ip, NOW(), p_success);
  DELETE FROM public.login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$function$;

-- 9. log_audit_action
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_user_id uuid, 
  p_action character varying, 
  p_resource_type character varying DEFAULT NULL, 
  p_resource_id uuid DEFAULT NULL, 
  p_severity character varying DEFAULT 'medium', 
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, ip_address, severity, metadata)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, inet_client_addr(), p_severity, p_metadata);
END;
$function$;

-- 10. get_all_users_admin
CREATE OR REPLACE FUNCTION public.get_all_users_admin(
  limit_count integer DEFAULT 20, 
  offset_count integer DEFAULT 0, 
  search_query text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT 
      u.id as user_id, u.email,
      u.raw_user_meta_data->>'full_name' as full_name,
      u.raw_user_meta_data->>'phone' as phone,
      w.id as workspace_id, w.name as workspace_name,
      p.id as plan_id, p.name as plan_name,
      w.plan_expires_at, w.is_active, wm.role, u.created_at
    FROM auth.users u
    LEFT JOIN public.workspace_members wm ON u.id = wm.user_id
    LEFT JOIN public.workspaces w ON wm.workspace_id = w.id
    LEFT JOIN public.plans p ON w.plan_id = p.id
    WHERE search_query IS NULL
      OR u.email ILIKE '%' || search_query || '%'
      OR (u.raw_user_meta_data->>'full_name') ILIKE '%' || search_query || '%'
    ORDER BY u.created_at DESC
    LIMIT limit_count OFFSET offset_count
  ) t;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$function$;

-- 11. count_all_users_admin
CREATE OR REPLACE FUNCTION public.count_all_users_admin(search_query text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  total INT;
BEGIN
  SELECT COUNT(*) INTO total
  FROM auth.users u
  WHERE search_query IS NULL
    OR u.email ILIKE '%' || search_query || '%'
    OR (u.raw_user_meta_data->>'full_name') ILIKE '%' || search_query || '%';
  RETURN total;
END;
$function$;

-- =====================================================
-- PART 2: Move pg_net extension to 'extensions' schema
-- =====================================================
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- =====================================================
-- PART 3: Fix RLS policies "always true"
-- =====================================================

-- 3a. Fix public.leads - remove permissive INSERT policy
DROP POLICY IF EXISTS "public_leads_insert" ON public.leads;

-- 3b. Fix public.verification_codes - restrict to service_role only
-- This table uses 'email' column, not 'user_id'
DROP POLICY IF EXISTS "Service Role Full Access" ON public.verification_codes;

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage verification codes (edge functions)
CREATE POLICY "Service role manages verification codes"
ON public.verification_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can view codes for their authenticated email (via auth.jwt())
CREATE POLICY "Users can view own verification codes"
ON public.verification_codes
FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));