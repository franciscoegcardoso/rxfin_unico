
-- RPC to get bank transactions from pluggy_transactions that haven't been synced to lancamentos_realizados yet
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
      SELECT 1 FROM lancamentos_realizados lr
      WHERE lr.source_type = 'pluggy_bank'
        AND lr.source_id = pt.pluggy_transaction_id
    )
  ORDER BY pt.date DESC;
END;
$function$;

-- RPC to get bank account date coverage for gap detection
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
  GROUP BY pt.account_id, pa.name;
END;
$function$;
