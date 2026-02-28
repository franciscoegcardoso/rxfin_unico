-- Create seguros table
CREATE TABLE public.seguros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  seguradora text NOT NULL,
  numero_apolice text,
  premio_mensal numeric NOT NULL DEFAULT 0,
  premio_anual numeric NOT NULL DEFAULT 0,
  valor_cobertura numeric NOT NULL DEFAULT 0,
  franquia numeric DEFAULT 0,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  renovacao_automatica boolean DEFAULT false,
  asset_id text,
  coberturas jsonb DEFAULT '[]',
  forma_pagamento text DEFAULT 'mensal',
  dia_vencimento integer,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seguros ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own seguros"
  ON public.seguros FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seguros"
  ON public.seguros FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seguros"
  ON public.seguros FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seguros"
  ON public.seguros FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_seguros_updated_at
  BEFORE UPDATE ON public.seguros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();