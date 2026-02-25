
-- Repair orphan transactions: assign credit_card_bill_id based on closing_date ranges
-- This is a data fix, using a function to perform the update
CREATE OR REPLACE FUNCTION public.repair_orphan_bill_links()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH bill_ranges AS (
    SELECT 
      id as bill_id, card_id, closing_date,
      LAG(closing_date) OVER (PARTITION BY card_id ORDER BY closing_date) as prev_closing
    FROM credit_card_bills
  ),
  matches AS (
    SELECT DISTINCT ON (t.id) t.id as tx_id, br.bill_id
    FROM credit_card_transactions t
    JOIN bill_ranges br ON br.card_id = t.card_id
      AND t.transaction_date > COALESCE(br.prev_closing, '1900-01-01')
      AND t.transaction_date <= br.closing_date
    WHERE t.credit_card_bill_id IS NULL
      AND t.card_id IS NOT NULL
    ORDER BY t.id, br.closing_date ASC
  )
  UPDATE credit_card_transactions t
  SET credit_card_bill_id = m.bill_id
  FROM matches m
  WHERE t.id = m.tx_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
