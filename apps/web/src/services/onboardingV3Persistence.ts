import { supabase } from '@/integrations/supabase/client';
import { logCrudOperation } from '@/core/auditLog';

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
      const startDel = performance.now();
      await supabase.from('user_income_items').delete().eq('user_id', userId);
      await logCrudOperation({
        operation: 'DELETE',
        tableName: 'user_income_items',
        recordId: userId,
        newData: { batch_user_id: userId },
        success: true,
        durationMs: Math.round(performance.now() - startDel),
        endpoint: 'onboarding-block-a',
      });
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
      const startIns = performance.now();
      const { error } = await supabase.from('user_income_items').insert(records);
      await logCrudOperation({
        operation: 'CREATE',
        tableName: 'user_income_items',
        recordId: undefined,
        newData: { count: records.length },
        success: !error,
        errorMessage: error?.message,
        errorCode: error?.code,
        durationMs: Math.round(performance.now() - startIns),
        endpoint: 'onboarding-block-a',
      });
      if (error) return { success: false, error: `income: ${error.message}` };
    }

    // 2. Save enabled expense items
    const enabledExpenses = expenseItems.filter(e => e.enabled);
    if (enabledExpenses.length > 0) {
      const startDel = performance.now();
      await supabase.from('user_expense_items').delete().eq('user_id', userId);
      await logCrudOperation({
        operation: 'DELETE',
        tableName: 'user_expense_items',
        recordId: userId,
        newData: { batch_user_id: userId },
        success: true,
        durationMs: Math.round(performance.now() - startDel),
        endpoint: 'onboarding-block-a',
      });
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
      const startIns = performance.now();
      const { error } = await supabase.from('user_expense_items').insert(records);
      await logCrudOperation({
        operation: 'CREATE',
        tableName: 'user_expense_items',
        recordId: undefined,
        newData: { count: records.length },
        success: !error,
        errorMessage: error?.message,
        errorCode: error?.code,
        durationMs: Math.round(performance.now() - startIns),
        endpoint: 'onboarding-block-a',
      });
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
    const start = performance.now();
    await (supabase as any).from('user_kv_store').upsert(
      { user_id: userId, key: 'onboarding_assets', value: assets },
      { onConflict: 'user_id,key' }
    );
    await logCrudOperation({
      operation: 'UPDATE',
      tableName: 'user_kv_store',
      recordId: userId,
      newData: { key: 'onboarding_assets', count: assets?.length },
      success: true,
      durationMs: Math.round(performance.now() - start),
      endpoint: 'onboarding-block-b',
    });
    await (supabase as any).from('user_kv_store').upsert(
      { user_id: userId, key: 'onboarding_debts', value: debts },
      { onConflict: 'user_id,key' }
    );
    await logCrudOperation({
      operation: 'UPDATE',
      tableName: 'user_kv_store',
      recordId: userId,
      newData: { key: 'onboarding_debts', count: debts?.length },
      success: true,
      durationMs: Math.round(performance.now() - start),
      endpoint: 'onboarding-block-b',
    });
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
    const startKv = performance.now();
    await (supabase as any).from('user_kv_store').upsert(
      { user_id: userId, key: 'onboarding_budgets', value: budgets },
      { onConflict: 'user_id,key' }
    );
    await (supabase as any).from('user_kv_store').upsert(
      { user_id: userId, key: 'onboarding_goals', value: goals },
      { onConflict: 'user_id,key' }
    );
    await logCrudOperation({
      operation: 'UPDATE',
      tableName: 'user_kv_store',
      recordId: userId,
      newData: { keys: ['onboarding_budgets', 'onboarding_goals'] },
      success: true,
      durationMs: Math.round(performance.now() - startKv),
      endpoint: 'onboarding-block-c',
    });
    const startProf = performance.now();
    const { error: profErr } = await supabase.from('profiles').update({
      onboarding_completed: true,
      status: 'active',
    }).eq('id', userId);
    await logCrudOperation({
      operation: 'UPDATE',
      tableName: 'profiles',
      recordId: userId,
      newData: { onboarding_completed: true, status: 'active' },
      success: !profErr,
      errorMessage: profErr?.message,
      errorCode: profErr?.code,
      durationMs: Math.round(performance.now() - startProf),
      endpoint: 'onboarding-block-c',
    });

    console.log('[OnboardingV3] Block C persisted, onboarding completed');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}
