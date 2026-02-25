
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Ensure RLS + public read policies for FIPE reference data
ALTER TABLE public.fipe_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_reference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read fipe_catalog" ON public.fipe_catalog;
CREATE POLICY "Allow public read fipe_catalog" ON public.fipe_catalog FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read fipe_price_history" ON public.fipe_price_history;
CREATE POLICY "Allow public read fipe_price_history" ON public.fipe_price_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read fipe_reference" ON public.fipe_reference;
CREATE POLICY "Allow public read fipe_reference" ON public.fipe_reference FOR SELECT USING (true);

-- Helper functions for frontend DB-first queries

CREATE OR REPLACE FUNCTION public.get_fipe_brands(p_vehicle_type integer)
RETURNS TABLE(brand_id integer, brand_name text)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT DISTINCT c.brand_id, c.brand_name
  FROM public.fipe_catalog c
  WHERE c.vehicle_type = p_vehicle_type
  ORDER BY c.brand_name;
$$;

CREATE OR REPLACE FUNCTION public.get_fipe_models(p_vehicle_type integer, p_brand_id integer)
RETURNS TABLE(model_id integer, model_name text)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT DISTINCT c.model_id, c.model_name
  FROM public.fipe_catalog c
  WHERE c.vehicle_type = p_vehicle_type AND c.brand_id = p_brand_id
  ORDER BY c.model_name;
$$;

CREATE OR REPLACE FUNCTION public.get_fipe_years(p_vehicle_type integer, p_brand_id integer, p_model_id integer)
RETURNS TABLE(year_id text, year_val integer, fuel_type integer)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT c.year_id, c.year AS year_val, c.fuel_type
  FROM public.fipe_catalog c
  WHERE c.vehicle_type = p_vehicle_type AND c.brand_id = p_brand_id AND c.model_id = p_model_id
  ORDER BY c.year DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_fipe_catalog_entry(p_vehicle_type integer, p_brand_id integer, p_model_id integer, p_year_id text)
RETURNS TABLE(fipe_code text, brand_name text, model_name text, year_val integer, fuel_type integer)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT c.fipe_code, c.brand_name, c.model_name, c.year AS year_val, c.fuel_type
  FROM public.fipe_catalog c
  WHERE c.vehicle_type = p_vehicle_type AND c.brand_id = p_brand_id AND c.model_id = p_model_id AND c.year_id = p_year_id
  LIMIT 1;
$$;
