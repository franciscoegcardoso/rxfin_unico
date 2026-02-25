
-- Update get_unsynced_pluggy_transactions to also include PENDING transactions
CREATE OR REPLACE FUNCTION public.get_unsynced_pluggy_transactions(p_account_id uuid)
 RETURNS SETOF pluggy_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
