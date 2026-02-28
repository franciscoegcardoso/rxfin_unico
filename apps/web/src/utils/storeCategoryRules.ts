import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeForWhitelist } from '@/utils/recurringWhitelist';

/**
 * Standalone function to create a store category rule via RPC.
 * Can be called from event handlers without hooks.
 */
export async function createStoreCategoryRule(
  storeName: string,
  categoryId: string,
  categoryName: string
): Promise<{ success: boolean; updated: number }> {
  const normalizedName = normalizeForWhitelist(storeName);

  try {
    const { data, error } = await supabase.rpc('apply_store_category_rule' as any, {
      p_normalized_name: normalizedName,
      p_original_name: storeName,
      p_category_id: categoryId,
      p_category_name: categoryName,
    });

    if (error) throw error;

    const result = data as any;
    const updatedCount = result?.updated || 0;

    toast.success(`Regra criada! ${updatedCount} transação(ões) atualizada(s).`);
    return { success: true, updated: updatedCount };
  } catch (err) {
    console.error('Error creating store category rule:', err);
    toast.error('Erro ao criar regra de categoria');
    return { success: false, updated: 0 };
  }
}
// sync
