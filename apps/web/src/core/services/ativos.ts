import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types'
import { logCrudOperation } from '@/core/auditLog'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserAsset = Tables<'user_assets'>
export type UserAssetInsert = TablesInsert<'user_assets'>
export type UserAssetUpdate = TablesUpdate<'user_assets'>
export type Seguro = Tables<'seguros'>
export type SeguroInsert = TablesInsert<'seguros'>
export type Financiamento = Tables<'financiamentos'>
export type FinanciamentoInsert = TablesInsert<'financiamentos'>
export type Consorcio = Tables<'consorcios'>
export type ConsorcioInsert = TablesInsert<'consorcios'>

// ─── Ativos ───────────────────────────────────────────────────────────────────

export async function getAtivos(userId: string, tipo?: string): Promise<UserAsset[]> {
  let query = supabase
    .from('user_assets')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (tipo) query = query.eq('type', tipo)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAtivoById(id: string): Promise<UserAsset> {
  const { data, error } = await supabase
    .from('user_assets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createAtivo(ativo: UserAssetInsert): Promise<UserAsset> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('user_assets')
    .insert(ativo)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'user_assets',
    recordId: data?.id,
    newData: ativo as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function updateAtivo(id: string, updates: UserAssetUpdate): Promise<UserAsset> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('user_assets').select('*').eq('id', id).single()
  const payload = { ...updates, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('user_assets')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'user_assets',
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

export async function deleteAtivo(id: string): Promise<void> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('user_assets').select('*').eq('id', id).single()
  const { error } = await supabase.from('user_assets').delete().eq('id', id)

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'user_assets',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
}

export async function getPatrimonioTotal(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_assets')
    .select('value')
    .eq('user_id', userId)

  if (error) throw error
  return data.reduce((acc, a) => acc + (a.value ?? 0), 0)
}

// ─── Seguros ──────────────────────────────────────────────────────────────────

export async function getSeguros(userId: string): Promise<Seguro[]> {
  const { data, error } = await supabase
    .from('seguros')
    .select('*')
    .eq('user_id', userId)
    .order('data_fim', { ascending: true })

  if (error) throw error
  return data
}

export async function createSeguro(seguro: SeguroInsert): Promise<Seguro> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('seguros')
    .insert(seguro)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'seguros',
    recordId: data?.id,
    newData: seguro as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

// ─── Financiamentos ───────────────────────────────────────────────────────────

export async function getFinanciamentos(userId: string): Promise<Financiamento[]> {
  const { data, error } = await supabase
    .from('financiamentos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createFinanciamento(fin: FinanciamentoInsert): Promise<Financiamento> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('financiamentos')
    .insert(fin)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'financiamentos',
    recordId: data?.id,
    newData: fin as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function updateFinanciamento(
  id: string,
  updates: TablesUpdate<'financiamentos'>
): Promise<Financiamento> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('financiamentos').select('*').eq('id', id).single()
  const payload = { ...updates, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('financiamentos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'financiamentos',
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

// ─── Consórcios ───────────────────────────────────────────────────────────────

export async function getConsorcios(userId: string): Promise<Consorcio[]> {
  const { data, error } = await supabase
    .from('consorcios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createConsorcio(consorcio: ConsorcioInsert): Promise<Consorcio> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('consorcios')
    .insert(consorcio)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'consorcios',
    recordId: data?.id,
    newData: consorcio as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}
