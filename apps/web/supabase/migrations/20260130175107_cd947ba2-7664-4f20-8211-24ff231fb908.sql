-- Create table to store Guru subscription history events
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_status TEXT,
  transaction_id TEXT,
  pagarme_transaction_id TEXT,
  subscription_id TEXT,
  product_id TEXT,
  product_name TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT,
  role_before TEXT,
  role_after TEXT,
  contact_email TEXT,
  raw_payload JSONB,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX idx_subscription_events_processed_at ON public.subscription_events(processed_at DESC);
CREATE INDEX idx_subscription_events_contact_email ON public.subscription_events(contact_email);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view subscription events (for support purposes)
CREATE POLICY "Admins can view all subscription events"
ON public.subscription_events
FOR SELECT
USING (is_admin(auth.uid()));

-- Users can view their own subscription events
CREATE POLICY "Users can view their own subscription events"
ON public.subscription_events
FOR SELECT
USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.subscription_events IS 'Stores subscription events from Guru/Pagar.me for audit and support purposes';