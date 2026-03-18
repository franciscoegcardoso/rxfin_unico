export interface OcorrenciaDetalhe {
  date: string           // 'YYYY-MM-DD'
  amount: number
  banco: string
  account_name: string | null
  fonte: 'bank' | 'card'
  transaction_type: 'despesa' | 'receita'
}

export interface BancoDetalhe {
  connector_name: string
  connector_image_url: string | null
  account_name: string | null
}

export interface ConsolidarEstabelecimento {
  estabelecimento: string
  transaction_type: 'despesa' | 'receita'
  total_ocorrencias: number
  ultima_compra: string
  ocorrencias_detalhe: OcorrenciaDetalhe[]
  categoria_id_atual: string | null
  categoria_nome_atual: string | null
  grupo_categoria_id: string | null
  grupo_categoria_nome: string | null
  alguma_confirmada: boolean
  total_pendentes: number
  valor_total: number
  valor_medio: number
  fonte: 'bank' | 'card' | 'mixed'
  bancos: string[]
  bancos_detalhe: BancoDetalhe[]
  ai_sugestao_categoria: string | null
  ai_sugestao_id: string | null
}

export interface ConsolidarRowState {
  estabelecimento: string
  grupo_id: string | null        // nível 1
  grupo_nome: string | null
  categoria_id: string | null    // nível 2
  categoria_nome: string | null
  dirty: boolean
  confirmada: boolean
}

// Retorno de bulk_assign_category_by_store
export interface BulkAssignResult {
  updated_transactions: number
  store_name: string
  category_id: string
  category_name: string
}

export interface ConsolidarFilters {
  search: string
  bancos: string[]
  fonte: ('bank' | 'card' | 'mixed')[]
  grupoCategoria: string | null
  semCategoria: boolean
  naoConfirmados: boolean
  dateFrom: string | null
  dateTo: string | null
}

/** Uma linha por transação (conta ou cartão) — RPC get_lancamentos_com_banco */
export interface Lancamento {
  transaction_id: string
  tx_date: string
  estabelecimento: string
  amount: number
  transaction_type: 'despesa' | 'receita'
  connector_name: string
  connector_image_url: string | null
  account_name: string | null
  grupo_categoria_id: string | null
  grupo_categoria_nome: string | null
  categoria_id: string | null
  categoria_nome: string | null
  is_category_confirmed: boolean
  ai_sugestao_categoria: string | null
  ai_sugestao_id: string | null
  is_pending: boolean
  is_income: boolean
  /** Apenas cartão — pluggy account id */
  card_id: string | null
}

export interface LancamentoRowState {
  transaction_id: string
  grupo_id: string | null
  grupo_nome: string | null
  categoria_id: string | null
  categoria_nome: string | null
  dirty: boolean
  confirmada: boolean
  is_income: boolean
}

export interface LancamentoFilters {
  search: string
  bancos: string[]
  semCategoria: boolean
  naoConfirmados: boolean
  dateFrom: string | null
  dateTo: string | null
}
