
-- Cleanup: remove duplicate installment transactions linked to the same bill.
-- For each group (same bill + base store name + installment_total + card_id),
-- keep only the one with the lowest installment_current and delete the rest.

WITH ranked AS (
  SELECT 
    id,
    credit_card_bill_id,
    UPPER(REGEXP_REPLACE(store_name, '\s*\d+\s*[/\\]\s*\d+\s*', '', 'g')) as base_name,
    installment_total,
    card_id,
    installment_current,
    ROW_NUMBER() OVER (
      PARTITION BY 
        credit_card_bill_id,
        UPPER(REGEXP_REPLACE(store_name, '\s*\d+\s*[/\\]\s*\d+\s*', '', 'g')),
        installment_total,
        card_id
      ORDER BY installment_current ASC NULLS LAST, created_at ASC
    ) as rn
  FROM credit_card_transactions
  WHERE credit_card_bill_id IS NOT NULL
    AND installment_total > 1
    AND bill_from_pluggy = true
)
DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);
