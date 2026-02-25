import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteUser {
  email: string;
  full_name?: string;
  phone?: string;
  plan_slug?: string;
  role?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller with anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("is_admin", {
      _user_id: callerId,
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin only" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { users, redirect_url } = (await req.json()) as {
      users: InviteUser[];
      redirect_url?: string;
    };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "No users provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (users.length > 100) {
      return new Response(
        JSON.stringify({ error: "Maximum 100 users per batch" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results: Array<{
      email: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const user of users) {
      try {
        const email = user.email?.trim()?.toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.push({
            email: user.email || "",
            success: false,
            error: "Email inválido",
          });
          continue;
        }

        // Check if user already exists
        const { data: existingUsers } =
          await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u) => u.email === email
        );

        if (existingUser) {
          results.push({
            email,
            success: false,
            error: "Usuário já cadastrado",
          });
          continue;
        }

        // Invite user via Supabase Auth
        const { data: inviteData, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(email, {
            data: {
              full_name: user.full_name?.trim() || null,
              phone: user.phone?.trim() || null,
              invited_by_admin: true,
            },
            redirectTo: redirect_url || `${Deno.env.get("SUPABASE_URL")}/auth/v1/callback`,
          });

        if (inviteError) {
          results.push({
            email,
            success: false,
            error: inviteError.message,
          });
          continue;
        }

        // If plan_slug is specified, update workspace plan
        if (user.plan_slug && inviteData?.user?.id) {
          const { data: plan } = await adminClient
            .from("subscription_plans")
            .select("id")
            .eq("name", user.plan_slug)
            .single();

          if (plan) {
            // The workspace is created by trigger, wait a bit then update
            await new Promise((r) => setTimeout(r, 500));
            await adminClient
              .from("workspaces")
              .update({ plan_id: plan.id })
              .eq("owner_id", inviteData.user.id);
          }
        }

        // If role is admin, grant admin role
        if (user.role === "admin" && inviteData?.user?.id) {
          await adminClient.from("user_roles").insert({
            user_id: inviteData.user.id,
            role: "admin",
            workspace_owner_id: inviteData.user.id,
          });
        }

        results.push({ email, success: true });
      } catch (err) {
        results.push({
          email: user.email || "",
          success: false,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: users.length,
          success: successCount,
          failed: failCount,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
