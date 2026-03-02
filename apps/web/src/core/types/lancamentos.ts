/**
 * Tipos de domínio para lançamentos realizados.
 * Compartilháveis entre web e mobile.
 */

export interface LancamentoRealizado {
  id: string;
  user_id: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  category_id?: string | null;
  nome: string;
  friendly_name: string | null;
  valor_previsto: number;
  valor_realizado: number | null;
  mes_referencia: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  data_registro: string;
  observacoes: string | null;
  forma_pagamento: string | null;
  source_type: string | null;
  source_id: string | null;
  is_category_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface LancamentoInput {
  tipo: 'receita' | 'despesa';
  categoria: string;
  category_id?: string | null;
  nome: string;
  valor_previsto: number;
  valor_realizado: number | null;
  mes_referencia: string;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  observacoes?: string | null;
  forma_pagamento?: string | null;
}
