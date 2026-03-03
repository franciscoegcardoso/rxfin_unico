import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types'
import { logCrudOperation } from '@/core/auditLog'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ContaPagarReceber = Tables<'contas_pagar_receber'>
export type ContaInsert = TablesInsert<'contas_pagar_receber'>
export type ContaUpdate = TablesUpdate<'contas_pagar_receber'>

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getContasAVencer(userId: string, diasAFrente = 30): Promise<ContaPagarReceber[]> {
  const hoje = new Date().toISOString().split('T')[0]
  const limite = new Date(Date.now() + diasAFrente * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('contas_pagar_receber')
    .select('*')
    .eq('user_id', userId)
    .is('data_pagamento', null)  // não pagas
    .gte('data_vencimento', hoje)
    .lte('data_vencimento', limite)
    .order('data_vencimento', { ascending: true })

  if (error) throw error
  return data
}

export async function getContasVencidas(userId: string): Promise<ContaPagarReceber[]> {
  const hoje = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('contas_pagar_receber')
    .select('*')
    .eq('user_id', userId)
    .is('data_pagamento', null)
    .lt('data_vencimento', hoje)
    .order('data_vencimento', { ascending: true })

  if (error) throw error
  return data
}

export async function getContas(
  userId: string,
  tipo?: 'pagar' | 'receber'
): Promise<ContaPagarReceber[]> {
  let query = supabase
    .from('contas_pagar_receber')
    .select('*')
    .eq('user_id', userId)
    .order('data_vencimento', { ascending: true })

  if (tipo) query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) throw error
  return data
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createConta(conta: ContaInsert): Promise<ContaPagarReceber> {
  const start = performance.now()
  const { data, error } = await supabase
    .from('contas_pagar_receber')
    .insert(conta)
    .select()
    .single()

  await logCrudOperation({
    operation: 'CREATE',
    tableName: 'contas_pagar_receber',
    recordId: data?.id,
    newData: conta as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function marcarComoPaga(
  id: string,
  dataPagamento: string = new Date().toISOString().split('T')[0]
): Promise<ContaPagarReceber> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('contas_pagar_receber').select('*').eq('id', id).single()
  const { data, error } = await supabase
    .from('contas_pagar_receber')
    .update({ data_pagamento: dataPagamento, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  await logCrudOperation({
    operation: 'UPDATE',
    tableName: 'contas_pagar_receber',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    newData: { data_pagamento: dataPagamento, updated_at: new Date().toISOString() },
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
  return data
}

export async function deleteConta(id: string): Promise<void> {
  const start = performance.now()
  const { data: oldRow } = await supabase.from('contas_pagar_receber').select('*').eq('id', id).single()
  const { error } = await supabase.from('contas_pagar_receber').delete().eq('id', id)

  await logCrudOperation({
    operation: 'DELETE',
    tableName: 'contas_pagar_receber',
    recordId: id,
    oldData: oldRow as Record<string, unknown>,
    success: !error,
    errorMessage: error?.message,
    errorCode: error?.code,
    durationMs: Math.round(performance.now() - start),
  })
  if (error) throw error
}
