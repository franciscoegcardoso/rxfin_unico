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
const MAX_RUNTIME_MS = 50_000;
const STATE_KEY = "fipe_auto_runner_state";

// ── Types ────────────────────────────────────────────────────────────

interface RunnerState {
  status: "idle" | "running" | "paused" | "completed";
  phase: number; // 0-3
  iteration: number;
  totals: {
    catalogInserted: number;
    pricesInserted: number;
    unavailable424: number;
  };
  phase0VehicleTypeIndex: number;
  phase0LastBrandId: number | null;
  phase0LastModelId: number | null;
  lastRunAt: string | null;
  nextCallScheduled: boolean;
  lastError: string | null;
}

interface ParallelumBrand { code: string; name: string; }
interface ParallelumModel { code: string; name: string; }
interface ParallelumYear { code: string; name: string; }

interface ParallelumFipeInfo {
  brand: string;
  codeFipe: string;
  fuel: string;
  fuelAcronym: string;
  model: string;
  modelYear: number;
  price: string;
  priceHistory: { month: string; price: string; reference: string; }[];
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
      if ((err as Error).message?.startsWith("FIPE_UNAVAILABLE:")) throw err;
      if (attempt === retries - 1) throw err;
      await sleep(2000 * (attempt + 1));
    }
  }
  throw new Error(`Failed after ${retries} retries: ${path}`);
}

function parsePrice(valor: string): number {
  return parseFloat(valor.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
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

const defaultState: RunnerState = {
  status: "idle",
  phase: 0,
  iteration: 0,
  totals: { catalogInserted: 0, pricesInserted: 0, unavailable424: 0 },
  phase0VehicleTypeIndex: 0,
  phase0LastBrandId: null,
  phase0LastModelId: null,
  lastRunAt: null,
  nextCallScheduled: false,
  lastError: null,
};

// ── State persistence ────────────────────────────────────────────────

async function loadState(sb: ReturnType<typeof supabaseAdmin>): Promise<RunnerState> {
  const { data } = await sb
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", STATE_KEY)
    .maybeSingle();
  if (data?.setting_value) {
    try {
      const parsed = data.setting_value;
      return { ...defaultState, ...parsed };
    } catch { /* ignore */ }
  }
  return { ...defaultState };
}

async function saveState(sb: ReturnType<typeof supabaseAdmin>, state: RunnerState) {
  await sb.from("app_settings").upsert({
    setting_key: STATE_KEY,
    setting_value: state as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  }, { onConflict: "setting_key" });
}

// ── Auto-loop via pg_net ─────────────────────────────────────────────

async function scheduleNextRun(sb: ReturnType<typeof supabaseAdmin>): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const url = `${supabaseUrl}/functions/v1/fipe-auto-runner`;

  try {
    const { error } = await sb.rpc("net_http_post" as any, {
      url,
      headers: JSON.stringify({
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      }),
      body: JSON.stringify({ action: "run" }),
      timeout_milliseconds: 5000,
    });

    if (error) {
      // pg_net might not be available — fall back to frontend polling
      console.warn(`pg_net scheduling failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`pg_net not available: ${e}`);
    return false;
  }
}

// ── Phase 0: Complete fipe_catalog ───────────────────────────────────

async function runPhase0(
  sb: ReturnType<typeof supabaseAdmin>,
  state: RunnerState,
  startTime: number
): Promise<{ done: boolean; inserted: number }> {
  let inserted = 0;

  for (let vtIdx = state.phase0VehicleTypeIndex; vtIdx < VEHICLE_TYPES.length; vtIdx++) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      state.phase0VehicleTypeIndex = vtIdx;
      return { done: false, inserted };
    }

    const vt = VEHICLE_TYPES[vtIdx];
    const vtNum = vehicleTypeToNumber(vt);
    const brands: ParallelumBrand[] = await fetchApi(`/${vt}/brands`);
    await sleep(DELAY_MS);

    // Sort brands and skip already processed
    const sortedBrands = brands.sort((a, b) => parseInt(a.code) - parseInt(b.code));
    const startIdx = state.phase0LastBrandId
      ? sortedBrands.findIndex((b) => parseInt(b.code) > state.phase0LastBrandId!)
      : 0;

    for (let bi = Math.max(0, startIdx); bi < sortedBrands.length; bi++) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        state.phase0VehicleTypeIndex = vtIdx;
        state.phase0LastBrandId = parseInt(sortedBrands[bi].code);
        return { done: false, inserted };
      }

      const brand = sortedBrands[bi];
      const brandId = parseInt(brand.code);
      await sleep(DELAY_MS);

      let models: ParallelumModel[];
      try {
        models = await fetchApi(`/${vt}/brands/${brand.code}/models`);
      } catch (e) {
        if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
          state.totals.unavailable424++;
          continue;
        }
        throw e;
      }
      await sleep(DELAY_MS);

      // Sort models and skip already processed within this brand
      const sortedModels = models.sort((a, b) => parseInt(a.code) - parseInt(b.code));
      const modelStartIdx =
        state.phase0LastBrandId === brandId && state.phase0LastModelId
          ? sortedModels.findIndex((m) => parseInt(m.code) > state.phase0LastModelId!)
          : 0;

      for (let mi = Math.max(0, modelStartIdx); mi < sortedModels.length; mi++) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) {
          state.phase0VehicleTypeIndex = vtIdx;
          state.phase0LastBrandId = brandId;
          state.phase0LastModelId = parseInt(sortedModels[mi].code);
          await saveState(sb, state); // Granular checkpoint
          return { done: false, inserted };
        }

        const model = sortedModels[mi];
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
                    model_id: parseInt(model.code),
                    model_name: model.name,
                    year_id: year.code,
                    year: yearNum,
                    fuel_type: fuelType,
                    fipe_code: info.codeFipe.replace(/-/g, "").trim(),
                  },
                  { onConflict: "vehicle_type,brand_id,model_id,year_id", ignoreDuplicates: true }
                );
                if (!error) inserted++;
              }
            } catch (e) {
              if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
                state.totals.unavailable424++;
              }
            }
          }
        } catch (e) {
          if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
            state.totals.unavailable424++;
          }
        }

        // Update model checkpoint
        state.phase0LastModelId = parseInt(model.code);
      }

      // Finished all models for this brand
      state.phase0LastBrandId = brandId;
      state.phase0LastModelId = null;
    }

    // Finished this vehicle type
    state.phase0LastBrandId = null;
    state.phase0LastModelId = null;
  }

  return { done: true, inserted };
}

// ── Phase 1: Expand 0km entries ──────────────────────────────────────

async function runPhase1(
  sb: ReturnType<typeof supabaseAdmin>,
  state: RunnerState,
  startTime: number
): Promise<{ done: boolean; inserted: number }> {
  let inserted = 0;

  const { data: items, error } = await sb
    .rpc("get_catalog_only_zero_km", { p_limit: 50 });

  if (error || !items?.length) return { done: true, inserted: 0 };

  for (const item of items) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) return { done: false, inserted };

    const apiType = vehicleTypeFromNumber(item.vehicle_type);
    await sleep(DELAY_MS);

    try {
      // Phase 1: NO year_id from RPC — must list years first
      const years: ParallelumYear[] = await fetchApi(
        `/${apiType}/brands/${item.brand_id}/models/${item.model_id}/years`
      );

      for (const year of years) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) break;

        const [yearStr, fuelStr] = year.code.split("-");
        const yearNum = parseInt(yearStr);
        if (yearNum === 32000) continue;
        const fuelType = parseInt(fuelStr) || 1;
        await sleep(DELAY_MS);

        try {
          const info: ParallelumFipeInfo = await fetchApi(
            `/${apiType}/brands/${item.brand_id}/models/${item.model_id}/years/${year.code}`
          );

          if (info.codeFipe) {
            const { error: uErr } = await sb.from("fipe_catalog").upsert(
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
            if (!uErr) inserted++;
          }
        } catch (e) {
          if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
            state.totals.unavailable424++;
          }
        }
      }
    } catch (e) {
      if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
        state.totals.unavailable424++;
      }
    }
  }

  return { done: items.length < 50, inserted };
}

// ── Phase 2: Fill missing history (model-level) ─────────────────────
//
// Architecture: Processes per MODEL (brand+model), not per year_id.
// The Parallelum API may return priceHistory only for certain year_ids
// (e.g., 32000-1 for 0km) while others return []. By fetching ALL
// year_ids for a model, we capture all available history and only
// sentinel catalog entries that genuinely have no data.

async function runPhase2(
  sb: ReturnType<typeof supabaseAdmin>,
  state: RunnerState,
  startTime: number
): Promise<{ done: boolean; inserted: number }> {
  let inserted = 0;

  const { data: items, error } = await sb
    .rpc("get_catalog_without_history", { p_limit: 30 });

  if (error || !items?.length) return { done: true, inserted: 0 };

  // Group catalog items by model (vehicle_type + brand_id + model_id)
  const modelGroups = new Map<string, typeof items>();
  for (const item of items) {
    const key = `${item.vehicle_type}-${item.brand_id}-${item.model_id}`;
    if (!modelGroups.has(key)) modelGroups.set(key, []);
    modelGroups.get(key)!.push(item);
  }

  console.log(`[Phase2] ${items.length} catalog items in ${modelGroups.size} model groups`);

  for (const [groupKey, modelItems] of modelGroups) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) return { done: false, inserted };

    const first = modelItems[0];
    const apiType = vehicleTypeFromNumber(first.vehicle_type);

    // Track which model_years received actual history data
    const modelYearsWithData = new Set<number>();

    try {
      // Step 1: List ALL year_ids for this model from the Parallelum API
      await sleep(DELAY_MS);
      const apiYears: ParallelumYear[] = await fetchApi(
        `/${apiType}/brands/${first.brand_id}/models/${first.model_id}/years`
      );

      console.log(`[Phase2] Model ${groupKey} (${first.brand_name} ${first.model_name}): ${apiYears.length} API year_ids, ${modelItems.length} catalog entries missing`);

      // Step 2: Fetch EACH year_id and collect ALL priceHistory
      for (const apiYear of apiYears) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) return { done: false, inserted };

        await sleep(DELAY_MS);

        try {
          const info: ParallelumFipeInfo = await fetchApi(
            `/${apiType}/brands/${first.brand_id}/models/${first.model_id}/years/${apiYear.code}`
          );

          if (info.priceHistory?.length > 0) {
            const fipeCode = (info.codeFipe || first.fipe_code).replace(/-/g, "").trim();
            const modelYear = info.modelYear;

            const rows = info.priceHistory
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
                const { error: uErr } = await sb
                  .from("fipe_price_history")
                  .upsert(batch as Record<string, unknown>[], {
                    onConflict: "fipe_code,model_year,reference_code",
                    ignoreDuplicates: true,
                  });
                if (!uErr) inserted += batch.length;
              }
              modelYearsWithData.add(modelYear);
            }
          }
        } catch (e) {
          if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
            state.totals.unavailable424++;
          }
          // Continue with other year_ids — don't abort the model
        }
      }

      // Step 3: Sentinel catalog entries that still have no direct history match
      const sentineled: string[] = [];
      for (const item of modelItems) {
        if (!modelYearsWithData.has(item.year)) {
          // Differentiate: data exists under another modelYear vs no data at all
          const label = modelYearsWithData.size > 0
            ? "dados_em_outro_model_year"
            : "sem_historico";

          await sb.from("fipe_price_history").upsert({
            fipe_code: item.fipe_code,
            model_year: item.year,
            reference_code: 0,
            price: 0,
            reference_month: 1,
            reference_year: item.year,
            reference_label: label,
          } as Record<string, unknown>, {
            onConflict: "fipe_code,model_year,reference_code",
            ignoreDuplicates: true,
          });
          sentineled.push(`${item.year}`);
        }
      }

      console.log(`[Phase2] Model ${groupKey}: ${modelYearsWithData.size} years with data [${[...modelYearsWithData].join(",")}], ${sentineled.length} sentineled [${sentineled.join(",")}]`);

    } catch (e) {
      if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
        state.totals.unavailable424++;
        // Model-level failure (e.g., can't list years): sentinel all items
        for (const item of modelItems) {
          await sb.from("fipe_price_history").upsert({
            fipe_code: item.fipe_code,
            model_year: item.year,
            reference_code: 0,
            price: 0,
            reference_month: 1,
            reference_year: item.year,
            reference_label: "indisponível",
          } as Record<string, unknown>, {
            onConflict: "fipe_code,model_year,reference_code",
            ignoreDuplicates: true,
          });
        }
        console.log(`[Phase2] Model ${groupKey}: unavailable (424), ${modelItems.length} items sentineled`);
      }
    }
  }

  return { done: items.length < 30, inserted };
}

// ── Phase 3: Sparse history enrichment (model-level) ─────────────────
//
// Same model-level approach as Phase 2: groups items by model, fetches
// ALL year_ids, and collects all available priceHistory before deciding
// what to do with sparse entries.

async function runPhase3(
  sb: ReturnType<typeof supabaseAdmin>,
  state: RunnerState,
  startTime: number
): Promise<{ done: boolean; inserted: number }> {
  let inserted = 0;

  const { data: items, error } = await sb
    .rpc("get_catalog_sparse_history", { p_limit: 30, p_max_refs: 20 });

  if (error || !items?.length) return { done: true, inserted: 0 };

  // Group by model
  const modelGroups = new Map<string, typeof items>();
  for (const item of items) {
    const key = `${item.vehicle_type}-${item.brand_id}-${item.model_id}`;
    if (!modelGroups.has(key)) modelGroups.set(key, []);
    modelGroups.get(key)!.push(item);
  }

  console.log(`[Phase3] ${items.length} sparse items in ${modelGroups.size} model groups`);

  for (const [groupKey, modelItems] of modelGroups) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) return { done: false, inserted };

    const first = modelItems[0];
    const apiType = vehicleTypeFromNumber(first.vehicle_type);

    try {
      // List ALL year_ids for this model
      await sleep(DELAY_MS);
      const apiYears: ParallelumYear[] = await fetchApi(
        `/${apiType}/brands/${first.brand_id}/models/${first.model_id}/years`
      );

      // Fetch each year_id and collect all priceHistory
      for (const apiYear of apiYears) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) return { done: false, inserted };

        await sleep(DELAY_MS);

        try {
          const info: ParallelumFipeInfo = await fetchApi(
            `/${apiType}/brands/${first.brand_id}/models/${first.model_id}/years/${apiYear.code}`
          );

          if (info.priceHistory?.length > 0) {
            const fipeCode = (info.codeFipe || first.fipe_code).replace(/-/g, "").trim();
            const modelYear = info.modelYear;

            const rows = info.priceHistory
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
                const { error: uErr } = await sb
                  .from("fipe_price_history")
                  .upsert(batch as Record<string, unknown>[], {
                    onConflict: "fipe_code,model_year,reference_code",
                    ignoreDuplicates: true,
                  });
                if (!uErr) inserted += batch.length;
              }
            }
          }
        } catch (e) {
          if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
            state.totals.unavailable424++;
          }
        }
      }

      console.log(`[Phase3] Model ${groupKey}: enriched across ${apiYears.length} year_ids`);

    } catch (e) {
      if ((e as Error).message?.startsWith("FIPE_UNAVAILABLE:")) {
        state.totals.unavailable424++;
        console.log(`[Phase3] Model ${groupKey}: unavailable (424)`);
      }
    }
  }

  return { done: items.length < 30, inserted };
}

// ── Main dispatch ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = supabaseAdmin();
    const rawBody = await req.text();
    let action = "status";

    if (rawBody) {
      try {
        const body = JSON.parse(rawBody);
        action = body.action || "status";
      } catch { /* ignore */ }
    }

    console.log(`[fipe-auto-runner] action=${action}`);

    const state = await loadState(sb);

    // ── Action: status ──
    if (action === "status") {
      // Also fetch DB totals
      const { count: catalogCount } = await sb
        .from("fipe_catalog")
        .select("fipe_code", { count: "exact", head: true });
      const { count: priceCount } = await sb
        .from("fipe_price_history")
        .select("id", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          success: true,
          state,
          dbTotals: {
            catalogCount: catalogCount ?? 0,
            priceHistoryCount: priceCount ?? 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: start ──
    if (action === "start") {
      const freshState: RunnerState = {
        ...defaultState,
        status: "running",
        lastRunAt: new Date().toISOString(),
      };
      await saveState(sb, freshState);
      // Schedule first run
      const scheduled = await scheduleNextRun(sb);
      freshState.nextCallScheduled = scheduled;
      await saveState(sb, freshState);
      return new Response(
        JSON.stringify({ success: true, action: "start", state: freshState }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: pause ──
    if (action === "pause") {
      state.status = "paused";
      state.nextCallScheduled = false;
      await saveState(sb, state);
      return new Response(
        JSON.stringify({ success: true, action: "pause", state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: resume ──
    if (action === "resume") {
      state.status = "running";
      state.lastRunAt = new Date().toISOString();
      await saveState(sb, state);
      const scheduled = await scheduleNextRun(sb);
      state.nextCallScheduled = scheduled;
      await saveState(sb, state);
      return new Response(
        JSON.stringify({ success: true, action: "resume", state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: reset ──
    if (action === "reset") {
      await saveState(sb, { ...defaultState });
      return new Response(
        JSON.stringify({ success: true, action: "reset", state: defaultState }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: run ──
    if (action === "run") {
      // Concurrency guard: skip if another instance ran < 45s ago
      if (state.lastRunAt) {
        const elapsed = Date.now() - new Date(state.lastRunAt).getTime();
        if (elapsed < 45_000) {
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: "another instance running", elapsedSinceLastRun: elapsed }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (state.status !== "running") {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: `status is ${state.status}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      state.lastRunAt = new Date().toISOString();
      state.iteration++;
      await saveState(sb, state);

      const startTime = Date.now();
      let result: { done: boolean; inserted: number };

      switch (state.phase) {
        case 0:
          result = await runPhase0(sb, state, startTime);
          state.totals.catalogInserted += result.inserted;
          break;
        case 1:
          result = await runPhase1(sb, state, startTime);
          state.totals.catalogInserted += result.inserted;
          break;
        case 2:
          result = await runPhase2(sb, state, startTime);
          state.totals.pricesInserted += result.inserted;
          break;
        case 3:
          result = await runPhase3(sb, state, startTime);
          state.totals.pricesInserted += result.inserted;
          break;
        default:
          result = { done: true, inserted: 0 };
      }

      if (result.done) {
        if (state.phase < 3) {
          state.phase++;
          // Reset phase-specific checkpoints
          state.phase0VehicleTypeIndex = 0;
          state.phase0LastBrandId = null;
          state.phase0LastModelId = null;
          console.log(`[fipe-auto-runner] Phase ${state.phase - 1} complete, advancing to phase ${state.phase}`);
        } else {
          state.status = "completed";
          state.nextCallScheduled = false;
          console.log(`[fipe-auto-runner] All phases complete!`);
        }
      }

      // Schedule next run if still running
      if (state.status === "running") {
        const scheduled = await scheduleNextRun(sb);
        state.nextCallScheduled = scheduled;
      }

      state.lastError = null;
      await saveState(sb, state);

      return new Response(
        JSON.stringify({
          success: true,
          action: "run",
          phase: state.phase,
          iteration: state.iteration,
          inserted: result.inserted,
          phaseDone: result.done,
          state,
          elapsedMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}. Use: start, run, status, pause, resume, reset`);
  } catch (err) {
    console.error("fipe-auto-runner error:", err);

    // Try to save error to state
    try {
      const sb = supabaseAdmin();
      const state = await loadState(sb);
      state.lastError = (err as Error).message;
      await saveState(sb, state);
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
