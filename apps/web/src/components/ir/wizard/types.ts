export interface IrBemItem {
  index: number
  codigo: string
  descricao: string
  discriminacao: string
  situacaoAnterior: number
  situacaoAtual: number
}

export interface IrSuggestion {
  ir_item_index: number
  ir_item_code: string
  ir_descricao: string
  ir_situacao_atual: number
  suggested_asset_id: string | null
  suggested_ua_id: string | null
  suggested_name: string | null
  suggested_type: string | null
  match_reason: string | null
  confidence: 'high' | 'medium' | 'low' | null
  already_linked: boolean
}

export type ReconcileAction = 'linked' | 'created' | 'ignored' | 'pending'

export interface WizardItemState {
  index: number
  action: ReconcileAction
  assetId?: string
  userAssetId?: string
  realValue?: number
  newAssetName?: string
}

