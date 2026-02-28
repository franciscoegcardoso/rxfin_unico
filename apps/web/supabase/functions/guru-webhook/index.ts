import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Status que concedem acesso
const GRANT_ACCESS_STATUSES = [
  "approved",
  "confirmed",
  "paid",
];

// Status que removem acesso
const REVOKE_ACCESS_STATUSES = [
  "refunded",
  "chargedback",
  "chargeback",
  "canceled",
  "expired",
  "overdue",
];

// Eventos do Guru que processamos
const SUPPORTED_EVENTS = [
  "venda_aprovada",
  "venda_confirmada", 
  "assinatura_ativa",
  "assinatura_cancelada",
  "assinatura_atrasada",
  "assinatura_renovada",
  "reembolso",
  "chargeback",
  "estorno",
];

interface GuruWebhookPayload {
  api_token?: string;
  event?: string;
  id?: string;
  contact?: {
    id?: string;
    name?: string;
    email?: string;
    doc?: string;
    phone_number?: string;
  };
  product?: {
    id?: string;
    name?: string;
    internal_id?: string;
    marketplace_id?: string;
    offer?: {
      id?: string;
      name?: string;
    };
  };
  items?: Array<{
    id?: string;
    name?: string;
    internal_id?: string;
  }>;
  payment?: {
    method?: string;
    total?: number;
    net?: number;
    currency?: string;
    marketplace_id?: string;
    marketplace_name?: string;
    refund_reason?: string;
  };
  subscription?: {
    id?: string;
    status?: string;
    plan?: {
      id?: string;
      name?: string;
    };
  };
  status?: string;
  dates?: {
    created_at?: string;
    confirmed_at?: string;
    canceled_at?: string;
  };
}

// Busca o mapeamento de produtos do Guru para plan IDs e slugs
async function getProductPlanMapping(supabase: any): Promise<Record<string, { id: string; slug: string; duration_days: number }>> {
  const { data: plans, error } = await supabase
    .from("subscription_plans")
    .select("id, slug, guru_product_id, duration_days")
    .eq("is_active", true)
    .not("guru_product_id", "is", null);

  if (error || !plans) {
    console.error("Error fetching product mapping:", error);
    return {};
  }

  const mapping: Record<string, { id: string; slug: string; duration_days: number }> = {};
  for (const plan of plans) {
    if (plan.guru_product_id) {
      const productIds = plan.guru_product_id.split(",").map((id: string) => id.trim());
      for (const productId of productIds) {
        mapping[productId] = { id: plan.id, slug: plan.slug, duration_days: plan.duration_days };
      }
    }
  }

  console.log("Product plan mapping:", mapping);
  return mapping;
}

async function determinePlanFromPayload(
  payload: GuruWebhookPayload, 
  productPlanMapping: Record<string, { id: string; slug: string; duration_days: number }>
): Promise<{ id: string; slug: string; duration_days: number } | null> {
  const tryMatch = (key?: string) => key ? productPlanMapping[key] : undefined;
  
  return tryMatch(payload.product?.id)
    || tryMatch(payload.product?.internal_id)
    || tryMatch(payload.product?.name)
    || tryMatch(payload.product?.offer?.name)
    || tryMatch(payload.product?.offer?.id)
    || tryMatch(payload.subscription?.plan?.id)
    || tryMatch(payload.subscription?.plan?.name)
    || (payload.items || []).reduce<{ id: string; slug: string; duration_days: number } | null>(
        (found, item) => found || tryMatch(item.id) || tryMatch(item.name) || tryMatch(item.internal_id) || null,
        null
      )
    || null;
}

function shouldGrantAccess(event: string, status?: string): boolean {
  const grantEvents = ["venda_aprovada", "venda_confirmada", "assinatura_ativa", "assinatura_renovada"];
  if (grantEvents.includes(event)) return true;
  if (status && GRANT_ACCESS_STATUSES.includes(status.toLowerCase())) return true;
  return false;
}

function shouldRevokeAccess(event: string, status?: string): boolean {
  const revokeEvents = ["assinatura_cancelada", "reembolso", "chargeback", "estorno"];
  if (revokeEvents.includes(event)) return true;
  if (status && REVOKE_ACCESS_STATUSES.includes(status.toLowerCase())) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("GURU_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const payload: GuruWebhookPayload = await req.json();

    console.log("Guru Webhook received:", JSON.stringify({
      event: payload.event,
      status: payload.status,
      contact_email: payload.contact?.email,
      product_id: payload.product?.id,
      product_name: payload.product?.name,
      transaction_id: payload.id,
    }));

    if (webhookSecret && payload.api_token !== webhookSecret) {
      console.error("Invalid API token - rejecting webhook request");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = payload.event?.toLowerCase() || "";
    if (!SUPPORTED_EVENTS.includes(event)) {
      return new Response(
        JSON.stringify({ success: true, message: "Event not supported" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = payload.contact?.email?.toLowerCase().trim();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing contact email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      console.error("User not found for email:", email, profileError);
      await supabase.from("subscription_events").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        event_type: event,
        event_status: payload.status || payload.subscription?.status,
        transaction_id: payload.id,
        pagarme_transaction_id: payload.payment?.marketplace_id,
        subscription_id: payload.subscription?.id,
        product_id: payload.product?.id || payload.product?.internal_id,
        product_name: payload.product?.name || payload.product?.offer?.name,
        amount: payload.payment?.total,
        currency: payload.payment?.currency || "BRL",
        payment_method: payload.payment?.method,
        contact_email: email,
        raw_payload: payload,
      });
      return new Response(
        JSON.stringify({ success: true, message: "User not found, event logged" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, plan_id, subscription_plans:plan_id(slug)")
      .eq("owner_id", profile.id)
      .eq("is_active", true)
      .single();

    const currentPlanSlug = (workspace?.subscription_plans as any)?.slug || "free";
    console.log("Found user:", profile.id, "Current plan:", currentPlanSlug, "Workspace:", workspace?.id);

    const productPlanMapping = await getProductPlanMapping(supabase);
    const newPlan = await determinePlanFromPayload(payload, productPlanMapping);
    const status = payload.status?.toLowerCase() || payload.subscription?.status?.toLowerCase();

    const roleBefore = currentPlanSlug;
    let roleAfter = currentPlanSlug;

    // Get the free plan ID for revocations
    const { data: freePlan } = await supabase
      .from("subscription_plans")
      .select("id, slug")
      .eq("slug", "free")
      .single();

    const freePlanId = freePlan?.id;

    if (shouldRevokeAccess(event, status)) {
      console.log(`Revoking access for user ${profile.id} due to ${event}/${status}`);
      roleAfter = "free";

      if (workspace?.id && freePlanId) {
        const { error: updateError } = await supabase
          .from("workspaces")
          .update({
            plan_id: freePlanId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspace.id);

        if (updateError) {
          console.error("Error revoking access:", updateError);
        } else {
          console.log(`Access revoked for user ${profile.id}`);
        }
      }

      // Update affiliate referral status to 'cancelou'
      await supabase
        .from("affiliate_referrals")
        .update({ status: "cancelou" })
        .eq("referred_user_id", profile.id);

    } else if (shouldGrantAccess(event, status)) {
      if (!newPlan) {
        console.error("Could not determine plan from product mapping");
        await supabase.from("subscription_events").insert({
          user_id: profile.id,
          event_type: event,
          event_status: status,
          transaction_id: payload.id,
          pagarme_transaction_id: payload.payment?.marketplace_id,
          subscription_id: payload.subscription?.id,
          product_id: payload.product?.id || payload.product?.internal_id,
          product_name: payload.product?.name || payload.product?.offer?.name,
          amount: payload.payment?.total,
          currency: payload.payment?.currency || "BRL",
          payment_method: payload.payment?.method,
          role_before: roleBefore,
          role_after: roleAfter,
          contact_email: email,
          raw_payload: payload,
        });
        return new Response(
          JSON.stringify({ success: true, message: "Could not determine plan" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      roleAfter = newPlan.slug;
      console.log(`Granting ${newPlan.slug} access to user ${profile.id}`);

      if (workspace?.id) {
        const { error: updateError } = await supabase
          .from("workspaces")
          .update({
            plan_id: newPlan.id,
            plan_expires_at: new Date(Date.now() + newPlan.duration_days * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspace.id);

        if (updateError) {
          console.error("Error granting access:", updateError);
        } else {
          console.log(`Access granted: ${newPlan.slug} for user ${profile.id}`);
        }
      }

      // Update affiliate referral status to 'ativo'
      await supabase
        .from("affiliate_referrals")
        .update({ status: "ativo" })
        .eq("referred_user_id", profile.id);

      // Send notification
      const notifSlug = (event === "assinatura_renovada") ? "plan_renewed" : "payment_confirmed";
      try {
        const { data: tpl } = await supabase
          .from("notification_templates")
          .select("*")
          .eq("slug", notifSlug)
          .eq("is_active", true)
          .single();

        if (tpl) {
          const productName = payload.product?.name || payload.product?.offer?.name || newPlan.slug;
          await supabase.from("notifications").insert({
            title: (tpl.title_template as string).replace(/\{\{plan_name\}\}/g, productName),
            message: (tpl.message_template as string).replace(/\{\{plan_name\}\}/g, productName),
            type: tpl.type,
            priority: tpl.priority,
            target_user_id: profile.id,
            action_url: tpl.action_url_template,
            metadata: { trigger: notifSlug, entity_id: payload.id || profile.id },
          });
          console.log(`Notification ${notifSlug} sent to user ${profile.id}`);
        }
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }
    } else if (event === "assinatura_atrasada") {
      console.log(`Subscription overdue for user ${profile.id} - keeping current plan`);
    }

    // Log the event
    const { error: eventError } = await supabase.from("subscription_events").insert({
      user_id: profile.id,
      event_type: event,
      event_status: status,
      transaction_id: payload.id,
      pagarme_transaction_id: payload.payment?.marketplace_id,
      subscription_id: payload.subscription?.id,
      product_id: payload.product?.id || payload.product?.internal_id,
      product_name: payload.product?.name || payload.product?.offer?.name,
      amount: payload.payment?.total,
      currency: payload.payment?.currency || "BRL",
      payment_method: payload.payment?.method,
      role_before: roleBefore,
      role_after: roleAfter,
      contact_email: email,
      raw_payload: payload,
    });

    if (eventError) {
      console.error("Error logging subscription event:", eventError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
