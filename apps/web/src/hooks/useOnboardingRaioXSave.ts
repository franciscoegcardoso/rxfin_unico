import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Persiste receitas e despesas do onboarding Raio-X via RPC save_onboarding_block_a.
 * Usado pelo wizard para salvar antes de avançar (receitas ao ir para despesas; ambos ao clicar "Ver meu Raio-X").
 */
export function useOnboardingRaioXSave() {
  const [isSaving, setIsSaving] = useState(false);

  const saveAll = useCallback(async (
    incomes: Record<string, number>,
    expenses: Record<string, number>
  ): Promise<boolean> => {
    setIsSaving(true);
    try {
      const incomeData = Object.entries(incomes)
        .filter(([, v]) => typeof v === 'number' && v > 0)
        .map(([key, value]) => ({ key, value }));

      const expenseData = Object.entries(expenses)
        .filter(([, v]) => typeof v === 'number' && v > 0)
        .map(([key, value]) => ({ key, value }));

      const { error } = await supabase.rpc('save_onboarding_block_a', {
        p_income_data: incomeData as any,
        p_expense_data: expenseData as any,
      });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('[OnboardingRaioX] Erro ao salvar:', err);
      toast.error('Erro ao salvar dados. Tente novamente.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { saveAll, isSaving };
}
