-- Tabela para armazenar dados de consumo do INMETRO
CREATE TABLE public.vehicle_fuel_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year_start INTEGER,
  year_end INTEGER,
  fuel_type TEXT NOT NULL DEFAULT 'flex',
  consumption_urban NUMERIC NOT NULL,
  consumption_highway NUMERIC NOT NULL,
  consumption_average NUMERIC GENERATED ALWAYS AS ((consumption_urban + consumption_highway) / 2) STORED,
  category TEXT NOT NULL,
  engine TEXT,
  source TEXT DEFAULT 'INMETRO',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca eficiente
CREATE INDEX idx_vehicle_fuel_brand_model ON public.vehicle_fuel_consumption(brand, model);
CREATE INDEX idx_vehicle_fuel_category ON public.vehicle_fuel_consumption(category);

-- Habilitar RLS
ALTER TABLE public.vehicle_fuel_consumption ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (dados de referência)
CREATE POLICY "Anyone can read vehicle fuel consumption data"
ON public.vehicle_fuel_consumption
FOR SELECT
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_vehicle_fuel_consumption_updated_at
BEFORE UPDATE ON public.vehicle_fuel_consumption
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();