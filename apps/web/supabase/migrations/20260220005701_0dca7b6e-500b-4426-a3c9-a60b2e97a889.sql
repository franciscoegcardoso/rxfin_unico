
-- Function 1: Get catalog entries that only have 0km (year=32000)
CREATE OR REPLACE FUNCTION public.get_catalog_only_zero_km(p_limit int DEFAULT 50)
RETURNS TABLE(fipe_code text, vehicle_type int, brand_id int, model_id int, brand_name text, model_name text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT c.fipe_code, c.vehicle_type, c.brand_id, c.model_id, c.brand_name, c.model_name
  FROM public.fipe_catalog c
  WHERE c.fipe_code IN (
    SELECT fc.fipe_code FROM public.fipe_catalog fc
    GROUP BY fc.fipe_code HAVING COUNT(*) = 1 AND MAX(fc.year) = 32000
  )
  ORDER BY c.vehicle_type, c.brand_id
  LIMIT p_limit;
$$;

-- Function 2: Get catalog entries with sparse price history
CREATE OR REPLACE FUNCTION public.get_catalog_sparse_history(p_limit int DEFAULT 30, p_max_refs int DEFAULT 10)
RETURNS TABLE(fipe_code text, year int, year_id text, vehicle_type int, brand_name text, model_name text, current_refs bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT c.fipe_code, c.year, c.year_id, c.vehicle_type, c.brand_name, c.model_name,
         COALESCE(ph.cnt, 0) as current_refs
  FROM public.fipe_catalog c
  LEFT JOIN (
    SELECT fipe_code, model_year, COUNT(*) as cnt
    FROM public.fipe_price_history GROUP BY fipe_code, model_year
  ) ph ON ph.fipe_code = c.fipe_code AND ph.model_year = c.year
  WHERE COALESCE(ph.cnt, 0) < p_max_refs
  ORDER BY COALESCE(ph.cnt, 0) ASC, c.vehicle_type, c.brand_id
  LIMIT p_limit;
$$;
