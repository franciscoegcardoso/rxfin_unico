
-- Add flag to distinguish authoritative Pluggy bill links from fallback estimates
ALTER TABLE public.credit_card_transactions ADD COLUMN bill_from_pluggy BOOLEAN DEFAULT FALSE;

-- Retroactively populate: if pluggy_transactions has a pluggy_bill_id, the link is authoritative
UPDATE public.credit_card_transactions t
SET bill_from_pluggy = TRUE
FROM public.pluggy_transactions pt
WHERE pt.pluggy_transaction_id = t.pluggy_transaction_id
  AND pt.pluggy_bill_id IS NOT NULL;

-- Clear fallback-assigned bill links so frontend can re-evaluate by date
UPDATE public.credit_card_transactions t
SET credit_card_bill_id = NULL
FROM public.pluggy_transactions pt
WHERE pt.pluggy_transaction_id = t.pluggy_transaction_id
  AND pt.pluggy_bill_id IS NULL
  AND t.credit_card_bill_id IS NOT NULL;
