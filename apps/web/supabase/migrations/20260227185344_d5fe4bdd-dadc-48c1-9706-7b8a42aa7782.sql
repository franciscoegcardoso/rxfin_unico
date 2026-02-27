
-- Market regime annual data (regime drift for v7.4 engine)
CREATE TABLE IF NOT EXISTS public.market_regime_annual (
  year integer PRIMARY KEY,
  mkt_retention numeric NOT NULL DEFAULT 0.955,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_regime_annual ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "Authenticated users can read market_regime_annual"
  ON public.market_regime_annual
  FOR SELECT
  TO authenticated
  USING (true);

-- Vehicle segments lookup
CREATE TABLE IF NOT EXISTS public.vehicle_segments (
  fipe_code text PRIMARY KEY,
  segment text NOT NULL DEFAULT 'default',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_segments ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "Authenticated users can read vehicle_segments"
  ON public.vehicle_segments
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed market_regime_annual with historical data
INSERT INTO public.market_regime_annual (year, mkt_retention) VALUES
  (2013, 0.950),
  (2014, 0.945),
  (2015, 0.940),
  (2016, 0.935),
  (2017, 0.948),
  (2018, 0.952),
  (2019, 0.955),
  (2020, 0.980),
  (2021, 1.020),
  (2022, 1.010),
  (2023, 0.975),
  (2024, 0.965),
  (2025, 0.958)
ON CONFLICT (year) DO NOTHING;
