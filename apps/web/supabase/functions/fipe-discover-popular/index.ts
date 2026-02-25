// supabase/functions/fipe-discover-popular/index.ts
// Discovers FIPE codes for popular Brazilian vehicles
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARALLELUM_API = "https://parallelum.com.br/fipe/api/v1";

// Popular vehicles to find - brand ID and model keywords
const POPULAR_VEHICLES = [
  // GM
  { brand: 23, keywords: ["onix"], variant: "1.0 turbo" },
  { brand: 23, keywords: ["onix", "plus"], variant: "sedan" },
  { brand: 23, keywords: ["tracker"], variant: "suv" },
  { brand: 23, keywords: ["s10"], variant: "pickup" },
  // Hyundai
  { brand: 26, keywords: ["hb20"], variant: "hatch" },
  { brand: 26, keywords: ["hb20s"], variant: "sedan" },
  { brand: 26, keywords: ["creta"], variant: "suv" },
  { brand: 26, keywords: ["tucson"], variant: "suv" },
  // Fiat
  { brand: 21, keywords: ["argo"], variant: "hatch" },
  { brand: 21, keywords: ["cronos"], variant: "sedan" },
  { brand: 21, keywords: ["mobi"], variant: "hatch" },
  { brand: 21, keywords: ["pulse"], variant: "suv" },
  { brand: 21, keywords: ["strada"], variant: "pickup" },
  { brand: 21, keywords: ["toro"], variant: "pickup" },
  // VW
  { brand: 59, keywords: ["polo"], variant: "hatch" },
  { brand: 59, keywords: ["virtus"], variant: "sedan" },
  { brand: 59, keywords: ["t-cross"], variant: "suv" },
  { brand: 59, keywords: ["nivus"], variant: "suv" },
  { brand: 59, keywords: ["gol"], variant: "hatch" },
  { brand: 59, keywords: ["saveiro"], variant: "pickup" },
  // Toyota
  { brand: 56, keywords: ["corolla"], variant: "sedan" },
  { brand: 56, keywords: ["corolla", "cross"], variant: "suv" },
  { brand: 56, keywords: ["hilux"], variant: "pickup" },
  { brand: 56, keywords: ["sw4"], variant: "suv" },
  { brand: 56, keywords: ["yaris"], variant: "hatch" },
  // Honda
  { brand: 25, keywords: ["civic"], variant: "sedan" },
  { brand: 25, keywords: ["city"], variant: "sedan" },
  { brand: 25, keywords: ["hr-v"], variant: "suv" },
  { brand: 25, keywords: ["fit"], variant: "hatch" },
  // Jeep
  { brand: 29, keywords: ["compass"], variant: "suv" },
  { brand: 29, keywords: ["renegade"], variant: "suv" },
  // Renault
  { brand: 48, keywords: ["kwid"], variant: "hatch" },
  { brand: 48, keywords: ["sandero"], variant: "hatch" },
  { brand: 48, keywords: ["duster"], variant: "suv" },
  // Nissan
  { brand: 40, keywords: ["kicks"], variant: "suv" },
  // Ford
  { brand: 22, keywords: ["ranger"], variant: "pickup" },
];

interface ModelResult {
  codigo: string;
  nome: string;
}

interface VehicleFound {
  brand: string;
  model: string;
  fipeCode: string;
  variant: string;
}

async function fetchModels(brandId: number): Promise<ModelResult[]> {
  try {
    const url = `${PARALLELUM_API}/carros/marcas/${brandId}/modelos`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.modelos || [];
  } catch {
    return [];
  }
}

async function fetchFipeCodeForModel(brandId: number, modelId: string): Promise<string | null> {
  try {
    // Get available years for this model
    const yearsUrl = `${PARALLELUM_API}/carros/marcas/${brandId}/modelos/${modelId}/anos`;
    const yearsRes = await fetch(yearsUrl);
    if (!yearsRes.ok) return null;
    const years = await yearsRes.json();
    
    if (!years.length) return null;
    
    // Get the most recent year's FIPE code
    const latestYear = years[0];
    const priceUrl = `${PARALLELUM_API}/carros/marcas/${brandId}/modelos/${modelId}/anos/${latestYear.codigo}`;
    const priceRes = await fetch(priceUrl);
    if (!priceRes.ok) return null;
    
    const priceData = await priceRes.json();
    return priceData.CodigoFipe || null;
  } catch {
    return null;
  }
}

function matchesKeywords(modelName: string, keywords: string[]): boolean {
  const normalized = modelName.toLowerCase();
  return keywords.every(kw => normalized.includes(kw.toLowerCase()));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[fipe-discover] Starting discovery of popular vehicles...");
    const startedAt = Date.now();
    
    const foundVehicles: VehicleFound[] = [];
    const brandCache = new Map<number, ModelResult[]>();
    
    for (const vehicle of POPULAR_VEHICLES) {
      // Get models for brand (cached)
      let models = brandCache.get(vehicle.brand);
      if (!models) {
        models = await fetchModels(vehicle.brand);
        brandCache.set(vehicle.brand, models);
        // Rate limit protection
        await new Promise(r => setTimeout(r, 200));
      }
      
      // Find matching model
      const matchingModel = models.find(m => matchesKeywords(m.nome, vehicle.keywords));
      
      if (matchingModel) {
        const fipeCode = await fetchFipeCodeForModel(vehicle.brand, matchingModel.codigo);
        
        if (fipeCode) {
          foundVehicles.push({
            brand: `Brand ${vehicle.brand}`,
            model: matchingModel.nome,
            fipeCode,
            variant: vehicle.variant
          });
          console.log(`[fipe-discover] Found: ${matchingModel.nome} -> ${fipeCode}`);
        }
        
        // Rate limit
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    const elapsedMs = Date.now() - startedAt;
    console.log(`[fipe-discover] Found ${foundVehicles.length} vehicles in ${elapsedMs}ms`);
    
    // Format for warmup function
    const warmupFormat = foundVehicles.map(v => ({
      code: v.fipeCode,
      name: v.model
    }));
    
    return new Response(
      JSON.stringify({
        success: true,
        vehicles: foundVehicles,
        warmupFormat,
        count: foundVehicles.length,
        elapsedMs
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[fipe-discover] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});