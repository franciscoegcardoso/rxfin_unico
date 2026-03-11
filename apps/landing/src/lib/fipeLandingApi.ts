/**
 * API FIPE para a landing: chama fipe-proxy e fipe-full-history (Edge Functions do Supabase).
 * Usa cache em sessionStorage para reduzir chamadas e melhorar performance.
 */
const SUPABASE_URL = 'https://kneaniaifzgqibpajyji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZWFuaWFpZnpncWlicGFqeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTc2MzEsImV4cCI6MjA4Mzg5MzYzMX0.WSGcnU8DvKJHxxQleTQP329bTxVyjklIXSQRdg9hT8E';

const CACHE_KEY_BRANDS = 'fipe-landing-brands';
const CACHE_KEY_PRICE = 'fipe-landing-price';
const CACHE_TTL_BRANDS_MS = 60 * 60 * 1000; // 1h
const CACHE_TTL_PRICE_MS = 30 * 60 * 1000;  // 30min

function getCached<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, at } = JSON.parse(raw) as { data: T; at: number };
    if (Date.now() - at > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function setCached<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, at: Date.now() }));
  } catch {
    // ignore
  }
}

export interface FipeBrand {
  codigo: string;
  nome: string;
}

export interface FipeModel {
  codigo: number;
  nome: string;
}

export interface FipeYear {
  codigo: string;
  nome: string;
}

export interface FipePrice {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
}

export interface HistoryPoint {
  date: string;
  monthLabel: string;
  price: number;
}

async function fetchFipeProxy<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/fipe-proxy?path=${encodeURIComponent(path)}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.ok === false || data?.error) return null;
    return data as T;
  } catch {
    return null;
  }
}

export async function fetchFipeBrands(): Promise<FipeBrand[]> {
  const cached = getCached<FipeBrand[]>(CACHE_KEY_BRANDS, CACHE_TTL_BRANDS_MS);
  if (cached && cached.length > 0) return cached;
  const data = await fetchFipeProxy<FipeBrand[]>('/carros/marcas');
  const result = Array.isArray(data) ? data : [];
  if (result.length > 0) setCached(CACHE_KEY_BRANDS, result);
  return result;
}

export async function fetchFipeModels(brandCode: string): Promise<FipeModel[]> {
  const data = await fetchFipeProxy<{ modelos: FipeModel[] }>(
    `/carros/marcas/${brandCode}/modelos`
  );
  return data?.modelos ?? [];
}

export async function fetchFipeYears(brandCode: string, modelCode: string): Promise<FipeYear[]> {
  const data = await fetchFipeProxy<FipeYear[]>(
    `/carros/marcas/${brandCode}/modelos/${modelCode}/anos`
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchFipePrice(
  brandCode: string,
  modelCode: string,
  yearCode: string
): Promise<FipePrice | null> {
  const cacheKey = `${CACHE_KEY_PRICE}-${brandCode}-${modelCode}-${yearCode}`;
  const cached = getCached<FipePrice>(cacheKey, CACHE_TTL_PRICE_MS);
  if (cached) return cached;
  const data = await fetchFipeProxy<FipePrice>(
    `/carros/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`
  );
  if (data) setCached(cacheKey, data);
  return data ?? null;
}

const CACHE_KEY_HISTORY = 'fipe-landing-history';

export async function fetchFipeHistory(
  fipeCode: string,
  modelYear: number
): Promise<HistoryPoint[]> {
  const cacheKey = `${CACHE_KEY_HISTORY}-${fipeCode}-${modelYear}`;
  const cached = getCached<HistoryPoint[]>(cacheKey, CACHE_TTL_PRICE_MS);
  if (cached && cached.length > 0) return cached;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/fipe-full-history`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fipeCode, modelYear }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json?.success || !Array.isArray(json.points)) return [];
    const points = json.points as HistoryPoint[];
    if (points.length > 0) setCached(cacheKey, points);
    return points;
  } catch {
    return [];
  }
}
