import { supabase } from '@/integrations/supabase/client';
import type { BillSplit } from '@/core/types/rxsplit';
import { logCrudOperation } from '@/core/auditLog';

export async function getBillSplits() {
  const { data, error } = await supabase
    .from('bill_splits')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BillSplit[];
}

export async function createBillSplit(entry: Omit<BillSplit, 'id' | 'created_at'>) {
  const start = performance.now();
  const payload = {
    user_id: entry.user_id,
    items: JSON.parse(JSON.stringify(entry.items)),
    people: JSON.parse(JSON.stringify(entry.people)),
    splits: JSON.parse(JSON.stringify(entry.splits)),
    subtotal: entry.subtotal,
    service_charge: entry.service_charge,
    grand_total: entry.grand_total,
    split_mode: entry.split_mode,
  };
  const { data, error } = await supabase
    .from('bill_splits')
    .insert(payload as any)
    .select()
    .single();

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'bill_splits',
    recordId: (data as any)?.id,
    newData: payload as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
  return data as unknown as BillSplit;
}

export async function deleteBillSplit(id: string) {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('bill_splits').select('*').eq('id', id).single();
  const { error } = await supabase.from('bill_splits').delete().eq('id', id);

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'bill_splits',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
}
