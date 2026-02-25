// supabase/functions/fipe-cache-warmup/index.ts
// Pre-populates FIPE cache with popular Brazilian vehicles
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRASIL_API_BASE = "https://brasilapi.com.br/api/fipe";

// Popular vehicle search terms - will be resolved to actual FIPE codes
const POPULAR_VEHICLES = [
  // Hatches
  "chevrolet onix",
  "hyundai hb20",
  "fiat argo",
  "volkswagen polo",
  "volkswagen gol",
  "fiat mobi",
  "renault kwid",
  // Sedans
  "toyota corolla",
  "honda civic",
  "chevrolet onix plus",
  "hyundai hb20s",
  "volkswagen virtus",
  "fiat cronos",
  "honda city",
  // SUVs
  "hyundai creta",
  "jeep compass",
  "volkswagen t-cross",
  "chevrolet tracker",
  "fiat pulse",
  "toyota corolla cross",
  "honda hr-v",
  "jeep renegade",
  "hyundai tucson",
  "toyota sw4",
  // Pickups
  "toyota hilux",
  "chevrolet s10",
  "fiat strada",
  "fiat toro",
  "volkswagen saveiro",
  "ford ranger",
];

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

type CachedPrice = {
  fipe_code: string;
  model_year: number;
  reference_code: number;
  price: number;
  reference_month: number;
  reference_year: number;
  reference_label: string;
};

type VehicleInfo = {
  fipeCode: string;
  name: string;
  brand: string;
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Helpers ---

function normalizeMonthString(input: string): string {
  return input.trim().toLowerCase().normalize("NFD")
    .replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ");
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
  return Number(priceStr.replace("R$", "").trim().replace(/\./g, "").replace(",", "."));
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

// --- Vehicle Discovery ---

async function searchVehicleByName(searchTerm: string, latestRefCode: number): Promise<VehicleInfo | null> {
  const normalized = normalizeText(searchTerm);
  const parts = normalized.split(" ");
  const brandName = parts[0];
  const modelKeywords = parts.slice(1);
  
  try {
    // 1. Get all brands
    const brandsRes = await fetch(`${BRASIL_API_BASE}/marcas/v1/carros`);
    if (!brandsRes.ok) return null;
    const brands: Array<{ nome: string; valor: string }> = await brandsRes.json();
    
    // Find matching brand
    const brand = brands.find(b => normalizeText(b.nome).includes(brandName));
    if (!brand) {
      console.log(`[warmup] Brand not found: ${brandName}`);
      return null;
    }
    
    // 2. Get models for this brand
    // We need to use the price endpoint with a known code to get model list
    // Alternative: search through price variations
    
    // Try to find a matching vehicle by searching recent FIPE data
    // This is a workaround since BrasilAPI doesn't have a direct model search
    
    // Use a broad search approach - get a sample of codes and find matches
    const searchUrl = `${BRASIL_API_BASE}/preco/v1/${brand.valor}?tabela_referencia=${latestRefCode}`;
    
    // Unfortunately BrasilAPI requires a full FIPE code, not brand code
    // Let's try a different approach - use known patterns
    
    // For now, return null and log - the warmup will work with user-provided codes
    console.log(`[warmup] Vehicle search not supported yet: ${searchTerm}`);
    return null;
  } catch (err) {
    console.error(`[warmup] Search error for ${searchTerm}:`, err);
    return null;
  }
}

// --- API Functions ---

async function fetchReferences(): Promise<BrasilApiReference[]> {
  try {
    const res = await fetch(`${BRASIL_API_BASE}/tabelas/v1`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchAvailableYears(fipeCode: string, latestRefCode: number): Promise<number[]> {
  try {
    const url = `${BRASIL_API_BASE}/preco/v1/${encodeURIComponent(fipeCode)}?tabela_referencia=${latestRefCode}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`[warmup] Failed to fetch years for ${fipeCode}: ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];
    
    const years = new Set<number>();
    for (const item of items) {
      const year = Number(item?.anoModelo);
      if (Number.isFinite(year)) years.add(year);
    }
    
    return Array.from(years).sort((a, b) => a - b);
  } catch (err) {
    console.error(`[warmup] Error fetching years for ${fipeCode}:`, err);
    return [];
  }
}

async function fetchPriceForModelYear(
  fipeCode: string,
  referenceCode: number,
  modelYear: number
): Promise<number | null> {
  try {
    const url = `${BRASIL_API_BASE}/preco/v1/${encodeURIComponent(fipeCode)}?tabela_referencia=${referenceCode}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      if (Number(item?.anoModelo) === modelYear) {
        const priceStr = item?.valor;
        if (typeof priceStr === "string") {
          const price = parseBRLPrice(priceStr);
          if (price > 0) return price;
        }
        if (typeof item?.valor === "number" && item.valor > 0) return item.valor;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getCachedRefCodes(fipeCode: string, modelYear: number): Promise<Set<number>> {
  try {
    const { data } = await supabase
      .from("fipe_price_history")
      .select("reference_code")
      .eq("fipe_code", fipeCode)
      .eq("model_year", modelYear);
    
    return new Set((data || []).map(r => r.reference_code));
  } catch {
    return new Set();
  }
}

async function savePricesToCache(prices: CachedPrice[]): Promise<number> {
  if (prices.length === 0) return 0;
  
  try {
    const { error } = await supabase
      .from("fipe_price_history")
      .upsert(prices, { onConflict: "fipe_code,model_year,reference_code" });
    
    if (error) {
      console.error("[warmup] Cache write error:", error);
      return 0;
    }
    return prices.length;
  } catch {
    return 0;
  }
}

// --- Main Warmup Logic ---

async function warmupVehicle(
  fipeCode: string,
  name: string,
  decemberRefs: ParsedReference[],
  latestRefCode: number
): Promise<{ vehicle: string; fipeCode: string; years: number; prices: number }> {
  console.log(`[warmup] Processing ${name} (${fipeCode})`);
  
  const availableYears = await fetchAvailableYears(fipeCode, latestRefCode);
  if (availableYears.length === 0) {
    console.log(`[warmup] No years found for ${name}`);
    return { vehicle: name, fipeCode, years: 0, prices: 0 };
  }
  
  console.log(`[warmup] ${name}: ${availableYears.length} model years (${availableYears.join(', ')})`);
  
  const currentYear = new Date().getFullYear();
  const relevantRefs = decemberRefs.filter(r => r.year >= currentYear - 15);
  
  let totalPricesSaved = 0;
  
  // Process each model year
  for (const modelYear of availableYears) {
    const cachedRefCodes = await getCachedRefCodes(fipeCode, modelYear);
    const startYear = modelYear === 32000 ? currentYear - 15 : modelYear;
    const missingRefs = relevantRefs.filter(r => 
      r.year >= startYear &&
      !cachedRefCodes.has(r.codigo)
    );
    
    if (missingRefs.length === 0) {
      console.log(`[warmup] ${name} year ${modelYear}: fully cached`);
      continue;
    }
    
    console.log(`[warmup] ${name} year ${modelYear}: fetching ${missingRefs.length} missing refs`);
    
    // Fetch in small batches to avoid rate limits
    const BATCH_SIZE = 5;
    const newPrices: CachedPrice[] = [];
    
    for (let i = 0; i < missingRefs.length; i += BATCH_SIZE) {
      const batch = missingRefs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(ref => fetchPriceForModelYear(fipeCode, ref.codigo, modelYear))
      );
      
      for (let j = 0; j < batch.length; j++) {
        const price = results[j];
        if (price && price > 0) {
          const ref = batch[j];
          newPrices.push({
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
      
      // Small delay between batches
      if (i + BATCH_SIZE < missingRefs.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    const saved = await savePricesToCache(newPrices);
    totalPricesSaved += saved;
  }
  
  console.log(`[warmup] ${name}: cached ${totalPricesSaved} prices`);
  return { vehicle: name, fipeCode, years: availableYears.length, prices: totalPricesSaved };
}

// --- HTTP Handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[warmup] Starting FIPE cache warmup...");
    const startedAt = Date.now();
    
    // Parse parameters - expects array of {code, name} objects
    let vehiclesToProcess: Array<{ code: string; name: string }> = [];
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        
        // Accept array of FIPE codes with names
        if (body?.vehicles && Array.isArray(body.vehicles)) {
          vehiclesToProcess = body.vehicles.map((v: { code: string; name?: string }) => ({
            code: v.code,
            name: v.name || v.code
          }));
        }
        // Or just array of codes
        else if (body?.fipeCodes && Array.isArray(body.fipeCodes)) {
          vehiclesToProcess = body.fipeCodes.map((code: string) => ({
            code,
            name: `Vehicle ${code}`
          }));
        }
        
        // Apply limit if provided
        if (body?.limit && typeof body.limit === "number" && vehiclesToProcess.length > body.limit) {
          vehiclesToProcess = vehiclesToProcess.slice(0, body.limit);
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    if (vehiclesToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No vehicles provided. Send POST with {vehicles: [{code: 'XXX-XXXX', name: 'Vehicle Name'}]} or {fipeCodes: ['XXX-XXXX']}"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Fetch all references once
    const allRefs = await fetchReferences();
    if (allRefs.length === 0) {
      throw new Error("Failed to fetch FIPE references");
    }
    
    const latestRefCode = allRefs[0].codigo;
    
    const parsedRefs: ParsedReference[] = allRefs
      .map(r => {
        const parsed = parseMonthString(r.mes);
        if (!parsed) return null;
        return { codigo: r.codigo, mes: r.mes, ...parsed };
      })
      .filter((r): r is ParsedReference => r !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Filter to December only + latest
    const decemberRefs = parsedRefs.filter(r => r.month === 11);
    const latestRef = parsedRefs[parsedRefs.length - 1];
    if (latestRef && latestRef.month !== 11 && !decemberRefs.some(r => r.codigo === latestRef.codigo)) {
      decemberRefs.push(latestRef);
    }
    
    console.log(`[warmup] Processing ${vehiclesToProcess.length} vehicles with ${decemberRefs.length} reference points`);
    
    // Process vehicles sequentially to avoid rate limits
    const results: Array<{ vehicle: string; fipeCode: string; years: number; prices: number }> = [];
    
    for (const vehicle of vehiclesToProcess) {
      try {
        const result = await warmupVehicle(vehicle.code, vehicle.name, decemberRefs, latestRefCode);
        results.push(result);
        
        // Delay between vehicles
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`[warmup] Error processing ${vehicle.name}:`, err);
        results.push({ vehicle: vehicle.name, fipeCode: vehicle.code, years: 0, prices: 0 });
      }
    }
    
    const totalPrices = results.reduce((sum, r) => sum + r.prices, 0);
    const totalYears = results.reduce((sum, r) => sum + r.years, 0);
    const elapsedMs = Date.now() - startedAt;
    
    console.log(`[warmup] Completed: ${totalPrices} prices cached across ${totalYears} model years in ${elapsedMs}ms`);
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          vehiclesProcessed: vehiclesToProcess.length,
          totalModelYears: totalYears,
          totalPricesCached: totalPrices,
          elapsedMs
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[warmup] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});