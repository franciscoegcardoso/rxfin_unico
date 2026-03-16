import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BankingInstitution {
  nome?: string;
  tipo?: string;
  saldo?: number;
  ultima_sync?: string | null;
}

export interface BankingAccount {
  id?: string;
  tipo?: string;
  saldo?: number;
  ultima_atualizacao?: string | null;
}

/** Item de compromisso recorrente retornado por get_banking_overview (recurring_payments). */
export interface RecurringPaymentOverviewItem {
  id?: string;
  description?: string;
  average_amount?: number;
  seen_this_month?: boolean;
  type?: string;
  [key: string]: unknown;
}

export interface BankingOverviewData {
  institutions?: BankingInstitution[];
  accounts?: BankingAccount[];
  connections?: unknown[];
  recurring_payments?: RecurringPaymentOverviewItem[];
}

export function useBankingOverview() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['banking-overview', user?.id],
    queryFn: async (): Promise<BankingOverviewData | null> => {
      const { data, error } = await supabase.rpc('get_banking_overview', {
        p_user_id: user?.id ?? undefined,
      });
      if (error) throw error;
      return (data as BankingOverviewData) ?? null;
    },
    enabled: !!user?.id,
  });
}
