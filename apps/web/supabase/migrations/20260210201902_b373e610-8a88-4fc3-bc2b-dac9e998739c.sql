UPDATE credit_card_bills
SET closing_date = (due_date::date - interval '7 days')::date,
    updated_at = now()
WHERE closing_date = due_date;