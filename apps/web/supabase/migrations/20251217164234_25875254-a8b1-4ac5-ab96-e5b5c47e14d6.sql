-- Create table for consolidated monthly entries (realized transactions)
CREATE TABLE public.lancamentos_realizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  valor_previsto NUMERIC NOT NULL,
  valor_realizado NUMERIC NOT NULL,
  mes_referencia TEXT NOT NULL, -- formato YYYY-MM
  data_vencimento DATE,
  data_pagamento DATE,
  data_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lancamentos_realizados ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own lancamentos" 
ON public.lancamentos_realizados 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lancamentos" 
ON public.lancamentos_realizados 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lancamentos" 
ON public.lancamentos_realizados 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lancamentos" 
ON public.lancamentos_realizados 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lancamentos_realizados_updated_at
BEFORE UPDATE ON public.lancamentos_realizados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_lancamentos_user_mes ON public.lancamentos_realizados(user_id, mes_referencia);
CREATE INDEX idx_lancamentos_tipo ON public.lancamentos_realizados(tipo);