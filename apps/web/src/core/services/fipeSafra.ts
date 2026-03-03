import { supabase } from '@/integrations/supabase/client';

export interface FipeSafraAnual {
  ano: number;
  mes_abertura: number;
  preco_abertura: number;
  mes_fechamento: number;
  preco_fechamento: number;
  variacao_abs: number;
  variacao_pct: number;
  meses_com_dado: number;
  ano_completo: boolean;
  precos_mensais: (number | null)[];
}

/**
 * Busca análise de safra (depreciação por ano calendário) via RPC get_fipe_safra_analysis.
 * Exige p_fipe_code (text) e p_model_year (integer).
 * CORREÇÃO: usar parseInt para suportar tanto "2023" quanto year_id "2023-5" (Number("2023-5") => NaN).
 */
export async function fetchSafraAnalysis(
  fipeCode: string,
  modelYear: string | number
): Promise<FipeSafraAnual[]> {
  const modelYearInt = parseInt(String(modelYear).split('-')[0], 10);

  // TODO: remover após validar no browser (Toyota / Corolla 2023 → modelYearInt: 2023, 5 linhas)
  console.log('[fipeSafra] chamando com:', { fipeCode, modelYear, modelYearInt });

  if (!fipeCode || !fipeCode.trim() || isNaN(modelYearInt) || modelYearInt < 1900 || modelYearInt > 2100) {
    console.warn('[fipeSafra] Parâmetros inválidos:', { fipeCode, modelYear, modelYearInt });
    return [];
  }

  const { data, error } = await supabase.rpc('get_fipe_safra_analysis', {
    p_fipe_code: fipeCode.trim(),
    p_model_year: modelYearInt,
  });

  if (error) {
    console.error('[fipeSafra] Erro na RPC:', error);
    return [];
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.warn('[fipeSafra] RPC retornou vazio para:', { fipeCode, modelYearInt });
    return [];
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row: Record<string, unknown>): FipeSafraAnual => ({
    ano: Number(row.ano),
    mes_abertura: Number(row.mes_abertura),
    preco_abertura: Number(row.preco_abertura),
    mes_fechamento: Number(row.mes_fechamento),
    preco_fechamento: Number(row.preco_fechamento),
    variacao_abs: Number(row.variacao_abs),
    variacao_pct: Number(row.variacao_pct),
    meses_com_dado: Number(row.meses_com_dado),
    ano_completo: Boolean(row.ano_completo),
    precos_mensais: Array.isArray(row.precos_mensais)
      ? (row.precos_mensais as (number | string | null)[]).map((v) => (v === null ? null : Number(v)))
      : Array(12).fill(null),
  }));
}
