import type { QueryClient } from '@tanstack/react-query';

/**
 * Após marcar/desmarcar transferência interna ou detecção em lote (RPC refresca MVs).
 * @param referenceMonth YYYY-MM quando conhecido — invalida também `['movimentacoes', month]` (spec) além de `movimentacoes-page`.
 */
export async function invalidateAfterInternalTransferToggle(
  queryClient: QueryClient,
  userId?: string | null,
  referenceMonth?: string | null
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['lancamentos-com-banco'] });
  if (userId) {
    await queryClient.invalidateQueries({ queryKey: ['movimentacoes-page', userId] });
  } else {
    await queryClient.invalidateQueries({ queryKey: ['movimentacoes-page'] });
  }
  if (referenceMonth) {
    await queryClient.invalidateQueries({ queryKey: ['movimentacoes', referenceMonth] });
  }
  await queryClient.invalidateQueries({ queryKey: ['home-dashboard'] });
  await queryClient.invalidateQueries({ queryKey: ['dashboard-enhanced'] });
  await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
}
