import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyOTPRequest {
  email: string;
  otpCode: string;
}

const MAX_ATTEMPTS = 5;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otpCode }: VerifyOTPRequest = await req.json();

    if (!email || !otpCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Email e código são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', otpCode)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      // Check if there's any token for this email to track attempts
      const { data: anyToken } = await supabaseAdmin
        .from('email_verification_tokens')
        .select('id, attempts')
        .eq('email', email.toLowerCase())
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (anyToken) {
        // Increment attempts
        await supabaseAdmin
          .from('email_verification_tokens')
          .update({ attempts: anyToken.attempts + 1 })
          .eq('id', anyToken.id);

        if (anyToken.attempts + 1 >= MAX_ATTEMPTS) {
          // Mark token as used (locked out)
          await supabaseAdmin
            .from('email_verification_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('id', anyToken.id);

          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Muitas tentativas incorretas. Solicite um novo código.",
              locked: true
            }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const remainingAttempts = MAX_ATTEMPTS - (anyToken.attempts + 1);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Código incorreto. ${remainingAttempts} tentativa(s) restante(s).`,
            remainingAttempts
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Código inválido ou expirado. Solicite um novo código." 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark token as used (single-use)
    await supabaseAdmin
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    // Confirm user email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (userError) {
      console.error("Error confirming user email:", userError);
      throw new Error("Falha ao confirmar email");
    }

    // Update profile status
    await supabaseAdmin
      .from('profiles')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.user_id);

    // Log verification event
    await supabaseAdmin
      .from('deletion_audit_log')
      .insert({
        user_id: tokenData.user_id,
        action: 'email_verified',
        entity_type: 'email_verification',
        entity_id: tokenData.id,
        details: { 
          method: 'otp',
          email: email.toLowerCase(),
          verified_at: new Date().toISOString()
        }
      });

    // Generate a session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://app.rxfin.com.br'}/onboarding`,
      }
    });

    console.log("Email verified successfully for:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verificado com sucesso!",
        userId: tokenData.user_id,
        redirectUrl: sessionData?.properties?.action_link || '/onboarding'
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-email-otp function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
