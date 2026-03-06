import { supabase } from '@/integrations/supabase/client';
import { FinancialConfig } from '@/types/financial';

interface PersistenceResult {
  success: boolean;
  failedTable?: string;
  error?: string;
}

/**
 * Persists onboarding data to the database.
 * Returns success status and failed table name for debugging.
 */
export async function persistOnboardingData(
  userId: string,
  config: FinancialConfig
): Promise<PersistenceResult> {
  console.log('[Onboarding] Starting persistence for user:', userId);
  
  try {
    // 1. Update profiles with birth_date first
    const birthDate = config.userProfile.birthDate || null;
    const fullName = `${config.userProfile.firstName} ${config.userProfile.lastName}`.trim() || null;

    console.log('[Onboarding] Step 1: Updating profile with birth_date and full_name');
    const { data: profileData, error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        birth_date: birthDate,
        full_name: fullName,
      })
      .eq('id', userId)
      .select();

    if (profileUpdateError) {
      console.error('[Onboarding] Failed to update profile:', profileUpdateError);
      return { success: false, failedTable: 'profiles (birth_date)', error: profileUpdateError.message };
    }
    console.log('[Onboarding] Step 1 complete, updated rows:', profileData?.length ?? 0);

    // 2. Save user income items (enabled ones)
    const enabledIncomes = config.incomeItems.filter(i => i.enabled);
    if (enabledIncomes.length > 0) {
      // First, delete existing items to avoid duplicates
      const { error: deleteIncomeError } = await supabase
        .from('user_income_items')
        .delete()
        .eq('user_id', userId);

      if (deleteIncomeError) {
        console.error('Failed to clear existing income items:', deleteIncomeError);
        return { success: false, failedTable: 'user_income_items (delete)', error: deleteIncomeError.message };
      }

      const incomeRecords = enabledIncomes.map((income, index) => ({
        user_id: userId,
        default_item_id: income.isSystemDefault ? income.id : null,
        name: income.name,
        method: income.method,
        enabled: income.enabled,
        is_stock_compensation: income.isStockCompensation ?? false,
        responsible_person_id: income.responsiblePersonId ?? null,
        order_index: index,
      }));

      const { error: incomeError } = await supabase
        .from('user_income_items')
        .insert(incomeRecords);

      if (incomeError) {
        console.error('Failed to save income items:', incomeError);
        return { success: false, failedTable: 'user_income_items', error: incomeError.message };
      }
    }

    // 3. Save user expense items (enabled ones)
    const enabledExpenses = config.expenseItems.filter(e => e.enabled);
    if (enabledExpenses.length > 0) {
      // First, delete existing items to avoid duplicates
      const { error: deleteExpenseError } = await supabase
        .from('user_expense_items')
        .delete()
        .eq('user_id', userId);

      if (deleteExpenseError) {
        console.error('Failed to clear existing expense items:', deleteExpenseError);
        return { success: false, failedTable: 'user_expense_items (delete)', error: deleteExpenseError.message };
      }

      const expenseRecords = enabledExpenses.map((expense, index) => ({
        user_id: userId,
        default_item_id: expense.isSystemDefault ? expense.id : null,
        category_id: expense.categoryId || 'outros',
        category_name: expense.category || 'Outros',
        name: expense.name,
        expense_type: expense.expenseType || 'variable_non_essential',
        expense_nature: expense.expenseNature || 'variable',
        recurrence_type: expense.recurrenceType || 'monthly',
        is_recurring: expense.isRecurring ?? false,
        payment_method: expense.paymentMethod || 'credit_card',
        enabled: expense.enabled,
        responsible_person_id: expense.responsiblePersonId ?? null,
        order_index: index,
      }));

      const { error: expenseError } = await supabase
        .from('user_expense_items')
        .insert(expenseRecords);

      if (expenseError) {
        console.error('Failed to save expense items:', expenseError);
        return { success: false, failedTable: 'user_expense_items', error: expenseError.message };
      }
    }

    // 4. Only mark onboarding as complete after all inserts succeed
    console.log('[Onboarding] Step 4: Marking onboarding as complete');
    const { data: completeData, error: completeError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId)
      .select('id, onboarding_completed');

    if (completeError) {
      console.error('[Onboarding] Failed to mark onboarding complete:', completeError);
      return { success: false, failedTable: 'profiles (onboarding_completed)', error: completeError.message };
    }

    console.log('[Onboarding] Step 4 complete, result:', completeData);
    
    // Verify the update actually happened
    if (!completeData || completeData.length === 0) {
      console.error('[Onboarding] No rows updated - RLS may be blocking the update');
      return { success: false, failedTable: 'profiles (onboarding_completed)', error: 'Nenhuma linha atualizada - verifique as permissões RLS' };
    }

    if (completeData[0]?.onboarding_completed !== true) {
      console.error('[Onboarding] Update did not set onboarding_completed to true');
      return { success: false, failedTable: 'profiles (onboarding_completed)', error: 'Falha ao atualizar onboarding_completed' };
    }

    console.log('[Onboarding] All steps completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error during onboarding persistence:', error);
    return { 
      success: false, 
      failedTable: 'unknown', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if user has completed onboarding (source of truth: onboarding_state via get_user_profile_settings RPC).
 */
export async function checkOnboardingStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('get_user_profile_settings');
  if (error || !data) return false;
  const profile = (data as { profile?: { onboarding_completed?: boolean | null } | null })?.profile;
  return profile?.onboarding_completed === true;
}

/**
 * Mark onboarding as complete for the user (updates profiles; used by public onboarding screen).
 */
export async function markOnboardingComplete(userId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId)
    .select('id, onboarding_completed')
    .single();

  if (error) return { success: false, error: error.message };
  if (!data?.onboarding_completed) return { success: false, error: 'Update did not set onboarding_completed' };
  return { success: true };
}
