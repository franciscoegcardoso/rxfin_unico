import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPluggyApiKey } from '../_shared/pluggy-auth.ts';
import {
  resolvePluggyTransactionCategories,
  type PluggyTransaction as PluggyTxShared,
} from '../_shared/pluggy-transactions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLUGGY_API_URL = 'https://api.pluggy.ai';

interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw?: string;
  amount: number;
  amountInAccountCurrency?: number;
  currencyCode?: string;
  date: string;
  category?: string;
  categoryId?: string | null;
  type: string;
  status?: string;
  paymentData?: Record<string, unknown>;
  creditCardMetadata?: Record<string, unknown>;
  bill?: { id: string } | null;
}

async function fetchTransactionsPaginated(
  apiKey: string,
  accountId: string,
  fromDate: string,
): Promise<PluggyTransaction[]> {
  const all: PluggyTransaction[] = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    const url = `${PLUGGY_API_URL}/transactions?accountId=${accountId}&from=${fromDate}&pageSize=${pageSize}&page=${page}`;
    const res = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Transactions fetch error (account ${accountId}, page ${page}):`, errText);
      throw new Error(`Failed to fetch transactions: ${res.status}`);
    }
    const data = await res.json();
    const results: PluggyTransaction[] = data.results ?? [];
    all.push(...results);

    if (results.length < pageSize || all.length >= (data.total ?? Infinity)) break;
    page++;
  }

  return all;
}

Deno.serve(async (req) => {
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

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(serviceKey) && authHeader !== `Bearer ${serviceKey}`) {
    // loose validation for pg_cron compatibility
  }

  const db = createClient(supabaseUrl, serviceKey);

  // ── Guard 1: rescue stuck jobs (running > 10 min) ──
  const { data: rescuedRows } = await db
    .from('pluggy_sync_jobs')
    .update({ status: 'pending', started_at: null, updated_at: new Date().toISOString() })
    .eq('status', 'running')
    .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .select('id');

  if (rescuedRows && rescuedRows.length > 0) {
    console.log(`[pluggy-worker] Rescued ${rescuedRows.length} stuck jobs: ${rescuedRows.map(r => r.id).join(', ')}`);
  }

  // ── Guard 2: AbortController with 350s timeout ──
  const TIMEOUT_MS = 350_000;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  let currentJobId: string | undefined;

  try {
    // 1. Determine which job to process
    let jobId: string | undefined;
    try {
      const body = await req.json();
      jobId = body?.jobId;
    } catch { /* no body */ }

    let job: Record<string, unknown> | null = null;

    if (jobId) {
      const { data } = await db
        .from('pluggy_sync_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('status', 'pending')
        .single();
      job = data;
    } else {
      const { data } = await db
        .from('pluggy_sync_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      job = data;
    }

    if (!job) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ success: true, message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    currentJobId = job.id as string;
    const itemId = job.item_id as string;
    const userId = job.user_id as string | null;
    const attempts = ((job.attempts as number) ?? 0) + 1;
    const maxAttempts = (job.max_attempts as number) ?? 3;

    // 2. Mark job as running
    await db
      .from('pluggy_sync_jobs')
      .update({ status: 'running', started_at: new Date().toISOString(), attempts, updated_at: new Date().toISOString() })
      .eq('id', currentJobId);

    console.log(`[pluggy-worker] Processing job ${currentJobId} | item ${itemId} | attempt ${attempts}/${maxAttempts}`);

    // Check abort before heavy work
    if (abortController.signal.aborted) throw new Error('Timeout após 350s');

    // 3. Authenticate with Pluggy
    const apiKey = await getPluggyApiKey(db);

    // 4. Fetch accounts for this item
    const accountsRes = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
      signal: abortController.signal,
    });
    if (!accountsRes.ok) throw new Error(`Failed to fetch accounts: ${accountsRes.status}`);
    const accountsData = await accountsRes.json();
    const pluggyAccounts: Array<{ id: string; type: string; name: string; number: string; balance: number; currencyCode: string; creditData?: Record<string, unknown>; bankData?: Record<string, unknown> }> = accountsData.results ?? [];

    console.log(`[pluggy-worker] Found ${pluggyAccounts.length} accounts for item ${itemId}`);

    // Resolve internal account IDs
    const { data: dbAccounts } = await db
      .from('pluggy_accounts')
      .select('id, pluggy_account_id')
      .eq('connection_id', (
        await db.from('pluggy_connections').select('id').eq('item_id', itemId).limit(1).single()
      ).data?.id ?? '');

    const accountIdMap = new Map<string, string>();
    for (const a of dbAccounts ?? []) {
      accountIdMap.set(a.pluggy_account_id, a.id);
    }

    // 5. For each account, fetch transactions (last 90 days)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 90);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    let totalTransactions = 0;
    let accountsSynced = 0;

    for (const account of pluggyAccounts) {
      if (abortController.signal.aborted) throw new Error('Timeout após 350s');

      const internalAccountId = accountIdMap.get(account.id);
      if (!internalAccountId) {
        console.warn(`[pluggy-worker] No internal account for pluggy account ${account.id}, skipping`);
        continue;
      }

      const transactions = await fetchTransactionsPaginated(apiKey, account.id, fromDateStr);
      console.log(`[pluggy-worker] Account ${account.id} (${account.type}): ${transactions.length} transactions`);

      if (transactions.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < transactions.length; i += chunkSize) {
          if (abortController.signal.aborted) throw new Error('Timeout após 350s');

          const chunk = transactions.slice(i, i + chunkSize);
          const rows = await Promise.all(
            chunk.map(async (tx) => {
              const { pluggy_category_id, category_id } = await resolvePluggyTransactionCategories(
                db,
                tx as PluggyTxShared,
              );
              return {
                user_id: userId,
                account_id: internalAccountId,
                pluggy_transaction_id: tx.id,
                description: tx.description ?? '',
                description_raw: tx.descriptionRaw ?? null,
                amount: Math.abs(tx.amount),
                amount_in_account_currency: tx.amountInAccountCurrency != null ? Math.abs(tx.amountInAccountCurrency) : null,
                currency_code: tx.currencyCode ?? null,
                date: tx.date?.split('T')[0] ?? tx.date,
                category: tx.category ?? null,
                pluggy_category_id,
                category_id,
                type: tx.type ?? 'DEBIT',
                status: tx.status ?? null,
                payment_data: tx.paymentData ?? null,
                credit_card_metadata: tx.creditCardMetadata ?? null,
                pluggy_bill_id: tx.bill?.id ?? null,
              };
            }),
          );

          const { error } = await db
            .from('pluggy_transactions')
            .upsert(rows, { onConflict: 'pluggy_transaction_id', ignoreDuplicates: false });

          if (error) {
            console.error(`[pluggy-worker] Upsert error for account ${account.id}:`, error.message);
          }
        }
        totalTransactions += transactions.length;
      }

      // Update account balance
      await db
        .from('pluggy_accounts')
        .update({
          balance: account.balance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', internalAccountId);

      accountsSynced++;
    }

    // 6. Update pluggy_connections
    await db
      .from('pluggy_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        status: 'UPDATED',
        updated_at: new Date().toISOString(),
      })
      .eq('item_id', itemId);

    const durationMs = Date.now() - startTime;

    // 7. Mark job as done
    await db
      .from('pluggy_sync_jobs')
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentJobId);

    // 8. Log
    await db.from('pluggy_sync_logs').insert({
      job_id: currentJobId,
      user_id: userId,
      item_id: itemId,
      accounts_synced: accountsSynced,
      transactions_synced: totalTransactions,
      duration_ms: durationMs,
    });

    console.log(`[pluggy-worker] Job ${currentJobId} done: ${totalTransactions} txs, ${accountsSynced} accounts, ${durationMs}ms`);

    clearTimeout(timeoutId);
    return new Response(
      JSON.stringify({
        success: true,
        jobId: currentJobId,
        transactionsSynced: totalTransactions,
        accountsSynced,
        durationMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    clearTimeout(timeoutId);

    const isTimeout = abortController.signal.aborted || (error instanceof Error && error.name === 'AbortError');
    const errMsg = isTimeout ? 'Timeout após 350s' : (error instanceof Error ? error.message : 'Unknown error');
    console.error(`[pluggy-worker] Error:`, errMsg);

    // Mark job as failed
    try {
      const failJobId = currentJobId || (await req.clone().json().catch(() => null))?.jobId;

      if (failJobId) {
        const { data: failedJob } = await db
          .from('pluggy_sync_jobs')
          .select('attempts, max_attempts')
          .eq('id', failJobId)
          .single();

        const attempts = (failedJob?.attempts ?? 0);
        const maxAttempts = (failedJob?.max_attempts ?? 3);
        const finalStatus = isTimeout || attempts >= maxAttempts ? 'error' : 'pending';

        await db
          .from('pluggy_sync_jobs')
          .update({
            status: finalStatus,
            error_message: errMsg,
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', failJobId);

        await db.from('pluggy_sync_logs').insert({
          job_id: failJobId,
          user_id: null,
          item_id: '',
          accounts_synced: 0,
          transactions_synced: 0,
          duration_ms: Date.now() - startTime,
          error: errMsg,
        });
      }
    } catch (innerErr) {
      console.error('[pluggy-worker] Failed to update job status:', innerErr);
    }

    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
