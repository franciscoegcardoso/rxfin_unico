-- Add 'migrado' to crm_status_enum after 'ativo'
ALTER TYPE crm_status_enum ADD VALUE IF NOT EXISTS 'migrado' AFTER 'ativo';

-- Function to compute 30-day admin dashboard metrics
CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics_30d()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  thirty_days_ago timestamptz := now() - interval '30 days';
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'active_users_30d', (
      SELECT count(*) FROM profiles
      WHERE last_login_at >= thirty_days_ago
    ),
    'new_active_users_30d', (
      SELECT count(*) FROM profiles
      WHERE created_at >= thirty_days_ago
    ),
    'paid_active_users_30d', (
      SELECT count(DISTINCT p.id) FROM profiles p
      JOIN v_user_plan vp ON vp.user_id = p.id
      WHERE p.last_login_at >= thirty_days_ago
        AND vp.plan_slug IS NOT NULL
        AND vp.plan_slug NOT IN ('free', '')
    ),
    'new_paid_active_users_30d', (
      SELECT count(DISTINCT se.user_id) FROM subscription_events se
      JOIN profiles p ON p.id = se.user_id
      WHERE se.created_at >= thirty_days_ago
        AND p.created_at >= thirty_days_ago
        AND se.event_type IN ('purchase', 'subscription_created')
        AND se.role_after IS NOT NULL
        AND se.role_after NOT IN ('free', '')
    ),
    'migrated_users_30d', (
      SELECT count(*) FROM (
        SELECT p.id
        FROM profiles p
        WHERE p.created_at >= thirty_days_ago
          AND p.last_login_at >= thirty_days_ago
          -- Has at least one receita
          AND EXISTS (
            SELECT 1 FROM lancamentos_realizados lr
            WHERE lr.user_id = p.id AND lr.tipo = 'receita'
          )
          -- Has at least one despesa
          AND EXISTS (
            SELECT 1 FROM lancamentos_realizados lr
            WHERE lr.user_id = p.id AND lr.tipo = 'despesa'
          )
          -- Has at least one financial institution
          AND EXISTS (
            SELECT 1 FROM user_financial_institutions ufi
            WHERE ufi.user_id = p.id
          )
          -- Logged in at least 2 times (approximate: created_at != last_login_at means at least 2 logins)
          -- We use a heuristic: last_login_at > created_at + interval '1 hour' indicates return visit
          AND p.last_login_at > p.created_at + interval '1 hour'
      ) migrated
    )
  ) INTO result;

  RETURN result;
END;
$$;