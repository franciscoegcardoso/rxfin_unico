import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { toDateOnly } from './pluggy-transactions.ts';

const PLUGGY_API_URL = 'https://api.pluggy.ai';

export type PluggyConnectionRef = {
  id: string;
  item_id: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Linha retornada por get_investment_transactions_sync_status (campos flexíveis). */
export type InvestmentTransactionsSyncStatusRow = {
  pluggy_investment_id: string;
  investment_id?: string;
  total_transactions?: number;
  last_synced_at?: string | null;
  needs_backfill: boolean;
};

function mapApiRowToInsert(
  raw: Record<string, unknown>,
  ctx: {
    userId: string;
    investmentId: string;
    pluggyInvestmentId: string;
  },
) {
  const syncedAt = new Date().toISOString();
  return {
    user_id: ctx.userId,
    investment_id: ctx.investmentId,
    pluggy_investment_id: ctx.pluggyInvestmentId,
    pluggy_transaction_id: String(raw.id ?? ''),
    type: (raw.type as string) ?? null,
    description: (raw.description as string) ?? null,
    quantity: raw.quantity != null ? Number(raw.quantity) : null,
    value: raw.value != null ? Number(raw.value) : null,
    amount: raw.amount != null ? Number(raw.amount) : null,
    net_amount: raw.netAmount != null ? Number(raw.netAmount) : null,
    agreed_rate: raw.agreedRate != null ? Number(raw.agreedRate) : null,
    trade_date: raw.tradeDate ? toDateOnly(String(raw.tradeDate)) : null,
    date: raw.date ? toDateOnly(String(raw.date)) : null,
    brokerage_number: (raw.brokerageNumber as string) ?? null,
    expenses: raw.expenses != null ? (raw.expenses as object) : null,
    investment_type: (raw.investmentType as string) ?? null,
    currency_code: (raw.currencyCode as string) ?? null,
    status: (raw.status as string) ?? null,
    raw_data: raw,
    synced_at: syncedAt,
  };
}

/**
 * Sincroniza transações de investimento (API não-deprecated) apenas onde needs_backfill = true.
 */
export async function syncInvestmentTransactions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  pluggyConnection: PluggyConnectionRef | null,
  apiKey: string,
): Promise<{
  investmentsProcessed: number;
  transactionsUpserted: number;
  skipped: number;
  errors: string[];
}> {
  const started = Date.now();
  const errors: string[] = [];
  let investmentsProcessed = 0;
  let transactionsUpserted = 0;
  let skipped = 0;

  const writeSyncLog = async () => {
    const { error: logErr } = await supabase.from('pluggy_sync_logs').insert({
      user_id: userId,
      item_id: pluggyConnection?.item_id ?? null,
      sync_type: 'sync-investment-transactions',
      transactions_synced: transactionsUpserted,
      accounts_synced: investmentsProcessed,
      duration_ms: Date.now() - started,
      error: errors.length ? errors.slice(0, 5).join('; ') : null,
    } as never);
    if (logErr) {
      console.warn('[sync-investment-tx] pluggy_sync_logs insert failed:', logErr.message);
    }
  };

  const { data: statusData, error: rpcError } = await supabase.rpc(
    'get_investment_transactions_sync_status',
    { user_id: userId },
  );

  if (rpcError) {
    const msg = `[sync-investment-tx] RPC get_investment_transactions_sync_status: ${rpcError.message}`;
    console.error(msg);
    errors.push(msg);
    await writeSyncLog();
    return { investmentsProcessed: 0, transactionsUpserted: 0, skipped: 0, errors };
  }

  const rows = (Array.isArray(statusData) ? statusData : []) as InvestmentTransactionsSyncStatusRow[];
  const toSync = rows.filter((r) => r && r.needs_backfill === true);
  skipped = rows.length - toSync.length;

  if (toSync.length === 0) {
    console.log('[sync-investment-tx] Nenhum investimento com needs_backfill=true');
    await writeSyncLog();
    return { investmentsProcessed: 0, transactionsUpserted: 0, skipped, errors };
  }

  for (const row of toSync) {
    const pluggyInvestmentId = String(row.pluggy_investment_id ?? '').trim();
    if (!pluggyInvestmentId) {
      errors.push('Linha com pluggy_investment_id vazio');
      continue;
    }

    let investmentId =
      row.investment_id != null && String(row.investment_id).length > 0
        ? String(row.investment_id).trim()
        : '';
    if (!investmentId) {
      const { data: inv, error: invErr } = await supabase
        .from('pluggy_investments')
        .select('id')
        .eq('user_id', userId)
        .eq('pluggy_investment_id', pluggyInvestmentId)
        .maybeSingle();

      if (invErr || !inv?.id) {
        errors.push(
          `investment_id não encontrado para pluggy_investment_id=${pluggyInvestmentId}: ${invErr?.message ?? 'sem linha'}`,
        );
        continue;
      }
      investmentId = inv.id as string;
    }

    let page = 1;
    let totalPages = 1;
    let totalForThisInvestment = 0;

    try {
      let hadSuccessfulFetch = false;
      while (true) {
        if (page > 1) await sleep(200);

        const url = `${PLUGGY_API_URL}/investments/${encodeURIComponent(pluggyInvestmentId)}/transactions?pageSize=20&page=${page}`;
        const res = await fetch(url, {
          headers: { 'X-API-KEY': apiKey },
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(
            `GET investments/.../transactions ${pluggyInvestmentId} page=${page}: ${res.status} ${errText}`,
          );
          break;
        }

        hadSuccessfulFetch = true;

        const payload = (await res.json()) as {
          results?: Record<string, unknown>[];
          total?: number;
          page?: number;
          totalPages?: number;
        };

        const results = payload.results ?? [];
        totalPages = Math.max(1, Number(payload.totalPages ?? 1));

        if (results.length === 0) break;

        const batch = results
          .filter((r) => r && r.id != null)
          .map((r) =>
            mapApiRowToInsert(r as Record<string, unknown>, {
              userId,
              investmentId,
              pluggyInvestmentId,
            }),
          );

        if (batch.length > 0) {
          const { error: upErr } = await supabase
            .from('pluggy_investment_transactions')
            .upsert(batch, {
              onConflict: 'pluggy_transaction_id',
              ignoreDuplicates: false,
            });

          if (upErr) {
            errors.push(`upsert pluggy_investment_transactions: ${upErr.message}`);
            break;
          }
          totalForThisInvestment += batch.length;
          transactionsUpserted += batch.length;
        }

        if (page >= totalPages) break;
        page += 1;
      }

      if (hadSuccessfulFetch) investmentsProcessed += 1;
      console.log(
        `[sync-investment-tx] pluggy_investment_id=${pluggyInvestmentId} → ${totalForThisInvestment} linhas`,
      );
    } catch (e) {
      errors.push(
        `investment ${pluggyInvestmentId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  await writeSyncLog();
  return { investmentsProcessed, transactionsUpserted, skipped, errors };
}
