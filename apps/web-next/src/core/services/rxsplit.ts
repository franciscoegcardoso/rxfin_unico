import { createClient } from '@/lib/supabase/client';
import type {
  RXSplitContact,
  RXSplitGroup,
  RXSplitGroupMember,
  RXSplitExpense,
  RXSplitExpenseDebtor,
} from '@/core/types/rxsplit';

const supabase = createClient();

export async function getContacts() {
  const { data, error } = await supabase
    .from('rxsplit_contacts')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as RXSplitContact[];
}

export async function createContact(contact: Omit<RXSplitContact, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('rxsplit_contacts')
    .insert(contact)
    .select()
    .single();
  if (error) throw error;
  return data as RXSplitContact;
}

export async function updateContact(id: string, updates: Partial<RXSplitContact>) {
  const { data, error } = await supabase
    .from('rxsplit_contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as RXSplitContact;
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from('rxsplit_contacts').delete().eq('id', id);
  if (error) throw error;
}

export async function getGroups() {
  const { data, error } = await supabase
    .from('rxsplit_groups')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as RXSplitGroup[];
}

export async function createGroup(
  group: Pick<
    RXSplitGroup,
    'user_id' | 'name' | 'is_active' | 'is_main' | 'deadline' | 'limit_total' | 'limit_per_user'
  >,
  memberContactIds: string[],
) {
  const { data, error } = await supabase
    .from('rxsplit_groups')
    .insert(group)
    .select()
    .single();
  if (error) throw error;

  const grp = data as RXSplitGroup;

  if (memberContactIds.length > 0) {
    const members = memberContactIds.map((cid) => ({
      group_id: grp.id,
      contact_id: cid,
      status: 'ACCEPTED' as const,
    }));
    const { error: mErr } = await supabase.from('rxsplit_group_members').insert(members);
    if (mErr) throw mErr;
  }

  return grp;
}

export async function updateGroup(id: string, updates: Partial<RXSplitGroup>) {
  const { data, error } = await supabase
    .from('rxsplit_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as RXSplitGroup;
}

export async function deleteGroup(id: string) {
  const { error } = await supabase.from('rxsplit_groups').delete().eq('id', id);
  if (error) throw error;
}

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('rxsplit_group_members')
    .select('*')
    .eq('group_id', groupId);
  if (error) throw error;
  return data as RXSplitGroupMember[];
}

export async function addGroupMember(groupId: string, contactId: string) {
  const { data, error } = await supabase
    .from('rxsplit_group_members')
    .insert({ group_id: groupId, contact_id: contactId, status: 'ACCEPTED' })
    .select()
    .single();
  if (error) throw error;
  return data as RXSplitGroupMember;
}

export async function removeGroupMember(groupId: string, contactId: string) {
  const { error } = await supabase
    .from('rxsplit_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('contact_id', contactId);
  if (error) throw error;
}

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
  debtors: { contact_id: string; amount: number }[],
) {
  const { data, error } = await supabase
    .from('rxsplit_expenses')
    .insert(expense)
    .select()
    .single();
  if (error) throw error;

  const exp = data as RXSplitExpense;

  if (debtors.length > 0) {
    const rows = debtors.map((d) => ({ expense_id: exp.id, ...d }));
    const { error: dErr } = await supabase.from('rxsplit_expense_debtors').insert(rows);
    if (dErr) throw dErr;
  }

  return exp;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('rxsplit_expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function getExpenseDebtors(expenseId: string) {
  const { data, error } = await supabase
    .from('rxsplit_expense_debtors')
    .select('*')
    .eq('expense_id', expenseId);
  if (error) throw error;
  return data as RXSplitExpenseDebtor[];
}
