// supabase/functions/creditos/index.ts
// Função de backend para listar/criar/atualizar/excluir consórcios e financiamentos

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

type CreditoType = "consorcio" | "financiamento";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "missing_env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    // Cliente com JWT do usuário (RLS garante que só acessa os próprios dados)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      const [consorciosRes, financiamentosRes] = await Promise.all([
        supabase.from("consorcios").select("*").order("created_at", { ascending: false }),
        supabase.from("financiamentos").select("*").order("created_at", { ascending: false }),
      ]);

      if (consorciosRes.error || financiamentosRes.error) {
        return new Response(
          JSON.stringify({
            error: "query_failed",
            details: {
              consorcios: consorciosRes.error?.message ?? null,
              financiamentos: financiamentosRes.error?.message ?? null,
            },
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          consorcios: consorciosRes.data ?? [],
          financiamentos: financiamentosRes.data ?? [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Métodos com body JSON
    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const type = body?.type as CreditoType | undefined;

    if (type !== "consorcio" && type !== "financiamento") {
      return new Response(JSON.stringify({ error: "invalid_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const table = type === "consorcio" ? "consorcios" : "financiamentos";

    if (req.method === "POST") {
      const payload = (body?.payload ?? {}) as Record<string, unknown>;

      const { data, error } = await supabase
        .from(table)
        .insert({ ...payload, user_id: user.id })
        .select("*")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "insert_failed", details: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      const id = body?.id as string | undefined;
      const updates = (body?.updates ?? {}) as Record<string, unknown>;

      if (!id) {
        return new Response(JSON.stringify({ error: "missing_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase.from(table).update(updates).eq("id", id).select("*").single();

      if (error) {
        return new Response(JSON.stringify({ error: "update_failed", details: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const id = body?.id as string | undefined;

      if (!id) {
        return new Response(JSON.stringify({ error: "missing_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from(table).delete().eq("id", id);

      if (error) {
        return new Response(JSON.stringify({ error: "delete_failed", details: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "unexpected", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
