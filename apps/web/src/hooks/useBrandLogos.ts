import { useState, useEffect, useMemo } from 'react';

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

  const basePath = import.meta.env.BASE_URL || '/';
  const paths = [`${basePath}marcas.json`, '/marcas.json', './marcas.json'];

  loadingPromise = (async () => {
    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const data: BrandLogosData = await res.json();
          if (data.marcas && data.marcas.length > 0) {
            cachedBrands = data.marcas;
            return cachedBrands;
          }
        }
      } catch {
        // continue
      }
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
    loadBrands().then(data => {
      setBrands(data);
      setLoading(false);
    });
  }, []);

  // Lookup por fipe_id — ÚNICA fonte de verdade, sem ambiguidade
  const getBrandByFipeId = useMemo(() => {
    const map = new Map(brands.map(b => [String(b.fipe_id), b]));
    return (fipeId: string | number): BrandData | undefined =>
      map.get(String(fipeId));
  }, [brands]);

  return { brands, loading, getBrandByFipeId };
}
