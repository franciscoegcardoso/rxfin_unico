// supabase/functions/fipe-sibling-history/index.ts
// Fetches FIPE price history for "sibling" model years (older versions of the same model)
// Used for Cohort Analysis projection when current model has insufficient data
// Implements database caching (30 days) to reduce API calls

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase client for cache operations
function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

// --- PANDEMIC ANOMALY FILTER ---
// Brazilian used car prices appreciated 2020-2022 due to market shortage
const PANDEMIC_START = new Date('2020-03-01').getTime();
const PANDEMIC_END = new Date('2022-06-01').getTime();
const FALLBACK_MONTHLY_RATE = -0.009; // ~10.8% annual depreciation (industry standard)

function isPandemicPeriod(date: Date): boolean {
  const ts = date.getTime();
  return ts >= PANDEMIC_START && ts <= PANDEMIC_END;
}

type SiblingHistoryPoint = {
  modelYear: number;
  monthsSinceLaunch: number; // Normalized timeline: 0 = launch
  price: number;
  date: string;
};

type SiblingResult = {
  modelYear: number;
  points: SiblingHistoryPoint[];
  launchPrice: number;
  currentPrice: number;
  monthlyDecayRate: number | null;
  pandemicFiltered?: boolean; // Flag if pandemic data was excluded
};

type BrasilApiReference = {
  codigo: number;
  mes: string;
};

const BRASIL_API_BASE = "https://brasilapi.com.br/api/fipe";

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

// --- API Fetchers ---

async function fetchReferences(): Promise<BrasilApiReference[]> {
  const url = `${BRASIL_API_BASE}/tabelas/v1`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchPriceForYear(
  fipeCode: string,
  referenceCode: number,
  modelYear: number
): Promise<number | null> {
  const url = `${BRASIL_API_BASE}/preco/v1/${encodeURIComponent(fipeCode)}?tabela_referencia=${referenceCode}`;

  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return null;

    const text = await res.text();
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
  } catch {
    return null;
  }
}

// Fetch simplified history for a single model year (just key points: launch, current)
async function fetchSiblingHistory(
  fipeCode: string,
  siblingYear: number,
  allRefs: BrasilApiReference[]
): Promise<SiblingResult | null> {
  // Parse references
  type ParsedRef = { codigo: number; mes: string; date: Date };
  const parsedRefs: ParsedRef[] = allRefs
    .map((r) => {
      const parsed = parseMonthString(r.mes);
      if (!parsed) return null;
      return { codigo: r.codigo, mes: r.mes, date: parsed.date };
    })
    .filter((r): r is ParsedRef => r !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (parsedRefs.length === 0) return null;

  // Find references where this model year would exist
  // Model year X is typically available from late year X-1 onwards
  const modelYearStart = new Date(siblingYear - 1, 6, 1); // July of previous year
  const relevantRefs = parsedRefs.filter((r) => r.date >= modelYearStart);

  if (relevantRefs.length === 0) return null;

  // Sample: first available, then yearly intervals (December), and latest
  const selectedRefs: ParsedRef[] = [];
  const seenMonthYears = new Set<string>();

  // First
  selectedRefs.push(relevantRefs[0]);
  seenMonthYears.add(`${relevantRefs[0].date.getFullYear()}-${relevantRefs[0].date.getMonth()}`);

  // Yearly (December of each year)
  for (const ref of relevantRefs) {
    if (ref.date.getMonth() === 11) { // December
      const key = `${ref.date.getFullYear()}-${ref.date.getMonth()}`;
      if (!seenMonthYears.has(key)) {
        selectedRefs.push(ref);
        seenMonthYears.add(key);
      }
    }
  }

  // Latest
  const last = relevantRefs[relevantRefs.length - 1];
  const lastKey = `${last.date.getFullYear()}-${last.date.getMonth()}`;
  if (!seenMonthYears.has(lastKey)) {
    selectedRefs.push(last);
  }

  // Sort by date
  selectedRefs.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Fetch prices in parallel
  const pricePromises = selectedRefs.map((ref) =>
    fetchPriceForYear(fipeCode, ref.codigo, siblingYear)
  );
  const prices = await Promise.all(pricePromises);

  // Build points
  const points: SiblingHistoryPoint[] = [];
  let launchDate: Date | null = null;

  for (let i = 0; i < selectedRefs.length; i++) {
    const price = prices[i];
    if (price && price > 0) {
      const ref = selectedRefs[i];
      if (!launchDate) launchDate = ref.date;

      const monthsSinceLaunch = launchDate
        ? Math.round(
            (ref.date.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          )
        : 0;

      points.push({
        modelYear: siblingYear,
        monthsSinceLaunch,
        price,
        date: ref.date.toISOString(),
      });
    }
  }

  if (points.length < 2) return null;

  const launchPrice = points[0].price;
  const currentPrice = points[points.length - 1].price;
  const totalMonths = points[points.length - 1].monthsSinceLaunch;

  // === PANDEMIC-AWARE DECAY CALCULATION ===
  // Use sliding windows to find "clean" depreciation periods outside pandemic
  let monthlyDecayRate: number | null = null;
  let pandemicFiltered = false;
  const validWindowRates: number[] = [];

  if (points.length >= 2) {
    // Sliding window approach: find 12-month windows outside pandemic
    for (let i = 0; i < points.length - 1; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const startPoint = points[i];
        const endPoint = points[j];
        const startDate = new Date(startPoint.date);
        const endDate = new Date(endPoint.date);
        const monthsBetween = endPoint.monthsSinceLaunch - startPoint.monthsSinceLaunch;

        // Skip windows less than 6 months (too noisy)
        if (monthsBetween < 6) continue;

        // Skip first 12 months (steep initial depreciation)
        if (startPoint.monthsSinceLaunch < 12) continue;

        // CRITICAL: Skip if window overlaps with pandemic period
        if (isPandemicPeriod(startDate) || isPandemicPeriod(endDate)) {
          pandemicFiltered = true;
          continue;
        }

        // Calculate rate for this window
        const ratio = endPoint.price / startPoint.price;
        const monthlyRate = Math.pow(ratio, 1 / monthsBetween) - 1;

        // SANITY CHECK: Used cars don't appreciate long-term
        // If rate > 0, it's anomalous data (partial pandemic effect, etc.)
        if (monthlyRate > 0) {
          pandemicFiltered = true;
          continue;
        }

        validWindowRates.push(monthlyRate);
      }
    }

    // Use median of valid windows (robust against outliers)
    if (validWindowRates.length > 0) {
      validWindowRates.sort((a, b) => a - b);
      const mid = Math.floor(validWindowRates.length / 2);
      monthlyDecayRate = validWindowRates.length % 2 === 0
        ? (validWindowRates[mid - 1] + validWindowRates[mid]) / 2
        : validWindowRates[mid];
    } else if (pandemicFiltered) {
      // All data was pandemic-contaminated: use industry fallback
      monthlyDecayRate = FALLBACK_MONTHLY_RATE;
    }
  }

  return {
    modelYear: siblingYear,
    points,
    launchPrice,
    currentPrice,
    monthlyDecayRate,
    pandemicFiltered,
  };
}

// --- Main Handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const fipeCode = String(body?.fipeCode ?? "").trim();
    const currentModelYear = Number(body?.currentModelYear);
    const siblingsToFetch = Number(body?.siblingsToFetch ?? 3);

    if (!fipeCode || !Number.isFinite(currentModelYear)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid payload: fipeCode and currentModelYear required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fipe-sibling-history] Request: fipeCode=${fipeCode} currentYear=${currentModelYear} siblings=${siblingsToFetch}`);
    const startedAt = Date.now();

    // --- CHECK DATABASE CACHE FIRST ---
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: cached } = await supabase
        .from("fipe_sibling_cache")
        .select("*")
        .eq("fipe_code", fipeCode)
        .eq("model_year", currentModelYear)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (cached) {
        console.log(`[fipe-sibling-history] CACHE HIT for ${fipeCode}/${currentModelYear}`);
        return new Response(
          JSON.stringify({
            success: true,
            siblings: cached.raw_data?.siblings || [],
            avgMonthlyDecayRate: cached.avg_monthly_decay_rate,
            pandemicFiltered: cached.pandemic_filtered,
            cached: true,
            stats: {
              requestedSiblings: siblingsToFetch,
              foundSiblings: cached.samples_used,
              decayRatesUsed: cached.samples_used,
              elapsedMs: Date.now() - startedAt,
              cacheAge: Math.round((Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60)) + "h",
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- FETCH FROM API ---
    const allReferences = await fetchReferences();
    if (allReferences.length === 0) {
      throw new Error("Não foi possível obter as tabelas de referência.");
    }

    // Fetch siblings (Year-1, Year-2, Year-3, ...)
    const siblingYears = [];
    for (let i = 1; i <= siblingsToFetch; i++) {
      siblingYears.push(currentModelYear - i);
    }

    console.log(`[fipe-sibling-history] Fetching siblings: ${siblingYears.join(", ")}`);

    // Fetch all siblings in parallel
    const siblingPromises = siblingYears.map((year) =>
      fetchSiblingHistory(fipeCode, year, allReferences)
    );
    const siblingResults = await Promise.all(siblingPromises);

    // Filter successful results
    const validSiblings = siblingResults.filter((s): s is SiblingResult => s !== null);

    // Calculate average decay rate from siblings
    const decayRates = validSiblings
      .map((s) => s.monthlyDecayRate)
      .filter((r): r is number => r !== null && r < 0); // Only valid depreciation

    const avgMonthlyDecayRate =
      decayRates.length > 0
        ? decayRates.reduce((a, b) => a + b, 0) / decayRates.length
        : null;

    const pandemicFiltered = validSiblings.some(s => s.pandemicFiltered);

    const elapsedMs = Date.now() - startedAt;

    console.log(`[fipe-sibling-history] Done: ${validSiblings.length} siblings found, avgDecay=${avgMonthlyDecayRate?.toFixed(5) || 'N/A'}, elapsed=${elapsedMs}ms`);

    // --- SAVE TO DATABASE CACHE ---
    if (supabase && (avgMonthlyDecayRate !== null || validSiblings.length > 0)) {
      const siblingYearsFound = validSiblings.map(s => s.modelYear);
      
      await supabase.from("fipe_sibling_cache").upsert({
        fipe_code: fipeCode,
        model_year: currentModelYear,
        sibling_years: siblingYearsFound,
        avg_monthly_decay_rate: avgMonthlyDecayRate,
        samples_used: decayRates.length,
        pandemic_filtered: pandemicFiltered,
        raw_data: { siblings: validSiblings },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }, { onConflict: "fipe_code,model_year" });

      console.log(`[fipe-sibling-history] Cached result for ${fipeCode}/${currentModelYear}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        siblings: validSiblings,
        avgMonthlyDecayRate,
        pandemicFiltered,
        cached: false,
        stats: {
          requestedSiblings: siblingsToFetch,
          foundSiblings: validSiblings.length,
          decayRatesUsed: decayRates.length,
          elapsedMs,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[fipe-sibling-history] Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
