-- Restore closing_dates to due_date - 7 days (undo the broken MAX(transaction_date) inference)
UPDATE credit_card_bills
SET closing_date = (due_date - INTERVAL '7 days')::date;