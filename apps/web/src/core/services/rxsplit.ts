import { supabase } from '@/integrations/supabase/client';
import type {
  RXSplitContact,
  RXSplitGroup,
  RXSplitGroupMember,
  RXSplitExpense,
  RXSplitExpenseDebtor,
} from '@/core/types/rxsplit';
import { logCrudOperation } from '@/core/auditLog';

// ─── Contacts ──────────────────────────────────────────
export async function getContacts() {
  const { data, error } = await supabase
    .from('rxsplit_contacts')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as RXSplitContact[];
}

export async function createContact(contact: Omit<RXSplitContact, 'id' | 'created_at'>) {
  const start = performance.now();
  const { data, error } = await supabase
    .from('rxsplit_contacts')
    .insert(contact)
    .select()
    .single();

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'rxsplit_contacts',
    recordId: (data as any)?.id,
    newData: contact as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
  return data as RXSplitContact;
}

export async function updateContact(id: string, updates: Partial<RXSplitContact>) {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('rxsplit_contacts').select('*').eq('id', id).single();
  const { data, error } = await supabase
    .from('rxsplit_contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'rxsplit_contacts',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    newData: updates as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
  return data as RXSplitContact;
}

export async function deleteContact(id: string) {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('rxsplit_contacts').select('*').eq('id', id).single();
  const { error } = await supabase.from('rxsplit_contacts').delete().eq('id', id);

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'rxsplit_contacts',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
}

// ─── Groups ────────────────────────────────────────────
export async function getGroups() {
  const { data, error } = await supabase
    .from('rxsplit_groups')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as RXSplitGroup[];
}

export async function createGroup(
  group: Pick<RXSplitGroup, 'user_id' | 'name' | 'is_active' | 'is_main' | 'deadline' | 'limit_total' | 'limit_per_user'>,
  memberContactIds: string[]
) {
  const start = performance.now();
  const { data, error } = await supabase
    .from('rxsplit_groups')
    .insert(group)
    .select()
    .single();
  if (error) throw error;

  const grp = data as RXSplitGroup;

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'rxsplit_groups',
    recordId: grp.id,
    newData: group as Record<string, unknown>,
    success: true,
    durationMs: Math.round(performance.now() - start),
  });

  if (memberContactIds.length > 0) {
    const members = memberContactIds.map(cid => ({
      group_id: grp.id,
      contact_id: cid,
      status: 'ACCEPTED' as const,
    }));
    const startM = performance.now();
    const { error: mErr } = await supabase.from('rxsplit_group_members').insert(members);
    await logCrudOperation({
      operation: 'CREATE',
      tableName: 'rxsplit_group_members',
      recordId: grp.id,
      newData: { count: members.length },
      success: !mErr,
      errorMessage: mErr?.message,
      errorCode: mErr?.code,
      durationMs: Math.round(performance.now() - startM),
    });
    if (mErr) throw mErr;
  }

  return grp;
}

export async function updateGroup(id: string, updates: Partial<RXSplitGroup>) {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('rxsplit_groups').select('*').eq('id', id).single();
  const { data, error } = await supabase
    .from('rxsplit_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'rxsplit_groups',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    newData: updates as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
  return data as RXSplitGroup;
}

export async function deleteGroup(id: string) {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('rxsplit_groups').select('*').eq('id', id).single();
  const { error } = await supabase.from('rxsplit_groups').delete().eq('id', id);

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'rxsplit_groups',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
}

// ─── Group Members ─────────────────────────────────────
export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('rxsplit_group_members')
    .select('*')
    .eq('group_id', groupId);
  if (error) throw error;
  return data as RXSplitGroupMember[];
}

export async function addGroupMember(groupId: string, contactId: string) {
  const start = performance.now();
  const payload = { group_id: groupId, contact_id: contactId, status: 'ACCEPTED' };
  const { data, error } = await supabase
    .from('rxsplit_group_members')
    .insert(payload)
    .select()
    .single();

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'rxsplit_group_members',
    recordId: (data as any)?.id,
    newData: payload as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
  return data as RXSplitGroupMember;
}

export async function removeGroupMember(groupId: string, contactId: string) {
  const start = performance.now();
  const { data: oldRows } = await supabase
    .from('rxsplit_group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('contact_id', contactId);
  const { error } = await supabase
    .from('rxsplit_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('contact_id', contactId);

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'rxsplit_group_members',
    recordId: `${groupId}:${contactId}`,
    oldData: (oldRows?.[0] as Record<string, unknown>) ?? undefined,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
}

// ─── Expenses ──────────────────────────────────────────
export async function getExpenses(groupId?: string) {
  let query = supabase
    .from('rxsplit_expenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (groupId) query = query.eq('group_id', groupId);
  const { data, error } = await query;
  if (error) throw error;
  return data as RXSplitExpense[];
}

export async function createExpense(
  expense: Omit<RXSplitExpense, 'id' | 'created_at'>,
  debtors: { contact_id: string; amount: number }[]
) {
  const start = performance.now();
  const { data, error } = await supabase
    .from('rxsplit_expenses')
    .insert(expense)
    .select()
    .single();
  if (error) throw error;

  const exp = data as RXSplitExpense;

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'rxsplit_expenses',
    recordId: exp.id,
    newData: expense as Record<string, unknown>,
    success: true,
    durationMs: Math.round(performance.now() - start),
  });

  if (debtors.length > 0) {
    const rows = debtors.map(d => ({ expense_id: exp.id, ...d }));
    const startD = performance.now();
    const { error: dErr } = await supabase.from('rxsplit_expense_debtors').insert(rows);
    await logCrudOperation({
      operation: 'CREATE',
      tableName: 'rxsplit_expense_debtors',
      recordId: exp.id,
      newData: { count: rows.length },
      success: !dErr,
      errorMessage: dErr?.message,
      errorCode: dErr?.code,
      durationMs: Math.round(performance.now() - startD),
    });
    if (dErr) throw dErr;
  }

  return exp;
}

export async function deleteExpense(id: string) {
  const start = performance.now();
  const { data: oldRow } = await supabase.from('rxsplit_expenses').select('*').eq('id', id).single();
  const { error } = await supabase.from('rxsplit_expenses').delete().eq('id', id);

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'rxsplit_expenses',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  });
  if (error) throw error;
}

// ─── Expense Debtors ───────────────────────────────────
export async function getExpenseDebtors(expenseId: string) {
  const { data, error } = await supabase
    .from('rxsplit_expense_debtors')
    .select('*')
    .eq('expense_id', expenseId);
  if (error) throw error;
  return data as RXSplitExpenseDebtor[];
}
