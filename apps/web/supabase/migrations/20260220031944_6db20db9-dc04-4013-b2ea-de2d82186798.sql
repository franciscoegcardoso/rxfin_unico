
-- =============================================================
-- PHASE 1: Backfill lancamento_metadata from legacy columns
-- =============================================================
INSERT INTO lancamento_metadata (lancamento_id, user_id, source_type, source_id)
SELECT lr.id, lr.user_id, lr.source_type, lr.source_id
FROM lancamentos_realizados lr
WHERE lr.source_type = 'pluggy_bank'
  AND lr.source_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lancamento_metadata lm
    WHERE lm.lancamento_id = lr.id
  )
ON CONFLICT (lancamento_id) DO NOTHING;

-- =============================================================
-- PHASE 2: Clean up duplicates (keep oldest, delete newest)
-- =============================================================
DELETE FROM lancamento_metadata
WHERE id IN (
  SELECT id FROM (
    SELECT lm.id,
           ROW_NUMBER() OVER (PARTITION BY lm.source_type, lm.source_id ORDER BY lm.created_at ASC) as rn
    FROM lancamento_metadata lm
    WHERE lm.source_type = 'pluggy_bank'
      AND lm.source_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Also delete the orphaned lancamentos_realizados records whose metadata was just removed
DELETE FROM lancamentos_realizados lr
WHERE lr.source_type = 'pluggy_bank'
  AND lr.source_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lancamento_metadata lm WHERE lm.lancamento_id = lr.id
  );

-- =============================================================
-- PHASE 3: Add unique partial index to prevent future duplicates
-- =============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_lancamento_metadata_source_unique
ON lancamento_metadata (source_type, source_id)
WHERE source_id IS NOT NULL;

-- =============================================================
-- PHASE 4: Fix RPC to filter soft-deleted accounts
-- =============================================================
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
    AND pa.deleted_at IS NULL          -- ← GOVERNANÇA: ignorar contas removidas
    AND pt.amount != 0
    AND NOT EXISTS (
      SELECT 1 FROM lancamento_metadata lm
      WHERE lm.source_type = 'pluggy_bank'
        AND lm.source_id = pt.pluggy_transaction_id
        AND lm.user_id = p_user_id
    )
  ORDER BY pt.date DESC;
END;
$function$;

-- =============================================================
-- PHASE 5: Also fix credit card coverage RPC for consistency
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_pluggy_bank_date_coverage(p_user_id uuid)
RETURNS TABLE(account_id uuid, account_name text, min_date date, max_date date, tx_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pt.account_id,
    pa.name as account_name,
    MIN(pt.date::date) as min_date,
    MAX(pt.date::date) as max_date,
    COUNT(*) as tx_count
  FROM pluggy_transactions pt
  JOIN pluggy_accounts pa ON pa.id = pt.account_id
  WHERE pa.user_id = p_user_id
    AND pa.type = 'BANK'
    AND pa.deleted_at IS NULL          -- ← GOVERNANÇA: ignorar contas removidas
  GROUP BY pt.account_id, pa.name;
END;
$function$;
