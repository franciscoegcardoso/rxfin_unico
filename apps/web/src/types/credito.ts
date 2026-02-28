export interface Consorcio {
  id: string;
  user_id: string;
  nome: string;
  valor_carta: number;
  prazo_total: number;
  parcelas_pagas: number;
  valor_parcela_atual: number;
  taxa_adm_total: number;
  fundo_reserva: number;
  seguro_mensal: number;
  reajuste_anual: number;
  contemplado: boolean;
  data_contemplacao?: string;
  administradora?: string;
  grupo?: string;
  cota?: string;
  data_inicio: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface Financiamento {
  id: string;
  user_id: string;
  nome: string;
  valor_bem: number;
  valor_entrada: number;
  valor_financiado: number;
  prazo_total: number;
  parcelas_pagas: number;
  valor_parcela_atual: number;
  taxa_juros_mensal: number;
  sistema_amortizacao: 'PRICE' | 'SAC';
  taxas_extras: number;
  seguro_mensal: number;
  saldo_devedor: number;
  instituicao_financeira?: string;
  contrato?: string;
  data_inicio: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export type ConsorcioInsert = Omit<Consorcio, 'id' | 'created_at' | 'updated_at'>;
export type ConsorcioUpdate = Partial<ConsorcioInsert>;

export type FinanciamentoInsert = Omit<Financiamento, 'id' | 'created_at' | 'updated_at'>;
export type FinanciamentoUpdate = Partial<FinanciamentoInsert>;
