
-- Table for storing favorite vehicles (up to 5 per user)
CREATE TABLE public.favorite_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'carros', -- carros, motos, caminhoes
  brand_code TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  model_code TEXT NOT NULL,
  model_name TEXT NOT NULL,
  year_code TEXT NOT NULL,
  year_label TEXT,
  fipe_code TEXT,
  fipe_value NUMERIC,
  display_name TEXT NOT NULL, -- user-friendly name for quick display
  position INTEGER NOT NULL DEFAULT 0, -- ordering (0-4)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: same vehicle per user only once
CREATE UNIQUE INDEX idx_favorite_vehicles_unique 
  ON public.favorite_vehicles (user_id, vehicle_type, brand_code, model_code, year_code);

-- Index for fast lookup
CREATE INDEX idx_favorite_vehicles_user ON public.favorite_vehicles (user_id);

-- Limit to 5 favorites per user via trigger
CREATE OR REPLACE FUNCTION public.check_favorite_vehicles_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.favorite_vehicles WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 favorite vehicles per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER enforce_favorite_vehicles_limit
  BEFORE INSERT ON public.favorite_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_favorite_vehicles_limit();

-- Enable RLS
ALTER TABLE public.favorite_vehicles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own favorites
CREATE POLICY "Users can view own favorites"
  ON public.favorite_vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.favorite_vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
  ON public.favorite_vehicles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorite_vehicles FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_favorite_vehicles_updated_at
  BEFORE UPDATE ON public.favorite_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
