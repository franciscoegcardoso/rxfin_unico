-- Fix all credit_card_bills where closing_date equals due_date
-- Apply the rule: closing_date = due_date - 7 days
UPDATE credit_card_bills
SET closing_date = (due_date::date - interval '7 days')::date,
    updated_at = now()
WHERE closing_date = due_date;