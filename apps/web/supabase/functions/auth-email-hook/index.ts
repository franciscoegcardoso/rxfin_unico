import React from "react";
import { renderAsync } from "@react-email/components";

import { SignupEmail } from "../_shared/email-templates/signup.tsx";
import { RecoveryEmail } from "../_shared/email-templates/recovery.tsx";
import { MagicLinkEmail } from "../_shared/email-templates/magic-link.tsx";
import { InviteEmail } from "../_shared/email-templates/invite.tsx";
import { EmailChangeEmail } from "../_shared/email-templates/email-change.tsx";
import { ReauthenticationEmail } from "../_shared/email-templates/reauthentication.tsx";

const AUTH_HOOK_SECRET = Deno.env.get("AUTH_HOOK_SECRET") ?? "";
const N8N_AUTH_EMAIL_WEBHOOK_URL = Deno.env.get("N8N_AUTH_EMAIL_WEBHOOK_URL") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (AUTH_HOOK_SECRET) {
    const headerSecret = req.headers.get("x-auth-hook-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (headerSecret !== AUTH_HOOK_SECRET) {
      console.error("Auth hook: invalid or missing secret");
      return new Response(JSON.stringify({ error: { http_code: 401, message: "Invalid signature" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let parsedPayload: {
    user: { email?: string; new_email?: string };
    email_data: {
      token: string;
      token_hash: string;
      redirect_to?: string;
      email_action_type: string;
      site_url?: string;
      token_new?: string;
      token_hash_new?: string;
    };
  };

  try {
    parsedPayload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: { http_code: 400, message: "Invalid JSON" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    user,
    email_data: {
      token,
      token_hash,
      redirect_to,
      email_action_type,
      site_url,
      token_new,
      token_hash_new,
    },
  } = parsedPayload;

  if (!user?.email) {
    return new Response(JSON.stringify({ error: { http_code: 400, message: "Missing user email" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const siteName = "RXFin";
  const siteUrl = site_url || "https://app.rxfin.com.br";
  const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || siteUrl}`;

  const templateProps = {
    confirmationUrl,
    siteName,
    siteUrl,
    recipient: user.email,
    token,
  };

  let html: string;
  let subject: string;

  try {
    switch (email_action_type) {
      case "signup":
        subject = "Confirme seu cadastro no RXFin";
        html = await renderAsync(React.createElement(SignupEmail, templateProps));
        break;
      case "recovery":
        subject = "Redefinir sua senha — RXFin";
        html = await renderAsync(React.createElement(RecoveryEmail, templateProps));
        break;
      case "magiclink":
        subject = "Seu link de acesso ao RXFin";
        html = await renderAsync(React.createElement(MagicLinkEmail, templateProps));
        break;
      case "invite":
        subject = "Você foi convidado para o RXFin!";
        html = await renderAsync(React.createElement(InviteEmail, templateProps));
        break;
      case "email_change":
        subject = "Confirme a alteração de email — RXFin";
        html = await renderAsync(
          React.createElement(EmailChangeEmail, {
            ...templateProps,
            newEmail: user.new_email || "",
          })
        );
        break;
      case "reauthentication":
        subject = "Código de verificação — RXFin";
        html = await renderAsync(
          React.createElement(ReauthenticationEmail, {
            token,
            siteName,
            siteUrl,
            recipient: user.email,
          })
        );
        break;
      default:
        console.warn("Unknown email_action_type:", email_action_type);
        subject = "Notificação do RXFin";
        html = await renderAsync(React.createElement(SignupEmail, templateProps));
        break;
    }
  } catch (error) {
    console.error("Error rendering email:", error);
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: (error as Error).message } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (N8N_AUTH_EMAIL_WEBHOOK_URL) {
    try {
      const res = await fetch(N8N_AUTH_EMAIL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          subject,
          html,
          email_action_type,
          confirmationUrl,
          site_url: siteUrl,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("n8n webhook error:", res.status, errText);
        return new Response(
          JSON.stringify({ error: { http_code: 502, message: "Failed to send email via n8n" } }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (err) {
      console.error("Error calling n8n webhook:", err);
      return new Response(
        JSON.stringify({ error: { http_code: 500, message: (err as Error).message } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    console.error("N8N_AUTH_EMAIL_WEBHOOK_URL is not set. Email not sent.");
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: "Email webhook not configured" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
