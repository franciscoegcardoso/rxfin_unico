-- Add vinculo_ativo_id column to link contas a pagar with assets (vehicles, properties, etc.)
ALTER TABLE public.contas_pagar_receber
ADD COLUMN vinculo_ativo_id TEXT;

-- Create index for efficient querying by asset
CREATE INDEX idx_contas_vinculo_ativo ON public.contas_pagar_receber(vinculo_ativo_id) WHERE vinculo_ativo_id IS NOT NULL;