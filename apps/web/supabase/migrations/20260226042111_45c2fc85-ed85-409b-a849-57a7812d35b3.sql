-- 1. Update get_admin_dashboard_metrics_30d to include churn_30d
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics_30d()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  thirty_days_ago timestamptz := now() - interval '30 days';
BEGIN
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
          AND EXISTS (SELECT 1 FROM lancamentos_realizados lr WHERE lr.user_id = p.id AND lr.tipo = 'receita')
          AND EXISTS (SELECT 1 FROM lancamentos_realizados lr WHERE lr.user_id = p.id AND lr.tipo = 'despesa')
          AND EXISTS (SELECT 1 FROM user_financial_institutions ufi WHERE ufi.user_id = p.id)
          AND p.last_login_at > p.created_at + interval '1 hour'
      ) migrated
    ),
    'churn_30d', (
      SELECT count(DISTINCT w.owner_id) FROM workspaces w
      JOIN subscription_plans sp ON sp.id = w.plan_id
      WHERE sp.slug NOT IN ('free', 'sem_cadastro', '')
        AND (
          (w.plan_expires_at BETWEEN thirty_days_ago AND now())
          OR (w.is_active = false AND w.updated_at >= thirty_days_ago)
        )
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 2. Create get_admin_dashboard_chart_data
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_chart_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'monthly_active', (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.month)
      FROM (
        SELECT to_char(gs, 'YYYY-MM') AS month, count(DISTINCT p.id) AS value
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs
        LEFT JOIN profiles p ON date_trunc('month', p.last_login_at) = gs
        GROUP BY gs ORDER BY gs
      ) t
    ),
    'new_active_daily', (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.day)
      FROM (
        SELECT to_char(gs, 'YYYY-MM-DD') AS day, count(p.id) AS value
        FROM generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') gs
        LEFT JOIN profiles p ON p.created_at::date = gs::date
        GROUP BY gs ORDER BY gs
      ) t
    ),
    'new_active_weekly', (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.week)
      FROM (
        SELECT to_char(gs, 'YYYY-"W"IW') AS week, count(p.id) AS value
        FROM generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') gs
        LEFT JOIN profiles p ON date_trunc('week', p.created_at) = gs
        GROUP BY gs ORDER BY gs
      ) t
    ),
    'new_active_monthly', (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.month)
      FROM (
        SELECT to_char(gs, 'YYYY-MM') AS month, count(p.id) AS value
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs
        LEFT JOIN profiles p ON date_trunc('month', p.created_at) = gs
        GROUP BY gs ORDER BY gs
      ) t
    ),
    'monthly_churn', (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.month)
      FROM (
        SELECT to_char(gs, 'YYYY-MM') AS month, count(DISTINCT w.owner_id) AS value
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs
        LEFT JOIN workspaces w ON date_trunc('month', w.plan_expires_at) = gs
          AND w.plan_id IN (SELECT id FROM subscription_plans WHERE slug NOT IN ('free', 'sem_cadastro', ''))
        GROUP BY gs ORDER BY gs
      ) t
    ),
    'monthly_reactivated', (
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.month)
      FROM (
        SELECT to_char(gs, 'YYYY-MM') AS month, count(DISTINCT se.user_id) AS value
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs
        LEFT JOIN subscription_events se ON date_trunc('month', se.created_at) = gs
          AND se.event_type IN ('purchase', 'subscription_created')
          AND (se.role_before IS NULL OR se.role_before IN ('free', 'sem_cadastro', ''))
          AND se.role_after IS NOT NULL
          AND se.role_after NOT IN ('free', 'sem_cadastro', '')
        GROUP BY gs ORDER BY gs
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
