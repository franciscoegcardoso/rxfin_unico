import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = req.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Buscar até 10 tickers pendentes da fila (prioridade 1 primeiro)
  const { data: queue, error: qErr } = await supabase
    .from("asset_scraping_queue")
    .select("asset_code, scrape_priority, holder_count")
    .eq("is_paused", false)
    .lte("next_scrape_at", new Date().toISOString())
    .order("scrape_priority", { ascending: true })
    .order("holder_count", { ascending: false })
    .limit(10);

  if (qErr || !queue?.length) {
    return new Response(
      JSON.stringify({ processed: 0, message: "Queue empty or error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const tickers = queue.map((q) => q.asset_code).join(",");
  let processed = 0;
  let errors = 0;

  // 2. Buscar dados no brapi.dev em batch
  try {
    const brapiUrl = `https://brapi.dev/api/quote/${tickers}?token=${BRAPI_TOKEN}&fundamental=true&logourl=true`;
    const brapiRes = await fetch(brapiUrl);
    const brapiData = await brapiRes.json();

    const results = brapiData?.results ?? [];

    for (const result of results) {
      const ticker = result.symbol;
      if (!ticker) continue;

      try {
        // Upsert em ticker_metadata
        await supabase.from("ticker_metadata").upsert(
          {
            ticker,
            logo_url: result.logourl ?? null,
            logo_source: result.logourl ? "brapi" : null,
            logo_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "ticker" }
        );

        // Upsert em asset_fundamentals (se tiver dados)
        if (result.eps || result.pe || result.dividendYield) {
          await supabase.rpc("upsert_asset_fundamentals_from_brapi", {
            p_asset_code: ticker,
            p_data: result,
          });
        }

        // Marcar como processado na fila
        await supabase
          .from("asset_scraping_queue")
          .update({
            last_scraped_at: new Date().toISOString(),
            next_scrape_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .eq("asset_code", ticker);

        processed++;
      } catch (e) {
        console.error(`Error processing ${ticker}:`, e);
        errors++;
      }
    }
  } catch (e) {
    console.error("brapi fetch error:", e);
    return new Response(
      JSON.stringify({
        error: "brapi unavailable",
        details: String(e),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      processed,
      errors,
      tickers_attempted: queue.length,
      executed_at: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
