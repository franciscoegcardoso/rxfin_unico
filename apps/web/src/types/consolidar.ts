// Retorno da RPC get_consolidar_estabelecimentos
export interface ConsolidarEstabelecimento {
  estabelecimento: string
  total_ocorrencias: number
  ultima_compra: string            // date ISO 'YYYY-MM-DD'
  todas_as_datas: string[]         // array of dates ISO
  categoria_id_atual: string | null
  categoria_nome_atual: string | null
  alguma_confirmada: boolean
  total_pendentes: number
  total_gasto: number
  fonte: 'bank' | 'card'
  ai_sugestao_categoria: string | null
  ai_sugestao_id: string | null
}

// Estado local de edição dentro da aba Consolidar
export interface ConsolidarRowState {
  estabelecimento: string
  categoria_id: string | null
  categoria_nome: string | null
  dirty: boolean            // usuário alterou algo
  confirmada: boolean       // já confirmada (sem pendentes)
}

// Retorno de bulk_assign_category_by_store
export interface BulkAssignResult {
  updated_transactions: number
  store_name: string
  category_id: string
  category_name: string
}
