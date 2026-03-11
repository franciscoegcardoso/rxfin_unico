import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as ammonia from "https://deno.land/x/ammonia@0.3.1/mod.ts";
await ammonia.init();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TestEmailRequest {
  type: "test";
  email: string;
  subject: string;
  body: string;
}

interface CampaignEmailRequest {
  type: "campaign";
  campaignId: string;
  segment: string;
  subject: string;
  body: string;
}

type EmailRequest = TestEmailRequest | CampaignEmailRequest;

// Send email via Resend API
async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  fromName: string,
  fromEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Resend API error:", errorData);
      return { success: false, error: errorData };
    }

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

// Generate HTML email template
function generateEmailHtml(rawBody: string): string {
  // Sanitize HTML to prevent XSS / phishing injection
  const body = ammonia.clean(rawBody);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: white; font-size: 24px; margin: 0; font-weight: 700; }
    .content { padding: 32px 24px; }
    .content h2 { color: #16a34a; margin-top: 24px; margin-bottom: 8px; }
    .content a { color: #16a34a; }
    .content p { margin-bottom: 16px; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .footer a { color: #6b7280; }
    .button { display: inline-block; background: #16a34a; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RXFin</h1>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} RXFin - Raio-X Financeiro</p>
      <p>
        <a href="https://rxfin.com.br/unsubscribe">Cancelar inscrição</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Validate user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract token and validate explicitly (required when verify_jwt=false)
    const token = authHeader.replace("Bearer ", "");

    // Create client with user's auth to validate the request
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // CRITICAL: Pass token explicitly when verify_jwt=false
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Service role client for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const request: EmailRequest = await req.json();

    // For campaign sends, verify user is an admin
    if (request.type === "campaign") {
      const { data: adminCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!adminCheck) {
        return new Response(
          JSON.stringify({ success: false, error: "Only admins can send campaigns" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Fetch email settings from database
    const { data: emailSettings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "email_settings")
      .single();

    const fromName = emailSettings?.setting_value?.resendFromName || "RXFin";
    const fromEmail = emailSettings?.setting_value?.resendFromEmail || "noreply@resend.dev";

    if (request.type === "test") {
      // Send test email to single address
      const html = generateEmailHtml(request.body);
      const result = await sendEmail(
        RESEND_API_KEY,
        request.email,
        `[TESTE] ${request.subject}`,
        html,
        fromName,
        fromEmail
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to send test email");
      }

      console.log("Test email sent to:", request.email);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (request.type === "campaign") {
      // Get users based on segment
      let users: any[] = [];

      if (request.segment === 'pro_users' || request.segment === 'free_users') {
        const targetSlugs = request.segment === 'pro_users' ? ['pro', 'starter'] : ['free'];
        const { data: planUsers } = await supabase
          .from('v_user_plan')
          .select('user_id, plan_slug');
        
        const matchingUserIds = (planUsers || [])
          .filter((p: any) => targetSlugs.includes(p.plan_slug))
          .map((p: any) => p.user_id);

        if (matchingUserIds.length > 0) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("is_active", true)
            .not("email", "is", null)
            .is("deleted_at", null)
            .in("id", matchingUserIds);
          if (error) throw new Error(`Failed to fetch users: ${error.message}`);
          users = data || [];
        }
      } else {
        let query = supabase
          .from("profiles")
          .select("id, email")
          .eq("is_active", true)
          .not("email", "is", null)
          .is("deleted_at", null);

        if (request.segment === 'inactive_users') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          query = query.lt("last_login_at", thirtyDaysAgo.toISOString());
        }

        const { data, error: usersError } = await query;
        if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
        users = data || [];
      }


      // Get unsubscribed emails
      const { data: unsubscribed } = await supabase
        .from("email_unsubscribes")
        .select("email");

      const unsubscribedEmails = new Set(unsubscribed?.map((u) => u.email) || []);

      // Filter out unsubscribed users
      const eligibleUsers = users?.filter(
        (u) => u.email && !unsubscribedEmails.has(u.email)
      ) || [];

      console.log(`Sending campaign to ${eligibleUsers.length} users`);

      // Send emails
      const html = generateEmailHtml(request.body);
      let successCount = 0;

      for (const user of eligibleUsers) {
        if (!user.email) continue;

        const result = await sendEmail(
          RESEND_API_KEY,
          user.email,
          request.subject,
          html,
          fromName,
          fromEmail
        );

        if (result.success) {
          successCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Update campaign status
      await supabase
        .from("email_campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          total_recipients: successCount,
        })
        .eq("id", request.campaignId);

      console.log(`Campaign sent: ${successCount}/${eligibleUsers.length}`);

      return new Response(
        JSON.stringify({
          success: true,
          totalSent: successCount,
          totalEligible: eligibleUsers.length,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    throw new Error("Invalid request type");
  } catch (error: unknown) {
    console.error("Error in send-campaign-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
