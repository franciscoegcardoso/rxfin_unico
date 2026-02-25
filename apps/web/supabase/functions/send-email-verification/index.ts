import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailVerificationRequest {
  email: string;
  redirectUrl: string;
  userName?: string;
  isResend?: boolean;
}

// Generate a 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectUrl, userName, isResend = false }: EmailVerificationRequest = await req.json();

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check rate limiting (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSends, error: rateLimitError } = await supabaseAdmin
      .from('email_verification_rate_limits')
      .select('id')
      .eq('email', email.toLowerCase())
      .gte('sent_at', oneHourAgo);

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (recentSends && recentSends.length >= 3) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Limite de reenvio atingido. Tente novamente em 1 hora.",
          rateLimited: true
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check cooldown (60 seconds between sends)
    if (isResend && recentSends && recentSends.length > 0) {
      const { data: lastSend } = await supabaseAdmin
        .from('email_verification_rate_limits')
        .select('sent_at')
        .eq('email', email.toLowerCase())
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSend) {
        const lastSendTime = new Date(lastSend.sent_at).getTime();
        const cooldownMs = 60 * 1000; // 60 seconds
        const timeSinceLast = Date.now() - lastSendTime;
        
        if (timeSinceLast < cooldownMs) {
          const waitSeconds = Math.ceil((cooldownMs - timeSinceLast) / 1000);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Aguarde ${waitSeconds} segundos para reenviar.`,
              cooldown: true,
              waitSeconds
            }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
    }

    // Get user ID from email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if user exists - just return success
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um código de verificação." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Invalidate previous tokens for this user
    await supabaseAdmin
      .from('email_verification_tokens')
      .delete()
      .eq('email', email.toLowerCase())
      .is('used_at', null);

    // Generate OTP code and token
    const otpCode = generateOTPCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Store OTP in database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        otp_code: otpCode,
        expires_at: expiresAt,
      })
      .select('token')
      .single();

    if (tokenError) {
      console.error("Error storing OTP:", tokenError);
      throw new Error("Falha ao gerar código de verificação");
    }

    // Generate magic link using Supabase Auth
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${redirectUrl}?verified=true`,
      },
    });

    if (linkError) {
      console.error("Error generating verification link:", linkError);
      throw new Error("Falha ao gerar link de verificação");
    }

    const verificationLink = linkData?.properties?.action_link;

    // Record rate limit
    await supabaseAdmin
      .from('email_verification_rate_limits')
      .insert({ email: email.toLowerCase() });

    const displayName = userName || email.split('@')[0];

    // Send email via Resend API
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 700;">RXFin</h1>
              <p style="margin: 8px 0 0; color: #71717a; font-size: 14px;">Seu Raio-X Financeiro</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 20px; font-weight: 600;">Confirme seu email</h2>
              <p style="margin: 0 0 8px; color: #52525b; font-size: 15px; line-height: 1.6;">
                Olá, <strong>${displayName}</strong>!
              </p>
              <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
                Para confirmar sua conta, use uma das opções abaixo:
              </p>
              
              <!-- OTP Code Section -->
              <div style="margin-bottom: 24px; padding: 20px; background-color: #f0f9ff; border-radius: 8px; text-align: center; border: 2px dashed #0ea5e9;">
                <p style="margin: 0 0 8px; color: #0369a1; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                  Seu código de verificação
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0c4a6e; font-family: 'Monaco', 'Menlo', monospace;">
                  ${otpCode}
                </p>
              </div>
              
              <p style="margin: 0 0 16px; color: #71717a; font-size: 13px; text-align: center;">
                — ou —
              </p>
              
              <!-- Magic Link Button -->
              <div style="text-align: center;">
                <a href="${verificationLink}" 
                   style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Confirmar com um clique
                </a>
              </div>
              
              <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                  <strong>⏱️ Este código expira em 15 minutos.</strong><br>
                  Se você não solicitou esta verificação, ignore este email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center; line-height: 1.5;">
                © ${new Date().getFullYear()} RXFin. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Fetch email settings from database
    const { data: emailSettings } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'email_settings')
      .single();

    const fromName = emailSettings?.setting_value?.resendFromName || 'RXFin';
    const fromEmail = emailSettings?.setting_value?.resendFromEmail || 'noreply@resend.dev';

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: `${otpCode} é seu código de verificação - ${fromName}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error("Falha ao enviar email");
    }

    console.log("Verification email sent successfully:", emailResult);

    // Calculate remaining sends
    const remainingSends = 3 - (recentSends?.length || 0) - 1;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de verificação enviado com sucesso!",
        expiresInMinutes: 15,
        remainingSends: Math.max(0, remainingSends),
        cooldownSeconds: 60
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-email-verification function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
