-- Tabela para armazenar tokens OTP de verificação
CREATE TABLE public.email_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + '15 minutes'::interval),
  used_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para buscas eficientes
CREATE INDEX idx_email_verification_tokens_email ON public.email_verification_tokens(email);
CREATE INDEX idx_email_verification_tokens_otp_code ON public.email_verification_tokens(otp_code);
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_expires ON public.email_verification_tokens(expires_at);

-- RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Apenas o serviço pode manipular (via edge functions)
CREATE POLICY "Service role only" ON public.email_verification_tokens
  FOR ALL USING (false);

-- Tabela para controle de rate limiting de reenvio
CREATE TABLE public.email_verification_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT
);

CREATE INDEX idx_email_rate_limits_email ON public.email_verification_rate_limits(email);
CREATE INDEX idx_email_rate_limits_sent_at ON public.email_verification_rate_limits(sent_at);

ALTER TABLE public.email_verification_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.email_verification_rate_limits
  FOR ALL USING (false);

-- Função para limpar tokens expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.email_verification_tokens 
  WHERE expires_at < now() OR used_at IS NOT NULL;
  
  DELETE FROM public.email_verification_rate_limits
  WHERE sent_at < now() - interval '1 hour';
END;
$$;