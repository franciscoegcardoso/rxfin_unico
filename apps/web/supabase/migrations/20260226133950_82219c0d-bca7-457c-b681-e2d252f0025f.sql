
CREATE OR REPLACE FUNCTION public.get_phase3_reference_progress(p_limit integer DEFAULT 10)
RETURNS TABLE(
  reference_code integer,
  slug text,
  done bigint,
  pending bigint,
  unavailable bigint,
  total bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    q.reference_code,
    r.slug,
    COUNT(*) FILTER (WHERE q.status = 'done') as done,
    COUNT(*) FILTER (WHERE q.status = 'pending') as pending,
    COUNT(*) FILTER (WHERE q.status = 'unavailable') as unavailable,
    COUNT(*) as total
  FROM fipe_phase3_queue q
  JOIN fipe_reference r ON r.reference_code = q.reference_code
  WHERE q.status != 'skip'
  GROUP BY q.reference_code, r.slug
  ORDER BY q.reference_code DESC
  LIMIT p_limit;
$$;
