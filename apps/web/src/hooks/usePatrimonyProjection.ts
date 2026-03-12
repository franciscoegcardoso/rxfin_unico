import { useMemo } from 'react';
import type { Asset, AssetType } from '@/types/financial';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MonthlyAssetValue {
  assetId: string;
  month: string;       // 'YYYY-MM'
  value: number;
  isManualOverride: boolean;
  isProjection: boolean;
}

export interface MonthlyPatrimonyTotals {
  month: string;
  totalVehicles: number;
  totalProperties: number;
  totalInvestments: number;
  totalCompanies: number;
  totalOthers: number;
  grandTotal: number;
}

export interface PatrimonyProjectionResult {
  /** Valor de um ativo em um mês específico */
  getAssetMonthlyValue: (assetId: string, month: string) => number;
  /** Totais por categoria para um mês */
  getMonthlyTotals: (month: string) => MonthlyPatrimonyTotals;
  /** Variação do patrimônio entre dois meses consecutivos */
  getMonthlyDelta: (month: string, prevMonth: string) => number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const VEHICLE_CATEGORIES: AssetType[] = ['vehicle'];
const PROPERTY_CATEGORIES: AssetType[] = ['property'];
const INVESTMENT_CATEGORIES: AssetType[] = ['investment'];
const COMPANY_CATEGORIES: AssetType[] = ['company'];

// ─── Cálculo de valor mensal por ativo ────────────────────────────────────────

/**
 * Calcula o valor projetado de um ativo para um mês específico.
 * Depreciação linear para veículos, valorização proporcional para demais.
 *
 * NOTA: Esta é a implementação de fallback (Fase 1).
 * A Fase 3 substituirá os veículos pelo DepreciationEngine v7.4.
 */
export function calculateAssetValueForMonth(
  asset: Asset,
  targetMonth: string,   // 'YYYY-MM'
  projectionRate: number // % ao ano (ex: 7.5)
): number {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const currentValue = asset.value;

  // Se não tem data de compra, retorna valor atual para todos os meses
  if (!asset.purchaseDate) {
    if (targetMonth === currentMonth) return currentValue;
    return calculateProjectedValue(asset, targetMonth, currentMonth, currentValue, projectionRate);
  }

  const purchaseDate = new Date(asset.purchaseDate);
  const purchaseMonthStr = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;
  const purchaseValue = asset.purchaseValue ?? currentValue;

  // Antes da compra: valor zero
  if (targetMonth < purchaseMonthStr) return 0;

  const monthsDiff = (from: Date, to: Date): number =>
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

  const targetDate = new Date(targetMonth + '-01');
  const monthsFromPurchaseToNow = monthsDiff(purchaseDate, currentDate);
  const monthsFromPurchaseToTarget = monthsDiff(purchaseDate, targetDate);

  if (asset.type === 'vehicle') {
    // Depreciação linear baseada em dados reais de compra → atual
    if (monthsFromPurchaseToNow <= 0) return currentValue;
    const monthlyDepreciation = (purchaseValue - currentValue) / monthsFromPurchaseToNow;
    const projected = purchaseValue - (monthlyDepreciation * monthsFromPurchaseToTarget);
    return Math.round(Math.max(projected, currentValue * 0.20)); // mínimo 20% do valor atual
  }

  if (asset.type === 'property') {
    // Valorização linear baseada em dados reais de compra → atual
    if (monthsFromPurchaseToNow <= 0) return purchaseValue;
    const monthlyAppreciation = (currentValue - purchaseValue) / monthsFromPurchaseToNow;
    const projected = purchaseValue + (monthlyAppreciation * monthsFromPurchaseToTarget);
    return Math.round(Math.max(projected, 0));
  }

  // Investimentos, empresas e demais: valorização composta pelo índice configurado
  return calculateProjectedValue(asset, targetMonth, currentMonth, currentValue, projectionRate);
}

function calculateProjectedValue(
  asset: Asset,
  targetMonth: string,
  currentMonth: string,
  currentValue: number,
  projectionRateAnnual: number
): number {
  const [ty, tm] = targetMonth.split('-').map(Number);
  const [cy, cm] = currentMonth.split('-').map(Number);
  const monthsFromCurrent = (ty - cy) * 12 + (tm - cm);

  if (monthsFromCurrent === 0) return currentValue;

  // Taxa mensal equivalente
  const annualRate = projectionRateAnnual / 100;
  // Multiplicador: investimentos crescem mais, obrigações diminuem
  let rateMultiplier = 1.0;
  if (asset.type === 'investment') rateMultiplier = 1.2;
  if (asset.type === 'company') rateMultiplier = 1.0;
  if (asset.type === 'obligations') rateMultiplier = -1.0; // obrigações "crescem" negativamente

  const effectiveAnnualRate = annualRate * rateMultiplier;
  const monthlyRate = Math.pow(1 + effectiveAnnualRate, 1 / 12) - 1;

  const projected = currentValue * Math.pow(1 + monthlyRate, monthsFromCurrent);
  return Math.round(Math.max(projected, 0));
}

// ─── Hook principal ───────────────────────────────────────────────────────────

interface UsePatrimonyProjectionProps {
  assets: Asset[];
  /** Valor real do ativo para um mês (de AssetMonthlyEntry). Retorna undefined se não existe. */
  getManualEntry: (month: string, assetId: string) => number | undefined;
  projectionRate: number; // % ao ano
  currentMonth: string;   // 'YYYY-MM'
}

export function usePatrimonyProjection({
  assets,
  getManualEntry,
  projectionRate,
  currentMonth,
}: UsePatrimonyProjectionProps): PatrimonyProjectionResult {

  const getAssetMonthlyValue = useMemo(() => {
    return (assetId: string, month: string): number => {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return 0;

      // Preferência: valor manual cadastrado (AssetMonthlyEntry)
      const manual = getManualEntry(month, assetId);
      if (manual !== undefined) return manual;

      // Fallback: cálculo automático
      return calculateAssetValueForMonth(asset, month, projectionRate);
    };
  }, [assets, getManualEntry, projectionRate]);

  const getMonthlyTotals = useMemo(() => {
    return (month: string): MonthlyPatrimonyTotals => {
      let totalVehicles = 0;
      let totalProperties = 0;
      let totalInvestments = 0;
      let totalCompanies = 0;
      let totalOthers = 0;

      for (const asset of assets) {
        if (asset.isSold) continue; // Ignorar ativos vendidos
        const value = getAssetMonthlyValue(asset.id, month);

        if (VEHICLE_CATEGORIES.includes(asset.type)) totalVehicles += value;
        else if (PROPERTY_CATEGORIES.includes(asset.type)) totalProperties += value;
        else if (INVESTMENT_CATEGORIES.includes(asset.type)) totalInvestments += value;
        else if (COMPANY_CATEGORIES.includes(asset.type)) totalCompanies += value;
        else if (asset.type === 'obligations') totalOthers -= value; // obrigações são negativas
        else totalOthers += value;
      }

      return {
        month,
        totalVehicles,
        totalProperties,
        totalInvestments,
        totalCompanies,
        totalOthers,
        grandTotal: totalVehicles + totalProperties + totalInvestments + totalCompanies + totalOthers,
      };
    };
  }, [assets, getAssetMonthlyValue]);

  const getMonthlyDelta = useMemo(() => {
    return (month: string, prevMonth: string): number => {
      const current = getMonthlyTotals(month).grandTotal;
      const prev = getMonthlyTotals(prevMonth).grandTotal;
      return current - prev;
    };
  }, [getMonthlyTotals]);

  return { getAssetMonthlyValue, getMonthlyTotals, getMonthlyDelta };
}
