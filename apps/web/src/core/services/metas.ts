import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types'
import { logCrudOperation } from '@/core/auditLog'

// ─── Tipos (Sonhos: user_dreams) ───────────────────────────────────────────────

/** Row da tabela user_dreams (backend já migrado de user_goals) */
export interface UserDreamRow {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  icon: string | null
  order_index: number
  created_at: string
  updated_at: string
}
export type UserDream = UserDreamRow
export type UserDreamInsert = Omit<UserDreamRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
export type UserDreamUpdate = Partial<Omit<UserDreamRow, 'id' | 'user_id' | 'created_at'>>

export type PurchaseRegistry = Tables<'purchase_registry'>
export type PurchaseRegistryInsert = TablesInsert<'purchase_registry'>
export type PurchaseRegistryUpdate = TablesUpdate<'purchase_registry'>

// ─── Sonhos do Usuário ────────────────────────────────────────────────────────

export async function getDreams(userId: string): Promise<UserDream[]> {
  const { data, error } = await supabase
    .from('user_dreams' as any)
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return (data ?? []) as UserDream[]
}

export async function createDream(dream: UserDreamInsert): Promise<UserDream> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('user_dreams' as any)
    .insert(dream)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'user_dreams',
    recordId: data?.id,
    newData: dream as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data as UserDream
}

export async function updateDream(id: string, updates: UserDreamUpdate): Promise<UserDream> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('user_dreams' as any).select('*').eq('id', id).single()
  const payload = { ...updates, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('user_dreams' as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'user_dreams',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    newData: payload as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data as UserDream
}

export async function deleteDream(id: string): Promise<void> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('user_dreams' as any).select('*').eq('id', id).single()
  const { error } = await supabase.from('user_dreams' as any).delete().eq('id', id)

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'user_dreams',
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
