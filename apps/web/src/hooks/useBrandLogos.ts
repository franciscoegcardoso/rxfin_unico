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
          if (data.marcas?.length > 0) {
            cachedBrands = data.marcas;
            return cachedBrands;
          }
        }
      } catch { /* continue */ }
    }
    loadingPromise = null;
    return [];
  })();

  return loadingPromise;
}

/** Remove zero-padding: "080" → "80", "007" → "7", "101" → "101" */
function normalizeId(id: string | number): string {
  return String(parseInt(String(id), 10));
}

export function useBrandLogos() {
  const [brands, setBrands] = useState<BrandData[]>(cachedBrands || []);
  const [loading, setLoading] = useState(!cachedBrands);

  useEffect(() => {
    if (cachedBrands) { setBrands(cachedBrands); setLoading(false); return; }
    loadBrands().then(data => { setBrands(data); setLoading(false); });
  }, []);

  /**
   * Lookup por fipe_id — aceita qualquer formato:
   *   "80", "080", 80  →  todos encontram a entrada com fipe_id "80"
   * Duas marcas diferentes nunca têm o mesmo fipe_id numérico,
   * então não há risco de colisão.
   */
  const getBrandByFipeId = useMemo(() => {
    // Indexa por fipe_id normalizado (sem zero-pad)
    const map = new Map(brands.map(b => [normalizeId(b.fipe_id), b]));
    return (fipeId: string | number): BrandData | undefined =>
      map.get(normalizeId(fipeId));
  }, [brands]);

  return { brands, loading, getBrandByFipeId };
}
