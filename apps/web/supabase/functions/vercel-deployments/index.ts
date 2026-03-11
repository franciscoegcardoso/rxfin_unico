import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VercelDeployment {
  uid: string;
  name: string;
  url: string | null;
  state?: string;
  created: number;
  meta?: { githubCommitMessage?: string; githubCommitRef?: string };
  target?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vercelToken = Deno.env.get("VERCEL_TOKEN") ?? Deno.env.get("VERCEL_API_TOKEN");
    const projectId = Deno.env.get("VERCEL_PROJECT_ID");
    const teamId = Deno.env.get("VERCEL_TEAM_ID");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vercelToken) {
      return new Response(
        JSON.stringify({
          error: "VERCEL_TOKEN not configured",
          deployments: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams();
    params.set("limit", "25");
    if (projectId) params.set("projectId", projectId);
    if (teamId) params.set("teamId", teamId);

    const url = `https://api.vercel.com/v6/deployments?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Vercel API error:", res.status, text);
      return new Response(
        JSON.stringify({
          error: "Vercel API error",
          detail: res.status === 401 ? "Invalid VERCEL_TOKEN" : text.slice(0, 200),
          deployments: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await res.json();
    const deployments: VercelDeployment[] = body.deployments ?? [];

    return new Response(
      JSON.stringify({
        deployments: deployments.map((d: VercelDeployment) => {
          const meta = (d.meta ?? {}) as Record<string, unknown>;
          const branch = (meta.githubCommitRef as string) ?? (meta.branch as string) ?? null;
          const commitMessage = (meta.githubCommitMessage as string) ?? null;
          return {
            id: d.uid,
            name: d.name,
            url: d.url,
            state: d.state ?? "UNKNOWN",
            created: d.created,
            branch,
            commitMessage,
            target: d.target ?? null,
          };
        }),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("vercel-deployments error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        deployments: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
