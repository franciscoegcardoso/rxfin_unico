import { createClient } from '@/lib/supabase'

const supabase = createClient()

// ============================================================
// FIPE Search (fuzzy, pg_trgm)
// ============================================================

export interface FipeSearchResult {
  fipe_code: string
  brand_name: string
  model_name: string
  year: number
  fuel_type: number
  vehicle_type: number
  similarity_score: number
}

export async function searchFipe(
  query: string,
  vehicleType?: 1 | 2 | 3, // 1=carro, 2=moto, 3=caminhão
  limit = 20
): Promise<FipeSearchResult[]> {
  if (query.length < 2) return []

  const { data, error } = await supabase.rpc('get_fipe_search_optimized', {
    p_query: query,
    p_vehicle_type: vehicleType ?? null,
    p_limit: limit,
  })

  if (error) throw error
  return (data ?? []) as FipeSearchResult[]
}

// ============================================================
// FIPE Price History
// ============================================================

export interface FipePricePoint {
  reference_month: number
  price: number
}

export async function getFipePriceHistory(fipeCode: string) {
  const { data, error } = await supabase
    .from('fipe_price_history')
    .select('reference_month, price')
    .eq('fipe_code', fipeCode)
    .order('reference_month', { ascending: true })

  if (error) throw error
  return (data ?? []) as FipePricePoint[]
}

// ============================================================
// FIPE Full History (via Edge Function)
// ============================================================

export async function getFipeFullHistory(fipeCode: string, yearId: string) {
  const { data, error } = await supabase.functions.invoke('fipe-full-history', {
    body: { fipeCode, yearId },
  })

  if (error) throw error
  return data
}

// ============================================================
// FIPE Brands / Models (cascading selects)
// ============================================================

export async function getFipeBrands(vehicleType: 1 | 2 | 3) {
  const { data, error } = await supabase
    .from('fipe_catalog')
    .select('brand_id, brand_name')
    .eq('vehicle_type', vehicleType)
    .order('brand_name')

  if (error) throw error

  // Deduplicate
  const seen = new Set<number>()
  return (data ?? []).filter((b) => {
    if (seen.has(b.brand_id)) return false
    seen.add(b.brand_id)
    return true
  })
}

export async function getFipeModels(vehicleType: number, brandId: number) {
  const { data, error } = await supabase
    .from('fipe_catalog')
    .select('model_id, model_name')
    .eq('vehicle_type', vehicleType)
    .eq('brand_id', brandId)
    .order('model_name')

  if (error) throw error

  const seen = new Set<number>()
  return (data ?? []).filter((m) => {
    if (seen.has(m.model_id)) return false
    seen.add(m.model_id)
    return true
  })
}

export async function getFipeYears(
  vehicleType: number,
  brandId: number,
  modelId: number
) {
  const { data, error } = await supabase
    .from('fipe_catalog')
    .select('year_id, year, fuel_type, fipe_code')
    .eq('vehicle_type', vehicleType)
    .eq('brand_id', brandId)
    .eq('model_id', modelId)
    .order('year', { ascending: false })

  if (error) throw error
  return data ?? []
}

// ============================================================
// FIPE Cohort & Comparison (via Edge Functions)
// ============================================================

export async function getFipeCohortMatrix(fipeCode: string) {
  const { data, error } = await supabase.functions.invoke('fipe-cohort-matrix', {
    body: { fipeCode },
  })
  if (error) throw error
  return data
}

export async function getCarComparisonVerdict(
  car1FipeCode: string,
  car2FipeCode: string
) {
  const { data, error } = await supabase.functions.invoke(
    'car-comparison-verdict',
    { body: { car1FipeCode, car2FipeCode } }
  )
  if (error) throw error
  return data
}
