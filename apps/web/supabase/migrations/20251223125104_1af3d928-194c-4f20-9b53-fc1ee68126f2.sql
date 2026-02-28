-- Create table for accounts payable and receivable
CREATE TABLE public.contas_pagar_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  categoria TEXT NOT NULL,
  forma_pagamento TEXT,
  observacoes TEXT,
  recorrente BOOLEAN DEFAULT FALSE,
  tipo_cobranca TEXT DEFAULT 'unica' CHECK (tipo_cobranca IN ('unica', 'parcelada', 'recorrente')),
  parcela_atual INTEGER,
  total_parcelas INTEGER,
  grupo_parcelamento TEXT,
  dia_recorrencia INTEGER,
  data_fim_recorrencia DATE,
  sem_data_fim BOOLEAN DEFAULT TRUE,
  vinculo_cartao_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contas_pagar_receber ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own contas"
ON public.contas_pagar_receber
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contas"
ON public.contas_pagar_receber
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contas"
ON public.contas_pagar_receber
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contas"
ON public.contas_pagar_receber
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contas_pagar_receber_updated_at
BEFORE UPDATE ON public.contas_pagar_receber
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();