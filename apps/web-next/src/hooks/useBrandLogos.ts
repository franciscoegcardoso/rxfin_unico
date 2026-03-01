import { useState, useEffect, useMemo } from 'react';
import { normalizeBrandName } from '@/lib/brand-utils';

export interface BrandData {
  id: string;
  nome: string;
  fipe_id: string;
  logo_url: string;
}

interface BrandLogosData {
  marcas: BrandData[];
}

let cachedBrands: BrandData[] | null = null;
let loadingPromise: Promise<BrandData[]> | null = null;

async function loadBrands(): Promise<BrandData[]> {
  if (cachedBrands && cachedBrands.length > 0) return cachedBrands;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const res = await fetch('/marcas.json');
      if (res.ok) {
        const data: BrandLogosData = await res.json();
        if (data.marcas?.length) {
          cachedBrands = data.marcas;
          return cachedBrands;
        }
      }
    } catch {
      // no brands available
    }
    loadingPromise = null;
    return [];
  })();
  return loadingPromise;
}

export function useBrandLogos() {
  const [brands, setBrands] = useState<BrandData[]>(cachedBrands || []);
  const [loading, setLoading] = useState(!cachedBrands);

  useEffect(() => {
    if (cachedBrands) {
      setBrands(cachedBrands);
      setLoading(false);
      return;
    }
    loadBrands().then((data) => {
      setBrands(data);
      setLoading(false);
    });
  }, []);

  const getBrandByFipeId = useMemo(() => {
    const map = new Map(brands.map((b) => [String(b.fipe_id), b]));
    return (fipeId: string | number) => map.get(String(fipeId));
  }, [brands]);

  const getBrandByName = useMemo(() => {
    const map = new Map(brands.map((b) => [normalizeBrandName(b.nome), b]));
    return (name: string) => {
      const normalized = normalizeBrandName(name);
      if (map.has(normalized)) return map.get(normalized);
      for (const [key, value] of map) {
        if (normalized.startsWith(key) || key.startsWith(normalized)) return value;
      }
      return undefined;
    };
  }, [brands]);

  return { brands, loading, getBrandByFipeId, getBrandByName };
}
