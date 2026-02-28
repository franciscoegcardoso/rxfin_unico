import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PARALLELUM_BASE = "https://fipe.parallelum.com.br/api/v2";
const VEHICLE_TYPES = ["cars", "motorcycles", "trucks"] as const;
type VehicleType = (typeof VEHICLE_TYPES)[number];

const DELAY_MS = 100;
const MAX_RETRIES = 3;

// ── Types ────────────────────────────────────────────────────────────

interface ParallelumBrand { code: string; name: string; }
interface ParallelumModel { code: string; name: string; }
interface ParallelumYear { code: string; name: string; }

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

      if (res.status === 424) {
        await res.text();
        throw new Error(`FIPE_UNAVAILABLE:${path}`);
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

function vehicleTypeToNumber(vt: VehicleType): number {
  return vt === "cars" ? 1 : vt === "motorcycles" ? 2 : 3;
}

function vehicleTypeFromNumber(n: number): VehicleType {
  return n === 1 ? "cars" : n === 2 ? "motorcycles" : "trucks";
}

// Paginated fetch to overcome PostgREST's 1,000-row server limit
async function fetchAllRows<T extends Record<string, unknown>>(
  buildQuery: () => ReturnType<ReturnType<typeof supabaseAdmin>["from"]>["select"]
): Promise<T[]> {
  const allRows: T[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await (buildQuery() as any).range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Paginated fetch error: ${error.message}`);
    if (!data || data.length === 0) break;
    allRows.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return allRows;
}

// ── ACTION: catalog-resume ──────────────────────────────────────────
// Compares API brands with DB, imports missing brands one at a time.
// Processes maxModelsPerBrand models per call to stay within timeout.

async function catalogResume(
  sb: ReturnType<typeof supabaseAdmin>,
  maxBrands = 3,
  maxModelsPerBrand = 15
) {
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 50_000; // 50s safety margin (60s timeout)

  let totalNewItems = 0;
  let brandsProcessed = 0;
  const details: Record<string, unknown>[] = [];

  for (const vt of VEHICLE_TYPES) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) break;
    if (brandsProcessed >= maxBrands) break;

    const vtNum = vehicleTypeToNumber(vt);

    // 1. Get all brands from API
    const apiBrands: ParallelumBrand[] = await fetchApi(`/${vt}/brands`);
    await sleep(DELAY_MS);

    // 2. Get brands already in DB
    const dbBrands = await fetchAllRows<{ brand_id: number }>(
      () => sb.from("fipe_catalog").select("brand_id").eq("vehicle_type", vtNum).order("brand_id")
    );

    const existingBrandIds = new Set(dbBrands.map((b) => b.brand_id));

    // 3. Find missing brands
    const missingBrands = apiBrands.filter(
      (b) => !existingBrandIds.has(parseInt(String(b.code)))
    );

    if (missingBrands.length === 0) {
      details.push({ type: vt, status: "complete", totalBrands: apiBrands.length });
      continue;
    }

    console.log(`${vt}: ${missingBrands.length} missing brands out of ${apiBrands.length}`);

    // 4. Process missing brands (up to maxBrands total across all types)
    for (const brand of missingBrands) {
      if (brandsProcessed >= maxBrands) break;
      if (Date.now() - startTime > MAX_RUNTIME_MS) break;

      const brandId = parseInt(String(brand.code));
      let brandItems = 0;

      try {
        // Fetch models
        const models: ParallelumModel[] = await fetchApi(
          `/${vt}/brands/${brand.code}/models`
        );
        await sleep(DELAY_MS);

        // Process up to maxModelsPerBrand models
        const modelsToProcess = models.slice(0, maxModelsPerBrand);

        for (const model of modelsToProcess) {
          if (Date.now() - startTime > MAX_RUNTIME_MS) break;

          await sleep(DELAY_MS);

          try {
            const years: ParallelumYear[] = await fetchApi(
              `/${vt}/brands/${brand.code}/models/${model.code}/years`
            );

            for (const year of years) {
              if (Date.now() - startTime > MAX_RUNTIME_MS) break;

              const [yearStr, fuelStr] = year.code.split("-");
              const yearNum = parseInt(yearStr);
              const fuelType = parseInt(fuelStr) || 1;

              await sleep(DELAY_MS);

              try {
                const info: ParallelumFipeInfo = await fetchApi(
                  `/${vt}/brands/${brand.code}/models/${model.code}/years/${year.code}`
                );

                if (info.codeFipe) {
                  const { error } = await sb.from("fipe_catalog").upsert(
                    {
                      vehicle_type: vtNum,
                      brand_id: brandId,
                      brand_name: brand.name,
                      model_id: parseInt(String(model.code)),
                      model_name: model.name,
                      year_id: year.code,
                      year: yearNum,
                      fuel_type: fuelType,
                      fipe_code: info.codeFipe.replace(/-/g, "").trim(),
                    },
                    {
                      onConflict: "vehicle_type,brand_id,model_id,year_id",
                      ignoreDuplicates: true,
                    }
                  );
                  if (!error) brandItems++;
                }
              } catch (e) {
                console.warn(`  Skip year ${year.code}: ${e}`);
              }
            }
          } catch (e) {
            console.warn(`  Skip model ${model.name}: ${e}`);
          }
        }

        totalNewItems += brandItems;
        brandsProcessed++;

        const hasMoreModels = models.length > maxModelsPerBrand;
        details.push({
          type: vt,
          brand: brand.name,
          brandId,
          modelsTotal: models.length,
          modelsProcessed: Math.min(models.length, maxModelsPerBrand),
          itemsInserted: brandItems,
          hasMoreModels,
        });

        console.log(
          `  ✓ ${brand.name}: ${brandItems} items (${Math.min(models.length, maxModelsPerBrand)}/${models.length} models)`
        );
      } catch (e) {
        console.warn(`  Skip brand ${brand.name}: ${e}`);
        details.push({ type: vt, brand: brand.name, error: String(e) });
      }
    }

    // Report remaining missing
    const remaining = missingBrands.length - brandsProcessed;
    if (remaining > 0) {
      details.push({
        type: vt,
        remainingMissingBrands: remaining,
        examples: missingBrands.slice(brandsProcessed, brandsProcessed + 5).map((b) => b.name),
      });
    }
  }

  return {
    brandsProcessed,
    newItems: totalNewItems,
    hasMore: brandsProcessed >= maxBrands, // May have more to process
    details,
    elapsedMs: Date.now() - startTime,
  };
}

// ── ACTION: catalog-fill-models ─────────────────────────────────────
// Fills missing models for brands already in DB (fixes truncated imports).

async function catalogFillModels(
  sb: ReturnType<typeof supabaseAdmin>,
  vehicleType: number | null = null,
  maxBrands = 2,
  startFromBrandId: number | null = null
) {
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 50_000;

  let totalNewItems = 0;
  let brandsChecked = 0;
  let brandsWithMissing = 0;
  const details: Record<string, unknown>[] = [];

  const vtList: VehicleType[] = vehicleType
    ? [vehicleTypeFromNumber(vehicleType)]
    : [...VEHICLE_TYPES];

  for (const vt of vtList) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) break;
    if (brandsWithMissing >= maxBrands) break;

    const vtNum = vehicleTypeToNumber(vt);

    // 1. Get all brands in DB with model counts, ordered by fewest models first
    const dbBrandsRaw = await fetchAllRows<{
      brand_id: number;
      brand_name: string;
      model_id: number;
    }>(
      () =>
        sb
          .from("fipe_catalog")
          .select("brand_id, brand_name, model_id")
          .eq("vehicle_type", vtNum)
          .order("brand_id")
    );

    // Group by brand and count distinct models
    const brandMap = new Map<number, { name: string; modelIds: Set<number> }>();
    for (const row of dbBrandsRaw) {
      let entry = brandMap.get(row.brand_id);
      if (!entry) {
        entry = { name: row.brand_name, modelIds: new Set() };
        brandMap.set(row.brand_id, entry);
      }
      entry.modelIds.add(row.model_id);
    }

    // Sort by model count ascending (most incomplete first)
    const sortedBrands = [...brandMap.entries()]
      .map(([id, v]) => ({ brandId: id, brandName: v.name, dbModelCount: v.modelIds.size, dbModelIds: v.modelIds }))
      .sort((a, b) => a.dbModelCount - b.dbModelCount);

    // Apply startFromBrandId filter: if provided, process ONLY that brand
    const brandsToCheck = startFromBrandId
      ? sortedBrands.filter((b) => b.brandId === startFromBrandId)
      : sortedBrands;

    // Also build a map of model_id -> Set<year_id> for existing models
    const modelYearMap = new Map<number, Set<string>>();
    for (const row of dbBrandsRaw) {
      // We need year_id too — but we don't have it yet. We'll fetch it below.
    }

    for (const brand of brandsToCheck) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) break;
      if (brandsWithMissing >= maxBrands) break;

      brandsChecked++;

      // 2. Fetch models from API
      await sleep(DELAY_MS);
      let apiModels: ParallelumModel[];
      try {
        apiModels = await fetchApi(`/${vt}/brands/${brand.brandId}/models`);
      } catch (e) {
        console.warn(`  Skip brand ${brand.brandName}: ${e}`);
        continue;
      }

      // 3. Find missing models
      const missingModels = apiModels.filter(
        (m) => !brand.dbModelIds.has(parseInt(String(m.code)))
      );

      // 4. Find existing models that might have missing years
      const existingModelCodes = apiModels.filter(
        (m) => brand.dbModelIds.has(parseInt(String(m.code)))
      );

      if (missingModels.length === 0 && existingModelCodes.length === 0) continue;

      // This brand needs work
      brandsWithMissing++;
      let brandItems = 0;

      // --- Phase 1: Import completely missing models ---
      if (missingModels.length > 0) {
        console.log(
          `${vt} ${brand.brandName} (id=${brand.brandId}): Phase 1 - ${missingModels.length} missing models`
        );

        for (const model of missingModels) {
          if (Date.now() - startTime > MAX_RUNTIME_MS) break;

          await sleep(DELAY_MS);
          try {
            const years: ParallelumYear[] = await fetchApi(
              `/${vt}/brands/${brand.brandId}/models/${model.code}/years`
            );

            for (const year of years) {
              if (Date.now() - startTime > MAX_RUNTIME_MS) break;

              const [yearStr, fuelStr] = year.code.split("-");
              const yearNum = parseInt(yearStr);
              const fuelType = parseInt(fuelStr) || 1;

              await sleep(DELAY_MS);
              try {
                const info: ParallelumFipeInfo = await fetchApi(
                  `/${vt}/brands/${brand.brandId}/models/${model.code}/years/${year.code}`
                );

                if (info.codeFipe) {
                  const { error } = await sb.from("fipe_catalog").upsert(
                    {
                      vehicle_type: vtNum,
                      brand_id: brand.brandId,
                      brand_name: brand.brandName,
                      model_id: parseInt(String(model.code)),
                      model_name: model.name,
                      year_id: year.code,
                      year: yearNum,
                      fuel_type: fuelType,
                      fipe_code: info.codeFipe.replace(/-/g, "").trim(),
                    },
                    {
                      onConflict: "vehicle_type,brand_id,model_id,year_id",
                      ignoreDuplicates: true,
                    }
                  );
                  if (!error) brandItems++;
                }
              } catch (e) {
                console.warn(`    Skip year ${year.code}: ${e}`);
              }
            }
          } catch (e) {
            console.warn(`    Skip model ${model.name}: ${e}`);
          }
        }
      }

      // --- Phase 2: Fill missing years for existing models ---
      if (existingModelCodes.length > 0 && Date.now() - startTime < MAX_RUNTIME_MS) {
        // Fetch existing year_ids for this brand from DB
        const dbYearsRaw = await fetchAllRows<{
          model_id: number;
          year_id: string;
        }>(
          () =>
            sb
              .from("fipe_catalog")
              .select("model_id, year_id")
              .eq("vehicle_type", vtNum)
              .eq("brand_id", brand.brandId)
              .order("model_id")
        );

        const dbModelYears = new Map<number, Set<string>>();
        for (const row of dbYearsRaw) {
          let s = dbModelYears.get(row.model_id);
          if (!s) {
            s = new Set();
            dbModelYears.set(row.model_id, s);
          }
          s.add(row.year_id);
        }

        let modelsWithMissingYears = 0;

        // Sort existing models by year count ascending (fewest years first = most incomplete)
        const sortedExistingModels = [...existingModelCodes].sort((a, b) => {
          const aYears = dbModelYears.get(parseInt(String(a.code)))?.size || 0;
          const bYears = dbModelYears.get(parseInt(String(b.code)))?.size || 0;
          return aYears - bYears;
        });

        console.log(
          `${vt} ${brand.brandName} (id=${brand.brandId}): Phase 2 - checking ${sortedExistingModels.length} existing models for missing years`
        );

        // Process models in parallel batches of 3 for speed
        const P2_BATCH = 3;
        for (let mi = 0; mi < sortedExistingModels.length; mi += P2_BATCH) {
          if (Date.now() - startTime > MAX_RUNTIME_MS) break;

          const modelBatch = sortedExistingModels.slice(mi, mi + P2_BATCH);

          // Fetch years for batch in parallel
          const yearResults = await Promise.allSettled(
            modelBatch.map(async (model) => {
              const modelId = parseInt(String(model.code));
              const existingYears = dbModelYears.get(modelId) || new Set();
              const apiYears: ParallelumYear[] = await fetchApi(
                `/${vt}/brands/${brand.brandId}/models/${model.code}/years`
              );
              return { model, modelId, existingYears, missingYears: apiYears.filter((y) => !existingYears.has(y.code)) };
            })
          );

          for (const result of yearResults) {
            if (result.status !== 'fulfilled' || result.value.missingYears.length === 0) continue;
            if (Date.now() - startTime > MAX_RUNTIME_MS) break;

            const { model, modelId, existingYears, missingYears } = result.value;
            modelsWithMissingYears++;
            console.log(`  Model ${model.name} (id=${model.code}): ${existingYears.size} in DB, ${missingYears.length} missing`);

            // Fetch details for missing years in parallel batches
            for (let yi = 0; yi < missingYears.length; yi += P2_BATCH) {
              if (Date.now() - startTime > MAX_RUNTIME_MS) break;

              const yearBatch = missingYears.slice(yi, yi + P2_BATCH);
              const detailResults = await Promise.allSettled(
                yearBatch.map(async (year) => {
                  const [yearStr, fuelStr] = year.code.split("-");
                  const info: ParallelumFipeInfo = await fetchApi(
                    `/${vt}/brands/${brand.brandId}/models/${model.code}/years/${year.code}`
                  );
                  return { yearNum: parseInt(yearStr), fuelType: parseInt(fuelStr) || 1, yearCode: year.code, info };
                })
              );

              const rows: Record<string, unknown>[] = [];
              for (const dr of detailResults) {
                if (dr.status !== 'fulfilled') continue;
                const { yearNum, fuelType, yearCode, info } = dr.value;
                if (info.codeFipe) {
                  rows.push({
                    vehicle_type: vtNum, brand_id: brand.brandId, brand_name: brand.brandName,
                    model_id: modelId, model_name: model.name, year_id: yearCode,
                    year: yearNum, fuel_type: fuelType,
                    fipe_code: info.codeFipe.replace(/-/g, "").trim(),
                  });
                }
              }

              if (rows.length > 0) {
                const { error, data } = await sb.from("fipe_catalog").upsert(rows, {
                  onConflict: "vehicle_type,brand_id,model_id,year_id", ignoreDuplicates: true,
                });
                if (error) {
                  console.error(`  UPSERT ERROR: ${error.message} | rows: ${JSON.stringify(rows[0])}`);
                } else {
                  brandItems += rows.length;
                  console.log(`    Inserted ${rows.length} year(s)`);
                }
              }
            }
          }
        }

        if (modelsWithMissingYears > 0) {
          console.log(`  Phase 2: ${modelsWithMissingYears} models had missing years`);
        }
      }

      totalNewItems += brandItems;
      details.push({
        type: vt,
        brand: brand.brandName,
        brandId: brand.brandId,
        dbModels: brand.dbModelCount,
        apiModels: apiModels.length,
        missingModels: missingModels.length,
        existingModelsChecked: existingModelCodes.length,
        itemsInserted: brandItems,
      });

      console.log(`  ✓ ${brand.brandName}: +${brandItems} items (total)`);
    }
  }

  return {
    brandsChecked,
    brandsWithMissing,
    newItems: totalNewItems,
    hasMore: brandsWithMissing >= maxBrands,
    details,
    elapsedMs: Date.now() - startTime,
  };
}

// ── ACTION: history-fill ────────────────────────────────────────────
// Finds catalog items without price history and fetches it.

async function historyFill(
  sb: ReturnType<typeof supabaseAdmin>,
  batchSize = 30
) {
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 50_000;

  // Use optimized RPC that does a LEFT JOIN to find items without history
  const { data: toProcess, error: rpcErr } = await sb
    .rpc("get_catalog_without_history", { p_limit: batchSize });

  if (rpcErr) {
    console.error("RPC error:", rpcErr.message);
    return { processed: 0, inserted: 0, error: rpcErr.message };
  }

  if (!toProcess?.length) {
    return {
      processed: 0,
      inserted: 0,
      remaining: 0,
      message: "All catalog items have price history",
    };
  }

  let totalProcessed = 0;
  let totalInserted = 0;

  for (const item of toProcess) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) break;

    const apiType = vehicleTypeFromNumber(item.vehicle_type);
    await sleep(DELAY_MS);

    try {
      const historyData: ParallelumFipeInfo = await fetchApi(
        `/${apiType}/brands/${item.brand_id}/models/${item.model_id}/years/${item.year_id}`
      );

      if (historyData.priceHistory?.length > 0) {
        const fipeCode = (historyData.codeFipe || item.fipe_code)
          .replace(/-/g, "")
          .trim();
        const modelYear = historyData.modelYear || item.year;

        const rows = historyData.priceHistory
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

        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 200) {
            const batch = rows.slice(i, i + 200);
            const { error } = await sb
              .from("fipe_price_history")
              .upsert(batch as Record<string, unknown>[], {
                onConflict: "fipe_code,model_year,reference_code",
                ignoreDuplicates: true,
              });
            if (!error) totalInserted += batch.length;
          }
        }

        console.log(
          `  ${item.brand_name} ${item.model_name} ${item.year}: ${rows.length} prices`
        );
      }
    } catch (e) {
      const msg = (e as Error).message || '';
      if (msg.startsWith('FIPE_UNAVAILABLE:')) {
        // Silent skip for upstream unavailable
      } else {
        console.warn(`  Skip ${item.fipe_code} ${item.year_id}: ${e}`);
      }
    }

    totalProcessed++;
  }

  return {
    processed: totalProcessed,
    inserted: totalInserted,
    hasMore: toProcess.length === batchSize,
    elapsedMs: Date.now() - startTime,
  };
}

// ── ACTION: populate-references ─────────────────────────────────────
// Fetches all FIPE references from the Parallelum API and populates the table.

async function populateReferences(sb: ReturnType<typeof supabaseAdmin>) {
  interface ParallelumRef { code: number; month: string; }
  const refs: ParallelumRef[] = await fetchApi("/references");
  console.log(`[populate-references] Got ${refs.length} references from API`);

  const rows = refs.map((r) => {
    const { month, year } = parseRefMonth(r.month);
    return {
      reference_code: r.code,
      month,
      year,
      slug: r.month,
    };
  });

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await sb
      .from("fipe_reference")
      .upsert(batch, { onConflict: "reference_code", ignoreDuplicates: true });
    if (!error) inserted += batch.length;
    else console.warn(`Reference upsert error: ${error.message}`);
  }

  return { totalFromAPI: refs.length, inserted };
}

// ── ACTION: catalog-backfill-years ──────────────────────────────────
// Finds fipe_codes that only have 0km (year=32000) and fetches real years.

async function catalogBackfillYears(
  sb: ReturnType<typeof supabaseAdmin>,
  batchSize = 50
) {
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 50_000;

  const { data: items, error: rpcErr } = await sb
    .rpc("get_catalog_only_zero_km", { p_limit: batchSize });

  if (rpcErr) {
    console.error("RPC error:", rpcErr.message);
    return { processed: 0, inserted: 0, error: rpcErr.message };
  }

  if (!items?.length) {
    return { processed: 0, inserted: 0, remaining: 0, hasMore: false, message: "All fipe_codes already have real years" };
  }

  console.log(`[catalog-backfill-years] Processing ${items.length} codes with only 0km`);

  let totalProcessed = 0;
  let totalInserted = 0;

  for (const item of items) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) break;

    const apiType = vehicleTypeFromNumber(item.vehicle_type);
    await sleep(DELAY_MS);

    try {
      // Fetch available years from API
      const years: ParallelumYear[] = await fetchApi(
        `/${apiType}/brands/${item.brand_id}/models/${item.model_id}/years`
      );

      for (const year of years) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) break;

        const [yearStr, fuelStr] = year.code.split("-");
        const yearNum = parseInt(yearStr);
        if (yearNum === 32000) continue; // Skip 0km, already have it

        const fuelType = parseInt(fuelStr) || 1;
        await sleep(DELAY_MS);

        try {
          const info: ParallelumFipeInfo = await fetchApi(
            `/${apiType}/brands/${item.brand_id}/models/${item.model_id}/years/${year.code}`
          );

          if (info.codeFipe) {
            const { error } = await sb.from("fipe_catalog").upsert(
              {
                vehicle_type: item.vehicle_type,
                brand_id: item.brand_id,
                brand_name: item.brand_name,
                model_id: item.model_id,
                model_name: item.model_name,
                year_id: year.code,
                year: yearNum,
                fuel_type: fuelType,
                fipe_code: info.codeFipe.replace(/-/g, "").trim(),
              },
              { onConflict: "vehicle_type,brand_id,model_id,year_id", ignoreDuplicates: true }
            );
            if (!error) totalInserted++;
          }
        } catch (e) {
          console.warn(`  Skip year ${year.code}: ${e}`);
        }
      }

      console.log(`  ✓ ${item.brand_name} ${item.model_name} (${item.fipe_code}): +${totalInserted} years`);
    } catch (e) {
      console.warn(`  Skip ${item.fipe_code}: ${e}`);
    }

    totalProcessed++;
  }

  return {
    processed: totalProcessed,
    inserted: totalInserted,
    hasMore: items.length === batchSize,
    elapsedMs: Date.now() - startTime,
  };
}

// ── ACTION: history-deep-fill ───────────────────────────────────────
// Enriches catalog entries that have sparse price history (< maxRefs).

async function historyDeepFill(
  sb: ReturnType<typeof supabaseAdmin>,
  batchSize = 30,
  maxRefs = 10
) {
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 50_000;

  const { data: items, error: rpcErr } = await sb
    .rpc("get_catalog_sparse_history", { p_limit: batchSize, p_max_refs: maxRefs });

  if (rpcErr) {
    console.error("RPC error:", rpcErr.message);
    return { processed: 0, inserted: 0, error: rpcErr.message };
  }

  if (!items?.length) {
    return { processed: 0, inserted: 0, hasMore: false, message: "All catalog entries have sufficient history" };
  }

  console.log(`[history-deep-fill] Processing ${items.length} entries with < ${maxRefs} refs`);

  let totalProcessed = 0;
  let totalInserted = 0;

  for (const item of items) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) break;

    const apiType = vehicleTypeFromNumber(item.vehicle_type);
    await sleep(DELAY_MS);

    try {
      const historyData: ParallelumFipeInfo = await fetchApi(
        `/${apiType}/brands/${item.brand_id}/models/${item.model_id}/years/${item.year_id}`
      );

      if (historyData.priceHistory?.length > 0) {
        const fipeCode = (historyData.codeFipe || item.fipe_code).replace(/-/g, "").trim();
        const modelYear = historyData.modelYear || item.year;

        const rows = historyData.priceHistory
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

        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 200) {
            const batch = rows.slice(i, i + 200);
            const { error } = await sb
              .from("fipe_price_history")
              .upsert(batch as Record<string, unknown>[], {
                onConflict: "fipe_code,model_year,reference_code",
                ignoreDuplicates: true,
              });
            if (!error) totalInserted += batch.length;
          }
        }

        console.log(
          `  ${item.brand_name} ${item.model_name} yr=${item.year}: had ${item.current_refs}, fetched ${rows.length}`
        );
      }
    } catch (e) {
      const msg = (e as Error).message || '';
      if (msg.startsWith('FIPE_UNAVAILABLE:')) {
        // Silent skip for upstream unavailable
      } else {
        console.warn(`  Skip ${item.fipe_code} ${item.year_id}: ${e}`);
      }
    }

    totalProcessed++;
  }

  return {
    processed: totalProcessed,
    inserted: totalInserted,
    hasMore: items.length === batchSize,
    elapsedMs: Date.now() - startTime,
  };
}

// ── ACTION: status ──────────────────────────────────────────────────

async function getStatus(sb: ReturnType<typeof supabaseAdmin>) {
  // Count catalog per vehicle type
  const counts: Record<string, unknown> = {};

  for (const vt of VEHICLE_TYPES) {
    const vtNum = vehicleTypeToNumber(vt);

    const { count: catalogCount } = await sb
      .from("fipe_catalog")
      .select("fipe_code", { count: "exact", head: true })
      .eq("vehicle_type", vtNum);

    // Get distinct brands in DB (use order to ensure consistent pagination)
    const dbBrands = await fetchAllRows<{ brand_id: number; brand_name: string }>(
      () => sb.from("fipe_catalog").select("brand_id, brand_name").eq("vehicle_type", vtNum).order("brand_id")
    );

    const uniqueBrands = new Map<number, string>();
    for (const b of dbBrands) {
      uniqueBrands.set(b.brand_id, b.brand_name);
    }

    // Get total brands from API
    try {
      const apiBrands: ParallelumBrand[] = await fetchApi(`/${vt}/brands`);
      await sleep(DELAY_MS);

      const missingBrands = apiBrands.filter(
        (b) => !uniqueBrands.has(parseInt(String(b.code)))
      );

      counts[vt] = {
        catalogItems: catalogCount ?? 0,
        brandsInDB: uniqueBrands.size,
        brandsInAPI: apiBrands.length,
        missingBrands: missingBrands.length,
        missingBrandNames: missingBrands.slice(0, 10).map((b) => b.name),
      };
    } catch {
      counts[vt] = {
        catalogItems: catalogCount ?? 0,
        brandsInDB: uniqueBrands.size,
        error: "Could not fetch API brands",
      };
    }
  }

  // Price history stats
  const { count: totalPrices } = await sb
    .from("fipe_price_history")
    .select("id", { count: "exact", head: true });

  return { vehicleTypes: counts, totalPriceHistory: totalPrices ?? 0 };
}

// ── MAIN ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = supabaseAdmin();

    let action = "status";
    let maxBrands = 3;
    let batchSize = 30;
    let maxModelsPerBrand = 15;
    let vehicleType: number | null = null;
    let startFromBrandId: number | null = null;
    let maxRefs = 10;

    // Parse body from JSON or try reading raw text (pg_net compatibility)
    const contentType = req.headers.get("content-type") || "";
    const rawBody = await req.text();
    console.log(`[fipe-orchestrator] method=${req.method} content-type=${contentType} body=${rawBody.substring(0, 500)}`);

    if (rawBody) {
      try {
        const body = JSON.parse(rawBody);
        action = body.action || "status";
        maxBrands = body.maxBrands || 3;
        batchSize = body.batchSize || 15;
        maxModelsPerBrand = body.maxModelsPerBrand || 15;
        vehicleType = body.vehicleType || null;
        startFromBrandId = body.startFromBrandId || null;
        maxRefs = body.maxRefs || 10;
      } catch (e) {
        console.warn(`[fipe-orchestrator] Failed to parse body: ${e}`);
      }
    }

    console.log(`[fipe-orchestrator] action=${action} maxBrands=${maxBrands} batchSize=${batchSize} maxModelsPerBrand=${maxModelsPerBrand}`);

    let result: Record<string, unknown>;

    switch (action) {
      case "catalog-resume":
        result = await catalogResume(sb, maxBrands, maxModelsPerBrand);
        break;

      case "history-fill":
        result = await historyFill(sb, batchSize);
        break;

      case "status":
        result = await getStatus(sb);
        break;

      case "populate-references":
        result = await populateReferences(sb);
        break;

      case "catalog-fill-models":
        result = await catalogFillModels(sb, vehicleType, maxBrands, startFromBrandId);
        break;

      case "catalog-backfill-years":
        result = await catalogBackfillYears(sb, batchSize);
        break;

      case "history-deep-fill":
        result = await historyDeepFill(sb, batchSize, maxRefs);
        break;

      default:
        throw new Error(
          `Unknown action: ${action}. Use: catalog-resume, catalog-fill-models, catalog-backfill-years, history-fill, history-deep-fill, status, populate-references`
        );
    }

    return new Response(
      JSON.stringify({ success: true, action, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fipe-orchestrator error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
