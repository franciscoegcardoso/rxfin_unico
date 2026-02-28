-- Tabela para armazenar conexões do Pluggy (Items)
CREATE TABLE public.pluggy_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  connector_id INTEGER NOT NULL,
  connector_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar contas bancárias e cartões sincronizados
CREATE TABLE public.pluggy_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.pluggy_connections(id) ON DELETE CASCADE,
  pluggy_account_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- BANK ou CREDIT
  subtype TEXT, -- CHECKING_ACCOUNT, SAVINGS_ACCOUNT, CREDIT_CARD
  name TEXT NOT NULL,
  number TEXT,
  balance NUMERIC DEFAULT 0,
  currency_code TEXT DEFAULT 'BRL',
  credit_limit NUMERIC,
  available_credit_limit NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar transações sincronizadas
CREATE TABLE public.pluggy_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.pluggy_accounts(id) ON DELETE CASCADE,
  pluggy_transaction_id TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  description_raw TEXT,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  type TEXT NOT NULL, -- DEBIT ou CREDIT
  status TEXT NOT NULL DEFAULT 'POSTED', -- POSTED ou PENDING
  payment_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pluggy_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pluggy_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pluggy_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pluggy_connections
CREATE POLICY "Users can view their own connections" 
ON public.pluggy_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections" 
ON public.pluggy_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON public.pluggy_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.pluggy_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for pluggy_accounts
CREATE POLICY "Users can view their own accounts" 
ON public.pluggy_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts" 
ON public.pluggy_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
ON public.pluggy_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
ON public.pluggy_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for pluggy_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.pluggy_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
ON public.pluggy_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.pluggy_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_pluggy_connections_user ON public.pluggy_connections(user_id);
CREATE INDEX idx_pluggy_accounts_connection ON public.pluggy_accounts(connection_id);
CREATE INDEX idx_pluggy_accounts_user ON public.pluggy_accounts(user_id);
CREATE INDEX idx_pluggy_transactions_account ON public.pluggy_transactions(account_id);
CREATE INDEX idx_pluggy_transactions_user ON public.pluggy_transactions(user_id);
CREATE INDEX idx_pluggy_transactions_date ON public.pluggy_transactions(date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_pluggy_connections_updated_at
BEFORE UPDATE ON public.pluggy_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pluggy_accounts_updated_at
BEFORE UPDATE ON public.pluggy_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();