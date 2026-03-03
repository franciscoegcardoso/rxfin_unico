import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PluggyConnection = Tables<'pluggy_connections'>
export type PluggyAccount = Tables<'pluggy_accounts'>
export type PluggyTransaction = Tables<'pluggy_transactions'>
export type PluggyInvestment = Tables<'pluggy_investments'>

// ─── Conexões ─────────────────────────────────────────────────────────────────

export async function getConexoes(userId: string): Promise<PluggyConnection[]> {
  const { data, error } = await supabase
    .from('pluggy_connections')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getConexaoById(id: string): Promise<PluggyConnection> {
  const { data, error } = await supabase
    .from('pluggy_connections')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function deleteConexao(id: string): Promise<void> {
  const { error } = await supabase
    .from('pluggy_connections')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ─── Contas Bancárias ─────────────────────────────────────────────────────────

export async function getContas(userId: string): Promise<PluggyAccount[]> {
  const { data, error } = await supabase
    .from('pluggy_accounts')
    .select('*, pluggy_connections(connector_name, connector_image_url, status)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function getContasByConexao(connectionId: string): Promise<PluggyAccount[]> {
  const { data, error } = await supabase
    .from('pluggy_accounts')
    .select('*')
    .eq('connection_id', connectionId)
    .is('deleted_at', null)

  if (error) throw error
  return data
}

// ─── Transações Bancárias ─────────────────────────────────────────────────────

export async function getTransacoesBancarias(
  userId: string,
  accountId?: string,
  limit = 50
): Promise<PluggyTransaction[]> {
  let query = supabase
    .from('pluggy_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)

  if (accountId) query = query.eq('account_id', accountId)

  const { data, error } = await query
  if (error) throw error
  return data
}

// ─── Investimentos ────────────────────────────────────────────────────────────

export async function getInvestimentos(userId: string): Promise<PluggyInvestment[]> {
  const { data, error } = await supabase
    .from('pluggy_investments')
    .select('*, pluggy_connections(connector_name, connector_image_url)')
    .eq('user_id', userId)
    .order('balance', { ascending: false })

  if (error) throw error
  return data
}

export async function getTotalInvestido(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('pluggy_investments')
    .select('balance')
    .eq('user_id', userId)

  if (error) throw error
  return data.reduce((acc, inv) => acc + (inv.balance ?? 0), 0)
}

// ─── Status de Sync ───────────────────────────────────────────────────────────

export async function getSyncJobAtivo(userId: string) {
  const { data, error } = await supabase
    .from('sync_jobs_v')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}
