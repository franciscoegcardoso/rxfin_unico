-- Fix: source_id must be TEXT to match pluggy_transaction_id (which is text)
ALTER TABLE public.lancamentos_realizados 
  ALTER COLUMN source_id TYPE text USING source_id::text;

-- Also fix the RPC to use explicit cast for safety
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