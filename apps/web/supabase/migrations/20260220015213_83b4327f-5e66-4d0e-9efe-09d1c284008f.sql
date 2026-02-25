
-- =============================================
-- FASE 3: Cleanup de planos
-- =============================================

-- 1. Drop the legacy 'plans' table (no FK references remain)
DROP TABLE IF EXISTS public.plans CASCADE;

-- 2. Remove subscription_role from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_role;

-- 3. Create a view for admin to see user plan slugs easily
CREATE OR REPLACE VIEW public.v_user_plan AS
SELECT 
  p.id AS user_id,
  COALESCE(sp.slug, 'free') AS plan_slug,
  COALESCE(sp.name, 'Free') AS plan_name,
  w.plan_expires_at,
  w.id AS workspace_id
FROM public.profiles p
LEFT JOIN public.workspace_members wm ON wm.user_id = p.id AND wm.is_active = true
LEFT JOIN public.workspaces w ON w.id = wm.workspace_id AND w.is_active = true
LEFT JOIN public.subscription_plans sp ON sp.id = w.plan_id;

-- =============================================
-- EXTRAÇÃO DE METADADOS DE LANÇAMENTOS
-- =============================================

-- 4. Create lancamento_metadata table (1:1 with lancamentos_realizados)
CREATE TABLE public.lancamento_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id UUID NOT NULL UNIQUE REFERENCES public.lancamentos_realizados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_type TEXT,
  source_id TEXT,
  purchase_registry_id UUID REFERENCES public.purchase_registry(id) ON DELETE SET NULL,
  friendly_name TEXT,
  is_category_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT lancamento_metadata_source_type_check 
    CHECK (source_type IS NULL OR source_type IN ('manual', 'pluggy', 'pluggy_bank', 'credit_card', 'consolidacao', 'contas_pagar'))
);

-- Index for fast lookups
CREATE INDEX idx_lancamento_metadata_lancamento ON public.lancamento_metadata(lancamento_id);
CREATE INDEX idx_lancamento_metadata_user ON public.lancamento_metadata(user_id);
CREATE INDEX idx_lancamento_metadata_source ON public.lancamento_metadata(source_type, source_id);

-- 5. Enable RLS
ALTER TABLE public.lancamento_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metadata"
  ON public.lancamento_metadata FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metadata"
  ON public.lancamento_metadata FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metadata"
  ON public.lancamento_metadata FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metadata"
  ON public.lancamento_metadata FOR DELETE USING (auth.uid() = user_id);

-- 6. Migrate existing data from lancamentos_realizados to lancamento_metadata
INSERT INTO public.lancamento_metadata (lancamento_id, user_id, source_type, source_id, purchase_registry_id, friendly_name, is_category_confirmed)
SELECT 
  id,
  user_id,
  source_type,
  source_id,
  purchase_registry_id,
  friendly_name,
  COALESCE(is_category_confirmed, false)
FROM public.lancamentos_realizados
WHERE source_type IS NOT NULL 
   OR source_id IS NOT NULL 
   OR purchase_registry_id IS NOT NULL 
   OR friendly_name IS NOT NULL 
   OR is_category_confirmed = true;

-- 7. Update the trigger for auto-updated_at
CREATE TRIGGER update_lancamento_metadata_updated_at
  BEFORE UPDATE ON public.lancamento_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Create a unified view for backward compatibility
CREATE OR REPLACE VIEW public.v_lancamentos_full AS
SELECT 
  lr.*,
  lm.source_type AS meta_source_type,
  lm.source_id AS meta_source_id,
  lm.purchase_registry_id AS meta_purchase_registry_id,
  lm.friendly_name AS meta_friendly_name,
  lm.is_category_confirmed AS meta_is_category_confirmed
FROM public.lancamentos_realizados lr
LEFT JOIN public.lancamento_metadata lm ON lm.lancamento_id = lr.id;

-- 9. Update DB function to use metadata table for deduplication
CREATE OR REPLACE FUNCTION public.get_unsynced_bank_transactions(p_user_id uuid)
 RETURNS SETOF pluggy_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT pt.* FROM pluggy_transactions pt
  JOIN pluggy_accounts pa ON pa.id = pt.account_id
  WHERE pa.user_id = p_user_id
    AND pa.type = 'BANK'
    AND pt.amount != 0
    AND NOT EXISTS (
      SELECT 1 FROM lancamento_metadata lm
      JOIN lancamentos_realizados lr ON lr.id = lm.lancamento_id
      WHERE lm.source_type = 'pluggy_bank'
        AND lm.source_id = pt.pluggy_transaction_id
        AND lr.user_id = p_user_id
    )
  ORDER BY pt.date DESC;
END;
$function$;
