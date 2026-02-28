import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as rxsplitService from '@/core/services/rxsplit';
import * as billsplitService from '@/core/services/billsplit';
import { useAuth } from '@/contexts/AuthContext';

// ─── Contacts ──────────────────────────────────────────
export function useRXSplitContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['rxsplit-contacts', user?.id],
    queryFn: rxsplitService.getContacts,
    enabled: !!user,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rxsplitService.createContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rxsplit-contacts'] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<import('@/core/types/rxsplit').RXSplitContact> }) =>
      rxsplitService.updateContact(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rxsplit-contacts'] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rxsplitService.deleteContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rxsplit-contacts'] }),
  });
}

// ─── Groups ────────────────────────────────────────────
export function useRXSplitGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['rxsplit-groups', user?.id],
    queryFn: rxsplitService.getGroups,
    enabled: !!user,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ group, memberContactIds }: { group: Parameters<typeof rxsplitService.createGroup>[0]; memberContactIds: string[] }) =>
      rxsplitService.createGroup(group, memberContactIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rxsplit-groups'] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof rxsplitService.updateGroup>[1] }) =>
      rxsplitService.updateGroup(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rxsplit-groups'] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rxsplitService.deleteGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rxsplit-groups'] }),
  });
}

// ─── Group Members ─────────────────────────────────────
export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ['rxsplit-group-members', groupId],
    queryFn: () => rxsplitService.getGroupMembers(groupId!),
    enabled: !!groupId,
  });
}

// ─── Expenses ──────────────────────────────────────────
export function useRXSplitExpenses(groupId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['rxsplit-expenses', user?.id, groupId],
    queryFn: () => rxsplitService.getExpenses(groupId),
    enabled: !!user,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expense, debtors }: { expense: Parameters<typeof rxsplitService.createExpense>[0]; debtors: Parameters<typeof rxsplitService.createExpense>[1] }) =>
      rxsplitService.createExpense(expense, debtors),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rxsplit-expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rxsplitService.deleteExpense,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rxsplit-expenses'] }),
  });
}

// ─── Bill Splits ───────────────────────────────────────
export function useBillSplitHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bill-splits', user?.id],
    queryFn: billsplitService.getBillSplits,
    enabled: !!user,
  });
}

export function useCreateBillSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billsplitService.createBillSplit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-splits'] }),
  });
}

export function useDeleteBillSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billsplitService.deleteBillSplit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-splits'] }),
  });
}
// sync
