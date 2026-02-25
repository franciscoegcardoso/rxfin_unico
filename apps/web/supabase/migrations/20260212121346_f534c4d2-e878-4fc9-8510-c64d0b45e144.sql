
-- Adicionar coluna metadata para user_vehicle_records (armazena dados específicos por tipo de registro)
ALTER TABLE public.user_vehicle_records ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
