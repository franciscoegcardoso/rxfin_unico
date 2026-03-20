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
  // full-range intencional — sem pruning (lista recente via limit + order date)
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
// Migrado para Edge Function sync-status; esta função mantém compatibilidade para callers legados.

export async function getSyncJobAtivo(_userId: string): Promise<{ id: string; status: string; item_id: string } | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null

  const url = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://kneaniaifzgqibpajyji.supabase.co'}/functions/v1/sync-status`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  })
  const json = await res.json()
  if (!json.success || !json.data?.summary?.is_syncing) return null
  const conn = json.data.connections?.[0]
  if (!conn) return null
  return {
    id: `sync-${conn.item_id}`,
    status: 'running',
    item_id: conn.item_id,
  }
}
