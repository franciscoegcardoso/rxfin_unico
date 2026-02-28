import { supabase } from '@/integrations/supabase/client';

/**
 * Persists onboarding Block A data (income + expense items) to Supabase.
 */
export async function persistBlockA(
  userId: string,
  incomeItems: any[],
  expenseItems: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Save enabled income items
    const enabledIncomes = incomeItems.filter(i => i.enabled);
    if (enabledIncomes.length > 0) {
      await supabase.from('user_income_items').delete().eq('user_id', userId);
      const records = enabledIncomes.map((inc, idx) => ({
        user_id: userId,
        default_item_id: inc.isSystemDefault ? inc.id : null,
        name: inc.name,
        method: inc.method,
        enabled: true,
        is_stock_compensation: inc.isStockCompensation ?? false,
        responsible_person_id: inc.responsiblePersonId ?? null,
        order_index: idx,
      }));
      const { error } = await supabase.from('user_income_items').insert(records);
      if (error) return { success: false, error: `income: ${error.message}` };
    }

    // 2. Save enabled expense items
    const enabledExpenses = expenseItems.filter(e => e.enabled);
    if (enabledExpenses.length > 0) {
      await supabase.from('user_expense_items').delete().eq('user_id', userId);
      const records = enabledExpenses.map((exp, idx) => ({
        user_id: userId,
        default_item_id: exp.isSystemDefault ? exp.id : null,
        category_id: exp.categoryId || 'outros',
        category_name: exp.category || 'Outros',
        name: exp.name,
        expense_type: exp.expenseType || 'variable_non_essential',
        expense_nature: exp.expenseNature || 'variable',
        recurrence_type: exp.recurrenceType || 'monthly',
        is_recurring: exp.isRecurring ?? false,
        payment_method: exp.paymentMethod || 'credit_card',
        enabled: true,
        responsible_person_id: exp.responsiblePersonId ?? null,
        order_index: idx,
      }));
      const { error } = await supabase.from('user_expense_items').insert(records);
      if (error) return { success: false, error: `expense: ${error.message}` };
    }

    console.log('[OnboardingV3] Block A persisted successfully');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}

/**
 * Persists onboarding Block B data (assets + debts) to user_kv_store.
 * We use KV store since there's no dedicated assets/debts table yet.
 */
export async function persistBlockB(
  userId: string,
  assets: any[],
  debts: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await (supabase as any).from('user_kv_store').upsert(
      { user_id: userId, key: 'onboarding_assets', value: assets },
      { onConflict: 'user_id,key' }
    );
    await (supabase as any).from('user_kv_store').upsert(
      { user_id: userId, key: 'onboarding_debts', value: debts },
      { onConflict: 'user_id,key' }
    );
    console.log('[OnboardingV3] Block B persisted successfully');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}

/**
 * Persists onboarding Block C data (budget + goals) to user_kv_store.
 */
export async function persistBlockC(
  userId: string,
  budgets: any[],
  goals: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await (supabase as any).from('user_kv_store').upsert(
      { user_id: userId, key: 'onboarding_budgets', value: budgets },
      { onConflict: 'user_id,key' }
    );
    await (supabase as any).from('user_kv_store').upsert(
      { user_id: userId, key: 'onboarding_goals', value: goals },
      { onConflict: 'user_id,key' }
    );
    // Mark onboarding as complete
    await supabase.from('profiles').update({
      onboarding_completed: true,
      status: 'active',
    }).eq('id', userId);

    console.log('[OnboardingV3] Block C persisted, onboarding completed');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}
