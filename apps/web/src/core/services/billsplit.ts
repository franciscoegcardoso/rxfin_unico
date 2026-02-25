import { supabase } from '@/integrations/supabase/client';
import type { BillSplit } from '@/core/types/rxsplit';

export async function getBillSplits() {
  const { data, error } = await supabase
    .from('bill_splits')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BillSplit[];
}

export async function createBillSplit(entry: Omit<BillSplit, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('bill_splits')
    .insert({
      user_id: entry.user_id,
      items: JSON.parse(JSON.stringify(entry.items)),
      people: JSON.parse(JSON.stringify(entry.people)),
      splits: JSON.parse(JSON.stringify(entry.splits)),
      subtotal: entry.subtotal,
      service_charge: entry.service_charge,
      grand_total: entry.grand_total,
      split_mode: entry.split_mode,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BillSplit;
}

export async function deleteBillSplit(id: string) {
  const { error } = await supabase.from('bill_splits').delete().eq('id', id);
  if (error) throw error;
}
