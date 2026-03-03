import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types'
import { logCrudOperation } from '@/core/auditLog'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserGoal = Tables<'user_goals'>
export type UserGoalInsert = TablesInsert<'user_goals'>
export type UserGoalUpdate = TablesUpdate<'user_goals'>
export type PurchaseRegistry = Tables<'purchase_registry'>
export type PurchaseRegistryInsert = TablesInsert<'purchase_registry'>
export type PurchaseRegistryUpdate = TablesUpdate<'purchase_registry'>

// ─── Metas do Usuário ─────────────────────────────────────────────────────────

export async function getMetas(userId: string): Promise<UserGoal[]> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

export async function createMeta(meta: UserGoalInsert): Promise<UserGoal> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('user_goals')
    .insert(meta)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'user_goals',
    recordId: data?.id,
    newData: meta as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function updateMeta(id: string, updates: UserGoalUpdate): Promise<UserGoal> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('user_goals').select('*').eq('id', id).single()
  const payload = { ...updates, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('user_goals')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'user_goals',
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

export async function deleteMeta(id: string): Promise<void> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('user_goals').select('*').eq('id', id).single()
  const { error } = await supabase.from('user_goals').delete().eq('id', id)

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'user_goals',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
}

// ─── Planejamento de Compras ──────────────────────────────────────────────────

export async function getPurchaseRegistry(
  userId: string,
  status?: string
): Promise<PurchaseRegistry[]> {
  let query = supabase
    .from('purchase_registry')
    .select('*')
    .eq('user_id', userId)
    .order('planned_date', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createPurchase(purchase: PurchaseRegistryInsert): Promise<PurchaseRegistry> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('purchase_registry')
    .insert(purchase)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'purchase_registry',
    recordId: data?.id,
    newData: purchase as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function updatePurchase(
  id: string,
  updates: PurchaseRegistryUpdate
): Promise<PurchaseRegistry> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('purchase_registry').select('*').eq('id', id).single()
  const payload = { ...updates, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('purchase_registry')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'purchase_registry',
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

export async function marcarCompraRealizada(
  id: string,
  actualValue: number,
  purchaseDate: string = new Date().toISOString().split('T')[0]
): Promise<PurchaseRegistry> {
  return updatePurchase(id, {
    status: 'purchased',
    actual_value: actualValue,
    purchase_date: purchaseDate,
  })
}
