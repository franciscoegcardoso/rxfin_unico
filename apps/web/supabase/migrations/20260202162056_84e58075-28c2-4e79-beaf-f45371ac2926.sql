-- Create storage bucket for legal documents (permanent, no deletion)
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-documents', 'legal-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create table for legal document versions
CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('terms_of_use', 'privacy_policy')),
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  change_description TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique version per document type
  UNIQUE (document_type, version_number)
);

-- Enable RLS
ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

-- Everyone can read (public documents)
CREATE POLICY "Legal documents are publicly readable"
ON public.legal_document_versions
FOR SELECT
USING (true);

-- Only admins can insert new versions
CREATE POLICY "Only admins can upload legal documents"
ON public.legal_document_versions
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update (to set is_current flag)
CREATE POLICY "Only admins can update legal documents"
ON public.legal_document_versions
FOR UPDATE
USING (is_admin(auth.uid()));

-- NO DELETE POLICY - documents cannot be deleted

-- Storage policies for legal-documents bucket
CREATE POLICY "Legal documents are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'legal-documents');

CREATE POLICY "Only admins can upload legal documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'legal-documents' AND is_admin(auth.uid()));

-- NO DELETE POLICY for storage - files cannot be deleted

-- Create index for faster queries
CREATE INDEX idx_legal_docs_type_current ON public.legal_document_versions(document_type, is_current);
CREATE INDEX idx_legal_docs_type_version ON public.legal_document_versions(document_type, version_number DESC);