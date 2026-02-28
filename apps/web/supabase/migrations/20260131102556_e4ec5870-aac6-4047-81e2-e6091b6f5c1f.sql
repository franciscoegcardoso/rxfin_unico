-- Tabela para registrar aceites de termos com governança
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_slug TEXT NOT NULL,
  document_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, document_slug)
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios consentimentos
CREATE POLICY "Users can view their own consents"
ON public.user_consents
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios consentimentos
CREATE POLICY "Users can insert their own consents"
ON public.user_consents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Índice para consultas por usuário
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);

-- Índice para consultas por documento
CREATE INDEX idx_user_consents_document ON public.user_consents(document_slug);