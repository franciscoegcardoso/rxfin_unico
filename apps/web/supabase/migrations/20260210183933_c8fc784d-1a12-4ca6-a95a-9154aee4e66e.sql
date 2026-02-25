
-- RPC: Return pluggy_transactions that haven't been imported into credit_card_transactions yet
CREATE OR REPLACE FUNCTION public.get_unsynced_pluggy_transactions(p_account_id UUID)
RETURNS SETOF pluggy_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT pt.* FROM pluggy_transactions pt
  WHERE pt.account_id = p_account_id
    AND pt.type = 'DEBIT'
    AND pt.amount > 0
    AND COALESCE(pt.category, '') != 'Credit card payment'
    AND NOT EXISTS (
      SELECT 1 FROM credit_card_transactions cct
      WHERE cct.pluggy_transaction_id = pt.pluggy_transaction_id
    )
  ORDER BY pt.date DESC;
END;
$$;

-- RPC: Get date coverage for pluggy_transactions per account (for gap detection)
CREATE OR REPLACE FUNCTION public.get_pluggy_date_coverage(p_user_id UUID)
RETURNS TABLE(account_id UUID, min_date DATE, max_date DATE, tx_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.account_id,
    MIN(pt.date::date) as min_date,
    MAX(pt.date::date) as max_date,
    COUNT(*) as tx_count
  FROM pluggy_transactions pt
  JOIN pluggy_accounts pa ON pa.id = pt.account_id
  WHERE pa.user_id = p_user_id
    AND pa.type = 'CREDIT'
  GROUP BY pt.account_id;
END;
$$;
