import React from "react";
import { Webhook } from "@lovable.dev/webhooks-js";
import { sendEmail } from "@lovable.dev/email-js";
import { renderAsync } from "@react-email/components";

import { SignupEmail } from "../_shared/email-templates/signup.tsx";
import { RecoveryEmail } from "../_shared/email-templates/recovery.tsx";
import { MagicLinkEmail } from "../_shared/email-templates/magic-link.tsx";
import { InviteEmail } from "../_shared/email-templates/invite.tsx";
import { EmailChangeEmail } from "../_shared/email-templates/email-change.tsx";
import { ReauthenticationEmail } from "../_shared/email-templates/reauthentication.tsx";

const hookSecret = Deno.env.get("LOVABLE_API_KEY") as string;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let parsedPayload: any;
  try {
    const wh = new Webhook(hookSecret);
    parsedPayload = wh.verify(payload, headers);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response(JSON.stringify({ error: { http_code: 401, message: "Invalid signature" } }), {
      status: 401,
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
    callback_url,
  } = parsedPayload;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const siteName = "RXFin";
  const siteUrl = site_url || "https://app.rxfin.com.br";

  // Build confirmation URL
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
        subject = `Notificação do RXFin`;
        html = await renderAsync(React.createElement(SignupEmail, templateProps));
        break;
    }

    // Send via Lovable Email API
    await sendEmail(callback_url, hookSecret, {
      to: user.email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error rendering/sending email:", error);
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: error.message } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
