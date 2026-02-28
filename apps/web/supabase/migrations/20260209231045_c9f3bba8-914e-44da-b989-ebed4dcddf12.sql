DELETE FROM credit_card_transactions 
WHERE LOWER(store_name) LIKE '%pagamento de fatura%' 
   OR LOWER(store_name) LIKE '%pagamento recebido%' 
   OR LOWER(store_name) LIKE '%desconto antecipa%';