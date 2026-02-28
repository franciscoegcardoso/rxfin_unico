import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as ammonia from "https://deno.land/x/ammonia@0.3.1/mod.ts";
await ammonia.init();

/**
 * Centralized Email Gateway for n8n Integration
 * 
 * This Edge Function acts as a secure gateway between the Lovable app and n8n workflows.
 * All email types (verification, campaigns, invitations, password reset) are routed through
 * a single n8n webhook, which handles the actual email delivery logic.
 * 
 * Authentication: Bearer token in Authorization header
 * n8n Webhook: Protected with N8N_WEBHOOK_SECRET header
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Supported email types for the n8n gateway
 */
type EmailType = 
  | 'verification'      // Email confirmation OTP
  | 'password_reset'    // Password recovery link
  | 'invitation'        // User/driver invitations
  | 'campaign'          // Marketing campaigns
  | 'test'              // Test emails from admin panel
  | 'welcome'           // Welcome email after signup
  | 'alert'             // System alerts/notifications
  | 'report';           // Monthly/weekly reports

/**
 * Base payload structure sent to n8n
 */
interface N8NEmailPayload {
  // Meta information
  type: EmailType;
  timestamp: string;
  environment: 'production' | 'test';
  
  // Recipient information
  recipient: {
    email: string;
    name?: string;
    userId?: string;
  };
  
  // Sender configuration (from app_settings)
  sender: {
    email: string;
    name: string;
  };
  
  // Email content
  content: {
    subject: string;
    preheader?: string;
    body?: string;         // HTML body for campaigns
    templateSlug?: string; // For n8n to select template
    variables?: Record<string, string | number | boolean>;
  };
  
  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * Request types from the frontend
 */
interface VerificationEmailRequest {
  type: 'verification';
  email: string;
  userName?: string;
  otpCode: string;
  magicLink?: string;
  expiresInMinutes?: number;
}

interface PasswordResetRequest {
  type: 'password_reset';
  email: string;
  userName?: string;
  resetLink: string;
  expiresInMinutes?: number;
}

interface InvitationRequest {
  type: 'invitation';
  email: string;
  invitedByName: string;
  role: 'shared_user' | 'driver';
  inviteLink: string;
  vehicleNames?: string[];
}

interface CampaignRequest {
  type: 'campaign';
  campaignId: string;
  segment: string;
  subject: string;
  body: string;
}

interface TestEmailRequest {
  type: 'test';
  email: string;
  subject: string;
  body: string;
}

interface GenericEmailRequest {
  type: 'welcome' | 'alert' | 'report';
  email: string;
  userName?: string;
  templateSlug: string;
  variables?: Record<string, string | number | boolean>;
  subject?: string;
}

type EmailRequest = 
  | VerificationEmailRequest 
  | PasswordResetRequest 
  | InvitationRequest 
  | CampaignRequest
  | TestEmailRequest
  | GenericEmailRequest;

// =============================================================================
// N8N INTEGRATION
// =============================================================================

/**
 * Sends payload to n8n webhook with retry logic
 */
async function sendToN8N(
  webhookUrl: string,
  webhookSecret: string,
  payload: N8NEmailPayload
): Promise<{ success: boolean; error?: string; n8nResponse?: unknown }> {
  const maxRetries = 2;
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[n8n] Sending ${payload.type} email to ${payload.recipient.email} (attempt ${attempt + 1})`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${webhookSecret}`,
          'X-Webhook-Source': 'lovable-rxfin',
          'X-Email-Type': payload.type,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[n8n] Error response (${response.status}):`, errorText);
        lastError = `n8n returned ${response.status}: ${errorText}`;
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          return { success: false, error: lastError };
        }
        
        continue; // Retry on 5xx errors
      }

      const result = await response.json().catch(() => ({}));
      console.log(`[n8n] Success:`, result);
      
      return { success: true, n8nResponse: result };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`[n8n] Fetch error (attempt ${attempt + 1}):`, lastError);
    }
  }

  return { success: false, error: lastError || 'Unknown error after retries' };
}

/**
 * Fetches email configuration from app_settings
 */
// deno-lint-ignore no-explicit-any
async function getEmailConfig(supabase: any): Promise<{ 
  email: string; 
  name: string; 
  webhookUrl?: string;
}> {
  const { data: emailSettings } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'email_settings')
    .maybeSingle();

  // deno-lint-ignore no-explicit-any
  const settingValue = (emailSettings as any)?.setting_value as Record<string, string> | null;
  
  return {
    name: settingValue?.senderName || settingValue?.resendFromName || settingValue?.smtpFromName || 'RXFin',
    email: settingValue?.senderEmail || settingValue?.resendFromEmail || settingValue?.smtpUser || 'noreply@resend.dev',
    webhookUrl: settingValue?.n8nWebhookUrl || undefined,
  };
}

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

async function handleVerification(
  request: VerificationEmailRequest,
  sender: { email: string; name: string },
  webhookUrl: string,
  webhookSecret: string
): Promise<N8NEmailPayload> {
  return {
    type: 'verification',
    timestamp: new Date().toISOString(),
    environment: 'production',
    recipient: {
      email: request.email,
      name: request.userName,
    },
    sender,
    content: {
      subject: `${request.otpCode} é seu código de verificação - ${sender.name}`,
      templateSlug: 'email-verification',
      variables: {
        otpCode: request.otpCode,
        userName: request.userName || request.email.split('@')[0],
        magicLink: request.magicLink || '',
        expiresInMinutes: request.expiresInMinutes || 15,
        brandName: sender.name,
      },
    },
  };
}

async function handlePasswordReset(
  request: PasswordResetRequest,
  sender: { email: string; name: string }
): Promise<N8NEmailPayload> {
  return {
    type: 'password_reset',
    timestamp: new Date().toISOString(),
    environment: 'production',
    recipient: {
      email: request.email,
      name: request.userName,
    },
    sender,
    content: {
      subject: `Redefinir sua senha - ${sender.name}`,
      templateSlug: 'password-reset',
      variables: {
        userName: request.userName || request.email.split('@')[0],
        resetLink: request.resetLink,
        expiresInMinutes: request.expiresInMinutes || 60,
        brandName: sender.name,
      },
    },
  };
}

async function handleInvitation(
  request: InvitationRequest,
  sender: { email: string; name: string }
): Promise<N8NEmailPayload> {
  const roleText = request.role === 'shared_user' ? 'compartilhar finanças' : 'gerenciar veículos';
  const vehicleText = request.vehicleNames?.length 
    ? ` para os veículos: ${request.vehicleNames.join(', ')}`
    : '';

  return {
    type: 'invitation',
    timestamp: new Date().toISOString(),
    environment: 'production',
    recipient: {
      email: request.email,
    },
    sender,
    content: {
      subject: `${request.invitedByName} convidou você para ${roleText}`,
      templateSlug: 'invitation',
      variables: {
        invitedByName: request.invitedByName,
        role: request.role,
        roleText,
        vehicleText,
        inviteLink: request.inviteLink,
        brandName: sender.name,
      },
    },
  };
}

// deno-lint-ignore no-explicit-any
async function handleCampaign(
  request: CampaignRequest,
  sender: { email: string; name: string },
  supabase: any,
  webhookUrl: string,
  webhookSecret: string
): Promise<{ success: boolean; totalSent: number; totalEligible: number }> {
  // Get users based on segment - use v_user_plan for plan-based filtering
  let users: any[] = [];

  if (request.segment === 'pro_users' || request.segment === 'free_users') {
    // Join with v_user_plan for plan-based segments
    const targetSlugs = request.segment === 'pro_users' ? ['pro', 'starter'] : ['free'];
    const { data: planUsers } = await supabase
      .from('v_user_plan')
      .select('user_id, plan_slug');
    
    const matchingUserIds = (planUsers || [])
      .filter((p: any) => targetSlugs.includes(p.plan_slug))
      .map((p: any) => p.user_id);

    if (matchingUserIds.length > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('is_active', true)
        .not('email', 'is', null)
        .is('deleted_at', null)
        .in('id', matchingUserIds);
      if (error) throw new Error(`Failed to fetch users: ${error.message}`);
      users = data || [];
    }
  } else {
    let query = supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('is_active', true)
      .not('email', 'is', null)
      .is('deleted_at', null);

    if (request.segment === 'inactive_users') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('last_login_at', thirtyDaysAgo.toISOString());
    }

    const { data, error: usersError } = await query;
    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
    users = data || [];
  }

  // Get unsubscribed emails
  const { data: unsubscribed } = await supabase
    .from('email_unsubscribes')
    .select('email');

  // deno-lint-ignore no-explicit-any
  const unsubscribedEmails = new Set((unsubscribed as any[])?.map((u: any) => u.email) || []);

  // Filter out unsubscribed users
  // deno-lint-ignore no-explicit-any
  const eligibleUsers = (users as any[])?.filter(
    (u: any) => u.email && !unsubscribedEmails.has(u.email)
  ) || [];

  console.log(`[Campaign] Sending to ${eligibleUsers.length} users`);

  let successCount = 0;

  // Send emails in batches
  for (const user of eligibleUsers) {
    if (!user.email) continue;

    const payload: N8NEmailPayload = {
      type: 'campaign',
      timestamp: new Date().toISOString(),
      environment: 'production',
      recipient: {
        email: user.email,
        name: user.full_name || undefined,
        userId: user.id,
      },
      sender,
      content: {
        subject: request.subject,
        body: ammonia.clean(request.body),
        templateSlug: 'campaign',
        variables: {
          userName: user.full_name || user.email.split('@')[0],
          brandName: sender.name,
        },
      },
      metadata: {
        campaignId: request.campaignId,
        segment: request.segment,
      },
    };

    const result = await sendToN8N(webhookUrl, webhookSecret, payload);
    
    if (result.success) {
      successCount++;
    }

    // Small delay to avoid overwhelming n8n
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Update campaign status
  await supabase
    .from('email_campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_recipients: successCount,
    })
    .eq('id', request.campaignId);

  return {
    success: true,
    totalSent: successCount,
    totalEligible: eligibleUsers.length,
  };
}

async function handleTestEmail(
  request: TestEmailRequest,
  sender: { email: string; name: string }
): Promise<N8NEmailPayload> {
  return {
    type: 'test',
    timestamp: new Date().toISOString(),
    environment: 'test',
    recipient: {
      email: request.email,
    },
    sender,
    content: {
      subject: `[TESTE] ${request.subject}`,
      body: ammonia.clean(request.body),
      templateSlug: 'test',
      variables: {
        brandName: sender.name,
      },
    },
  };
}

async function handleGenericEmail(
  request: GenericEmailRequest,
  sender: { email: string; name: string }
): Promise<N8NEmailPayload> {
  return {
    type: request.type,
    timestamp: new Date().toISOString(),
    environment: 'production',
    recipient: {
      email: request.email,
      name: request.userName,
    },
    sender,
    content: {
      subject: request.subject || `${sender.name} - Notificação`,
      templateSlug: request.templateSlug,
      variables: {
        userName: request.userName || request.email.split('@')[0],
        brandName: sender.name,
        ...request.variables,
      },
    },
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const internalSecret = Deno.env.get('INTERNAL_SECRET');
  const headerSecret = req.headers.get('x-internal-secret');
  if (!internalSecret || headerSecret !== internalSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Environment variables
    const N8N_WEBHOOK_URL_ENV = Deno.env.get('N8N_WEBHOOK_URL');
    const N8N_WEBHOOK_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!N8N_WEBHOOK_SECRET) {
      throw new Error('N8N_WEBHOOK_SECRET not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Validate user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Service role client for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const request: EmailRequest = await req.json();
    
    // Get email configuration (includes webhook URL from app_settings)
    const emailConfig = await getEmailConfig(supabase);
    const sender = { email: emailConfig.email, name: emailConfig.name };
    
    // Use webhook URL from app_settings, fallback to env variable
    const N8N_WEBHOOK_URL = emailConfig.webhookUrl || N8N_WEBHOOK_URL_ENV;
    
    if (!N8N_WEBHOOK_URL) {
      throw new Error('N8N webhook URL not configured (set in Admin or as secret)');
    }
    
    console.log(`[Gateway] Processing ${request.type} email request to ${N8N_WEBHOOK_URL}`);

    // Route to appropriate handler
    let payload: N8NEmailPayload | null = null;
    let campaignResult: { success: boolean; totalSent: number; totalEligible: number } | null = null;

    switch (request.type) {
      case 'verification':
        payload = await handleVerification(request, sender, N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET);
        break;
      
      case 'password_reset':
        payload = await handlePasswordReset(request, sender);
        break;
      
      case 'invitation':
        payload = await handleInvitation(request, sender);
        break;
      
      case 'campaign':
        // Verify admin permission for campaigns
        const { data: adminCheck } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!adminCheck) {
          return new Response(
            JSON.stringify({ success: false, error: 'Only admins can send campaigns' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        
        campaignResult = await handleCampaign(request, sender, supabase, N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET);
        break;
      
      case 'test':
        payload = await handleTestEmail(request, sender);
        break;
      
      case 'welcome':
      case 'alert':
      case 'report':
        payload = await handleGenericEmail(request, sender);
        break;
      
      default:
        throw new Error(`Unsupported email type: ${(request as EmailRequest).type}`);
    }

    // Send to n8n (except for campaigns which handle their own sending)
    if (payload) {
      const result = await sendToN8N(N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET, payload);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send to n8n');
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Email queued successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Campaign result
    if (campaignResult) {
      return new Response(
        JSON.stringify(campaignResult),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    throw new Error('No payload generated');

  } catch (error: unknown) {
    console.error('[Gateway] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
