import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ code: "UNAUTHORIZED", message: "Missing auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged ops
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Validate JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ code: "UNAUTHORIZED", message: "Invalid JWT" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, admin_token } = await req.json();

    // Check if user is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ code: "NOT_ADMIN", message: "User is not an admin" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACTION: validate ===
    if (action === "validate") {
      if (!admin_token) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session } = await supabaseAdmin
        .from("admin_sessions")
        .select("*")
        .eq("session_token", admin_token)
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      return new Response(
        JSON.stringify({ valid: !!session }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACTION: logout ===
    if (action === "logout") {
      if (admin_token) {
        await supabaseAdmin
          .from("admin_sessions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("session_token", admin_token)
          .eq("user_id", user.id);
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACTION: login ===
    if (action === "login") {
      // Check MFA status
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors?.totp?.filter((f: any) => f.status === "verified") || [];
      const hasVerifiedMfa = verifiedFactors.length > 0;

      // Check AAL level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const currentAAL = aalData?.currentLevel;

      if (!hasVerifiedMfa || currentAAL !== "aal2") {
        return new Response(
          JSON.stringify({
            code: "MFA_REQUIRED",
            message: "MFA verification required for admin access",
            mfa_enrolled: hasVerifiedMfa,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // MFA verified — create admin session
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4h

      await supabaseAdmin.from("admin_sessions").insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt,
        user_agent: req.headers.get("user-agent") || null,
      });

      // Log admin login
      await supabaseAdmin.from("audit_logs").insert({
        user_id: user.id,
        action: "admin_login",
        severity: "info",
        metadata: { mfa_verified: true },
        user_agent: req.headers.get("user-agent") || null,
      });

      return new Response(
        JSON.stringify({
          code: "SUCCESS",
          session_token: sessionToken,
          expires_at: expiresAt,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ code: "INVALID_ACTION", message: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-gate error:", err);
    return new Response(
      JSON.stringify({ code: "ERROR", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
