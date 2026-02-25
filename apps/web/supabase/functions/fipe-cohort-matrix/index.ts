// supabase/functions/fipe-cohort-matrix/index.ts
// Fetches all available model years for a FIPE code with DB cache
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRASIL_API_BASE = "https://brasilapi.com.br/api/fipe";

type VehicleType = 'carros' | 'motos' | 'caminhoes';

type AvailableYear = {
  codigo: string;
  nome: string;
};

type BrasilApiReference = {
  codigo: number;
  mes: string;
};

type ParsedReference = {
  codigo: number;
  mes: string;
  date: Date;
  month: number;
  year: number;
};

type CohortCell = {
  modelYear: number;
  calendarYear: number;
  price: number;
  month: number;
};

type CachedPrice = {
  fipe_code: string;
  model_year: number;
  reference_code: number;
  price: number;
  reference_month: number;
  reference_year: number;
  reference_label: string;
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Helpers ---

function normalizeMonthString(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

const monthMap: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function parseMonthString(monthStr: string): { date: Date; month: number; year: number } | null {
  const normalized = normalizeMonthString(monthStr);
  const match = normalized.match(/^(\w+)\s*(?:de\s*)?[\/]?\s*(\d{4})$/);
  if (!match) return null;

  const [, monthName, yearStr] = match;
  const monthIdx = monthMap[monthName];
  if (monthIdx === undefined) return null;

  const year = parseInt(yearStr, 10);
  return { date: new Date(year, monthIdx, 1), month: monthIdx, year };
}

function parseBRLPrice(priceStr: string): number {
  return Number(
    priceStr.replace("R$", "").trim().replace(/\./g, "").replace(",", ".")
  );
}

function parseYearCode(codigo: string): number {
  const parts = codigo.split("-");
  return parseInt(parts[0], 10);
}

// --- Database Cache Functions ---

async function getCachedPricesForFipeCode(fipeCode: string): Promise<CachedPrice[]> {
  try {
    const { data, error } = await supabase
      .from("fipe_price_history")
      .select("*")
      .eq("fipe_code", fipeCode);
    
    if (error) {
      console.error("[fipe-cohort-matrix] Cache read error:", error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error("[fipe-cohort-matrix] Cache read exception:", err);
    return [];
  }
}

async function savePricesToCache(prices: CachedPrice[]): Promise<void> {
  if (prices.length === 0) return;
  
  try {
    const { error } = await supabase
      .from("fipe_price_history")
      .upsert(prices, { 
        onConflict: "fipe_code,model_year,reference_code",
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error("[fipe-cohort-matrix] Cache write error:", error);
    } else {
      console.log(`[fipe-cohort-matrix] Saved ${prices.length} prices to cache`);
    }
  } catch (err) {
    console.error("[fipe-cohort-matrix] Cache write exception:", err);
  }
}

// --- API Fetchers ---

// Helper for fetch with retry on 429
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      
      if (res.status === 429) {
        // Rate limited - wait and retry with exponential backoff
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[fipe-cohort-matrix] Rate limited (429), waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const waitMs = Math.min(500 * Math.pow(2, attempt), 3000);
      console.log(`[fipe-cohort-matrix] Fetch error, waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}: ${lastError.message}`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

async function fetchAvailableYears(fipeCode: string): Promise<AvailableYear[]> {
  console.log(`[fipe-cohort-matrix] Fetching years for ${fipeCode}`);
  
  try {
    const refRes = await fetchWithRetry(`${BRASIL_API_BASE}/tabelas/v1`, { headers: { "Accept": "application/json" } });
    if (!refRes.ok) throw new Error(`Failed to fetch references: ${refRes.status}`);
    
    const refs: BrasilApiReference[] = await refRes.json();
    if (!refs.length) throw new Error("No references found");
    
    const latestRef = refs[0];
    
    const priceUrl = `${BRASIL_API_BASE}/preco/v1/${encodeURIComponent(fipeCode)}?tabela_referencia=${latestRef.codigo}`;
    console.log(`[fipe-cohort-matrix] Fetching variations: ${priceUrl}`);
    
    const priceRes = await fetchWithRetry(priceUrl, { headers: { "Accept": "application/json" } });
    if (!priceRes.ok) throw new Error(`Failed to fetch price variations: ${priceRes.status}`);
    
    const priceData = await priceRes.json();
    const items = Array.isArray(priceData) ? priceData : [priceData];
    
    const yearsSet = new Map<number, AvailableYear>();
    
    for (const item of items) {
      const anoModelo = Number(item?.anoModelo);
      if (Number.isFinite(anoModelo) && !yearsSet.has(anoModelo)) {
        yearsSet.set(anoModelo, {
          codigo: `${anoModelo}-1`,
          nome: `${anoModelo} ${item?.combustivel || ''}`.trim()
        });
      }
    }
    
    const years = Array.from(yearsSet.values()).sort((a, b) => {
      const yearA = parseYearCode(a.codigo);
      const yearB = parseYearCode(b.codigo);
      return yearA - yearB;
    });
    
    console.log(`[fipe-cohort-matrix] Found ${years.length} available years`);
    return years;
  } catch (err) {
    console.error(`[fipe-cohort-matrix] Error fetching available years:`, err);
    return [];
  }
}

async function fetchReferences(): Promise<BrasilApiReference[]> {
  const url = `${BRASIL_API_BASE}/tabelas/v1`;
  try {
    const res = await fetchWithRetry(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchPriceForModelYear(
  fipeCode: string,
  referenceCode: number,
  modelYear: number
): Promise<number | null> {
  const url = `${BRASIL_API_BASE}/preco/v1/${encodeURIComponent(fipeCode)}?tabela_referencia=${referenceCode}`;

  try {
    const res = await fetchWithRetry(url, { headers: { "Accept": "application/json" } }, 2);
    if (!res.ok) return null;

    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      const anoModeloNum = Number(item?.anoModelo);
      if (Number.isFinite(anoModeloNum) && anoModeloNum === modelYear) {
        const priceStr = item?.valor;
        if (priceStr && typeof priceStr === "string") {
          const price = parseBRLPrice(priceStr);
          if (price > 0) return price;
        }
        if (typeof item?.valor === "number" && item.valor > 0) {
          return item.valor;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Fetch December prices for each calendar year for a specific model year
async function fetchMissingPricesForModelYear(
  fipeCode: string,
  modelYear: number,
  decemberRefs: ParsedReference[],
  cachedRefCodes: Set<number>
): Promise<{ cells: CohortCell[]; newCached: CachedPrice[] }> {
  // Filter to refs from model year onwards (removed 15-year hard limit)
  // This ensures Y0 cells (e.g., 2009 model in Dec/2009) are fetched correctly
  const missingRefs = decemberRefs.filter(r => 
    r.year >= modelYear &&
    !cachedRefCodes.has(r.codigo)
  );
  
  if (missingRefs.length === 0) {
    return { cells: [], newCached: [] };
  }
  
  // Fetch prices in parallel
  const pricePromises = missingRefs.map(ref => 
    fetchPriceForModelYear(fipeCode, ref.codigo, modelYear)
  );
  
  const prices = await Promise.all(pricePromises);
  
  const cells: CohortCell[] = [];
  const newCached: CachedPrice[] = [];
  
  for (let i = 0; i < missingRefs.length; i++) {
    const ref = missingRefs[i];
    const price = prices[i];
    
    if (price && price > 0) {
      cells.push({
        modelYear,
        calendarYear: ref.year,
        price,
        month: ref.month
      });
      
      newCached.push({
        fipe_code: fipeCode,
        model_year: modelYear,
        reference_code: ref.codigo,
        price,
        reference_month: ref.month + 1,
        reference_year: ref.year,
        reference_label: `${monthNames[ref.month]}/${ref.year}`
      });
    }
  }
  
  return { cells, newCached };
}

// Fetch the 0km price for a model year at its launch time
// For a Model Year 2017, the launch price was the 0km price in December 2016
// We need to fetch anoModelo=0 (32000 code) from the December 2016 reference
async function fetch0kmForLaunchYear(
  fipeCode: string,
  modelYear: number,
  decemberRefs: ParsedReference[],
  cachedRefCodes: Set<number>
): Promise<{ cell: CohortCell | null; newCached: CachedPrice | null }> {
  // Launch year is Y-1 (e.g., Model 2017 -> December 2016)
  const launchYear = modelYear - 1;
  
  // Find December ref for the launch year
  const launchRef = decemberRefs.find(r => r.year === launchYear && r.month === 11);
  
  if (!launchRef) {
    console.log(`[fipe-cohort-matrix] No December ref for launch year ${launchYear}`);
    return { cell: null, newCached: null };
  }
  
  // Skip if already cached for this reference
  if (cachedRefCodes.has(launchRef.codigo)) {
    return { cell: null, newCached: null };
  }
  
  // CRITICAL FIX: Fetch the 0km price (anoModelo=0) from the launch year reference
  // This gets the actual 0km price, not the used car price of that model year
  const price = await fetch0kmPriceFromReference(fipeCode, launchRef.codigo);
  
  if (!price || price <= 0) {
    // Fallback: try fetching the modelYear's price in the launch year
    // This is less accurate but better than nothing
    const fallbackPrice = await fetchPriceForModelYear(fipeCode, launchRef.codigo, modelYear);
    if (!fallbackPrice || fallbackPrice <= 0) {
      console.log(`[fipe-cohort-matrix] No 0km price for MY ${modelYear} in Dec/${launchYear}`);
      return { cell: null, newCached: null };
    }
    
    console.log(`[fipe-cohort-matrix] Using fallback price for MY ${modelYear} in Dec/${launchYear}: ${fallbackPrice}`);
    
    const cell: CohortCell = {
      modelYear,
      calendarYear: launchYear,
      price: fallbackPrice,
      month: launchRef.month
    };
    
    const newCached: CachedPrice = {
      fipe_code: fipeCode,
      model_year: modelYear,
      reference_code: launchRef.codigo,
      price: fallbackPrice,
      reference_month: launchRef.month + 1,
      reference_year: launchYear,
      reference_label: `${monthNames[launchRef.month]}/${launchYear}`
    };
    
    return { cell, newCached };
  }
  
  console.log(`[fipe-cohort-matrix] Found 0km price for MY ${modelYear} in Dec/${launchYear}: ${price}`);
  
  // Create cell with modelYear in the Y-1 column
  const cell: CohortCell = {
    modelYear,
    calendarYear: launchYear,
    price,
    month: launchRef.month
  };
  
  // Cache with the actual model_year for proper lookup
  const newCached: CachedPrice = {
    fipe_code: fipeCode,
    model_year: modelYear,
    reference_code: launchRef.codigo,
    price,
    reference_month: launchRef.month + 1,
    reference_year: launchYear,
    reference_label: `${monthNames[launchRef.month]}/${launchYear}`
  };
  
  return { cell, newCached };
}

// Fetch the 0km price from a specific reference table
async function fetch0kmPriceFromReference(
  fipeCode: string,
  referenceCode: number
): Promise<number | null> {
  const url = `${BRASIL_API_BASE}/preco/v1/${encodeURIComponent(fipeCode)}?tabela_referencia=${referenceCode}`;

  try {
    const res = await fetchWithRetry(url, { headers: { "Accept": "application/json" } }, 2);
    if (!res.ok) return null;

    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];
    
    // Look for anoModelo = 0 (which is the 0km/brand new price)
    for (const item of items) {
      const anoModeloNum = Number(item?.anoModelo);
      // 0km is represented as anoModelo = 0 or sometimes 32000
      if (anoModeloNum === 0 || anoModeloNum === 32000) {
        const priceStr = item?.valor;
        if (priceStr && typeof priceStr === "string") {
          const price = parseBRLPrice(priceStr);
          if (price > 0) return price;
        }
        if (typeof item?.valor === "number" && item.valor > 0) {
          return item.valor;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// --- Main Handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const fipeCode = String(body?.fipeCode ?? "").trim();

    if (!fipeCode) {
      return new Response(JSON.stringify({ success: false, error: "Invalid payload: fipeCode required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[fipe-cohort-matrix] Request: fipeCode=${fipeCode}`);
    const startedAt = Date.now();

    // 1. Load all cached prices for this FIPE code
    const cachedPrices = await getCachedPricesForFipeCode(fipeCode);
    
    // Build lookup: model_year -> Set of reference_codes
    const cachedByModelYear = new Map<number, Set<number>>();
    let cachedCells: CohortCell[] = [];
    
    // CRITICAL: Group by model_year + calendar_year and pick DECEMBER (month 12) first
    const cellsByKey = new Map<string, CachedPrice>();
    
    for (const cached of cachedPrices) {
      const key = `${cached.model_year}-${cached.reference_year}`;
      const existing = cellsByKey.get(key);
      
      // Priority: December (12) > existing
      if (!existing) {
        cellsByKey.set(key, cached);
      } else if (cached.reference_month === 12 && existing.reference_month !== 12) {
        // Replace with December data
        cellsByKey.set(key, cached);
      }
      
      // Track all ref codes per model year for cache-miss detection
      const my = cached.model_year;
      if (!cachedByModelYear.has(my)) {
        cachedByModelYear.set(my, new Set());
      }
      cachedByModelYear.get(my)!.add(cached.reference_code);
    }
    
    // Build cells from deduplicated data (December priority)
    for (const cached of cellsByKey.values()) {
      cachedCells.push({
        modelYear: cached.model_year,
        calendarYear: cached.reference_year,
        price: Number(cached.price),
        month: cached.reference_month - 1
      });
    }

    // --- Cache governance: invalidate legacy (wrong) launch/Y-1 cells ---
    // Historical bug: we used to cache the launch cell as the modelYear's USED price at Y-1,
    // which ends up very close to the Y0 used price. The correct launch/Y-1 cell must be the
    // 0km price (anoModelo=0) at Dec/Y-1.
    //
    // Heuristic to detect legacy bug without causing repeated refetches during market anomalies:
    // - launch cell exists at (my, my-1)
    // - y0 cell exists at (my, my)
    // - launch < y0 AND launch is within 5% of y0 (suspiciously close => likely used price)
    const modelYearsInCache = [...new Set(cachedPrices.map(p => p.model_year))]
      .filter(y => y !== 32000 && y > 2000);

    const suspiciousLaunchKeys = new Set<string>();
    for (const my of modelYearsInCache) {
      const launchKey = `${my}-${my - 1}`;
      const y0Key = `${my}-${my}`;
      const launch = cellsByKey.get(launchKey);
      const y0 = cellsByKey.get(y0Key);

      if (!launch || !y0) continue;

      const launchPrice = Number(launch.price);
      const y0Price = Number(y0.price);
      if (!Number.isFinite(launchPrice) || !Number.isFinite(y0Price) || y0Price <= 0) continue;

      const diffPct = (y0Price - launchPrice) / y0Price;
      const isSuspicious = launchPrice < y0Price && diffPct > 0 && diffPct < 0.05;

      if (isSuspicious) {
        suspiciousLaunchKeys.add(launchKey);
        // Allow refetch for the launch reference on this model year
        cachedByModelYear.get(my)?.delete(launch.reference_code);
      }
    }

    if (suspiciousLaunchKeys.size > 0) {
      cachedCells = cachedCells.filter(c => !suspiciousLaunchKeys.has(`${c.modelYear}-${c.calendarYear}`));
      console.log(`[fipe-cohort-matrix] Invalidated ${suspiciousLaunchKeys.size} suspicious launch cells for refetch`);
    }
    
    console.log(`[fipe-cohort-matrix] Cache hit: ${cachedPrices.length} prices`);

    // 2. Get available model years
    const availableYears = await fetchAvailableYears(fipeCode);
    
    if (availableYears.length === 0) {
      throw new Error("Não foi possível obter os anos disponíveis para este veículo.");
    }

    const modelYears = availableYears
      .map(y => parseYearCode(y.codigo))
      .filter(y => y !== 32000 && y > 2000)
      .sort((a, b) => a - b);
    
    const has0km = availableYears.some(y => parseYearCode(y.codigo) === 32000);

    console.log(`[fipe-cohort-matrix] Model years: ${modelYears.join(', ')}, has0km=${has0km}`);

    // 3. Fetch references
    const allReferences = await fetchReferences();
    if (allReferences.length === 0) {
      throw new Error("Não foi possível obter as tabelas de referência.");
    }

    const parsedRefs: ParsedReference[] = allReferences
      .map(r => {
        const parsed = parseMonthString(r.mes);
        if (!parsed) return null;
        return { codigo: r.codigo, mes: r.mes, ...parsed };
      })
      .filter((r): r is ParsedReference => r !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Filter to December only (plus latest if not December)
    const decemberRefs = parsedRefs.filter(r => r.month === 11);
    const latestRef = parsedRefs[parsedRefs.length - 1];
    if (latestRef && latestRef.month !== 11) {
      decemberRefs.push(latestRef);
    }

    // 4. Fetch missing data for each model year (NO 0km row - it's merged)
    const BATCH_SIZE = 3;
    const allNewCells: CohortCell[] = [];
    const allNewCached: CachedPrice[] = [];
    
    // Only fetch regular model years, not 32000 (0km is merged into Y-1 column)
    for (let i = 0; i < modelYears.length; i += BATCH_SIZE) {
      const batch = modelYears.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (my) => {
          const cachedRefCodes = cachedByModelYear.get(my) || new Set();
          const result = await fetchMissingPricesForModelYear(fipeCode, my, decemberRefs, cachedRefCodes);
          
          // Also fetch the launch price for Y-1 (this is the "0km" price when the model first appeared)
          const launchResult = await fetch0kmForLaunchYear(fipeCode, my, decemberRefs, cachedRefCodes);
          const launchCell = launchResult.cell;
          const launchCached = launchResult.newCached;
          
          return { ...result, launchCell, launchCached };
        })
      );
      
      for (const result of batchResults) {
        allNewCells.push(...result.cells);
        allNewCached.push(...result.newCached);
        if (result.launchCell) allNewCells.push(result.launchCell);
        if (result.launchCached) allNewCached.push(result.launchCached);
      }
    }

    // Save new prices to cache (don't await)
    if (allNewCached.length > 0) {
      savePricesToCache(allNewCached);
    }

    // 5. Combine cached + new cells (filter out old 32000 row data from cache)
    const allCells = [...cachedCells, ...allNewCells].filter(c => c.modelYear !== 32000);

    // 6. Build response structure (no 32000 row - 0km is now merged into Y-1 column)
    const modelYearsWithData = [...new Set(allCells.map(c => c.modelYear))]
      .filter(y => y !== 32000) // Ensure no 0km row
      .sort((a, b) => a - b);
    
    const calendarYears = [...new Set(allCells.map(c => c.calendarYear))].sort((a, b) => a - b);

    const elapsedMs = Date.now() - startedAt;
    console.log(`[fipe-cohort-matrix] Done: ${allCells.length} cells, cacheHits=${cachedPrices.length}, apiFetches=${allNewCached.length}, elapsed=${elapsedMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        modelYears: modelYearsWithData,
        calendarYears,
        cells: allCells,
        has0km,
        stats: {
          totalCells: allCells.length,
          cacheHits: cachedPrices.length,
          apiFetches: allNewCached.length,
          modelYearsCount: modelYearsWithData.length,
          calendarYearsCount: calendarYears.length,
          elapsedMs
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400"
        } 
      }
    );
  } catch (err) {
    console.error("[fipe-cohort-matrix] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});