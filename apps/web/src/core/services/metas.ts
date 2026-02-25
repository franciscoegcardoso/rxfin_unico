import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types'

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
  const { data, error } = await supabase
    .from('user_goals')
    .insert(meta)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMeta(id: string, updates: UserGoalUpdate): Promise<UserGoal> {
  const { data, error } = await supabase
    .from('user_goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMeta(id: string): Promise<void> {
  const { error } = await supabase.from('user_goals').delete().eq('id', id)
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
  const { data, error } = await supabase
    .from('purchase_registry')
    .insert(purchase)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePurchase(
  id: string,
  updates: PurchaseRegistryUpdate
): Promise<PurchaseRegistry> {
  const { data, error } = await supabase
    .from('purchase_registry')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

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
