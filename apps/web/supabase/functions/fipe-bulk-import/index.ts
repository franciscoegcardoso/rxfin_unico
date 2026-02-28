import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PARALLELUM_BASE = "https://fipe.parallelum.com.br/api/v2";
const VEHICLE_TYPES = ["cars", "motorcycles", "trucks"] as const;
type VehicleType = (typeof VEHICLE_TYPES)[number];

// Rate limiting: 500 req/day free, 1000 with token
const DELAY_BETWEEN_REQUESTS_MS = 200; // ~5 req/s = safe margin
const MAX_RETRIES = 3;

// ── Types ────────────────────────────────────────────────────────────

interface ParallelumRef { code: number; month: string; }
interface ParallelumBrand { code: string; name: string; }
interface ParallelumModel { code: string; name: string; }
interface ParallelumYear { code: string; name: string; }

interface ParallelumHistoryEntry {
  month: string;   // "janeiro de 2024"
  price: string;   // "R$ 52.345,00"
  reference: string; // "308"
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
  const token = Deno.env.get("FIPE_PARALLELUM_TOKEN"); // optional subscription token

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Accept": "application/json",
      };
      if (token) {
        headers["X-Subscription-Token"] = token;
      }

      const res = await fetch(`${PARALLELUM_BASE}${path}`, { headers });

      if (res.status === 429) {
        // Rate limited - wait and retry
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
  // "janeiro de 2024" or "janeiro/2001"
  const cleaned = mes.toLowerCase().replace(" de ", "/").trim();
  const parts = cleaned.split("/");
  return { month: months[parts[0]] || 1, year: parseInt(parts[1]) || 2001 };
}

function vehicleTypeToNumber(vt: VehicleType): number {
  return vt === "cars" ? 1 : vt === "motorcycles" ? 2 : 3;
}

async function createSyncLog(
  sb: ReturnType<typeof supabaseAdmin>,
  syncType: string,
  vehicleType?: number,
  batchKey?: string,
  refCode?: number
) {
  const { data } = await sb
    .from("fipe_sync_log")
    .insert({
      sync_type: syncType,
      vehicle_type: vehicleType ?? null,
      batch_key: batchKey ?? null,
      ref_code: refCode ?? null,
      status: "running",
    })
    .select("id")
    .single();
  return data?.id;
}

async function updateSyncLog(
  sb: ReturnType<typeof supabaseAdmin>,
  logId: string,
  updates: Record<string, unknown>
) {
  await sb.from("fipe_sync_log").update(updates).eq("id", logId);
}

async function finishSyncLog(
  sb: ReturnType<typeof supabaseAdmin>,
  logId: string,
  processed: number,
  inserted: number,
  error?: string
) {
  await sb
    .from("fipe_sync_log")
    .update({
      status: error ? "error" : "completed",
      records_processed: processed,
      records_inserted: inserted,
      error_message: error ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", logId);
}

// ── ACTION: references ──────────────────────────────────────────────

async function importReferences(sb: ReturnType<typeof supabaseAdmin>) {
  const logId = await createSyncLog(sb, "references");

  const refs: ParallelumRef[] = await fetchApi("/references");
  console.log(`Fetched ${refs.length} references from API`);

  const rows = refs.map((r) => {
    const { month, year } = parseRefMonth(r.month);
    return {
      ref_code: r.code,
      ref_label: r.month,
      ref_month: `${year}-${String(month).padStart(2, "0")}-01`,
    };
  });

  // Upsert in batches of 100
  let totalInserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await sb
      .from("fipe_reference")
      .upsert(batch, { onConflict: "ref_code", ignoreDuplicates: true });
    if (error) throw error;
    totalInserted += batch.length;
  }

  await finishSyncLog(sb, logId!, rows.length, totalInserted);
  return { total: rows.length, inserted: totalInserted };
}

// ── ACTION: catalog ─────────────────────────────────────────────────

async function importCatalog(
  sb: ReturnType<typeof supabaseAdmin>,
  vehicleType: VehicleType,
  brandId?: number,
  refCode?: number,
  modelOffset = 0,
  maxModels = 10
) {
  const vtNum = vehicleTypeToNumber(vehicleType);
  const logId = await createSyncLog(sb, "catalog", vtNum, `vtype_${vehicleType}_b${brandId ?? "all"}_m${modelOffset}`);

  try {
    const refParam = refCode ? `?reference=${refCode}` : "";

    // 1. Fetch brands
    const brands: ParallelumBrand[] = await fetchApi(
      `/${vehicleType}/brands${refParam}`
    );
    console.log(`${vehicleType}: ${brands.length} brands`);

    const brandsToProcess = brandId
      ? brands.filter((b) => String(b.code) === String(brandId))
      : brands;

    if (brandsToProcess.length === 0) {
      await finishSyncLog(sb, logId!, 0, 0, `Brand ${brandId} not found`);
      return { processed: 0, inserted: 0, error: `Brand ${brandId} not found in ${brands.length} brands` };
    }

    let totalInserted = 0;
    let totalProcessed = 0;
    let totalModelsInBrand = 0;

    for (const brand of brandsToProcess) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);

      // 2. Fetch models
      const allModels: ParallelumModel[] = await fetchApi(
        `/${vehicleType}/brands/${brand.code}/models${refParam}`
      );
      totalModelsInBrand = allModels.length;
      console.log(`  Brand ${brand.name} (${brand.code}): ${allModels.length} models, processing offset ${modelOffset} limit ${maxModels}`);

      // Paginate models
      const models = allModels.slice(modelOffset, modelOffset + maxModels);

      for (const model of models) {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);

        // 3. Fetch years
        const years: ParallelumYear[] = await fetchApi(
          `/${vehicleType}/brands/${brand.code}/models/${model.code}/years${refParam}`
        );

        for (const year of years) {
          const [yearStr, fuelStr] = year.code.split("-");
          const yearNum = parseInt(yearStr);
          const fuelType = parseInt(fuelStr) || 1;

          await sleep(DELAY_BETWEEN_REQUESTS_MS);
          try {
            const info: ParallelumFipeInfo = await fetchApi(
              `/${vehicleType}/brands/${brand.code}/models/${model.code}/years/${year.code}${refParam}`
            );

            if (info.codeFipe) {
              const catalogRow = {
                vehicle_type: vtNum,
                brand_id: parseInt(String(brand.code)),
                brand_name: brand.name,
                model_id: parseInt(String(model.code)),
                model_name: model.name,
                year_id: year.code,
                year: yearNum,
                fuel_type: fuelType,
                fipe_code: info.codeFipe.replace(/-/g, "").trim(),
              };

              const { error: upsertErr } = await sb
                .from("fipe_catalog")
                .upsert(catalogRow, {
                  onConflict: "vehicle_type,brand_id,model_id,year_id",
                  ignoreDuplicates: true,
                });

              if (!upsertErr) totalInserted++;
              totalProcessed++;
            }
          } catch (e) {
            console.warn(`  Skip ${brand.name} ${model.name} ${year.code}: ${e}`);
          }
        }

        // Update progress after each model
        await updateSyncLog(sb, logId!, {
          records_processed: totalProcessed,
          records_inserted: totalInserted,
          metadata: { lastBrand: brand.name, lastModel: model.name },
        });
      }
    }

    const hasMore = modelOffset + maxModels < totalModelsInBrand;
    await finishSyncLog(sb, logId!, totalProcessed, totalInserted);
    return {
      processed: totalProcessed,
      inserted: totalInserted,
      totalModels: totalModelsInBrand,
      hasMore,
      nextModelOffset: hasMore ? modelOffset + maxModels : null,
    };
  } catch (err) {
    await finishSyncLog(sb, logId!, 0, 0, (err as Error).message);
    throw err;
  }
}

// ── Shared: Save price history ──────────────────────────────────────

async function savePriceHistory(
  sb: ReturnType<typeof supabaseAdmin>,
  fipeCode: string,
  modelYear: number,
  history: ParallelumHistoryEntry[]
) {
  const rows = history
    .map((h) => {
      const price = parsePrice(h.price);
      const { month, year } = parseRefMonth(h.month);
      const refCode = parseInt(h.reference);
      if (isNaN(price) || price <= 0 || isNaN(refCode)) return null;
      return {
        fipe_code: fipeCode,
        model_year: modelYear,
        reference_code: refCode,
        reference_label: h.month,
        reference_month: month,
        reference_year: year,
        price,
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return 0;

  // Upsert in batches of 200
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await sb
      .from("fipe_price_history")
      .upsert(batch as Record<string, unknown>[], {
        onConflict: "fipe_code,model_year,reference_code",
        ignoreDuplicates: true,
      });
    if (error) {
      console.warn(`Price upsert error: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

// ── ACTION: history (bulk fetch histories by fipe code) ─────────────

async function importHistory(
  sb: ReturnType<typeof supabaseAdmin>,
  vehicleType: VehicleType,
  batchSize = 20,
  offset = 0,
  brandId?: number
) {
  const vtNum = vehicleTypeToNumber(vehicleType);
  const logId = await createSyncLog(sb, "prices", vtNum, `history_${offset}_${offset + batchSize}`);

  try {
    // Get catalog items for this vehicle type
    let query = sb
      .from("fipe_catalog")
      .select("fipe_code, year, year_id, brand_name, model_name")
      .eq("vehicle_type", vtNum)
      .range(offset, offset + batchSize - 1);

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    const { data: catalogItems, error: catErr } = await query;
    if (catErr) throw catErr;
    if (!catalogItems || catalogItems.length === 0) {
      await finishSyncLog(sb, logId!, 0, 0);
      return { processed: 0, inserted: 0, hasMore: false };
    }

    let totalProcessed = 0;
    let totalInserted = 0;

    for (const item of catalogItems) {
      // Check if we already have substantial history for this item
      const { count } = await sb
        .from("fipe_price_history")
        .select("id", { count: "exact", head: true })
        .eq("fipe_code", item.fipe_code)
        .eq("model_year", item.year);

      if ((count ?? 0) > 50) {
        // Already has good history, skip
        totalProcessed++;
        continue;
      }

      await sleep(DELAY_BETWEEN_REQUESTS_MS);

      try {
        // Use the history endpoint - returns ALL historical prices in one call!
        const historyData: ParallelumFipeInfo = await fetchApi(
          `/${vehicleType}/${item.fipe_code}/years/${item.year_id}/history`
        );

        if (historyData.priceHistory?.length > 0) {
          const fipeCode = (historyData.codeFipe || item.fipe_code).replace(/-/g, "").trim();
          const inserted = await savePriceHistory(
            sb,
            fipeCode,
            historyData.modelYear || item.year,
            historyData.priceHistory
          );
          totalInserted += inserted;
          console.log(
            `  ${item.brand_name} ${item.model_name} ${item.year}: ${historyData.priceHistory.length} points, ${inserted} inserted`
          );
        }
      } catch (e) {
        console.warn(`  History skip ${item.fipe_code} ${item.year_id}: ${e}`);
      }

      totalProcessed++;

      // Update progress
      if (totalProcessed % 5 === 0) {
        await updateSyncLog(sb, logId!, {
          records_processed: totalProcessed,
          records_inserted: totalInserted,
        });
      }
    }

    await finishSyncLog(sb, logId!, totalProcessed, totalInserted);
    return {
      processed: totalProcessed,
      inserted: totalInserted,
      hasMore: catalogItems.length === batchSize,
      nextOffset: offset + batchSize,
    };
  } catch (err) {
    await finishSyncLog(sb, logId!, 0, 0, (err as Error).message);
    throw err;
  }
}

// ── ACTION: status ──────────────────────────────────────────────────

async function getStatus(sb: ReturnType<typeof supabaseAdmin>) {
  const [refs, catalog, prices, syncLogs] = await Promise.all([
    sb.from("fipe_reference").select("ref_code", { count: "exact", head: true }),
    sb.from("fipe_catalog").select("fipe_code", { count: "exact", head: true }),
    sb.from("fipe_price_history").select("id", { count: "exact", head: true }),
    sb
      .from("fipe_sync_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  return {
    counts: {
      references: refs.count ?? 0,
      catalog: catalog.count ?? 0,
      priceHistory: prices.count ?? 0,
    },
    recentSyncs: syncLogs.data ?? [],
  };
}

// ── ACTION: catalog-auto (auto-discover and import next brand) ──────

async function catalogAuto(
  sb: ReturnType<typeof supabaseAdmin>,
  vehicleType: VehicleType,
  maxModels = 10
) {
  const vtNum = vehicleTypeToNumber(vehicleType);

  // 1. Check cursor from last completed auto-run
  const { data: lastRun } = await sb
    .from("fipe_sync_log")
    .select("metadata")
    .eq("sync_type", "catalog_auto")
    .eq("vehicle_type", vtNum)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const meta = (lastRun?.metadata ?? {}) as Record<string, unknown>;
  let brandIndex = typeof meta.nextBrandIndex === "number" ? meta.nextBrandIndex : 0;
  let modelOffset = typeof meta.nextModelOffset === "number" ? meta.nextModelOffset : 0;

  // 2. Get all brands from API
  const brands: ParallelumBrand[] = await fetchApi(`/${vehicleType}/brands`);

  if (brandIndex >= brands.length) {
    return { done: true, totalBrands: brands.length, message: `All ${brands.length} brands imported for ${vehicleType}` };
  }

  const brand = brands[brandIndex];
  const brandId = parseInt(String(brand.code));

  // 3. Import catalog for current brand from current offset
  const result = await importCatalog(sb, vehicleType, brandId, undefined, modelOffset, maxModels);

  // 4. Determine next cursor
  let nextBrandIndex = brandIndex;
  let nextModelOffset = modelOffset + maxModels;

  if (!result.hasMore) {
    nextBrandIndex = brandIndex + 1;
    nextModelOffset = 0;
  }

  // 5. Log with cursor metadata for next run
  const logId = await createSyncLog(sb, "catalog_auto", vtNum, `auto_b${brandId}_m${modelOffset}`);
  await updateSyncLog(sb, logId!, {
    status: "completed",
    records_processed: result.processed,
    records_inserted: result.inserted,
    completed_at: new Date().toISOString(),
    metadata: {
      brandName: brand.name,
      brandId,
      modelOffset,
      nextBrandIndex,
      nextModelOffset,
      brandComplete: !result.hasMore,
    },
  });

  return {
    done: nextBrandIndex >= brands.length,
    brand: { name: brand.name, id: brandId, index: brandIndex },
    modelOffset,
    ...result,
    totalBrands: brands.length,
    progress: `Brand ${brandIndex + 1}/${brands.length}: ${brand.name}`,
  };
}

// ── ACTION: catalog-auto-all (round-robin cars/motorcycles/trucks) ───

async function catalogAutoAll(
  sb: ReturnType<typeof supabaseAdmin>,
  maxModels = 10
) {
  // Determine which vehicle type to process next via round-robin
  const { data: lastRuns } = await sb
    .from("fipe_sync_log")
    .select("vehicle_type, metadata, completed_at")
    .eq("sync_type", "catalog_auto")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(30);

  // Find the least-recently-processed type that isn't done
  const typeStatus: Record<number, { done: boolean; lastRun: string }> = {};
  for (const run of lastRuns || []) {
    const vt = run.vehicle_type as number;
    if (typeStatus[vt]) continue; // Already have latest for this type
    const meta = (run.metadata ?? {}) as Record<string, unknown>;
    typeStatus[vt] = {
      done: meta.nextBrandIndex !== undefined && (meta.nextBrandIndex as number) >= (meta.totalBrands as number || 999),
      lastRun: run.completed_at || "",
    };
  }

  // Priority order: pick the type with oldest lastRun that isn't done
  const priorities: { type: VehicleType; vt: number }[] = [
    { type: "cars", vt: 1 },
    { type: "motorcycles", vt: 2 },
    { type: "trucks", vt: 3 },
  ];

  // Sort by: not done first, then oldest lastRun
  priorities.sort((a, b) => {
    const sa = typeStatus[a.vt];
    const sb2 = typeStatus[b.vt];
    if (!sa && !sb2) return 0;
    if (!sa) return -1; // Never run = highest priority
    if (!sb2) return 1;
    if (sa.done && !sb2.done) return 1;
    if (!sa.done && sb2.done) return -1;
    return sa.lastRun.localeCompare(sb2.lastRun);
  });

  const selected = priorities[0];
  console.log(`catalog-auto-all: selected ${selected.type} (round-robin)`);

  const result = await catalogAuto(sb, selected.type, maxModels);
  return { ...result, vehicleType: selected.type };
}

// ── ACTION: history-auto (batch import history for catalog items) ────

async function historyAuto(
  sb: ReturnType<typeof supabaseAdmin>,
  batchSize = 10
) {
  // Find catalog items with no/little history, round-robin across types
  const { data: items, error: catErr } = await sb
    .from("fipe_catalog")
    .select("fipe_code, year, year_id, brand_name, model_name, vehicle_type")
    .limit(batchSize * 3); // Fetch more to filter

  if (catErr || !items || items.length === 0) {
    return { processed: 0, inserted: 0, message: "No catalog items found" };
  }

  // Filter to items with sparse history
  const toProcess: typeof items = [];
  for (const item of items) {
    if (toProcess.length >= batchSize) break;
    const { count } = await sb
      .from("fipe_price_history")
      .select("id", { count: "exact", head: true })
      .eq("fipe_code", item.fipe_code)
      .eq("model_year", item.year);
    if ((count ?? 0) < 10) {
      toProcess.push(item);
    }
  }

  if (toProcess.length === 0) {
    return { processed: 0, inserted: 0, message: "All items have sufficient history" };
  }

  const logId = await createSyncLog(sb, "history_auto", undefined, `history_auto_batch`);
  let totalProcessed = 0;
  let totalInserted = 0;

  for (const item of toProcess) {
    const apiType = item.vehicle_type === 1 ? "cars" : item.vehicle_type === 2 ? "motorcycles" : "trucks";
    await sleep(DELAY_BETWEEN_REQUESTS_MS);

    try {
      const historyData: ParallelumFipeInfo = await fetchApi(
        `/${apiType}/${item.fipe_code}/years/${item.year_id}/history`
      );

      if (historyData.priceHistory?.length > 0) {
        const fipeCode = (historyData.codeFipe || item.fipe_code).replace(/-/g, "").trim();
        const inserted = await savePriceHistory(
          sb, fipeCode, historyData.modelYear || item.year, historyData.priceHistory
        );
        totalInserted += inserted;
        console.log(`  ${item.brand_name} ${item.model_name} ${item.year}: ${inserted} prices`);
      }
    } catch (e) {
      console.warn(`  History skip ${item.fipe_code}: ${e}`);
    }
    totalProcessed++;
  }

  await finishSyncLog(sb, logId!, totalProcessed, totalInserted);
  return { processed: totalProcessed, inserted: totalInserted };
}

// ── MAIN ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: only allow service_role or matching internal secret
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (token !== serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = supabaseAdmin();
    const body = await req.json();
    const { action, vehicleType, brandId, refCode, batchSize, offset, modelOffset, maxModels, dryRun } = body;

    if (dryRun) {
      return new Response(
        JSON.stringify({ success: true, dryRun: true, action, vehicleType }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: Record<string, unknown>;
    const vt: VehicleType = vehicleType || "cars";

    switch (action) {
      case "references":
        result = await importReferences(sb);
        break;

      case "brands": {
        const brands: ParallelumBrand[] = await fetchApi(`/${vt}/brands`);
        result = { brands: brands.map(b => ({ code: b.code, name: b.name })) };
        break;
      }

      case "catalog":
        result = await importCatalog(sb, vt, brandId, refCode, modelOffset || 0, maxModels || 10);
        break;

      case "history":
        result = await importHistory(sb, vt, batchSize || 20, offset || 0, brandId);
        break;

      case "catalog-auto":
        result = await catalogAuto(sb, vt, maxModels || 10);
        break;

      case "catalog-auto-all":
        result = await catalogAutoAll(sb, maxModels || 10);
        break;

      case "history-auto":
        result = await historyAuto(sb, batchSize || 10);
        break;

      case "status":
        result = await getStatus(sb);
        break;

      default:
        throw new Error(
          `Unknown action: ${action}. Use: references, catalog, catalog-auto, catalog-auto-all, history, history-auto, status`
        );
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fipe-bulk-import error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
