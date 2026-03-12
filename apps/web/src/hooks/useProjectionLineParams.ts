import { useUserKV } from '@/hooks/useUserKV';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ProjectionIndex = 'ipca' | 'igpm' | 'cdi' | 'ibovespa' | 'custom';

export interface LineParam {
  index: ProjectionIndex;
  spread: number;   // % a.a. adicional (pode ser negativo)
  customRate?: number; // só usado quando index === 'custom'
}

/**
 * Parâmetros de projeção para cada linha da Guia 30 Anos.
 * Persistidos em user_kv_store com key 'projection_line_params'.
 */
export interface ProjectionLineParams {
  income: LineParam;
  expense: LineParam;
  property: LineParam;
  vehicle: LineParam;
  investment: LineParam;
  company: LineParam;
  others: LineParam;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
// Conforme definido no plano estratégico da feature.

export const DEFAULT_LINE_PARAMS: ProjectionLineParams = {
  income:     { index: 'ipca',     spread: 2 },
  expense:    { index: 'ipca',     spread: 0 },
  property:   { index: 'igpm',     spread: 0 },
  vehicle:    { index: 'ipca',     spread: -5 }, // depreciação estimada
  investment: { index: 'cdi',      spread: 0 },
  company:    { index: 'ibovespa', spread: 0 },
  others:     { index: 'ipca',     spread: 0 },
};

export type LineParamKey = keyof ProjectionLineParams;

export const LINE_LABELS: Record<LineParamKey, string> = {
  income:     'Receitas',
  expense:    'Despesas',
  property:   'Imóveis',
  vehicle:    'Veículos',
  investment: 'Investimentos',
  company:    'Empresas',
  others:     'Outros',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectionLineParams() {
  const { value: params, setValue: setParams, isLoading } = useUserKV<ProjectionLineParams>(
    'projection_line_params',
    DEFAULT_LINE_PARAMS
  );

  const updateLine = (key: LineParamKey, update: Partial<LineParam>) => {
    setParams(prev => ({
      ...prev,
      [key]: { ...prev[key], ...update },
    }));
  };

  const resetToDefaults = () => setParams(DEFAULT_LINE_PARAMS);

  return { params, updateLine, resetToDefaults, isLoading };
}
