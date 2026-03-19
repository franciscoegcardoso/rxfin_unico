/**
 * useBrandLogos.ts
 * Fonte de logos de marcas FIPE — lê do Supabase (fipe_brand_logos)
 * com fallback para marcas.json local.
 *
 * A chave de lookup é SEMPRE brand_id numérico (sem zero-pad).
 * normalizeId("080") === normalizeId(80) === "80"
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VehicleType } from '@/hooks/useFipe';

export interface BrandLogoData {
  brand_id: number;
  brand_name: string;
  logo_path: string | null;
  has_logo: boolean;
  verified: boolean;
  total_models: number;
}

// ─── Cache em memória por vehicle_type ───────────────────────────────────────
const logoCache = new Map<number, BrandLogoData[]>();
const loadingPromises = new Map<number, Promise<BrandLogoData[]>>();

export function normalizeId(id: string | number): string {
  return String(parseInt(String(id), 10));
}

const VT_MAP: Record<VehicleType, number> = { carros: 1, motos: 2, caminhoes: 3 };

interface LegacyBrand {
  fipe_id: string;
  nome: string;
  logo_url: string;
}

async function loadFromJson(): Promise<Map<string, LegacyBrand>> {
  try {
    const r = await fetch('/marcas.json?v=2');
    if (!r.ok) return new Map();
    const { marcas } = (await r.json()) as { marcas: LegacyBrand[] };
    return new Map(marcas.map((b) => [normalizeId(b.fipe_id), b]));
  } catch {
    return new Map();
  }
}

function normalizeRpcRows(data: unknown): BrandLogoData[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      brand_id: Number(r.brand_id ?? r.brandId ?? 0),
      brand_name: String(r.brand_name ?? r.brandName ?? ''),
      logo_path: (r.logo_path ?? r.logoPath ?? null) as string | null,
      has_logo: Boolean(r.has_logo ?? r.hasLogo ?? !!r.logo_path),
      verified: Boolean(r.verified),
      total_models: Number(r.total_models ?? r.totalModels ?? 0),
    };
  });
}

// ─── Carrega do Supabase com fallback para JSON ───────────────────────────────
async function loadLogosByType(vehicleType: number): Promise<BrandLogoData[]> {
  if (logoCache.has(vehicleType)) return logoCache.get(vehicleType)!;
  if (loadingPromises.has(vehicleType)) return loadingPromises.get(vehicleType)!;

  const promise = (async (): Promise<BrandLogoData[]> => {
    try {
      const { data, error } = await supabase.rpc(
        'get_fipe_brand_logos_by_type' as never,
        { p_vehicle_type: vehicleType } as never,
      );

      const rows = normalizeRpcRows(data);
      if (!error && rows.length > 0) {
        logoCache.set(vehicleType, rows);
        loadingPromises.delete(vehicleType);
        return rows;
      }
    } catch {
      /* fallback abaixo */
    }

    const jsonMap = await loadFromJson();
    const fallback: BrandLogoData[] = [...jsonMap.entries()].map(([id, b]) => ({
      brand_id: parseInt(id, 10),
      brand_name: b.nome,
      logo_path: b.logo_url || null,
      has_logo: !!b.logo_url,
      verified: false,
      total_models: 0,
    }));
    logoCache.set(vehicleType, fallback);
    loadingPromises.delete(vehicleType);
    return fallback;
  })();

  loadingPromises.set(vehicleType, promise);
  return promise;
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useBrandLogos(vehicleType?: VehicleType) {
  const vt = vehicleType ? VT_MAP[vehicleType] : 0;
  const [brands, setBrands] = useState<BrandLogoData[]>(() => (vt ? logoCache.get(vt) ?? [] : []));
  const [loading, setLoading] = useState(() => Boolean(vt && !logoCache.has(vt)));

  useEffect(() => {
    if (!vt) {
      setBrands([]);
      setLoading(false);
      return;
    }
    if (logoCache.has(vt)) {
      setBrands(logoCache.get(vt)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadLogosByType(vt).then((data) => {
      setBrands(data);
      setLoading(false);
    });
  }, [vt]);

  const getBrandByFipeId = useMemo(() => {
    const map = new Map(brands.map((b) => [normalizeId(b.brand_id), b]));
    return (fipeId: string | number): BrandLogoData | undefined => map.get(normalizeId(fipeId));
  }, [brands]);

  return { brands, loading, getBrandByFipeId };
}

/** Pré-carrega o cache sem consumir o resultado no render */
export function usePreloadBrandLogos(vehicleType: VehicleType) {
  const vt = VT_MAP[vehicleType];
  useEffect(() => {
    if (!logoCache.has(vt)) void loadLogosByType(vt);
  }, [vt]);
}
