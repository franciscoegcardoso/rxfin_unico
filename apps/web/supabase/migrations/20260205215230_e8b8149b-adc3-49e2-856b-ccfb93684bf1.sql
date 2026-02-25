-- Permitir que effective_date seja NULL para suportar "Vigência Indeterminada"
ALTER TABLE public.legal_document_versions 
ALTER COLUMN effective_date DROP NOT NULL;