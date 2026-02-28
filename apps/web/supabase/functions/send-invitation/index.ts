import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: 'shared_user' | 'driver';
  invitedByName: string;
  metadata?: {
    vehicleIds?: string[];
    vehicleNames?: string[];
    defaultIncomeIds?: string[];
  };
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "RXFin <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email error: ${error}`);
  }

  return await response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, invitedByName, metadata }: InvitationRequest = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email e role são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map role to invitation_type for guest_invitations table
    const invitationType = role === 'shared_user' ? 'shared_user' : 'driver';

    // Check for existing pending invitation in guest_invitations
    const { data: existingInvitation } = await supabase
      .from("guest_invitations")
      .select("*")
      .eq("guest_email", email)
      .eq("principal_user_id", user.id)
      .eq("invitation_type", invitationType)
      .eq("status", "pending")
      .single();

    let invitation;

    if (existingInvitation) {
      // Update existing invitation with new token and expiry
      const { data, error } = await supabase
        .from("guest_invitations")
        .update({
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", existingInvitation.id)
        .select()
        .single();

      if (error) throw error;
      invitation = data;
    } else {
      // Create new invitation
      const { data, error } = await supabase
        .from("guest_invitations")
        .insert({
          guest_email: email,
          invitation_type: invitationType,
          principal_user_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      invitation = data;
    }

    // Generate invite link
    const baseUrl = req.headers.get("origin") || "https://app.example.com";
    const inviteLink = `${baseUrl}/aceitar-convite?token=${invitation.token}`;

    // Send email
    const roleText = role === 'shared_user' ? 'compartilhar finanças' : 'gerenciar veículos';
    const vehicleText = metadata?.vehicleNames?.length 
      ? ` para os veículos: ${metadata.vehicleNames.join(', ')}`
      : '';

    const logoUrl = `https://kneaniaifzgqibpajyji.supabase.co/storage/v1/object/public/email-assets/logo-rxfin-full.png?v=1`;

    const emailResponse = await sendEmail(
      email,
      `${invitedByName} convidou você para ${roleText}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="${logoUrl}" alt="RXFin" width="140" style="display: inline-block;" />
            </div>
            <div style="background-color: #f9fafb; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h1 style="color: #161922; font-size: 22px; margin: 0 0 16px 0; font-weight: 700;">Você foi convidado! 🎉</h1>
              
              <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">
                <strong>${invitedByName}</strong> convidou você para ${roleText}${vehicleText}.
              </p>
              
              <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                Clique no botão abaixo para aceitar o convite e começar a usar o RXFin:
              </p>
              
              <div style="text-align: center;">
                <a href="${inviteLink}" style="display: inline-block; background-color: hsl(145, 63%, 35%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Aceitar Convite
                </a>
              </div>
              
              <p style="color: #a1a1aa; font-size: 12px; margin-top: 28px; margin-bottom: 0; text-align: center;">
                Este convite expira em 7 dias. Se você não reconhece este convite, pode ignorar este email.
              </p>
            </div>
            <p style="color: #c4c4c4; font-size: 11px; text-align: center; margin-top: 24px;">
              RXFin — Suas finanças sob controle
            </p>
          </div>
        </body>
        </html>
      `
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation: {
          id: invitation.id,
          token: invitation.token,
          inviteLink,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
