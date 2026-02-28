import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeForWhitelist } from '@/utils/recurringWhitelist';

/**
 * Apply a friendly name rule via RPC: saves the rule and updates all matching transactions.
 */
export async function applyStoreFriendlyNameRule(
  storeName: string,
  friendlyName: string
): Promise<{ success: boolean; updated: number }> {
  const normalizedName = normalizeForWhitelist(storeName);

  try {
    const { data, error } = await supabase.rpc('apply_store_friendly_name_rule' as any, {
      p_normalized_name: normalizedName,
      p_original_name: storeName,
      p_friendly_name: friendlyName,
    });

    if (error) throw error;

    const result = data as any;
    const updatedCount = result?.updated || 0;

    toast.success(`Nome atualizado em ${updatedCount} transação(ões).`);
    return { success: true, updated: updatedCount };
  } catch (err) {
    console.error('Error applying friendly name rule:', err);
    toast.error('Erro ao aplicar nome amigável');
    return { success: false, updated: 0 };
  }
}
// sync
