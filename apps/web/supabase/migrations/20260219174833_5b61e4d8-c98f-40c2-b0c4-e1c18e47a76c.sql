
-- Enable RLS on all FIPE tables that have policies but RLS disabled
ALTER TABLE public.fipe_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fipe_sibling_cache ENABLE ROW LEVEL SECURITY;
