/**
 * Serviço de lixeira — RPCs Supabase para itens deletados.
 * Usado pela página Lixeira (/lixeira).
 */
import { supabase } from '@/core/supabase';

export interface TrashItemRow {
  id: string;
  original_id: string;
  asset_type: string;
  asset_data: Record<string, unknown>;
  deleted_at: string;
  expires_at: string;
  deleted_reason?: string | null;
}

/** Retorna itens na lixeira do usuário logado (RPC usa auth.uid()). */
export async function getTrashItems(): Promise<TrashItemRow[]> {
  const { data, error } = await supabase.rpc('get_trash_items', {} as Record<string, never>);
  if (error) throw error;
  if (Array.isArray(data)) return data as TrashItemRow[];
  const payload = data as { items?: TrashItemRow[] } | null;
  return payload?.items ?? [];
}

/** Restaura um item da lixeira. */
export async function restoreFromTrash(trashId: string): Promise<void> {
  const { data, error } = await supabase.rpc('restore_from_trash', { _trash_id: trashId });
  if (error) throw error;
  const result = data as { success?: boolean; error?: string } | null;
  if (result && result.success === false) {
    throw new Error(result.error ?? 'Erro ao restaurar item');
  }
}

/** Esvazia toda a lixeira do usuário. */
export async function emptyTrash(): Promise<void> {
  const { error } = await supabase.rpc('empty_trash', {} as Record<string, never>);
  if (error) throw error;
}

/** Exclui permanentemente um item da lixeira (delete direto na tabela). */
export async function permanentlyDeleteTrashItem(trashId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_trash' as any)
    .delete()
    .eq('id', trashId)
    .eq('user_id', userId);

  if (error) throw error;
}
