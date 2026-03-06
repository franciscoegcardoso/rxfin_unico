// Stub da Edge Function para a página Admin > API Keys carregar.
// Valida JWT + role admin; retorna listas vazias. Implementação completa (CRUD, vault) pode ser feita depois.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        { code: "UNAUTHORIZED", error: "Missing auth header" },
        401
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return jsonResponse(
        { code: "UNAUTHORIZED", error: "Invalid or expired token" },
        401
      );
    }

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return jsonResponse(
        { code: "FORBIDDEN", error: "Admin role required" },
        403
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET" && action === "list") {
      return jsonResponse({ success: true, data: [] });
    }

    if (action === "create" || action === "update" || action === "delete") {
      return jsonResponse({ success: false, error: "Not implemented" }, 501);
    }

    if (action === "audit") {
      return jsonResponse({ success: true, data: [] });
    }
    if (action === "expiration-summary") {
      return jsonResponse({
        success: true,
        summary: { expired: [], expiring_1d: [], expiring_7d: [], expiring_30d: [], ok: [] },
      });
    }
    if (action === "security-log") {
      return jsonResponse({ success: true, data: [] });
    }
    if (action === "reveal" || action === "test-connectivity") {
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action", code: "INVALID_ACTION" }, 400);
  } catch (err) {
    console.error("manage-api-credentials error:", err);
    return jsonResponse(
      { code: "ERROR", error: err?.message ?? "Internal error" },
      500
    );
  }
});
