import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PARALLELUM_BASE = "https://fipe.parallelum.com.br/api/v2";

interface ParallelumRef {
  code: number;
  month: string;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const internalSecret = Deno.env.get("INTERNAL_SECRET");
  const headerSecret = req.headers.get("x-internal-secret");
  if (!internalSecret || headerSecret !== internalSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch latest FIPE reference from Parallelum API
    const token = Deno.env.get("FIPE_PARALLELUM_TOKEN");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["X-Subscription-Token"] = token;

    const res = await fetch(`${PARALLELUM_BASE}/references`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch FIPE references: ${res.status}`);
    }

    const refs: ParallelumRef[] = await res.json();
    const latestRef = refs[0];
    const { month, year } = parseRefMonth(latestRef.month);
    const referenceLabel = `${month}/${year}`;

    console.log(`[check-fipe-availability] Latest FIPE reference: ${latestRef.month} (code ${latestRef.code}, parsed ${referenceLabel})`);

    // 2. Check if we already have a successful sync for this reference
    const { data: existingLog } = await sb
      .from("fipe_sync_log")
      .select("id, status")
      .eq("sync_type", "monthly_sync")
      .eq("ref_code", latestRef.code)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle();

    if (existingLog) {
      console.log(`[check-fipe-availability] Already synced for ref ${latestRef.code}`);
      return new Response(
        JSON.stringify({ available: false, reference_month: referenceLabel, ref_code: latestRef.code, reason: "already_synced" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check if this reference is newer than the last successful sync
    const { data: lastSuccess } = await sb
      .from("fipe_sync_log")
      .select("ref_code")
      .eq("sync_type", "monthly_sync")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastRefCode = lastSuccess?.ref_code ?? 0;

    if (latestRef.code > lastRefCode) {
      console.log(`[check-fipe-availability] New reference available: ${latestRef.code} > ${lastRefCode}`);
      return new Response(
        JSON.stringify({ available: true, reference_month: referenceLabel, ref_code: latestRef.code }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ available: false, reference_month: referenceLabel, ref_code: latestRef.code, reason: "not_newer" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[check-fipe-availability] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
