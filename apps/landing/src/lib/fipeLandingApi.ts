/**
 * API FIPE para a landing: chama fipe-proxy e fipe-full-history (Edge Functions do Supabase).
 * Usa a mesma base URL do projeto.
 */
const SUPABASE_URL = 'https://kneaniaifzgqibpajyji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZWFuaWFpZnpncWlicGFqeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTc2MzEsImV4cCI6MjA4Mzg5MzYzMX0.WSGcnU8DvKJHxxQleTQP329bTxVyjklIXSQRdg9hT8E';

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
  const data = await fetchFipeProxy<FipeBrand[]>('/carros/marcas');
  return Array.isArray(data) ? data : [];
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
  const data = await fetchFipeProxy<FipePrice>(
    `/carros/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`
  );
  return data ?? null;
}

export async function fetchFipeHistory(
  fipeCode: string,
  modelYear: number
): Promise<HistoryPoint[]> {
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
    return json.points;
  } catch {
    return [];
  }
}
