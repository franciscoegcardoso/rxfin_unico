
DROP FUNCTION IF EXISTS public.get_catalog_without_history(integer);
DROP FUNCTION IF EXISTS public.get_catalog_sparse_history(integer, integer);

CREATE OR REPLACE FUNCTION public.get_catalog_without_history(p_limit integer DEFAULT 30)
 RETURNS TABLE(fipe_code text, year integer, year_id text, brand_id integer, model_id integer, brand_name text, model_name text, vehicle_type integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT c.fipe_code, c.year, c.year_id, c.brand_id, c.model_id, c.brand_name, c.model_name, c.vehicle_type
  FROM public.fipe_catalog c
  LEFT JOIN (
    SELECT DISTINCT ph.fipe_code, ph.model_year
    FROM public.fipe_price_history ph
  ) h ON h.fipe_code = c.fipe_code AND h.model_year = c.year
  WHERE h.fipe_code IS NULL
  ORDER BY c.vehicle_type, c.brand_id, c.model_id
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_catalog_sparse_history(p_limit integer DEFAULT 30, p_max_refs integer DEFAULT 10)
 RETURNS TABLE(fipe_code text, year integer, year_id text, brand_id integer, model_id integer, vehicle_type integer, brand_name text, model_name text, current_refs bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT c.fipe_code, c.year, c.year_id, c.brand_id, c.model_id, c.vehicle_type, c.brand_name, c.model_name,
         COALESCE(ph.cnt, 0) as current_refs
  FROM public.fipe_catalog c
  LEFT JOIN (
    SELECT fipe_code, model_year, COUNT(*) as cnt
    FROM public.fipe_price_history GROUP BY fipe_code, model_year
  ) ph ON ph.fipe_code = c.fipe_code AND ph.model_year = c.year
  WHERE COALESCE(ph.cnt, 0) < p_max_refs
  ORDER BY COALESCE(ph.cnt, 0) ASC, c.vehicle_type, c.brand_id
  LIMIT p_limit;
$function$;
