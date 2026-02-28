-- Enable RLS on tables that have it disabled
ALTER TABLE public.fipe_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_reference ENABLE ROW LEVEL SECURITY;

-- fipe_reference has no policies at all, add read + service_role write
CREATE POLICY "Allow public read fipe_reference"
  ON public.fipe_reference FOR SELECT USING (true);

CREATE POLICY "Service role can manage fipe_reference"
  ON public.fipe_reference FOR ALL TO service_role USING (true) WITH CHECK (true);