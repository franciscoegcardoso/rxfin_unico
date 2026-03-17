-- View lancamentos_realizados_v: mesma base que v_lancamentos_full + account_name (nome da conta/banco)
-- Usada pelo front na Atribuir Categorias > Lançamentos em conta para exibir a coluna Banco.
-- Para origem pluggy_bank, faz join com pluggy_transactions e pluggy_accounts.

CREATE OR REPLACE VIEW public.lancamentos_realizados_v
WITH (security_invoker = true)
AS
SELECT
  v.*,
  pa.name AS account_name
FROM public.v_lancamentos_full v
LEFT JOIN public.pluggy_transactions pt
  ON pt.pluggy_transaction_id = v.meta_source_id
  AND v.meta_source_type = 'pluggy_bank'
LEFT JOIN public.pluggy_accounts pa
  ON pa.id = pt.account_id;

COMMENT ON VIEW public.lancamentos_realizados_v IS
  'Lançamentos realizados com metadados e nome da conta (account_name) para origem pluggy_bank.';
