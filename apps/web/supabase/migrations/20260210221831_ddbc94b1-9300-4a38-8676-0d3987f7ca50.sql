
-- Remove duplicate installment rows linked to same bill (keep lowest installment_current per group)
WITH ranked AS (
  SELECT 
    id,
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
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
