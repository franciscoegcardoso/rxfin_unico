-- Adicionar campos de garantia de compra na tabela de seguros
ALTER TABLE public.seguros 
ADD COLUMN IF NOT EXISTS is_warranty BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_extended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_extended_months INTEGER,
ADD COLUMN IF NOT EXISTS warranty_store TEXT;