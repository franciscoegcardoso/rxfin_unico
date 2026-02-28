import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLUGGY_API_URL = 'https://api.pluggy.ai';

// ─── Interfaces ───

export interface PluggyAccount {
  id: string;
  type: string;
  subtype: string;
  name: string;
  number: string;
  balance: number;
  currencyCode: string;
  creditData?: {
    level: string;
    brand: string;
    balanceCloseDate: string;
    balanceDueDate: string;
    availableCreditLimit: number;
    balanceForeignCurrency: number;
    minimumPayment: number;
    creditLimit: number;
  };
}

export interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw?: string;
  amount: number;
  amountInAccountCurrency?: number;
  currencyCode?: string;
  date: string;
  category?: string;
  type: string;
  status: string;
  paymentData?: object;
  creditCardMetadata?: {
    billId?: string;
    installmentNumber?: number;
    totalInstallments?: number;
    totalAmount?: number;
    cardNumber?: string;
  };
}

export interface PluggyBill {
  id: string;
  dueDate: string;
  totalAmount: number;
  totalAmountCurrencyCode: string;
  minimumPaymentAmount?: number;
  closingDate?: string;
  state?: 'OPEN' | 'CLOSED' | 'OVERDUE' | 'PAID';
  paidAmount?: number;
}

export interface PluggyItem {
  id: string;
  connector: {
    id: number;
    name: string;
  };
  status: string;
  executionStatus?: string;
  lastUpdatedAt: string;
  consentExpiresAt?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

// ─── Utility functions ───

/**
 * Normalize an ISO date string to YYYY-MM-DD, stripping time component.
 */
export function toDateOnly(dateStr: string): string {
  if (!dateStr) return dateStr;
  return dateStr.split('T')[0];
}

/**
 * Derive billing_month (competence) from due_date: always 1 month before.
 */
export function deriveBillingMonth(dueDate: string): string {
  const clean = toDateOnly(dueDate);
  const d = new Date(clean + 'T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/**
 * Compute a valid closing_date: never equal to due_date.
 */
export function resolveClosingDate(closeDateRaw: string | null | undefined, dueDateRaw: string): string {
  const dueDate = toDateOnly(dueDateRaw);
  if (closeDateRaw) {
    const closeDate = toDateOnly(closeDateRaw);
    if (closeDate !== dueDate) return closeDate;
    console.log(`[resolveClosingDate] closeDate equals dueDate (${dueDate}), applying fallback`);
  }
  const d = new Date(dueDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// ─── API functions ───

export async function getAccounts(apiKey: string, itemId: string): Promise<PluggyAccount[]> {
  const response = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to get accounts: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

export async function getTransactions(apiKey: string, accountId: string, options?: { daysBack?: number; fullHistory?: boolean; maxPages?: number; startPage?: number; fromDate?: string; toDate?: string; billId?: string }): Promise<{ transactions: PluggyTransaction[]; nextPage: number | null; totalPages: number }> {
  const allTransactions: PluggyTransaction[] = [];
  let page = options?.startPage || 1;
  const pageSize = 500;
  const maxPages = options?.maxPages || 999;
  let pagesProcessed = 0;
  let totalPages = 1;
  
  let fromParam = '';
  let toParam = '';
  let billParam = '';

  if (options?.billId) {
    billParam = `&billId=${options.billId}`;
  }

  if (options?.fromDate) {
    fromParam = `&from=${options.fromDate}`;
    if (options?.toDate) {
      toParam = `&to=${options.toDate}`;
    }
  } else if (options?.fullHistory) {
    // No date filter — fetch everything available from Pluggy
  } else if (!options?.billId) {
    const fromDate = new Date();
    const daysBack = options?.daysBack || 365;
    fromDate.setDate(fromDate.getDate() - daysBack);
    fromParam = `&from=${fromDate.toISOString().split('T')[0]}`;
  }

  while (pagesProcessed < maxPages) {
    const url = `${PLUGGY_API_URL}/transactions?accountId=${accountId}${fromParam}${toParam}${billParam}&pageSize=${pageSize}&page=${page}`;
    const response = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!response.ok) {
      throw new Error(`Failed to get transactions: ${response.status}`);
    }

    const data = await response.json();
    const transactions = data.results || [];
    totalPages = data.totalPages || Math.ceil((data.total || 0) / pageSize) || 1;
    allTransactions.push(...transactions);
    pagesProcessed++;

    if (transactions.length < pageSize) {
      console.log(`Fetched ${allTransactions.length} transactions for account ${accountId} (all pages done)`);
      return { transactions: allTransactions, nextPage: null, totalPages };
    }
    page++;
  }

  console.log(`Fetched ${allTransactions.length} transactions for account ${accountId} (paused at page ${page}, totalPages ~${totalPages})`);
  return { transactions: allTransactions, nextPage: page, totalPages };
}

export async function getBills(apiKey: string, accountId: string): Promise<PluggyBill[]> {
  try {
    const response = await fetch(`${PLUGGY_API_URL}/bills?accountId=${accountId}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!response.ok) {
      console.log(`Bills endpoint returned ${response.status} for account ${accountId}, skipping`);
      return [];
    }

    const data = await response.json();
    const bills = data.results || [];
    console.log(`Fetched ${bills.length} bills for account ${accountId}`);
    return bills;
  } catch (e) {
    console.error('Error fetching bills:', e);
    return [];
  }
}

// ─── Deduplication ───

/**
 * Deduplicate installment transactions for a single bill.
 */
export function deduplicateInstallmentsForBill(
  transactions: PluggyTransaction[],
  billClosingDate: string
): PluggyTransaction[] {
  const groups = new Map<string, PluggyTransaction[]>();
  const nonInstallment: PluggyTransaction[] = [];

  for (const tx of transactions) {
    const meta = tx.creditCardMetadata;
    const total = meta?.totalInstallments;
    if (!total || total <= 1) {
      nonInstallment.push(tx);
      continue;
    }

    const baseName = (tx.descriptionRaw || tx.description || '')
      .replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    const groupKey = `${baseName}::${total}`;

    const group = groups.get(groupKey) || [];
    group.push(tx);
    groups.set(groupKey, group);
  }

  const result = [...nonInstallment];
  for (const [, group] of groups) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const closingMs = new Date(billClosingDate + 'T23:59:59Z').getTime();
    let best = group[0];
    let bestDist = Infinity;

    for (const tx of group) {
      const txMs = new Date(toDateOnly(tx.date) + 'T12:00:00Z').getTime();
      const dist = Math.abs(closingMs - txMs);
      const installNum = tx.creditCardMetadata?.installmentNumber || 999;
      const bestInstallNum = best.creditCardMetadata?.installmentNumber || 999;

      if (dist < bestDist || (dist === bestDist && installNum < bestInstallNum)) {
        best = tx;
        bestDist = dist;
      }
    }

    console.log(`[Dedup] Group "${group[0].description}" (${group.length} parcelas) → kept installment ${best.creditCardMetadata?.installmentNumber}/${best.creditCardMetadata?.totalInstallments}`);
    result.push(best);
  }

  return result;
}

// ─── Bill sync ───

/**
 * Fetch bills from Pluggy, upsert into credit_card_bills, return mapping pluggyBillId -> internal UUID
 */
export async function syncBillsForAccount(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  userId: string,
  account: PluggyAccount,
  savedAccountId: string,
  cardName: string,
): Promise<{ billsMap: Record<string, string>; hasInvoiceDetail: boolean }> {
  const billsMap: Record<string, string> = {};
  
  if (account.type !== 'CREDIT') return { billsMap, hasInvoiceDetail: false };

  let bills: PluggyBill[] = [];
  try {
    bills = await getBills(apiKey, account.id);
  } catch (e: any) {
    if (e?.status === 403 || e?.status === 401) {
      console.warn(`Sem permissão para faturas da conta ${account.id}, usando fallback`);
    } else {
      console.error('Error fetching bills:', e);
    }
    bills = [];
  }
  
  if (bills.length === 0) {
    console.log(`No bills returned from Pluggy for account ${account.id} (${account.name})`);
    
    if (account.creditData?.balanceDueDate) {
      const dueDate = toDateOnly(account.creditData.balanceDueDate);
      const closingDate = resolveClosingDate(account.creditData.balanceCloseDate, account.creditData.balanceDueDate);
      
      const { data: savedBill, error: billError } = await supabase
        .from('credit_card_bills')
        .upsert({
          user_id: userId,
          card_id: savedAccountId,
          card_name: cardName,
          due_date: dueDate,
          closing_date: closingDate,
          total_value: account.balance || 0,
          status: 'open',
          billing_month: deriveBillingMonth(dueDate),
        }, {
          onConflict: 'card_id,due_date',
        })
        .select('id')
        .single();

      if (!billError && savedBill) {
        billsMap[`__fallback_${dueDate.substring(0, 7)}`] = savedBill.id;
        console.log(`Created fallback bill for ${dueDate} (closing: ${closingDate}) -> ${savedBill.id}`);
      }
    }
    
    return { billsMap, hasInvoiceDetail: false };
  }

  let hasInvoiceDetail = true;

  for (const bill of bills) {
    const closingDate = resolveClosingDate(bill.closingDate, bill.dueDate);
    console.log(`[SyncBills] Bill pluggy:${bill.id} — dueDate=${bill.dueDate}, closingDate(raw)=${bill.closingDate || 'NULL'}, closingDate(resolved)=${closingDate}, totalAmount=${bill.totalAmount}`);
    const pluggyHasPaymentData = (bill.paidAmount != null && bill.paidAmount > 0) || 
      bill.state === 'PAID' || bill.state === 'OVERDUE';

    const billPayload: Record<string, unknown> = {
      user_id: userId,
      card_id: savedAccountId,
      card_name: cardName,
      due_date: toDateOnly(bill.dueDate),
      closing_date: closingDate,
      total_value: bill.totalAmount || 0,
      billing_month: deriveBillingMonth(bill.dueDate),
    };

    if (pluggyHasPaymentData) {
      billPayload.paid_amount = bill.paidAmount ?? (bill.state === 'PAID' ? (bill.totalAmount || 0) : null);
      billPayload.status = bill.state === 'PAID' ? 'paid' : bill.state === 'OVERDUE' ? 'overdue' : 'closed';
      billPayload.payment_source = (bill.paidAmount != null && bill.paidAmount > 0) || bill.state === 'PAID' ? 'pluggy_api' : null;
    }

    const { data: savedBill, error: billError } = await supabase
      .from('credit_card_bills')
      .upsert(billPayload, {
        onConflict: 'card_id,due_date',
      })
      .select('id')
      .single();

    if (!billError && savedBill) {
      billsMap[bill.id] = savedBill.id;
      console.log(`Mapped bill pluggy:${bill.id} -> db:${savedBill.id} (due: ${bill.dueDate.split('T')[0]}, close: ${closingDate})`);

      try {
        const { transactions: billTxs } = await getTransactions(apiKey, account.id, { billId: bill.id });
        
        if (billTxs.length > 0) {
          console.log(`[SyncBills] Bill ${bill.id}: ${billTxs.length} transações retornadas pela API`);
          
          const deduplicatedTxs = deduplicateInstallmentsForBill(billTxs, closingDate);
          console.log(`[SyncBills] Bill ${bill.id}: ${deduplicatedTxs.length} transações após deduplicação (removidas ${billTxs.length - deduplicatedTxs.length})`);
          
          const toInsert = deduplicatedTxs.map(tx => ({
            user_id: userId,
            account_id: savedAccountId,
            pluggy_transaction_id: tx.id,
            description: tx.description,
            description_raw: tx.descriptionRaw,
            amount: tx.amount,
            amount_in_account_currency: tx.amountInAccountCurrency ?? null,
            currency_code: tx.currencyCode ?? null,
            date: toDateOnly(tx.date),
            category: tx.category,
            type: tx.type,
            status: tx.status,
            payment_data: tx.paymentData,
            pluggy_bill_id: bill.id,
            bill_id: savedBill.id,
            credit_card_metadata: tx.creditCardMetadata || null,
          }));

          const { error: txError } = await supabase
            .from('pluggy_transactions')
            .upsert(toInsert, { onConflict: 'pluggy_transaction_id' });

          if (txError) {
            console.error(`Error saving bill transactions for bill ${bill.id}:`, txError);
          }
        } else {
          console.log(`[SyncBills] Bill ${bill.id}: sem detalhamento (0 transações), fallback necessário`);
          hasInvoiceDetail = false;
        }
      } catch (e) {
        console.warn(`[SyncBills] Erro ao buscar transações da fatura ${bill.id}, fallback necessário:`, e);
        hasInvoiceDetail = false;
      }
    } else if (billError) {
      console.error('Error saving bill:', billError);
    }
  }

  return { billsMap, hasInvoiceDetail };
}

// ─── Bill helpers ───

/**
 * Build sorted bills list for a card
 */
export async function buildSortedBills(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accountId: string,
): Promise<Array<{ id: string; due_date: string; closing_date: string }>> {
  const { data: bills } = await supabase
    .from('credit_card_bills')
    .select('id, due_date, closing_date')
    .eq('user_id', userId)
    .eq('card_id', accountId)
    .order('closing_date', { ascending: true });
  return (bills || []) as Array<{ id: string; due_date: string; closing_date: string }>;
}

/**
 * Infer the card's billing cycle from existing bills.
 */
export function inferBillingCycle(bills: Array<{ due_date: string; closing_date: string }>): { dueDay: number; closingDay: number } | null {
  if (bills.length === 0) return null;
  const latest = bills[bills.length - 1];
  const dueDay = parseInt(latest.due_date.substring(8, 10), 10);
  const resolvedClosing = resolveClosingDate(latest.closing_date, latest.due_date);
  const closingDay = parseInt(resolvedClosing.substring(8, 10), 10);
  return { dueDay, closingDay };
}

/**
 * Given a transaction date and billing cycle, compute the target bill's closing and due dates.
 */
export function getTargetBillDates(txDate: string, cycle: { dueDay: number; closingDay: number }): { closingDate: string; dueDate: string } {
  const d = new Date(txDate + 'T12:00:00Z');
  let year = d.getUTCFullYear();
  let month = d.getUTCMonth();
  if (d.getUTCDate() > cycle.closingDay) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const effClosingDay = Math.min(cycle.closingDay, lastDay(year, month));
  const effDueDay = Math.min(cycle.dueDay, lastDay(year, month));
  return {
    closingDate: `${year}-${pad(month + 1)}-${pad(effClosingDay)}`,
    dueDate: `${year}-${pad(month + 1)}-${pad(effDueDay)}`,
  };
}

/**
 * Ensure a bill exists for a given card+dueDate, creating it if needed.
 */
export async function ensureBillExists(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cardId: string,
  cardName: string | null,
  targetDueDate: string,
  targetClosingDate: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('credit_card_bills')
    .select('id')
    .eq('card_id', cardId)
    .eq('due_date', targetDueDate)
    .maybeSingle();
  if (existing) return existing.id;

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
    const { data: retry } = await supabase
      .from('credit_card_bills')
      .select('id')
      .eq('card_id', cardId)
      .eq('due_date', targetDueDate)
      .maybeSingle();
    return retry?.id || null;
  }
  console.log(`[AutoCreate] Bill created: card=${cardId} due=${targetDueDate} close=${targetClosingDate} -> ${newBill.id}`);
  return newBill.id;
}

/**
 * Map a transaction to its internal bill_id, auto-creating if needed.
 */
export async function resolveBillIdWithAutoCreate(
  supabase: ReturnType<typeof createClient>,
  tx: PluggyTransaction,
  userId: string,
  cardId: string,
  cardName: string | null,
  billsMap: Record<string, string>,
  sortedBills: Array<{ id: string; due_date: string; closing_date: string }>,
): Promise<string | null> {
  const pluggyBillId = tx.creditCardMetadata?.billId;
  if (pluggyBillId && billsMap[pluggyBillId]) {
    return billsMap[pluggyBillId];
  }

  if (pluggyBillId) {
    const { data: ptMatch } = await supabase
      .from('pluggy_transactions')
      .select('bill_id')
      .eq('pluggy_bill_id', pluggyBillId)
      .not('bill_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (ptMatch?.bill_id) {
      return ptMatch.bill_id as string;
    }
  }

  const txDate = toDateOnly(tx.date);

  for (let i = 0; i < sortedBills.length; i++) {
    const bill = sortedBills[i];
    const effectiveClosing = bill.closing_date !== bill.due_date
      ? bill.closing_date
      : resolveClosingDate(null, bill.due_date);
    const prevClosing = i > 0
      ? (sortedBills[i - 1].closing_date !== sortedBills[i - 1].due_date
        ? sortedBills[i - 1].closing_date
        : resolveClosingDate(null, sortedBills[i - 1].due_date))
      : '1900-01-01';
    if (txDate > prevClosing && txDate <= effectiveClosing) {
      return bill.id;
    }
  }

  const cycle = inferBillingCycle(sortedBills);
  if (!cycle) return null;

  const target = getTargetBillDates(txDate, cycle);
  const newId = await ensureBillExists(supabase, userId, cardId, cardName, target.dueDate, target.closingDate);
  if (newId) {
    sortedBills.push({ id: newId, due_date: target.dueDate, closing_date: target.closingDate });
    sortedBills.sort((a, b) => a.closing_date.localeCompare(b.closing_date));
  }
  return newId;
}

/**
 * Build a transaction record with resolved bill_id.
 */
export async function buildTransactionRecordAsync(
  supabase: ReturnType<typeof createClient>,
  tx: PluggyTransaction,
  userId: string,
  accountId: string,
  cardName: string | null,
  billsMap: Record<string, string>,
  sortedBills: Array<{ id: string; due_date: string; closing_date: string }>,
) {
  const pluggyBillId = tx.creditCardMetadata?.billId || null;
  const resolvedBillId = await resolveBillIdWithAutoCreate(
    supabase, tx, userId, accountId, cardName, billsMap, sortedBills,
  );

  return {
    user_id: userId,
    account_id: accountId,
    pluggy_transaction_id: tx.id,
    description: tx.description,
    description_raw: tx.descriptionRaw,
    amount: tx.amount,
    amount_in_account_currency: tx.amountInAccountCurrency ?? null,
    currency_code: tx.currencyCode ?? null,
    date: toDateOnly(tx.date),
    category: tx.category,
    type: tx.type,
    status: tx.status || 'POSTED',
    payment_data: tx.paymentData,
    pluggy_bill_id: pluggyBillId,
    bill_id: resolvedBillId,
    credit_card_metadata: tx.creditCardMetadata || null,
  };
}
