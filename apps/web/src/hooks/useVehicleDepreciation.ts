/**
 * Hook que busca dados históricos FIPE do Supabase para todos os veículos
 * do usuário e calcula a curva de depreciação v7.4 para cada um.
 *
 * Retorna um mapa { assetId → getValueForYear(year): number }
 * para ser passado como override em usePatrimonyProjection.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Asset } from '@/types/financial';
import {
  calculateDepreciationCurveV7,
  type VehicleSegment,
} from '@/utils/depreciation';
import type { FipePoint } from '@/utils/depreciation';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FipeHistoryRow {
  fipe_code: string;
  price: number;
  month: number;
  year: number;
  ref_date: string | null;
}

interface VehicleSegmentRow {
  fipe_code: string;
  segment: VehicleSegment;
}

/** Mapa de resultado: assetId → função que retorna valor projetado para um ano */
export type VehicleDepreciationMap = Map<string, (year: number) => number>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractModelYear(asset: Asset): number | null {
  if (!asset.fipeYearCode) return null;
  const match = String(asset.fipeYearCode).match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

function getFipeCode(asset: Asset): string | null {
  return asset.fipeModelCode ?? null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseVehicleDepreciationProps {
  assets: Asset[];
}

export function useVehicleDepreciation({ assets }: UseVehicleDepreciationProps) {
  const { user } = useAuth();

  const vehicleAssets = useMemo(() =>
    assets.filter(a =>
      a.type === 'vehicle' &&
      !a.isSold &&
      getFipeCode(a) !== null &&
      extractModelYear(a) !== null
    ),
    [assets]
  );

  const fipeCodes = useMemo(
    () => [...new Set(vehicleAssets.map(a => getFipeCode(a)!))],
    [vehicleAssets]
  );

  const historyQuery = useQuery({
    queryKey: ['fipe_price_history_v7', fipeCodes],
    queryFn: async (): Promise<FipeHistoryRow[]> => {
      if (fipeCodes.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('fipe_price_history')
        .select('fipe_code, price, month, year, ref_date')
        .in('fipe_code', fipeCodes)
        .order('year', { ascending: true });

      if (error) {
        console.warn('[useVehicleDepreciation] FIPE history query failed:', error.message);
        return [];
      }
      return data ?? [];
    },
    enabled: fipeCodes.length > 0 && !!user?.id,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const segmentQuery = useQuery({
    queryKey: ['vehicle_segments_v7', fipeCodes],
    queryFn: async (): Promise<VehicleSegmentRow[]> => {
      if (fipeCodes.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('vehicle_segments')
        .select('fipe_code, segment')
        .in('fipe_code', fipeCodes);

      if (error) {
        console.warn('[useVehicleDepreciation] Segment query failed:', error.message);
        return [];
      }
      return data ?? [];
    },
    enabled: fipeCodes.length > 0 && !!user?.id,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const depreciationMap = useMemo((): VehicleDepreciationMap => {
    const map: VehicleDepreciationMap = new Map();

    if (!historyQuery.data || historyQuery.data.length === 0) return map;

    const historyByCode = new Map<string, FipePoint[]>();
    for (const row of historyQuery.data) {
      const pts = historyByCode.get(row.fipe_code) ?? [];
      pts.push({
        price: row.price,
        month: row.month,
        year: row.year,
        ref_date: row.ref_date ?? undefined,
      });
      historyByCode.set(row.fipe_code, pts);
    }

    const segmentByCode = new Map<string, VehicleSegment>();
    for (const row of segmentQuery.data ?? []) {
      segmentByCode.set(row.fipe_code, row.segment);
    }

    for (const asset of vehicleAssets) {
      const fipeCode = getFipeCode(asset)!;
      const modelYear = extractModelYear(asset)!;
      const history = historyByCode.get(fipeCode);

      if (!history || history.length < 3) continue;

      const segment = segmentByCode.get(fipeCode) ?? 'default';

      try {
        const result = calculateDepreciationCurveV7(
          history,
          modelYear,
          new Date(),
          { segment }
        );

        const getValueForYear = (targetYear: number): number => {
          const targetAge = targetYear - modelYear;

          const point = result.projection.find(p => p.t === targetAge);
          if (point) {
            const price = point.realized_value ?? point.projected_value ?? null;
            if (price !== null && price > 0) return Math.round(price);
          }

          const sorted = [...result.projection]
            .filter(p => p.projected_value !== null && p.projected_value > 0)
            .sort((a, b) => b.t - a.t);

          if (sorted.length >= 2) {
            const last = sorted[0];
            const prev = sorted[1];
            const lastPrice = last.projected_value!;
            const prevPrice = prev.projected_value!;
            const yoyRate = prevPrice > 0 ? lastPrice / prevPrice : 0.92;
            const extraYears = targetAge - last.t;
            return Math.round(lastPrice * Math.pow(yoyRate, extraYears));
          }

          return Math.round(asset.value * Math.pow(0.92, targetYear - new Date().getFullYear()));
        };

        map.set(asset.id, getValueForYear);
      } catch (err) {
        console.warn(`[useVehicleDepreciation] Engine failed for ${asset.name}:`, err);
      }
    }

    return map;
  }, [historyQuery.data, segmentQuery.data, vehicleAssets]);

  return {
    depreciationMap,
    isLoading: historyQuery.isLoading || segmentQuery.isLoading,
    vehiclesWithEngineCount: depreciationMap.size,
    vehiclesFipeCount: vehicleAssets.length,
  };
}
