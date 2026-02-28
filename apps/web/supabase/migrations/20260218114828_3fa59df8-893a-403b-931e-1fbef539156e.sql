
CREATE OR REPLACE FUNCTION public.get_catalog_without_history(p_limit int DEFAULT 30)
RETURNS TABLE(
  fipe_code text,
  year int,
  year_id text,
  brand_name text,
  model_name text,
  vehicle_type int
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT c.fipe_code, c.year, c.year_id, c.brand_name, c.model_name, c.vehicle_type
  FROM public.fipe_catalog c
  LEFT JOIN (
    SELECT DISTINCT ph.fipe_code, ph.model_year
    FROM public.fipe_price_history ph
  ) h ON h.fipe_code = c.fipe_code AND h.model_year = c.year
  WHERE h.fipe_code IS NULL
  ORDER BY c.vehicle_type, c.brand_id, c.model_id
  LIMIT p_limit;
$$;
