import { toast } from 'sonner';
import { applyFriendlyNameRule } from '@/core/services/lancamentos';

/**
 * Apply a friendly name rule for lancamentos via RPC: saves the rule and updates all matching lancamentos.
 * Delegated to core service.
 */
export async function applyLancamentoFriendlyNameRule(
  originalName: string,
  friendlyName: string
): Promise<{ success: boolean; updated: number }> {
  try {
    const result = await applyFriendlyNameRule(originalName, friendlyName);
    toast.success(`Nome atualizado em ${result.updated} lançamento(s).`);
    return { success: true, updated: result.updated };
  } catch (err) {
    console.error('Error applying lancamento friendly name rule:', err);
    toast.error('Erro ao aplicar nome amigável');
    return { success: false, updated: 0 };
  }
}
// sync
