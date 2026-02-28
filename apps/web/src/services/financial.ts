import { createClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

const supabase = createClient()

// ============================================================
// Dashboard Service
// ============================================================

export async function getDashboardSummary(userId: string, month: string) {
  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_user_id: userId,
    p_month: month,
  })
  if (error) throw error
  return data as {
    month: string
    receitas: number
    despesas: number
    saldo: number
    variacao: {
      receitas_pct: number | null
      despesas_pct: number | null
      saldo_diff: number
    }
    categorias_despesa: Array<{
      categoria: string
      total: number
      count: number
    }>
    contadores: {
      pendentes_vencidos: number
      pagos: number
    }
  }
}

export async function getFinancialReport(
  userId: string,
  startMonth: string,
  endMonth: string
) {
  const { data, error } = await supabase.rpc('get_financial_report', {
    p_user_id: userId,
    p_start_month: startMonth,
    p_end_month: endMonth,
  })
  if (error) throw error
  return data as {
    periodo: { inicio: string; fim: string }
    totais: {
      receitas: number
      despesas: number
      saldo: number
      total_lancamentos: number
      media_mensal_despesas: number
    }
    mensal: Array<{
      mes: string
      receitas: number
      despesas: number
      saldo: number
      total_lancamentos: number
      pagos: number
    }>
    categorias_despesa: Array<{
      categoria: string
      total: number
      count: number
      percentual: number
    }>
    gerado_em: string
  }
}

// ============================================================
// Lançamentos Service
// ============================================================

type Lancamento = Database['public']['Tables']['lancamentos_realizados']['Row']

export async function getLancamentos(userId: string, month: string) {
  const { data, error } = await supabase
    .from('lancamentos_realizados')
    .select('*')
    .eq('user_id', userId)
    .eq('mes_referencia', month)
    .order('data_vencimento', { ascending: true })

  if (error) throw error
  return data as Lancamento[]
}

export async function createLancamento(
  lancamento: Database['public']['Tables']['lancamentos_realizados']['Insert']
) {
  const { data, error } = await supabase
    .from('lancamentos_realizados')
    .insert(lancamento)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLancamento(
  id: string,
  updates: Database['public']['Tables']['lancamentos_realizados']['Update']
) {
  const { data, error } = await supabase
    .from('lancamentos_realizados')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLancamento(id: string) {
  const { error } = await supabase
    .from('lancamentos_realizados')
    .delete()
    .eq('id', id)

  if (error) throw error
}
