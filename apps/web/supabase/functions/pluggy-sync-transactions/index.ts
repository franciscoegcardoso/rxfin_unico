import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPluggyApiKey } from '../_shared/pluggy-auth.ts';
import {
  getTransactions,
  buildSortedBills,
  buildTransactionRecordAsync,
} from '../_shared/pluggy-transactions.ts';

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

    const body = await req.json();
    const { accountId, pluggyAccountId, daysBack, fromDate, toDate, page } = body;

    if (!accountId || !pluggyAccountId) {
      return new Response(JSON.stringify({ error: 'accountId and pluggyAccountId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    const { data: account } = await supabase
      .from('pluggy_accounts')
      .select('id, name, type, connection_id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: connection } = await supabase
      .from('pluggy_connections')
      .select('connector_name')
      .eq('id', account.connection_id)
      .maybeSingle();

    const cardName = account.name || connection?.connector_name || 'Cartão';

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const apiKey = await getPluggyApiKey(serviceClient);

    // Fetch one page of transactions (maxPages=1 for pagination control)
    const { transactions, nextPage, totalPages } = await getTransactions(apiKey, pluggyAccountId, {
      daysBack: daysBack || 365,
      fromDate,
      toDate,
      maxPages: 1,
      startPage: page || 1,
    });

    console.log(`[pluggy-sync-transactions] Fetched ${transactions.length} txs for account ${accountId} (page ${page || 1}/${totalPages})`);

    if (transactions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        saved: 0,
        hasMore: false,
        nextPage: null,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load bill mapping for credit accounts
    const sortedBills = account.type === 'CREDIT'
      ? await buildSortedBills(supabase, userId, accountId)
      : [];

    // Build billsMap from existing pluggy_transactions for this account
    const billsMap: Record<string, string> = {};
    if (account.type === 'CREDIT') {
      const { data: existingBillLinks } = await supabase
        .from('pluggy_transactions')
        .select('pluggy_bill_id, bill_id')
        .eq('account_id', accountId)
        .not('pluggy_bill_id', 'is', null)
        .not('bill_id', 'is', null);

      if (existingBillLinks) {
        for (const link of existingBillLinks) {
          if (link.pluggy_bill_id && link.bill_id) {
            billsMap[link.pluggy_bill_id as string] = link.bill_id as string;
          }
        }
      }
    }

    // Build records with bill resolution
    const records = await Promise.all(
      transactions.map(tx =>
        buildTransactionRecordAsync(supabase, tx, userId, accountId, cardName, billsMap, sortedBills)
      ),
    );

    const { error: upsertError } = await supabase
      .from('pluggy_transactions')
      .upsert(records, { onConflict: 'pluggy_transaction_id' });

    if (upsertError) {
      console.error('[pluggy-sync-transactions] Upsert error:', upsertError);
      throw new Error(`Failed to save transactions: ${upsertError.message}`);
    }

    console.log(`[pluggy-sync-transactions] Saved ${records.length} txs, nextPage=${nextPage}`);

    return new Response(JSON.stringify({
      success: true,
      saved: records.length,
      hasMore: nextPage !== null,
      nextPage,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[pluggy-sync-transactions] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
