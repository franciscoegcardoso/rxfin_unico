-- Create table for fiscal receipts/vouchers
CREATE TABLE public.ir_comprovantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  categoria TEXT NOT NULL, -- 'saude', 'educacao', 'previdencia', 'profissional', 'outros'
  subcategoria TEXT, -- 'medico', 'dentista', 'hospital', 'escola', 'faculdade', etc.
  valor DECIMAL(15,2) NOT NULL,
  data_comprovante DATE NOT NULL,
  prestador_nome TEXT,
  prestador_cpf_cnpj TEXT,
  beneficiario_nome TEXT,
  beneficiario_cpf TEXT,
  descricao TEXT,
  arquivo_path TEXT,
  arquivo_nome TEXT,
  is_valid_deduction BOOLEAN DEFAULT true,
  validation_notes TEXT,
  ano_fiscal INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ir_comprovantes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own comprovantes" 
ON public.ir_comprovantes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comprovantes" 
ON public.ir_comprovantes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comprovantes" 
ON public.ir_comprovantes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comprovantes" 
ON public.ir_comprovantes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ir_comprovantes_updated_at
BEFORE UPDATE ON public.ir_comprovantes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for fiscal organizer chat messages
CREATE TABLE public.ir_fiscal_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ir_fiscal_chat ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own chat messages" 
ON public.ir_fiscal_chat 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages" 
ON public.ir_fiscal_chat 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages" 
ON public.ir_fiscal_chat 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_ir_comprovantes_user_ano ON public.ir_comprovantes(user_id, ano_fiscal);
CREATE INDEX idx_ir_comprovantes_categoria ON public.ir_comprovantes(categoria);
CREATE INDEX idx_ir_fiscal_chat_user ON public.ir_fiscal_chat(user_id, created_at DESC);