import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body for password verification
    const body = await req.json();
    const { password } = body;

    // Verify password if email provider
    const provider = user.app_metadata?.provider || "email";
    if (provider === "email") {
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Senha é obrigatória para confirmar a exclusão" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Attempt to sign in with password to verify it
      const verifyClient = createClient(supabaseUrl, supabaseAnonKey);
      const { error: signInError } = await verifyClient.auth.signInWithPassword({
        email: user.email!,
        password,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({ error: "Senha incorreta. Verifique e tente novamente." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use service role for data operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const userId = user.id;
    const userEmail = user.email || "";
    const timestamp = new Date().toISOString();

    // 1. Get user profile info for audit
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    // 2. LGPD: Anonymize profile (soft delete + PII removal)
    await adminClient
      .from("profiles")
      .update({
        full_name: "[Conta Excluída]",
        email: `deleted_${userId}@deleted.local`,
        phone: null,
        cpf_encrypted: null,
        is_active: false,
        deleted_at: timestamp,
        status: "deleted",
        admin_notes: `[SELF-DELETE] Original email: ${userEmail} | Name: ${profile?.full_name || "N/A"} | Deleted at: ${timestamp} | LGPD compliant self-service deletion`,
      })
      .eq("id", userId);

    // 3. Nullify user references in workspace (don't delete data for accounting)
    // Cancel pending invitations
    await adminClient
      .from("guest_invitations")
      .update({ status: "cancelled" })
      .or(`principal_user_id.eq.${userId},guest_user_id.eq.${userId}`)
      .eq("status", "pending");

    // 4. Remove user roles
    await adminClient.from("user_roles").delete().eq("user_id", userId);

    // 5. Audit log
    await adminClient.from("deletion_audit_log").insert({
      user_id: userId,
      action: "self_deletion",
      entity_type: "profile",
      entity_id: userId,
      entity_name: profile?.full_name || null,
      details: {
        original_email: userEmail,
        deletion_type: "lgpd_self_service",
        timestamp,
      },
    });

    // 6. Delete the auth user (this invalidates all sessions)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao finalizar exclusão. Tente novamente ou contate o suporte." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Conta excluída com sucesso conforme LGPD." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
