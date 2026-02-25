-- Create table for user profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create table for consortiums (consórcios)
CREATE TABLE public.consorcios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_carta NUMERIC NOT NULL,
  prazo_total INTEGER NOT NULL,
  parcelas_pagas INTEGER NOT NULL DEFAULT 0,
  valor_parcela_atual NUMERIC NOT NULL,
  taxa_adm_total NUMERIC NOT NULL DEFAULT 15,
  fundo_reserva NUMERIC NOT NULL DEFAULT 2,
  seguro_mensal NUMERIC NOT NULL DEFAULT 0.05,
  reajuste_anual NUMERIC NOT NULL DEFAULT 4.5,
  contemplado BOOLEAN NOT NULL DEFAULT false,
  data_contemplacao DATE,
  administradora TEXT,
  grupo TEXT,
  cota TEXT,
  data_inicio DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consorcios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consorcios" ON public.consorcios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consorcios" ON public.consorcios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consorcios" ON public.consorcios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consorcios" ON public.consorcios
  FOR DELETE USING (auth.uid() = user_id);

-- Create table for financings (financiamentos)
CREATE TABLE public.financiamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_bem NUMERIC NOT NULL,
  valor_entrada NUMERIC NOT NULL DEFAULT 0,
  valor_financiado NUMERIC NOT NULL,
  prazo_total INTEGER NOT NULL,
  parcelas_pagas INTEGER NOT NULL DEFAULT 0,
  valor_parcela_atual NUMERIC NOT NULL,
  taxa_juros_mensal NUMERIC NOT NULL,
  sistema_amortizacao TEXT NOT NULL DEFAULT 'PRICE' CHECK (sistema_amortizacao IN ('PRICE', 'SAC')),
  taxas_extras NUMERIC NOT NULL DEFAULT 0,
  seguro_mensal NUMERIC NOT NULL DEFAULT 0,
  saldo_devedor NUMERIC NOT NULL,
  instituicao_financeira TEXT,
  contrato TEXT,
  data_inicio DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financiamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own financiamentos" ON public.financiamentos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financiamentos" ON public.financiamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financiamentos" ON public.financiamentos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financiamentos" ON public.financiamentos
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_consorcios_updated_at
  BEFORE UPDATE ON public.consorcios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financiamentos_updated_at
  BEFORE UPDATE ON public.financiamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();