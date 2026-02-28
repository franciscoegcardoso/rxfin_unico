-- Create table for caching FIPE historical prices
-- This stores immutable historical data to avoid repeated API calls

CREATE TABLE public.fipe_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Composite unique key
  fipe_code TEXT NOT NULL,
  model_year INTEGER NOT NULL,           -- e.g. 2020, 2021, or 32000 for "0 km"
  reference_code INTEGER NOT NULL,       -- FIPE table code (315, 316, etc)
  
  -- Price data
  price NUMERIC NOT NULL,
  reference_month INTEGER NOT NULL,      -- 1-12
  reference_year INTEGER NOT NULL,       -- 2020, 2021, etc
  reference_label TEXT NOT NULL,         -- "dezembro/2020"
  
  -- Metadata
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT fipe_price_history_unique 
    UNIQUE (fipe_code, model_year, reference_code)
);

-- Indexes for fast lookups
CREATE INDEX idx_fipe_price_fipe_code ON public.fipe_price_history(fipe_code);
CREATE INDEX idx_fipe_price_model_year ON public.fipe_price_history(fipe_code, model_year);
CREATE INDEX idx_fipe_price_calendar ON public.fipe_price_history(reference_year, reference_month);
CREATE INDEX idx_fipe_price_reference ON public.fipe_price_history(reference_code);

-- Enable RLS
ALTER TABLE public.fipe_price_history ENABLE ROW LEVEL SECURITY;

-- Public read access (FIPE data is public)
CREATE POLICY "Cache is readable by everyone" 
  ON public.fipe_price_history 
  FOR SELECT 
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.fipe_price_history IS 'Cache of historical FIPE vehicle prices. Data is immutable once fetched.';