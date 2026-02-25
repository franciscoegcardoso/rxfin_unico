
-- Tabela para registrar migrations com seus scripts de rollback
CREATE TABLE public.migration_rollbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT now(),
  rollback_sql TEXT NOT NULL,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID,
  description TEXT,
  is_reversible BOOLEAN DEFAULT true,
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('staging', 'production')),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.migration_rollbacks ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage rollbacks
CREATE POLICY "Admins can view migration rollbacks"
  ON public.migration_rollbacks
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert migration rollbacks"
  ON public.migration_rollbacks
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update migration rollbacks"
  ON public.migration_rollbacks
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Tabela para registrar histórico de deploys
CREATE TABLE public.deploy_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deploy_type TEXT NOT NULL CHECK (deploy_type IN ('frontend', 'migration', 'edge_function', 'full')),
  environment TEXT NOT NULL CHECK (environment IN ('staging', 'production')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
  description TEXT,
  changes_summary JSONB,
  deployed_by UUID,
  deployed_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  rollback_id UUID REFERENCES public.migration_rollbacks(id),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.deploy_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage deploy history
CREATE POLICY "Admins can view deploy history"
  ON public.deploy_history
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert deploy history"
  ON public.deploy_history
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update deploy history"
  ON public.deploy_history
  FOR UPDATE
  USING (public.is_admin(auth.uid()));
