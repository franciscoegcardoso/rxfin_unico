import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types'
import { logCrudOperation } from '@/core/auditLog'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BudgetPackage = Tables<'budget_packages'>
export type BudgetPackageInsert = TablesInsert<'budget_packages'>
export type BudgetPackageTransaction = Tables<'budget_package_transactions'>
export type BudgetPackageTransactionInsert = TablesInsert<'budget_package_transactions'>
export type MonthlyGoal = Tables<'monthly_goals'>
export type MonthlyGoalInsert = TablesInsert<'monthly_goals'>
export type MonthlyGoalUpdate = TablesUpdate<'monthly_goals'>

// ─── Budget Packages ──────────────────────────────────────────────────────────

export async function getBudgetPackages(userId: string, status?: string): Promise<BudgetPackage[]> {
  let query = supabase
    .from('budget_packages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getBudgetPackageById(id: string): Promise<BudgetPackage> {
  const { data, error } = await supabase
    .from('budget_packages')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createBudgetPackage(pkg: BudgetPackageInsert): Promise<BudgetPackage> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('budget_packages')
    .insert(pkg)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'budget_packages',
    recordId: data?.id,
    newData: pkg as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function updateBudgetPackage(
  id: string,
  updates: TablesUpdate<'budget_packages'>
): Promise<BudgetPackage> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('budget_packages').select('*').eq('id', id).single()
  const payload = { ...updates, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('budget_packages')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'budget_packages',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    newData: payload as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function deleteBudgetPackage(id: string): Promise<void> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('budget_packages').select('*').eq('id', id).single()
  const { error } = await supabase.from('budget_packages').delete().eq('id', id)

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'budget_packages',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
}

// ─── Transações do Package ────────────────────────────────────────────────────

export async function getTransacoesDoPacote(
  packageId: string
): Promise<BudgetPackageTransaction[]> {
  const { data, error } = await supabase
    .from('budget_package_transactions')
    .select('*')
    .eq('package_id', packageId)
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data
}

export async function addTransacaoAoPacote(
  tx: BudgetPackageTransactionInsert
): Promise<BudgetPackageTransaction> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('budget_package_transactions')
    .insert(tx)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'budget_package_transactions',
    recordId: data?.id,
    newData: tx as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

// ─── Metas Mensais ────────────────────────────────────────────────────────────

export async function getMetaMensal(userId: string, month: string): Promise<MonthlyGoal | null> {
  const { data, error } = await supabase
    .from('monthly_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertMetaMensal(
  userId: string,
  month: string,
  meta: Omit<MonthlyGoalInsert, 'user_id' | 'month'>
): Promise<MonthlyGoal> {
  const start = performance.now()
  const payload = { ...meta, user_id: userId, month }
  const { data, error } = await supabase
    .from('monthly_goals')
    .upsert(payload, { onConflict: 'user_id,month' })
    .select()
    .single()

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'monthly_goals',
    recordId: data?.id,
    newData: payload as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}
