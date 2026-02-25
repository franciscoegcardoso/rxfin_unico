import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPluggyApiKey } from '../_shared/pluggy-auth.ts';
import { getAccounts } from '../_shared/pluggy-transactions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const { itemId } = await req.json();
    if (!itemId) {
      return new Response(JSON.stringify({ error: 'itemId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service client for caching token in app_settings
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const apiKey = await getPluggyApiKey(serviceClient);

    // Look up the connection for this item
    const { data: connection } = await supabase
      .from('pluggy_connections')
      .select('id, connector_name')
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!connection) {
      return new Response(JSON.stringify({ error: 'Connection not found for this itemId' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch accounts from Pluggy API
    const accounts = await getAccounts(apiKey, itemId);
    console.log(`[pluggy-sync-accounts] Fetched ${accounts.length} accounts for item ${itemId}`);

    // Upsert each account
    const savedAccounts: Array<{ id: string; pluggy_account_id: string; type: string; name: string }> = [];

    for (const account of accounts) {
      const { data: savedAccount, error: upsertError } = await supabase
        .from('pluggy_accounts')
        .upsert({
          user_id: userId,
          connection_id: connection.id,
          pluggy_account_id: account.id,
          type: account.type,
          subtype: account.subtype,
          name: account.name,
          number: account.number,
          balance: account.balance,
          currency_code: account.currencyCode,
          credit_limit: account.creditData?.creditLimit,
          available_credit_limit: account.creditData?.availableCreditLimit,
          card_brand: account.creditData?.brand || null,
        }, { onConflict: 'pluggy_account_id' })
        .select('id, pluggy_account_id, type, name')
        .single();

      if (upsertError) {
        console.error(`[pluggy-sync-accounts] Error upserting account ${account.id}:`, upsertError);
        continue;
      }

      if (savedAccount) {
        savedAccounts.push(savedAccount as { id: string; pluggy_account_id: string; type: string; name: string });
      }
    }

    console.log(`[pluggy-sync-accounts] Upserted ${savedAccounts.length} accounts for item ${itemId}`);

    return new Response(JSON.stringify({ accounts: savedAccounts }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[pluggy-sync-accounts] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
