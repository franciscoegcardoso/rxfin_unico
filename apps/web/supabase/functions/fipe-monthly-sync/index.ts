import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PARALLELUM_BASE = "https://fipe.parallelum.com.br/api/v2";
const VEHICLE_TYPES = ["cars", "motorcycles", "trucks"] as const;
type VehicleType = (typeof VEHICLE_TYPES)[number];

const DELAY_MS = 250;
const MAX_RETRIES = 3;

// ── Types ────────────────────────────────────────────────────────────

interface ParallelumRef { code: number; month: string; }

interface ParallelumHistoryEntry {
  month: string;
  price: string;
  reference: string;
}

interface ParallelumFipeInfo {
  brand: string;
  codeFipe: string;
  fuel: string;
  fuelAcronym: string;
  model: string;
  modelYear: number;
  price: string;
  priceHistory: ParallelumHistoryEntry[];
  referenceMonth: string;
  vehicleType: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchApi<T>(path: string, retries = MAX_RETRIES): Promise<T> {
  const token = Deno.env.get("FIPE_PARALLELUM_TOKEN");
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["X-Subscription-Token"] = token;

      const res = await fetch(`${PARALLELUM_BASE}${path}`, { headers });

      if (res.status === 429) {
        const wait = Math.min(60000, 5000 * Math.pow(2, attempt));
        console.warn(`Rate limited on ${path}, waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.substring(0, 200)}`);
      }

      return await res.json();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await sleep(2000 * (attempt + 1));
    }
  }
  throw new Error(`Failed after ${retries} retries: ${path}`);
}

function parsePrice(valor: string): number {
  return parseFloat(
    valor.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
  );
}

function parseRefMonth(mes: string): { month: number; year: number } {
  const months: Record<string, number> = {
    janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4,
    maio: 5, junho: 6, julho: 7, agosto: 8,
    setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  };
  const cleaned = mes.toLowerCase().replace(" de ", "/").trim();
  const parts = cleaned.split("/");
  return { month: months[parts[0]] || 1, year: parseInt(parts[1]) || 2001 };
}

function vehicleTypeToApi(vt: number): VehicleType {
  return vt === 1 ? "cars" : vt === 2 ? "motorcycles" : "trucks";
}

// ── Main Sync Logic ─────────────────────────────────────────────────

async function monthlySync(
  sb: ReturnType<typeof supabaseAdmin>,
  batchSize = 20,
  offset = 0,
  vehicleType?: number
) {
  // 1. Check for new references
  const refs: ParallelumRef[] = await fetchApi("/references");
  const latestRef = refs[0]; // Most recent first
  console.log(`Latest reference: ${latestRef.month} (code ${latestRef.code})`);

  // Upsert latest reference
  const { month, year } = parseRefMonth(latestRef.month);
  await sb.from("fipe_reference").upsert(
    {
      ref_code: latestRef.code,
      ref_label: latestRef.month,
      ref_month: `${year}-${String(month).padStart(2, "0")}-01`,
    },
    { onConflict: "ref_code", ignoreDuplicates: true }
  );

  // 2. Find catalog items that don't have the latest reference price
  let query = sb
    .from("fipe_catalog")
    .select("fipe_code, year, year_id, brand_name, model_name, vehicle_type")
    .range(offset, offset + batchSize - 1);

  if (vehicleType) {
    query = query.eq("vehicle_type", vehicleType);
  }

  const { data: items, error: catErr } = await query;
  if (catErr) throw catErr;
  if (!items || items.length === 0) {
    return { processed: 0, inserted: 0, updated: 0, hasMore: false, latestRef: latestRef.code };
  }

  // 3. Create sync log
  const { data: logData } = await sb
    .from("fipe_sync_log")
    .insert({
      sync_type: "monthly_sync",
      vehicle_type: vehicleType ?? null,
      batch_key: `monthly_${latestRef.code}_${offset}`,
      ref_code: latestRef.code,
      status: "running",
    })
    .select("id")
    .single();
  const logId = logData?.id;

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (const item of items) {
    // Check if we already have price for this ref
    const { count } = await sb
      .from("fipe_price_history")
      .select("id", { count: "exact", head: true })
      .eq("fipe_code", item.fipe_code)
      .eq("model_year", item.year)
      .eq("reference_code", latestRef.code);

    if ((count ?? 0) > 0) {
      totalProcessed++;
      continue; // Already have this price
    }

    await sleep(DELAY_MS);
    console.log(`Processing ${item.fipe_code} year ${item.year_id} (${item.brand_name} ${item.model_name})...`);

    try {
      const apiType = vehicleTypeToApi(item.vehicle_type);
      const info: ParallelumFipeInfo = await fetchApi(
        `/${apiType}/${item.fipe_code}/years/${item.year_id}?reference=${latestRef.code}`
      );

      if (info.price) {
        const price = parsePrice(info.price);
        if (price > 0) {
          const { error: upsertErr } = await sb
            .from("fipe_price_history")
            .upsert(
              {
                fipe_code: (info.codeFipe || item.fipe_code).replace(/-/g, "").trim(),
                model_year: info.modelYear || item.year,
                reference_code: latestRef.code,
                reference_label: latestRef.month,
                reference_month: month,
                reference_year: year,
                price,
              },
              { onConflict: "fipe_code,model_year,reference_code", ignoreDuplicates: false }
            );

          if (!upsertErr) {
            totalInserted++;
          } else {
            console.warn(`Price upsert error: ${upsertErr.message}`);
          }
        }
      }

      // Also save any history entries returned
      if (info.priceHistory?.length > 0) {
        const fipeCode = (info.codeFipe || item.fipe_code).replace(/-/g, "").trim();
        const rows = info.priceHistory
          .map((h) => {
            const p = parsePrice(h.price);
            const ref = parseRefMonth(h.month);
            const refCode = parseInt(h.reference);
            if (isNaN(p) || p <= 0 || isNaN(refCode)) return null;
            return {
              fipe_code: fipeCode,
              model_year: info.modelYear || item.year,
              reference_code: refCode,
              reference_label: h.month,
              reference_month: ref.month,
              reference_year: ref.year,
              price: p,
            };
          })
          .filter(Boolean);

        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 200) {
            const batch = rows.slice(i, i + 200);
            const { error } = await sb
              .from("fipe_price_history")
              .upsert(batch as Record<string, unknown>[], {
                onConflict: "fipe_code,model_year,reference_code",
                ignoreDuplicates: true,
              });
            if (!error) totalUpdated += batch.length;
          }
        }
      }
    } catch (e) {
      console.warn(`Skip ${item.fipe_code} ${item.year_id}: ${e}`);
    }

    totalProcessed++;

    if (totalProcessed % 5 === 0 && logId) {
      await sb.from("fipe_sync_log").update({
        records_processed: totalProcessed,
        records_inserted: totalInserted,
        records_updated: totalUpdated,
      }).eq("id", logId);
    }
  }

  // Finish sync log
  if (logId) {
    await sb.from("fipe_sync_log").update({
      status: "completed",
      records_processed: totalProcessed,
      records_inserted: totalInserted,
      records_updated: totalUpdated,
      completed_at: new Date().toISOString(),
    }).eq("id", logId);
  }

  return {
    processed: totalProcessed,
    inserted: totalInserted,
    updated: totalUpdated,
    hasMore: items.length === batchSize,
    nextOffset: offset + batchSize,
    latestRef: latestRef.code,
  };
}

// ── MAIN ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = supabaseAdmin();

    let batchSize = 20;
    let offset = 0;
    let vehicleType: number | undefined;

    if (req.headers.get("content-type")?.includes("application/json")) {
      try {
        const body = await req.json();
        batchSize = body.batchSize || 20;
        offset = body.offset || 0;
        vehicleType = body.vehicleType;
      } catch {
        // No body is fine - use defaults
      }
    }

    const result = await monthlySync(sb, batchSize, offset, vehicleType);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fipe-monthly-sync error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
