-- Add get_notifications_page RPC for /notificacoes page.
-- Returns paginated notifications for the current user with read_at and total_count.
-- Signature (p_limit, p_page) matches what PostgREST schema cache expects when client sends params.

CREATE OR REPLACE FUNCTION public.get_notifications_page(p_limit integer, p_page integer)
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  type text,
  priority text,
  category text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_offset integer := (greatest(p_page, 1) - 1) * greatest(p_limit, 1);
  v_limit_val integer := least(greatest(p_limit, 1), 100);
  v_total bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.notifications n
  WHERE n.target_user_id = v_user_id;

  RETURN QUERY
  SELECT
    n.id,
    n.title::text,
    n.message::text,
    n.type::text,
    n.priority::text,
    coalesce((n.metadata->>'category')::text, n.type::text) AS category,
    n.action_url::text,
    nr.read_at,
    n.created_at,
    v_total AS total_count
  FROM public.notifications n
  LEFT JOIN public.notification_reads nr
    ON nr.notification_id = n.id AND nr.user_id = v_user_id
  WHERE n.target_user_id = v_user_id
  ORDER BY n.created_at DESC
  OFFSET v_offset
  LIMIT v_limit_val;
END;
$$;

COMMENT ON FUNCTION public.get_notifications_page(integer, integer) IS
  'Returns paginated notifications for current user; used by /notificacoes page.';
