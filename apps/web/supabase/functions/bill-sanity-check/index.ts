import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Derive billing_month (competence) from due_date: always 1 month before.
 */
function deriveBillingMonth(dueDate: string): string {
  const d = new Date(dueDate.split('T')[0] + 'T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/**
 * Resolve closing date: use real value if available, otherwise fallback to due - 7 days.
 */
function resolveClosingDate(closeDateRaw: string | null | undefined, dueDateRaw: string): string {
  const dueDate = dueDateRaw.split('T')[0];
  if (closeDateRaw) {
    const closeDate = closeDateRaw.split('T')[0];
    if (closeDate !== dueDate) return closeDate;
  }
  const d = new Date(dueDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().split('T')[0];
}

function inferBillingCycle(bills: Array<{ due_date: string; closing_date: string }>): { dueDay: number; closingDay: number } | null {
  if (bills.length === 0) return null;
  const latest = bills[bills.length - 1];
  const dueDay = parseInt(latest.due_date.substring(8, 10), 10);
  const resolvedClosing = resolveClosingDate(latest.closing_date, latest.due_date);
  const closingDay = parseInt(resolvedClosing.substring(8, 10), 10);
  return { dueDay, closingDay };
}

/**
 * Given a transaction date and the card's billing cycle, determine the target bill month.
 * Returns { closingDate, dueDate } as YYYY-MM-DD strings.
 */
function getTargetBillDates(txDate: string, cycle: { dueDay: number; closingDay: number }): { closingDate: string; dueDate: string } {
  const d = new Date(txDate + 'T12:00:00Z');
  let year = d.getUTCFullYear();
  let month = d.getUTCMonth(); // 0-indexed

  // If the purchase happened after the closing day of its month, it belongs to the next month's bill
  if (d.getUTCDate() > cycle.closingDay) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  const effClosingDay = Math.min(cycle.closingDay, lastDay(year, month));
  const effDueDay = Math.min(cycle.dueDay, lastDay(year, month));

  const closingDate = `${year}-${pad(month + 1)}-${pad(effClosingDay)}`;
  const dueDate = `${year}-${pad(month + 1)}-${pad(effDueDay)}`;

  return { closingDate, dueDate };
}

/**
 * Ensure a bill exists for the given card/month. Creates it if missing.
 * Returns the bill ID.
 */
async function ensureBillExists(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cardId: string,
  cardName: string | null,
  targetDueDate: string,
  targetClosingDate: string,
): Promise<string | null> {
  // Try to find existing bill for this card+due_date
  const { data: existing } = await supabase
    .from('credit_card_bills')
    .select('id')
    .eq('card_id', cardId)
    .eq('due_date', targetDueDate)
    .maybeSingle();

  if (existing) return existing.id;

  // Create the bill
  const { data: newBill, error } = await supabase
    .from('credit_card_bills')
    .insert({
      user_id: userId,
      card_id: cardId,
      card_name: cardName,
      due_date: targetDueDate,
      closing_date: targetClosingDate,
      total_value: 0,
      status: 'open',
      billing_month: deriveBillingMonth(targetDueDate),
    })
    .select('id')
    .single();

  if (error) {
    // Could be a race condition / unique constraint — try to fetch again
    const { data: retry } = await supabase
      .from('credit_card_bills')
      .select('id')
      .eq('card_id', cardId)
      .eq('due_date', targetDueDate)
      .maybeSingle();
    return retry?.id || null;
  }

  console.log(`[AutoCreate] Created bill for card ${cardId} due=${targetDueDate} close=${targetClosingDate} -> ${newBill.id}`);
  return newBill.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;

    // ─── Step 1: Find inconsistent transactions (date > due_date) ───
    // Fetch pluggy_transactions for pluggy_bill_id lookups
    const { data: pluggyTxs } = await supabase
      .from('pluggy_transactions')
      .select('pluggy_transaction_id, pluggy_bill_id, bill_id')
      .eq('user_id', user.id)
      .not('pluggy_bill_id', 'is', null);

    // Build map: pluggy_transaction_id -> { pluggy_bill_id, bill_id }
    const pluggyTxMap = new Map<string, { pluggy_bill_id: string; bill_id: string | null }>();
    for (const pt of pluggyTxs || []) {
      pluggyTxMap.set((pt as any).pluggy_transaction_id, {
        pluggy_bill_id: (pt as any).pluggy_bill_id,
        bill_id: (pt as any).bill_id,
      });
    }

    // Build map: pluggy_bill_id -> internal bill_id (from pluggy_transactions that have both)
    const pluggyBillToInternal = new Map<string, string>();
    for (const pt of pluggyTxs || []) {
      if ((pt as any).bill_id && (pt as any).pluggy_bill_id) {
        pluggyBillToInternal.set((pt as any).pluggy_bill_id, (pt as any).bill_id);
      }
    }

    const { data: allTxs, error: queryError } = await supabase
      .from('credit_card_transactions')
      .select('id, store_name, transaction_date, credit_card_bill_id, pluggy_transaction_id, card_id, value')
      .eq('user_id', user.id)
      .not('credit_card_bill_id', 'is', null);

    if (queryError) throw queryError;

    const { data: allBills, error: billsError } = await supabase
      .from('credit_card_bills')
      .select('id, due_date, closing_date, card_id, card_name')
      .eq('user_id', user.id)
      .order('closing_date', { ascending: true });

    if (billsError) throw billsError;

    const billMap = new Map(allBills.map((b: any) => [b.id, b]));

    // Build card -> sorted bills for cycle inference
    const cardBillsMap = new Map<string, any[]>();
    for (const b of allBills || []) {
      const list = cardBillsMap.get(b.card_id) || [];
      list.push(b);
      cardBillsMap.set(b.card_id, list);
    }

    // Identify bad links
    const badLinks: any[] = [];
    for (const tx of allTxs || []) {
      const bill = billMap.get(tx.credit_card_bill_id);
      if (!bill) {
        badLinks.push({ id: tx.id, store_name: tx.store_name, transaction_date: tx.transaction_date, card_id: tx.card_id, bill_id: tx.credit_card_bill_id, reason: 'orphan_bill_id' });
        continue;
      }
      const txDate = tx.transaction_date.substring(0, 10);
      if (txDate > bill.due_date) {
        badLinks.push({ id: tx.id, store_name: tx.store_name, transaction_date: txDate, card_id: tx.card_id, bill_id: tx.credit_card_bill_id, bill_due_date: bill.due_date, reason: 'date_after_due' });
      }
    }

    // ─── Step 2: Find orphan transactions (bill_id IS NULL) ───
    const { data: orphanTxs } = await supabase
      .from('credit_card_transactions')
      .select('id, store_name, transaction_date, card_id, value')
      .eq('user_id', user.id)
      .is('credit_card_bill_id', null);

    const orphanCount = orphanTxs?.length || 0;

    console.log(`[SanityCheck] ${badLinks.length} inconsistent links + ${orphanCount} orphans for user ${user.id}`);

    if (dryRun) {
      return new Response(JSON.stringify({
        dryRun: true,
        inconsistentCount: badLinks.length,
        orphanCount,
        transactions: badLinks.slice(0, 50),
        orphanSample: (orphanTxs || []).slice(0, 20).map((t: any) => ({ id: t.id, store_name: t.store_name, date: t.transaction_date })),
        message: `Found ${badLinks.length} bad links + ${orphanCount} orphans. Set dryRun=false to fix.`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Step 3: Reset bad links ───
    const badIds = badLinks.map(b => b.id);
    for (let i = 0; i < badIds.length; i += 100) {
      await supabase
        .from('credit_card_transactions')
        .update({ credit_card_bill_id: null })
        .in('id', badIds.slice(i, i + 100))
        .eq('user_id', user.id);
    }

    console.log(`[SanityCheck] Reset ${badIds.length} bad links`);

    // ─── Step 4: Re-link ALL orphans (bad links + previously null) with auto-creation ───
    const allOrphanIds = [...badIds, ...(orphanTxs || []).map((t: any) => t.id)];
    const uniqueOrphanIds = [...new Set(allOrphanIds)];

    // Re-fetch them
    let relinkedCount = 0;
    let billsCreated = 0;

    // Process in chunks
    for (let i = 0; i < uniqueOrphanIds.length; i += 200) {
      const chunk = uniqueOrphanIds.slice(i, i + 200);
      const { data: txsToFix } = await supabase
        .from('credit_card_transactions')
        .select('id, transaction_date, card_id')
        .in('id', chunk)
        .eq('user_id', user.id);

      if (!txsToFix) continue;

      for (const tx of txsToFix) {
        const txDate = tx.transaction_date.substring(0, 10);
        const cardBills = cardBillsMap.get(tx.card_id) || [];
        const cycle = inferBillingCycle(cardBills);

        // First try: find existing bill by closing_date range
        let matchedBillId: string | null = null;
        for (let j = 0; j < cardBills.length; j++) {
          const bill = cardBills[j];
          const effectiveClosing = resolveClosingDate(bill.closing_date !== bill.due_date ? bill.closing_date : null, bill.due_date);
          const prevClosing = j > 0
            ? resolveClosingDate(cardBills[j - 1].closing_date !== cardBills[j - 1].due_date ? cardBills[j - 1].closing_date : null, cardBills[j - 1].due_date)
            : '1900-01-01';

          if (txDate > prevClosing && txDate <= effectiveClosing) {
            matchedBillId = bill.id;
            break;
          }
        }

        // If no existing bill matches AND we have a cycle, auto-create the target bill
        if (!matchedBillId && cycle) {
          const target = getTargetBillDates(txDate, cycle);
          // Get card_name from any existing bill
          const cardName = cardBills.length > 0 ? cardBills[0].card_name : null;
          const newId = await ensureBillExists(supabase, user.id, tx.card_id, cardName, target.dueDate, target.closingDate);
          if (newId) {
            matchedBillId = newId;
            billsCreated++;
            // Add to cardBillsMap so subsequent txs can find it
            const newBill = { id: newId, due_date: target.dueDate, closing_date: target.closingDate, card_id: tx.card_id, card_name: cardName };
            cardBills.push(newBill);
            cardBills.sort((a: any, b: any) => a.closing_date.localeCompare(b.closing_date));
            billMap.set(newId, newBill);
          }
        }

        // PRIORITY 0: Check pluggy_bill_id from pluggy_transactions
        if (!matchedBillId && tx.pluggy_transaction_id) {
          const ptData = pluggyTxMap.get(tx.pluggy_transaction_id);
          if (ptData?.pluggy_bill_id) {
            const internalId = pluggyBillToInternal.get(ptData.pluggy_bill_id);
            if (internalId) matchedBillId = internalId;
          }
        }

        if (matchedBillId) {
          await supabase
            .from('credit_card_transactions')
            .update({ credit_card_bill_id: matchedBillId })
            .eq('id', tx.id);
          relinkedCount++;
        }
      }
    }

    console.log(`[SanityCheck] Relinked ${relinkedCount}, created ${billsCreated} bills`);

    return new Response(JSON.stringify({
      dryRun: false,
      inconsistentCount: badLinks.length,
      orphanCount,
      resetCount: badIds.length,
      relinkedCount,
      billsCreated,
      unresolvedCount: uniqueOrphanIds.length - relinkedCount,
      message: `Fixed ${badIds.length} bad links + ${orphanCount} orphans. Relinked ${relinkedCount}. Created ${billsCreated} new bills.`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('SanityCheck error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
