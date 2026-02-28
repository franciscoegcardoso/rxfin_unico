import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPluggyApiKey } from '../_shared/pluggy-auth.ts';
import { syncBillsForAccount } from '../_shared/pluggy-transactions.ts';

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

    const { accountId, pluggyAccountId } = await req.json();
    if (!accountId || !pluggyAccountId) {
      return new Response(JSON.stringify({ error: 'accountId and pluggyAccountId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the account belongs to this user
    const { data: account } = await supabase
      .from('pluggy_accounts')
      .select('id, pluggy_account_id, type, name, connection_id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get connector name for card_name
    const { data: connection } = await supabase
      .from('pluggy_connections')
      .select('connector_name')
      .eq('id', account.connection_id)
      .maybeSingle();

    const cardName = account.name || connection?.connector_name || 'Cartão';

    // Service client for token caching
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const apiKey = await getPluggyApiKey(serviceClient);

    // Build a PluggyAccount-compatible object for syncBillsForAccount
    const pluggyAccount = {
      id: pluggyAccountId,
      type: account.type,
      subtype: '',
      name: account.name,
      number: '',
      balance: 0,
      currencyCode: 'BRL',
    };

    // Enrich balance from DB for fallback bill creation
    if (account.type === 'CREDIT') {
      const { data: fullAccount } = await supabase
        .from('pluggy_accounts')
        .select('balance')
        .eq('id', accountId)
        .single();

      if (fullAccount) {
        pluggyAccount.balance = fullAccount.balance || 0;
      }
    }

    const { billsMap, hasInvoiceDetail } = await syncBillsForAccount(
      supabase,
      apiKey,
      userId,
      pluggyAccount,
      accountId,
      cardName,
    );

    const billsCount = Object.keys(billsMap).length;
    console.log(`[pluggy-sync-bills] Synced ${billsCount} bills for account ${accountId}, hasInvoiceDetail=${hasInvoiceDetail}`);

    return new Response(JSON.stringify({
      success: true,
      billsCount,
      hasInvoiceDetail,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[pluggy-sync-bills] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
