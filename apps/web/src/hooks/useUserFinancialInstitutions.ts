import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserFinancialInstitution } from '@/types/financial';
import { toast } from 'sonner';

const QUERY_KEY = 'user-financial-institutions';

/**
 * Cascade delete: remove all credit card data linked to an institution.
 * Handles both manual mode (card_id = institution.id) and Open Finance (card_id = pluggy_accounts.id).
 */
async function cascadeDeleteCardData(userId: string, institutionId: string) {
  const cardIds: string[] = [institutionId];

  const { data: pluggyAccounts } = await supabase
    .from('pluggy_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'CREDIT')
    .is('deleted_at', null);

  if (pluggyAccounts && pluggyAccounts.length > 0) {
    cardIds.push(...pluggyAccounts.map(a => a.id));
  }

  await supabase.from('credit_card_transactions_v').delete().eq('user_id', userId).in('card_id', cardIds);
  await supabase.from('credit_card_bills').delete().eq('user_id', userId).in('card_id', cardIds);
  await supabase.from('credit_card_imports').delete().eq('user_id', userId).in('card_id', cardIds);
  await supabase.from('contas_pagar_receber').delete().eq('vinculo_cartao_id', institutionId).eq('user_id', userId);
}

function dbToApp(row: any): UserFinancialInstitution {
  return {
    id: row.id,
    institutionId: row.institution_id,
    customName: row.custom_name,
    customCode: row.custom_code,
    hasCheckingAccount: row.has_checking_account,
    hasSavingsAccount: row.has_savings_account,
    hasCreditCard: row.has_credit_card,
    hasInvestments: row.has_investments,
    creditCardBrand: row.credit_card_brand,
    creditCardDueDay: row.credit_card_due_day,
    notes: row.notes,
  };
}

export function useUserFinancialInstitutions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_financial_institutions' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at');
      if (error) throw error;
      return (data as any[]).map(dbToApp);
    },
    enabled: !!userId,
  });

  const addInstitution = useMutation({
    mutationFn: async (inst: Omit<UserFinancialInstitution, 'id'>) => {
      const { data, error } = await supabase.from('user_financial_institutions' as any).insert({
        user_id: userId,
        institution_id: inst.institutionId,
        custom_name: inst.customName,
        custom_code: inst.customCode,
        has_checking_account: inst.hasCheckingAccount,
        has_savings_account: inst.hasSavingsAccount,
        has_credit_card: inst.hasCreditCard,
        has_investments: inst.hasInvestments,
        credit_card_brand: inst.creditCardBrand,
        credit_card_due_day: inst.creditCardDueDay,
        notes: inst.notes,
      } as any).select('id').single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao adicionar instituição'),
  });

  const updateInstitution = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserFinancialInstitution> }) => {
      const dbUpdates: any = {};
      if (updates.institutionId !== undefined) dbUpdates.institution_id = updates.institutionId;
      if (updates.customName !== undefined) dbUpdates.custom_name = updates.customName;
      if (updates.customCode !== undefined) dbUpdates.custom_code = updates.customCode;
      if (updates.hasCheckingAccount !== undefined) dbUpdates.has_checking_account = updates.hasCheckingAccount;
      if (updates.hasSavingsAccount !== undefined) dbUpdates.has_savings_account = updates.hasSavingsAccount;
      if (updates.hasCreditCard !== undefined) dbUpdates.has_credit_card = updates.hasCreditCard;
      if (updates.hasInvestments !== undefined) dbUpdates.has_investments = updates.hasInvestments;
      if (updates.creditCardBrand !== undefined) dbUpdates.credit_card_brand = updates.creditCardBrand;
      if (updates.creditCardDueDay !== undefined) dbUpdates.credit_card_due_day = updates.creditCardDueDay;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      const { error } = await supabase.from('user_financial_institutions' as any).update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    onError: () => toast.error('Erro ao atualizar instituição'),
  });

  const removeInstitution = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await cascadeDeleteCardData(userId, id);
      const { error } = await supabase.from('user_financial_institutions' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['credit-card-bills'] });
      qc.invalidateQueries({ queryKey: ['credit-card-transactions'] });
    },
    onError: () => toast.error('Erro ao remover instituição'),
  });

  return {
    institutions: query.data ?? [],
    isLoading: query.isLoading,
    addInstitution,
    updateInstitution,
    removeInstitution,
  };
}
// sync
