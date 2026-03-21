-- Blueprint Parte B.2 — NÃO executar automaticamente.
-- Sprint dedicado: substituir pluggy_transactions por tabela particionada (HASH user_id)
-- + migrar dados + atualizar Edge Functions / policies.
--
-- Exemplo ilustrativo (ajustar colunas/constraints ao schema real):
--
-- CREATE TABLE public.pluggy_transactions_v2 (
--   LIKE public.pluggy_transactions INCLUDING ALL
-- ) PARTITION BY HASH (user_id);
--
-- CREATE TABLE public.pluggy_transactions_v2_p0 PARTITION OF public.pluggy_transactions_v2
--   FOR VALUES WITH (modulus 8, remainder 0);
-- ... p1 .. p7

SELECT 1; -- ficheiro de referência apenas
