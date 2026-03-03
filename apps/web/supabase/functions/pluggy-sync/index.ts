import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPluggyApiKey } from '../_shared/pluggy-auth.ts';
import {
  type PluggyAccount,
  type PluggyItem,
  toDateOnly,
  deriveBillingMonth,
  resolveClosingDate,
  getAccounts,
  getTransactions,
  getBills,
  syncBillsForAccount,
  buildSortedBills,
  buildTransactionRecordAsync,
  inferBillingCycle,
  getTargetBillDates,
  ensureBillExists,
} from '../_shared/pluggy-transactions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLUGGY_API_URL = 'https://api.pluggy.ai';

async function getItem(apiKey: string, itemId: string): Promise<PluggyItem> {
  const response = await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to get item: ${response.status}`);
  }

  return response.json();
}

/**
 * Build a map of YYYY-MM -> bill internal ID for date-based fallback matching
 */
async function buildBillsByDueMonth(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accountId: string,
): Promise<Record<string, string>> {
  const { data: bills } = await supabase
    .from('credit_card_bills')
    .select('id, due_date')
    .eq('user_id', userId)
    .eq('card_id', accountId);

  const map: Record<string, string> = {};
  if (bills) {
    for (const b of bills) {
      const month = (b as { due_date: string }).due_date.substring(0, 7);
      map[month] = (b as { id: string }).id;
    }
  }
  return map;
}

/**
 * Self-healing: find all credit_card_transactions with NULL bill and re-assign.
 */
async function selfHealOrphanTransactions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ healed: number; billsCreated: number }> {
  const { data: orphans } = await supabase
    .from('credit_card_transactions_v')
    .select('id, transaction_date, card_id, pluggy_transaction_id')
    .eq('user_id', userId)
    .is('credit_card_bill_id', null);

  if (!orphans || orphans.length === 0) return { healed: 0, billsCreated: 0 };

  console.log(`[SelfHeal] Found ${orphans.length} orphan credit_card_transactions`);

  // Group by card
  const byCard = new Map<string, typeof orphans>();
  for (const tx of orphans) {
    const list = byCard.get(tx.card_id) || [];
    list.push(tx);
    byCard.set(tx.card_id, list);
  }

  // Accumulate: billId → txIds[] for batch update at the end
  const billToTxIds = new Map<string, string[]>();
  let billsCreated = 0;

  for (const [cardId, txs] of byCard) {
    const sortedBills = await buildSortedBills(supabase, userId, cardId);
    const cycle = inferBillingCycle(sortedBills);
    if (!cycle && sortedBills.length === 0) continue;

    // Get card_name
    const { data: anyBill } = await supabase
      .from('credit_card_bills')
      .select('card_name')
      .eq('card_id', cardId)
      .limit(1)
      .maybeSingle();
    const cardName = anyBill?.card_name || null;

    // Batch lookup: fetch all pluggy_transactions for orphans that have pluggy_transaction_id
    const pluggyIds = txs
      .filter(tx => tx.pluggy_transaction_id)
      .map(tx => tx.pluggy_transaction_id!);
    
    const pluggyBillMap = new Map<string, string>();
    if (pluggyIds.length > 0) {
      const { data: ptRows } = await supabase
        .from('pluggy_transactions')
        .select('pluggy_transaction_id, bill_id')
        .in('pluggy_transaction_id', pluggyIds)
        .not('bill_id', 'is', null);
      
      for (const row of ptRows || []) {
        pluggyBillMap.set(row.pluggy_transaction_id, row.bill_id as string);
      }
    }

    for (const tx of txs) {
      const txDate = tx.transaction_date.substring(0, 10);

      // PRIORITY 1: Pluggy authoritative bill_id (from batch lookup)
      let matchedId: string | null = null;
      if (tx.pluggy_transaction_id && pluggyBillMap.has(tx.pluggy_transaction_id)) {
        matchedId = pluggyBillMap.get(tx.pluggy_transaction_id)!;
      }

      // PRIORITY 2: Try existing bills by closing-date range
      if (!matchedId) {
        for (let j = 0; j < sortedBills.length; j++) {
          const bill = sortedBills[j];
          const effClose = resolveClosingDate(bill.closing_date !== bill.due_date ? bill.closing_date : null, bill.due_date);
          const prevClose = j > 0
            ? resolveClosingDate(sortedBills[j - 1].closing_date !== sortedBills[j - 1].due_date ? sortedBills[j - 1].closing_date : null, sortedBills[j - 1].due_date)
            : '1900-01-01';
          if (txDate > prevClose && txDate <= effClose) { matchedId = bill.id; break; }
        }
      }

      // PRIORITY 3: Auto-create if needed
      if (!matchedId && cycle) {
        const target = getTargetBillDates(txDate, cycle);
        const newId = await ensureBillExists(supabase, userId, cardId, cardName, target.dueDate, target.closingDate);
        if (newId) {
          matchedId = newId;
          billsCreated++;
          sortedBills.push({ id: newId, due_date: target.dueDate, closing_date: target.closingDate });
          sortedBills.sort((a, b) => a.closing_date.localeCompare(b.closing_date));
        }
      }

      if (matchedId) {
        const list = billToTxIds.get(matchedId) || [];
        list.push(tx.id);
        billToTxIds.set(matchedId, list);
      }
    }
  }

  // Batch update: one query per distinct bill_id instead of one per transaction
  let healed = 0;
  for (const [billId, txIds] of billToTxIds) {
    const { error } = await supabase
      .from('credit_card_transactions_v')
      .update({ credit_card_bill_id: billId })
      .in('id', txIds);
    if (!error) healed += txIds.length;
    else console.error(`[SelfHeal] Batch update failed for bill ${billId}:`, error.message);
  }

  console.log(`[SelfHeal] Healed ${healed} (${billToTxIds.size} batch updates), created ${billsCreated} bills`);
  return { healed, billsCreated };
}

/**
 * Reconcile bill payments by matching bank statement entries to unpaid bills.
 * Priority: P1 (Pluggy API) already handled in syncBillsForAccount.
 * This function handles P3 (bank statement matching) and P4 (manual check fallback).
 */
async function reconcileBillPayments(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ reconciled: number; manualCheck: number }> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Get all unpaid bills with due_date in the past
  const { data: unpaidBills } = await supabase
    .from('credit_card_bills')
    .select('id, due_date, total_value, status, payment_source, card_id, card_name')
    .eq('user_id', userId)
    .lt('due_date', todayStr)
    .not('status', 'eq', 'paid');

  if (!unpaidBills || unpaidBills.length === 0) {
    console.log('[Reconcile] No unpaid past-due bills found');
    return { reconciled: 0, manualCheck: 0 };
  }

  console.log(`[Reconcile] Found ${unpaidBills.length} unpaid past-due bills`);

  // Skip bills already reconciled via bank_statement (don't re-process)
  const billsToProcess = unpaidBills.filter(b => 
    (b as any).payment_source !== 'bank_statement' && (b as any).status !== 'overdue'
  );

  if (billsToProcess.length === 0) {
    console.log('[Reconcile] All bills already processed or overdue');
    return { reconciled: 0, manualCheck: 0 };
  }

  // Get payment-like transactions from lancamentos_realizados
  const { data: payments } = await supabase
    .from('lancamentos_realizados')
    .select('id, nome, categoria, valor_realizado, data_pagamento, data_registro')
    .eq('user_id', userId)
    .eq('tipo', 'despesa');

  if (!payments || payments.length === 0) {
    console.log('[Reconcile] No payment transactions found in lancamentos_realizados');
    // Batch: mark all as requiring manual check in a single query
    const manualIds = billsToProcess.map(b => (b as any).id as string);
    await supabase
      .from('credit_card_bills')
      .update({ requires_manual_check: true, status: 'closed' })
      .in('id', manualIds);
    return { reconciled: 0, manualCheck: manualIds.length };
  }

  // Filter payments that look like credit card bill payments
  const paymentKeywords = ['fatura', 'pagamento de fatura', 'pgto fatura', 'credit card payment'];
  const paymentCategories = ['Pagamento Dividas', 'Credit Card Payment', 'Pagamento de Cartão'];

  const candidatePayments = payments.filter(p => {
    const nome = ((p as any).nome || '').toLowerCase();
    const categoria = ((p as any).categoria || '').toLowerCase();
    return paymentKeywords.some(kw => nome.includes(kw)) ||
           paymentCategories.some(cat => categoria.toLowerCase().includes(cat.toLowerCase()));
  });

  console.log(`[Reconcile] Found ${candidatePayments.length} candidate payment transactions`);

  // Accumulate results for batch updates
  const reconciledUpdates: Array<{ billId: string; payValue: number; lancamentoId: string }> = [];
  const manualCheckIds: string[] = [];

  for (const bill of billsToProcess) {
    const billId = (bill as any).id;
    const billTotal = (bill as any).total_value as number;
    const billDueDate = (bill as any).due_date as string;

    // Window: due_date - 10 days to due_date + 5 days
    const dueMs = new Date(billDueDate + 'T12:00:00Z').getTime();
    const windowStart = dueMs - 10 * 24 * 60 * 60 * 1000;
    const windowEnd = dueMs + 5 * 24 * 60 * 60 * 1000;

    let matched = false;
    for (const payment of candidatePayments) {
      const payDate = (payment as any).data_pagamento || (payment as any).data_registro;
      if (!payDate) continue;

      const payDateClean = payDate.split('T')[0];
      const payMs = new Date(payDateClean + 'T12:00:00Z').getTime();

      if (payMs < windowStart || payMs > windowEnd) continue;

      // Value match with R$0.05 tolerance
      const payValue = Math.abs((payment as any).valor_realizado as number);
      const diff = Math.abs(billTotal - payValue);
      if (diff <= 0.05) {
        console.log(`[Reconcile] Match! Bill ${billId} (R$${billTotal}) ↔ Payment "${(payment as any).nome}" (R$${payValue})`);
        reconciledUpdates.push({ billId, payValue, lancamentoId: (payment as any).id });
        matched = true;
        break;
      }
    }

    if (!matched) {
      console.log(`[Reconcile] No match for bill ${billId} (R$${billTotal}, due ${billDueDate}), flagging for manual check`);
      manualCheckIds.push(billId);
    }
  }

  // Batch update: manual check bills in a single query
  if (manualCheckIds.length > 0) {
    await supabase
      .from('credit_card_bills')
      .update({ requires_manual_check: true, status: 'closed' })
      .in('id', manualCheckIds);
  }

  // Reconciled bills have unique paid_amount/lancamento_id per bill,
  // so we fire them in parallel with Promise.all instead of sequentially
  if (reconciledUpdates.length > 0) {
    await Promise.all(
      reconciledUpdates.map(({ billId, payValue, lancamentoId }) =>
        supabase
          .from('credit_card_bills')
          .update({
            status: 'paid',
            paid_amount: payValue,
            payment_source: 'bank_statement',
            lancamento_id: lancamentoId,
            requires_manual_check: false,
          })
          .eq('id', billId)
      )
    );
  }

  console.log(`[Reconcile] Done: ${reconciledUpdates.length} reconciled, ${manualCheckIds.length} flagged for manual check`);
  return { reconciled: reconciledUpdates.length, manualCheck: manualCheckIds.length };
}

/**
 * Execute async tasks with limited concurrency (semaphore pattern).
 * Processes items in chunks of `limit` using Promise.allSettled.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, itemId, skipCooldown } = body;

    console.log(`Action: ${action}, Item ID: ${itemId}, User: ${user.id}`);



    // ─── BACKFILL ACTION ───
    if (action === 'backfill-bills') {
      console.log('Starting backfill of bill_id for existing transactions...');
      
      // Get all credit card accounts for this user
      const { data: accounts } = await supabase
        .from('pluggy_accounts')
        .select('id, pluggy_account_id, type, name')
        .eq('user_id', user.id)
        .eq('type', 'CREDIT');

      if (!accounts || accounts.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No credit card accounts found', updated: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let apiKey: string | null = null;
      try {
        apiKey = await getPluggyApiKey(supabase);
      } catch (e) {
        console.log('Could not get Pluggy API key, will do date-based backfill only');
      }

      let totalUpdated = 0;

      const CONCURRENCY = 3;
      const backfillResults = await runWithConcurrency(accounts, CONCURRENCY, async (account) => {
        let updated = 0;
        const accId = (account as { id: string }).id;
        const pluggyAccId = (account as { pluggy_account_id: string }).pluggy_account_id;
        const accName = (account as { name: string }).name;
        
        // Fetch fresh bills from Pluggy if possible
        if (apiKey) {
          const bills = await getBills(apiKey, pluggyAccId);
          for (const bill of bills) {
            const closingDate = resolveClosingDate(bill.closingDate, bill.dueDate);
            const { data: savedBill, error: billError } = await supabase
              .from('credit_card_bills')
              .upsert({
                user_id: user.id,
                card_id: accId,
                card_name: accName,
              due_date: toDateOnly(bill.dueDate),
              closing_date: toDateOnly(closingDate),
                total_value: bill.totalAmount || 0,
                paid_amount: bill.paidAmount ?? (bill.state === 'PAID' ? (bill.totalAmount || 0) : null),
                status: bill.state === 'PAID' ? 'paid' : bill.state === 'OVERDUE' ? 'overdue' : (bill.state === 'CLOSED') ? 'closed' : 'open',
                payment_source: (bill.paidAmount != null && bill.paidAmount > 0) || bill.state === 'PAID' ? 'pluggy_api' : null,
                billing_month: deriveBillingMonth(bill.dueDate),
              }, {
                onConflict: 'card_id,due_date',
              })
              .select('id')
              .single();

            if (!billError && savedBill) {
              const { data: updateResult } = await supabase
                .from('pluggy_transactions')
                .update({ 
                  bill_id: (savedBill as { id: string }).id,
                  pluggy_bill_id: bill.id 
                })
                .eq('account_id', accId)
                .eq('pluggy_bill_id', bill.id)
                .select('id');

              const directUpdates = updateResult?.length || 0;
              updated += directUpdates;
              console.log(`Backfill: bill ${bill.id} -> ${(savedBill as { id: string }).id}, direct matches: ${directUpdates}`);
            }
          }
        }

        // Backfill fallback: match orphans by billing_month
        const { data: billsForComp } = await supabase
          .from('credit_card_bills')
          .select('id, billing_month')
          .eq('user_id', user.id)
          .eq('card_id', accId);
        const billsByCompetence: Record<string, string> = {};
        if (billsForComp) {
          for (const b of billsForComp) {
            billsByCompetence[(b as any).billing_month] = (b as any).id;
          }
        }
        
        const { data: orphanTxs } = await supabase
          .from('pluggy_transactions')
          .select('id, date, pluggy_bill_id')
          .eq('account_id', accId)
          .is('bill_id', null);

        if (orphanTxs && orphanTxs.length > 0) {
          const updatesByBill: Record<string, string[]> = {};
          
          for (const tx of orphanTxs) {
            let matchedBillId: string | null = null;
            if ((tx as any).pluggy_bill_id) {
              const { data: billMatch } = await supabase
                .from('pluggy_transactions')
                .select('bill_id')
                .eq('pluggy_bill_id', (tx as any).pluggy_bill_id)
                .not('bill_id', 'is', null)
                .limit(1)
                .maybeSingle();
              if (billMatch?.bill_id) matchedBillId = billMatch.bill_id as string;
            }
            
            if (!matchedBillId) {
              const txMonth = (tx as { date: string }).date.substring(0, 7);
              matchedBillId = billsByCompetence[txMonth] || null;
            }
            
            if (matchedBillId) {
              if (!updatesByBill[matchedBillId]) updatesByBill[matchedBillId] = [];
              updatesByBill[matchedBillId].push((tx as { id: string }).id);
            }
          }

          for (const [billId, txIds] of Object.entries(updatesByBill)) {
            for (let i = 0; i < txIds.length; i += 100) {
              const chunk = txIds.slice(i, i + 100);
              const { error: updateErr } = await supabase
                .from('pluggy_transactions')
                .update({ bill_id: billId })
                .in('id', chunk);

              if (!updateErr) {
                updated += chunk.length;
              } else {
                console.error('Error batch updating bill_id:', updateErr);
              }
            }
          }
          
          console.log(`Backfill date-based for account ${accId}: ${orphanTxs.length} orphans, updated ${Object.values(updatesByBill).flat().length}`);
        }

        return updated;
      });

      for (const r of backfillResults) {
        if (r.status === 'fulfilled') totalUpdated += r.value;
        else console.error('[Backfill] Account failed:', r.reason);
      }

      return new Response(
        JSON.stringify({ success: true, updated: totalUpdated }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── HISTORICAL LOAD: Dispatch via Redis ingest layer (fallback: pluggy_sync_jobs) ───
    if (action === 'historical-load') {
      console.log('[historical-load] Dispatching via ingest-dispatcher...');

      const histItemId = itemId || '__all__';
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const internalSecret = Deno.env.get('INTERNAL_SECRET') ?? '';
      const dispatcherUrl = `${supabaseUrl}/functions/v1/ingest-dispatcher`;

      if (internalSecret && dispatcherUrl) {
        try {
          const dispatchRes = await fetch(dispatcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
            body: JSON.stringify({
              type: 'pluggy:historical_load',
              payload: { user_id: user.id, item_id: histItemId },
              priority: 3,
              idempotencyKey: `historical-load:${histItemId}:${new Date().toISOString().split('T')[0]}`,
            }),
          });
          const dispatchData = await dispatchRes.json();
          const jobId = dispatchData.messageId ?? 'dispatched';
          console.log(`[historical-load] Dispatcher response:`, dispatchData);
          return new Response(
            JSON.stringify({ success: true, queued: true, jobId, fallback: dispatchData.fallback === true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (e) {
          console.error('[historical-load] Dispatcher failed, falling back to pluggy_sync_jobs:', e);
        }
      }

      const { data: existingHist } = await supabase
        .from('pluggy_sync_jobs')
        .select('id')
        .eq('item_id', histItemId)
        .eq('action', 'historical-load')
        .in('status', ['pending', 'running'])
        .limit(1)
        .maybeSingle();

      if (existingHist) {
        return new Response(
          JSON.stringify({ success: true, queued: true, jobId: existingHist.id, alreadyRunning: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from('pluggy_sync_jobs')
        .insert({
          user_id: user.id,
          item_id: histItemId,
          action: 'historical-load',
          priority: 3,
          status: 'pending',
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('[historical-load] Error queuing job:', jobError);
        throw jobError;
      }

      console.log(`[historical-load] Queued job ${job.id}`);
      return new Response(
        JSON.stringify({ success: true, queued: true, jobId: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── INCREMENTAL SYNC: Dispatch via Redis ingest layer (fallback: pluggy_sync_jobs) ───
    if (action === 'incremental-sync') {
      console.log('[incremental-sync] Dispatching via ingest-dispatcher...');

      const incItemId = itemId || '__all__';
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const internalSecret = Deno.env.get('INTERNAL_SECRET') ?? '';
      const dispatcherUrl = `${supabaseUrl}/functions/v1/ingest-dispatcher`;

      if (internalSecret && dispatcherUrl) {
        try {
          const dispatchRes = await fetch(dispatcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
            body: JSON.stringify({
              type: 'pluggy:incremental_sync',
              payload: { user_id: user.id, item_id: incItemId },
              priority: 2,
              idempotencyKey: `incremental-sync:${incItemId}:${new Date().toISOString().split('T')[0]}`,
            }),
          });
          const dispatchData = await dispatchRes.json();
          const jobId = dispatchData.messageId ?? 'dispatched';
          return new Response(
            JSON.stringify({ success: true, queued: true, jobId, fallback: dispatchData.fallback === true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (e) {
          console.error('[incremental-sync] Dispatcher failed, falling back to pluggy_sync_jobs:', e);
        }
      }

      const { data: existingInc } = await supabase
        .from('pluggy_sync_jobs')
        .select('id')
        .eq('item_id', incItemId)
        .eq('action', 'incremental-sync')
        .in('status', ['pending', 'running'])
        .limit(1)
        .maybeSingle();

      if (existingInc) {
        return new Response(
          JSON.stringify({ success: true, queued: true, jobId: existingInc.id, alreadyRunning: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from('pluggy_sync_jobs')
        .insert({
          user_id: user.id,
          item_id: incItemId,
          action: 'incremental-sync',
          priority: 2,
          status: 'pending',
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('[incremental-sync] Error queuing job:', jobError);
        throw jobError;
      }

      console.log(`[incremental-sync] Queued job ${job.id}`);
      return new Response(
        JSON.stringify({ success: true, queued: true, jobId: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── All other actions need Pluggy API key ───
    const apiKey = await getPluggyApiKey(supabase);

    if (action === 'save-connection') {
      const item = await getItem(apiKey, itemId);
      console.log('Saving connection for item:', item.id, 'connector:', item.connector.name);

      // ─── Cross-user uniqueness: prevent the same item_id from being claimed by another user ───
      const { data: existingConn } = await supabase
        .from('pluggy_connections')
        .select('user_id')
        .eq('item_id', itemId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingConn && existingConn.user_id !== user.id) {
        console.error(`[save-connection] item_id ${itemId} already belongs to user ${existingConn.user_id}, rejecting for ${user.id}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Esta conexão já está vinculada a outra conta. Se você acredita ser um erro, entre em contato com o suporte.',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upsert connection metadata only (no heavy sync)
      const { data: connection, error: connError } = await supabase
        .from('pluggy_connections')
        .upsert({
          user_id: user.id,
          item_id: itemId,
          connector_id: item.connector.id,
          connector_name: item.connector.name,
          connector_image_url: item.connector.imageUrl || null,
          connector_primary_color: item.connector.primaryColor || null,
          status: item.status,
          execution_status: item.executionStatus || null,
          last_error_code: item.error?.code || null,
          consent_expires_at: item.consentExpiresAt || null,
        }, {
          onConflict: 'item_id',
        })
        .select()
        .single();

      if (connError) {
        console.error('Error saving connection:', connError);
        throw connError;
      }

      // Queue a background sync job via ingest-dispatcher (Redis) or fallback to pluggy_sync_jobs
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const internalSecret = Deno.env.get('INTERNAL_SECRET') ?? '';
      const dispatcherUrl = `${supabaseUrl}/functions/v1/ingest-dispatcher`;
      let queuedViaDispatcher = false;

      if (internalSecret && dispatcherUrl) {
        try {
          const dispatchRes = await fetch(dispatcherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
            body: JSON.stringify({
              type: 'pluggy:initial_sync',
              payload: { user_id: user.id, item_id: itemId },
              priority: 1,
              idempotencyKey: `initial-sync:${itemId}:${new Date().toISOString().split('T')[0]}`,
            }),
          });
          const dispatchData = await dispatchRes.json();
          if (dispatchData.success && dispatchData.messageId) {
            queuedViaDispatcher = true;
            console.log(`[save-connection] Dispatched initial-sync for item ${itemId}, messageId: ${dispatchData.messageId}`);
          }
        } catch (e) {
          console.error('[save-connection] Dispatcher failed, falling back to pluggy_sync_jobs:', e);
        }
      }

      if (!queuedViaDispatcher) {
        const { data: existingInit } = await supabase
          .from('pluggy_sync_jobs')
          .select('id')
          .eq('item_id', itemId)
          .in('status', ['pending', 'running'])
          .limit(1)
          .maybeSingle();

        let jobError = null;
        if (!existingInit) {
          const { error } = await supabase
            .from('pluggy_sync_jobs')
            .insert({
              user_id: user.id,
              item_id: itemId,
              action: 'initial-sync',
              priority: 1,
              status: 'pending',
            });
          jobError = error;
        }

        if (jobError) {
          console.error('Error queuing sync job:', jobError);
        } else {
          console.log(`[save-connection] Queued initial-sync job for item ${itemId}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          queued: true,
          connection,
          message: 'Sincronização iniciada em segundo plano',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh') {
      const { data: connection, error: connError } = await supabase
        .from('pluggy_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .is('deleted_at', null)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: 'Connection not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ─── Cooldown guard: 1 hour minimum between manual refreshes ───
      // Automated flows (worker, daily_auto) pass skipCooldown=true
      if (!skipCooldown) {
        const REFRESH_COOLDOWN_MS = 60 * 60 * 1000;
        if (connection.last_sync_at) {
          const elapsed = Date.now() - new Date(connection.last_sync_at).getTime();
          if (elapsed < REFRESH_COOLDOWN_MS) {
            const remainingMin = Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 60000);
            return new Response(
              JSON.stringify({
                success: false,
                error: `Sincronização disponível em ${remainingMin} minuto(s).`,
                cooldown: true,
                retryAfterMs: REFRESH_COOLDOWN_MS - elapsed,
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      const item = await getItem(apiKey, itemId);
      const accounts = await getAccounts(apiKey, itemId);

      await supabase
        .from('pluggy_connections')
        .update({ 
          status: item.status,
          execution_status: item.executionStatus || null,
          last_error_code: item.error?.code || null,
          consent_expires_at: item.consentExpiresAt || null,
          connector_image_url: item.connector?.imageUrl || null,
          connector_primary_color: item.connector?.primaryColor || null,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      const CONCURRENCY = 3;
      const refreshResults = await runWithConcurrency(accounts, CONCURRENCY, async (account) => {
        const { data: savedAccount } = await supabase
          .from('pluggy_accounts')
          .upsert({
            user_id: user.id,
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
          .select()
          .single();

        if (!savedAccount) return;

        const cardName = account.name || connection.connector_name;
        const { billsMap, hasInvoiceDetail } = await syncBillsForAccount(supabase, apiKey, user.id, account, savedAccount.id, cardName);
        const sortedBillsRef = await buildSortedBills(supabase, user.id, savedAccount.id);

        if (!hasInvoiceDetail) {
          const { transactions } = await getTransactions(apiKey, account.id);
          
          if (transactions.length > 0) {
            const transactionsToInsert = await Promise.all(transactions.map(tx =>
              buildTransactionRecordAsync(supabase, tx, user.id, savedAccount.id, cardName, billsMap, sortedBillsRef)
            ));

            const { error: txError } = await supabase
              .from('pluggy_transactions')
              .upsert(transactionsToInsert, {
                onConflict: 'pluggy_transaction_id',
              });

            if (txError) {
              console.error('Error saving transactions (refresh):', txError);
            } else {
              const withBill = transactionsToInsert.filter(t => t.bill_id).length;
              console.log(`Refresh: ${transactionsToInsert.length} transactions, ${withBill} linked to bills`);
            }
          }
        } else {
          console.log(`[Refresh] ${cardName}: transações já importadas por fatura`);
        }
      });

      // Log any account-level failures
      for (const r of refreshResults) {
        if (r.status === 'rejected') console.error('[Refresh] Account sync failed:', r.reason);
      }

      // Run payment reconciliation after refresh
      const reconcileResult = await reconcileBillPayments(supabase, user.id);
      console.log(`[Refresh] Reconciliation: ${reconcileResult.reconciled} reconciled, ${reconcileResult.manualCheck} manual check`);

      return new Response(
        JSON.stringify({ success: true, accountsCount: accounts.length, reconciliation: reconcileResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      // Soft-delete: mark connection and its accounts as deleted instead of physical removal
      // This preserves historical transaction data and prevents orphan card_ids
      const { data: connData, error: connFetchErr } = await supabase
        .from('pluggy_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .single();

      if (connFetchErr) throw connFetchErr;

      const connectionId = connData.id;

      // Soft-delete the accounts first
      const { error: acctErr } = await supabase
        .from('pluggy_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('connection_id', connectionId);

      if (acctErr) {
        console.error('Error soft-deleting accounts:', acctErr);
      }

      // Soft-delete the connection
      const { error: connErr } = await supabase
        .from('pluggy_connections')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', connectionId);

      if (connErr) throw connErr;

      // Still revoke access from Pluggy API (best-effort)
      try {
        await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
          method: 'DELETE',
          headers: { 'X-API-KEY': apiKey },
        });
      } catch (e) {
        console.error('Error deleting item from Pluggy:', e);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── SYNC RECURRING PAYMENTS ───
    if (action === 'sync-recurring-payments') {
      console.log('Starting recurring payments sync...');
      const ENRICHMENT_API = 'https://enrichment-api.pluggy.ai';

      const { data: connections } = await supabase
        .from('pluggy_connections')
        .select('id, item_id, connector_name')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (!connections || connections.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No connections found', synced: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let totalSynced = 0;

      for (const conn of connections) {
        try {
          const response = await fetch(`${ENRICHMENT_API}/recurring-payments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': apiKey,
            },
            body: JSON.stringify({ itemId: (conn as any).item_id }),
          });

          if (!response.ok) {
            console.log(`Recurring payments API returned ${response.status} for item ${(conn as any).item_id}, skipping`);
            continue;
          }

          const data = await response.json();
          const recurringPayments = data.recurringPayments || [];

          console.log(`Found ${recurringPayments.length} recurring payments for ${(conn as any).connector_name}`);

          for (const rp of recurringPayments) {
            const occurrences = rp.occurrences || [];
            const lastDate = occurrences.length > 0
              ? occurrences[occurrences.length - 1]
              : null;

            // Estimate next expected date (last occurrence + ~30 days)
            let nextExpectedDate: string | null = null;
            if (lastDate) {
              // lastDate is a transaction ID, try to get its date from pluggy_transactions
              const { data: lastTx } = await supabase
                .from('pluggy_transactions')
                .select('date')
                .eq('pluggy_transaction_id', lastDate)
                .maybeSingle();
              
              if (lastTx?.date) {
                const d = new Date(toDateOnly(lastTx.date as string) + 'T12:00:00Z');
                d.setUTCDate(d.getUTCDate() + 30);
                const pad = (n: number) => String(n).padStart(2, '0');
                nextExpectedDate = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
              }
            }

            const { error: upsertErr } = await supabase
              .from('pluggy_recurring_payments')
              .upsert({
                user_id: user.id,
                item_id: (conn as any).item_id,
                description: rp.description || 'Pagamento recorrente',
                average_amount: rp.averageAmount || 0,
                regularity_score: rp.regularityScore || 0,
                frequency: 'monthly',
                last_occurrence_date: null,
                next_expected_date: nextExpectedDate,
                category: rp.category || null,
                account_id: null,
                is_active: true,
                raw_data: rp,
              }, {
                onConflict: 'user_id,item_id,description',
              });

            if (upsertErr) {
              console.error('Error upserting recurring payment:', upsertErr);
            } else {
              totalSynced++;
            }
          }
        } catch (e) {
          console.error(`Error fetching recurring payments for item ${(conn as any).item_id}:`, e);
        }
      }

      return new Response(
        JSON.stringify({ success: true, synced: totalSynced }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── reconcile-bills: standalone bill payment reconciliation ──
    if (action === 'reconcile-bills') {
      const result = await reconcileBillPayments(supabase, user.id);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── refresh-statuses: check real-time status from Pluggy API and update DB ──
    if (action === 'refresh-statuses') {
      const apiKey = await getPluggyApiKey(supabase);

      const { data: connections, error: fetchErr } = await supabase
        .from('pluggy_connections')
        .select('id, item_id, status, execution_status')
        .eq('user_id', user.id)
        .not('item_id', 'is', null)
        .is('deleted_at', null);

      if (fetchErr) {
        console.error('[refresh-statuses] Error fetching connections:', JSON.stringify(fetchErr));
      }

      console.log(`[refresh-statuses] Found ${(connections || []).length} connections for user ${user.id}`);

      let updated = 0;
      for (const conn of (connections || [])) {
        try {
          console.log(`[refresh-statuses] Checking item_id="${conn.item_id}" (db_id=${conn.id}, db_status=${conn.status})`);
          const item = await getItem(apiKey, conn.item_id);
          console.log(`[refresh-statuses] Pluggy API response: status="${item.status}", executionStatus="${item.executionStatus}", error=${JSON.stringify(item.error)}, consentExpiresAt="${item.consentExpiresAt}"`);

          const newStatus = item.status || conn.status;
          const newExecStatus = item.executionStatus || null;
          const newErrorCode = item.error?.code || null;

          // Always update if Pluggy status diverges from DB — force sync
          if (newStatus !== conn.status || newExecStatus !== conn.execution_status) {
            const updatePayload = {
              status: newStatus,
              execution_status: newExecStatus,
              last_error_code: newErrorCode,
              consent_expires_at: item.consentExpiresAt || null,
            };
            console.log(`[refresh-statuses] WILL UPDATE connection ${conn.id}:`, JSON.stringify(updatePayload));

            const { data: updateData, error: updateErr } = await supabase
              .from('pluggy_connections')
              .update(updatePayload)
              .eq('id', conn.id)
              .select('id, status');

            if (updateErr) {
              console.error(`[refresh-statuses] UPDATE FAILED for ${conn.id}:`, JSON.stringify(updateErr));
            } else {
              updated++;
              console.log(`[refresh-statuses] UPDATE OK for ${conn.id}: ${conn.status} -> ${newStatus}, returned:`, JSON.stringify(updateData));
            }
          } else {
            console.log(`[refresh-statuses] No change needed for ${conn.id} (status already "${newStatus}")`);
          }
        } catch (e) {
          console.error(`[refresh-statuses] Error checking item ${conn.item_id}:`, e);
        }
      }

      return new Response(
        JSON.stringify({ success: true, updated }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pluggy-sync:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
