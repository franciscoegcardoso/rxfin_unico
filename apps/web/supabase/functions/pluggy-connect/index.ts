import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPluggyApiKey } from '../_shared/pluggy-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLUGGY_API_URL = 'https://api.pluggy.ai';

interface PluggyAuthResponse {
  apiKey: string;
}

interface PluggyConnectTokenResponse {
  accessToken: string;
}


async function createConnectToken(apiKey: string, clientUserId: string, itemId?: string): Promise<string> {
  console.log('Creating Pluggy connect token for user:', clientUserId, itemId ? `(update mode, itemId: ${itemId})` : '');

  const body: Record<string, string> = { clientUserId };
  if (itemId) {
    body.itemId = itemId;
  }

  const response = await fetch(`${PLUGGY_API_URL}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Pluggy connect token error:', error);
    throw new Error(`Failed to create connect token: ${response.status}`);
  }

  const data: PluggyConnectTokenResponse = await response.json();
  console.log('Successfully created connect token');
  return data.accessToken;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Request from user:', user.id);

    // Parse optional itemId for update mode
    let itemId: string | undefined;
    try {
      const body = await req.json();
      itemId = body?.itemId;
    } catch {
      // No body or not JSON — that's fine, proceed without itemId
    }

    // Get Pluggy API key
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const apiKey = await getPluggyApiKey(serviceClient);

    // Create connect token for this user (with optional itemId for update mode)
    const connectToken = await createConnectToken(apiKey, user.id, itemId);

    // Retrieve decrypted CPF if available
    let cpf: string | null = null;
    try {
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: cpfData } = await supabaseAdmin.rpc('get_user_cpf', { p_user_id: user.id });
      if (cpfData) {
        cpf = cpfData as string;
        console.log('CPF found for user, will pre-fill widget');
      }
    } catch (cpfError) {
      console.error('Error fetching CPF (non-fatal):', cpfError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        connectToken,
        cpf,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in pluggy-connect:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});