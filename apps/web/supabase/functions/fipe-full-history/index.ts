// supabase/functions/fipe-full-history/index.ts
// Fetches FIPE price history using DB cache + BrasilAPI fallback
// v2: Optimized with parallel batch fetching for 50%+ faster performance
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type HistoryPoint = {
  date: string;
  monthLabel: string;
  price: number;
  reference: string;
};

type BrasilApiReference = {
  codigo: number;
  mes: string;
};

type ParsedReference = {
  codigo: number;
  mes: string;
  date: Date;
  month: number; // 0-11
  year: number;
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

const BRASIL_API_BASE = "https://brasilapi.com.br/api/fipe";

// Batch configuration - OPTIMIZED after stress testing
// Key findings: Brasil API is very slow (~10-50s for full history) and rate-limited
const BATCH_SIZE = 2; // Reduced from 3 - fewer parallel = less rate limiting
const BATCH_DELAY_MS = 600; // Increased from 400ms - more spacing between batches
const MAX_RETRIES = 3; // Increased from 2 - more retries on transient failures
const FETCH_TIMEOUT_MS = 12000; // 12s timeout per individual fetch to fail fast

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

function formatMonthLabel(date: Date): string {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const year = date.getFullYear().toString().slice(-2);
  return `${months[date.getMonth()]}/${year}`;
}

function parseBRLPrice(priceStr: string): number {
  return Number(
    priceStr.replace("R$", "").trim().replace(/\./g, "").replace(",", ".")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Database Cache Functions ---

async function getCachedPrices(fipeCode: string, modelYear: number): Promise<CachedPrice[]> {
  try {
    const { data, error } = await supabase
      .from("fipe_price_history")
      .select("*")
      .eq("fipe_code", fipeCode)
      .eq("model_year", modelYear);
    
    if (error) {
      console.error("[fipe-full-history] Cache read error:", error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error("[fipe-full-history] Cache read exception:", err);
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
      console.error("[fipe-full-history] Cache write error:", error);
    } else {
      console.log(`[fipe-full-history] Saved ${prices.length} prices to cache`);
    }
  } catch (err) {
    console.error("[fipe-full-history] Cache write exception:", err);
  }
}

// --- API Fetchers ---

// Helper for fetch with retry on 429 (rate limit) and 5xx errors
// OPTIMIZED: Added per-request timeout to prevent slow requests from blocking batches
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      
      const res = await fetch(url, { 
        ...options,
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      // Rate limited (429) or server error (5xx) - retry with backoff
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        const waitMs = Math.min(500 * Math.pow(2, attempt), 4000);
        console.log(`[fipe-full-history] Rate limited/error (${res.status}), waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(waitMs);
        continue;
      }
      
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // If timeout/abort, don't log full error
      const isTimeout = lastError.name === 'AbortError';
      if (isTimeout) {
        console.log(`[fipe-full-history] Request timeout (${FETCH_TIMEOUT_MS}ms), retry ${attempt + 1}/${maxRetries}`);
      } else {
        const waitMs = Math.min(300 * Math.pow(2, attempt), 2000);
        console.log(`[fipe-full-history] Fetch error, waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}: ${lastError.message}`);
        await sleep(waitMs);
      }
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

async function fetchReferences(): Promise<BrasilApiReference[]> {
  const url = `${BRASIL_API_BASE}/tabelas/v1`;
  console.log(`[fipe-full-history] Fetching references: ${url}`);

  try {
    const res = await fetchWithRetry(url, { headers: { "Accept": "application/json" } });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[fipe-full-history] References failed: ${res.status} - ${text.slice(0, 300)}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[fipe-full-history] References error:`, err);
    return [];
  }
}

async function fetchPrice(
  fipeCode: string, 
  referenceCode: number, 
  modelYear: number, 
  logFirst = false
): Promise<number | null> {
  const url = `${BRASIL_API_BASE}/preco/v1/${encodeURIComponent(fipeCode)}?tabela_referencia=${referenceCode}`;

  try {
    if (logFirst) console.log(`[fipe-full-history] Fetching price: ${url} (filtering for modelYear=${modelYear})`);

    const res = await fetchWithRetry(url, { headers: { "Accept": "application/json" } }, 2);
    const text = await res.text();

    if (logFirst) console.log(`[fipe-full-history] Response: ${res.status} - ${text.slice(0, 500)}`);

    if (!res.ok) return null;

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }

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
  } catch (err) {
    if (logFirst) console.error(`[fipe-full-history] Fetch error:`, err);
    return null;
  }
}

// --- Parallel Batch Fetcher ---
// Fetches prices in parallel batches with rate limiting

interface BatchFetchResult {
  ref: ParsedReference;
  price: number | null;
  yearFetched: number;
}

async function fetchPricesInBatches(
  fipeCode: string,
  refs: ParsedReference[],
  modelYear: number,
  launchRefCodigo: number | undefined,
  isUsedVehicleRequest: boolean
): Promise<BatchFetchResult[]> {
  const NEW_CAR_ANO_MODELO = 32000;
  const results: BatchFetchResult[] = [];
  
  // Process in batches
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = refs.slice(i, i + BATCH_SIZE);
    const isFirstBatch = i === 0;
    
    // Create promises for parallel execution
    const batchPromises = batch.map((ref, idx) => {
      const isLaunchRef = ref.codigo === launchRefCodigo;
      const yearToFetch = (isUsedVehicleRequest && isLaunchRef) ? NEW_CAR_ANO_MODELO : modelYear;
      const shouldLog = isFirstBatch && idx === 0;
      
      return fetchPrice(fipeCode, ref.codigo, yearToFetch, shouldLog)
        .then(price => ({ ref, price, yearFetched: yearToFetch }));
    });
    
    // Wait for all promises in batch (use allSettled to continue even if some fail)
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
      // Rejected promises are silently ignored (already logged in fetchPrice)
    }
    
    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < refs.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
  
  return results;
}

// --- Full Month Selection (No Sampling) ---
// v2: Fetches ALL available months for complete historical view

function selectAllReferences(
  allRefs: ParsedReference[],
  _modelYear: number
): ParsedReference[] {
  if (allRefs.length === 0) return [];
  
  // Sort chronologically and dedupe by year-month
  const sorted = [...allRefs].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const seenKeys = new Set<string>();
  const selected: ParsedReference[] = [];
  
  for (const ref of sorted) {
    const key = `${ref.year}-${ref.month}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      selected.push(ref);
    }
  }
  
  console.log(`[fipe-full-history] Full Month Selection: ${selected.length} references from ${allRefs.length} available`);
  
  return selected;
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
    const modelYear = Number(body?.modelYear);

    if (!fipeCode || !Number.isFinite(modelYear)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid payload: fipeCode and modelYear required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[fipe-full-history] Request: fipeCode=${fipeCode} modelYear=${modelYear}`);
    const startedAt = Date.now();

    // 1. Check cache first
    const cachedPrices = await getCachedPrices(fipeCode, modelYear);
    const cachedRefCodes = new Set(cachedPrices.map(p => p.reference_code));
    
    console.log(`[fipe-full-history] Cache hit: ${cachedPrices.length} prices`);

    // 2. Fetch all reference tables
    const allReferences = await fetchReferences();

    if (allReferences.length === 0) {
      throw new Error("Não foi possível obter as tabelas de referência da BrasilAPI.");
    }

    // 3. Parse and filter references
    const launchDate = new Date(modelYear - 1, 11, 1); // December of previous year
    const now = new Date();

    const parsedRefs: ParsedReference[] = allReferences
      .map((r) => {
        const parsed = parseMonthString(r.mes);
        if (!parsed) return null;
        return {
          codigo: r.codigo,
          mes: r.mes,
          date: parsed.date,
          month: parsed.month,
          year: parsed.year,
        };
      })
      .filter((r): r is ParsedReference => r !== null && r.date >= launchDate && r.date <= now);

    // 4. Select ALL references (full monthly history)
    const selectedRefs = selectAllReferences(parsedRefs, modelYear);

    // 5. Identify which refs are missing from cache
    const missingRefs = selectedRefs.filter(ref => !cachedRefCodes.has(ref.codigo));
    
    console.log(`[fipe-full-history] Missing refs to fetch: ${missingRefs.length}/${selectedRefs.length}`);

    // 6. Fetch only missing prices from API using PARALLEL BATCHES
    const NEW_CAR_ANO_MODELO = 32000;
    const isUsedVehicleRequest = modelYear !== NEW_CAR_ANO_MODELO;
    
    // Find the launch reference (December of year before model year)
    const launchRef = selectedRefs.find(ref => 
      ref.year === modelYear - 1 && ref.month === 11 // December
    ) || selectedRefs[0];
    
    const newPricesToCache: CachedPrice[] = [];

    if (missingRefs.length > 0) {
      // Use parallel batch fetching for significant speedup
      const batchResults = await fetchPricesInBatches(
        fipeCode,
        missingRefs,
        modelYear,
        launchRef?.codigo,
        isUsedVehicleRequest
      );
      
      for (const { ref, price, yearFetched } of batchResults) {
        if (price && price > 0) {
          newPricesToCache.push({
            fipe_code: fipeCode,
            model_year: yearFetched,
            reference_code: ref.codigo,
            price,
            reference_month: ref.month + 1,
            reference_year: ref.year,
            reference_label: `${monthNames[ref.month]}/${ref.year}`
          });
        }
      }
      
      // Save new prices to cache (async, don't wait)
      if (newPricesToCache.length > 0) {
        savePricesToCache(newPricesToCache);
      }
    }

    // 7. Build final result from cache + new data
    const allPricesMap = new Map<number, { price: number; month: number; year: number }>();
    
    // Add cached prices
    for (const cached of cachedPrices) {
      allPricesMap.set(cached.reference_code, {
        price: Number(cached.price),
        month: cached.reference_month - 1,
        year: cached.reference_year
      });
    }
    
    // Add new prices
    for (const newPrice of newPricesToCache) {
      allPricesMap.set(newPrice.reference_code, {
        price: newPrice.price,
        month: newPrice.reference_month - 1,
        year: newPrice.reference_year
      });
    }

    // Build points from selected refs
    const points: HistoryPoint[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const ref of selectedRefs) {
      const priceData = allPricesMap.get(ref.codigo);
      
      if (priceData && priceData.price > 0) {
        points.push({
          date: ref.date.toISOString(),
          monthLabel: formatMonthLabel(ref.date),
          price: priceData.price,
          reference: String(ref.codigo),
        });
        successCount++;
      } else {
        failCount++;
      }
    }

    points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const elapsedMs = Date.now() - startedAt;
    const restricted = failCount > successCount && points.length < 3;

    console.log(`[fipe-full-history] Done: ${points.length} points, cacheHits=${cachedPrices.length}, apiFetches=${missingRefs.length}, elapsed=${elapsedMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        points,
        restricted,
        stats: {
          totalReferences: allReferences.length,
          sampledReferences: selectedRefs.length,
          cacheHits: cachedPrices.length,
          apiFetches: missingRefs.length,
          newCached: newPricesToCache.length,
          successCount,
          failCount,
          elapsedMs,
          vehicleAge: new Date().getFullYear() - modelYear,
          batchSize: BATCH_SIZE,
          batchDelayMs: BATCH_DELAY_MS,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[fipe-full-history] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
