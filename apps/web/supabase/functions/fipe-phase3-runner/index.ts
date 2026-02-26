import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v2';
const TYPE_PATH: Record<number, string> = { 1: 'cars', 2: 'trucks', 3: 'motorcycles' };
const LOCK_KEY = 'fipe_phase3_lock';
const STATE_KEY = 'fipe_phase3_state';
const LOCK_TTL_MS = 55_000;
const BATCH_SIZE = 50;
const PARALLEL_SIZE = 10;

// Meses em PT-BR para validação
const MONTHS_PTBR: Record<number, string[]> = {
  1: ['janeiro', 'jan'],
  2: ['fevereiro', 'fev'],
  3: ['março', 'mar'],
  4: ['abril', 'abr'],
  5: ['maio', 'mai'],
  6: ['junho', 'jun'],
  7: ['julho', 'jul'],
  8: ['agosto', 'ago'],
  9: ['setembro', 'set'],
  10: ['outubro', 'out'],
  11: ['novembro', 'nov'],
  12: ['dezembro', 'dez'],
};

/**
 * Parse de preço FIPE — v14 (CORRIGIDO):
 * A API retorna price como string: "R$ 99.706,00"
 * 1. Remove "R$ " e espaços
 * 2. Remove TODOS os pontos (separadores de milhar)
 * 3. Substitui vírgula decimal por ponto
 * 4. parseFloat → Math.round (inteiro)
 *
 * Bug anterior (v5-v13): regex /\.(\d{3})/g só removia o PRIMEIRO separador de milhar,
 * causando multiplicação por 100 quando havia dois separadores (ex: "9.970.600").
 */
function parseFipePrice(raw: string): number | null {
  const s = raw.trim()
    .replace(/R\$\s*/i, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const n = parseFloat(s);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n);
}

/**
 * Valida que o label retornado pela API corresponde ao mês+ano esperado.
 * v14: valida MÊS além do ano — evita aceitar label errado quando a API
 * ignora o ?referenceCode e retorna a referência mais recente.
 */
function labelMatchesRef(label: string, month: number, year: number): boolean {
  const l = label.toLowerCase();
  if (!l.includes(String(year))) return false;
  const monthVariants = MONTHS_PTBR[month] ?? [];
  return monthVariants.some(m => l.includes(m));
}

async function acquireLock(): Promise<boolean> {
  const { data } = await supabase.from('app_settings').select('setting_value').eq('setting_key', LOCK_KEY).single();
  let lock = data?.setting_value;
  if (typeof lock === 'string') { try { lock = JSON.parse(lock); } catch { lock = null; } }
  if (lock?.lockedAt && (Date.now() - new Date(lock.lockedAt).getTime()) < LOCK_TTL_MS) return false;
  await supabase.from('app_settings').upsert({ setting_key: LOCK_KEY, setting_value: JSON.stringify({ lockedAt: new Date().toISOString() }) }, { onConflict: 'setting_key' });
  return true;
}

async function releaseLock() {
  await supabase.from('app_settings').upsert({ setting_key: LOCK_KEY, setting_value: JSON.stringify({ lockedAt: null }) }, { onConflict: 'setting_key' });
}

async function loadState() {
  const { data } = await supabase.from('app_settings').select('setting_value').eq('setting_key', STATE_KEY).single();
  let raw = data?.setting_value;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
  return raw ?? { status: 'running', iteration: 0, inserted: 0, unavailable: 0, mismatch: 0, lastRunAt: null };
}

async function saveState(state: Record<string, unknown>) {
  await supabase.from('app_settings').upsert({ setting_key: STATE_KEY, setting_value: JSON.stringify(state) }, { onConflict: 'setting_key' });
}

async function getReferenceMap(): Promise<Map<number, { month: number; year: number }>> {
  const { data } = await supabase.from('fipe_reference').select('reference_code, month, year');
  const map = new Map<number, { month: number; year: number }>();
  if (data) for (const r of data) map.set(r.reference_code, { month: r.month, year: r.year });
  return map;
}

async function fetchPrice(
  item: { id: bigint; fipe_code: string; model_year: number; reference_code: number; brand_id: number; model_id: number; year_id: string; vehicle_type: number },
  refMap: Map<number, { month: number; year: number }>
): Promise<{ price: number; reference_month: number; reference_year: number; reference_label: string } | null> {
  const typePath = TYPE_PATH[item.vehicle_type];
  if (!typePath) return null;

  const url = `${FIPE_BASE}/${typePath}/brands/${item.brand_id}/models/${item.model_id}/years/${item.year_id}?referenceCode=${item.reference_code}`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();

    const priceRaw: string = data?.price ?? data?.preco ?? data?.valor ?? '';
    if (!priceRaw) return null;
    const price = parseFipePrice(String(priceRaw));
    if (!price || price <= 0) return null;

    const returnedLabel: string = data?.referenceMonth ?? data?.mes ?? data?.referencia ?? '';
    const expectedRef = refMap.get(item.reference_code);

    if (expectedRef && returnedLabel) {
      if (!labelMatchesRef(returnedLabel, expectedRef.month, expectedRef.year)) {
        console.log(`MISMATCH ref=${item.reference_code} expected=${expectedRef.month}/${expectedRef.year} got="${returnedLabel}"`);
        return null;
      }
    }

    if (price > 15_000_000) {
      console.log(`PRICE_ABSURD fipe=${item.fipe_code} ref=${item.reference_code} price=${price}`);
      return null;
    }

    return {
      price,
      reference_month: expectedRef?.month ?? 0,
      reference_year: expectedRef?.year ?? 0,
      reference_label: returnedLabel || '',
    };
  } catch (e) {
    console.error(`fetchPrice error fipe=${item.fipe_code} ref=${item.reference_code}:`, e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });

  const locked = await acquireLock();
  if (!locked) return new Response(JSON.stringify({ skipped: true, reason: 'locked' }), { headers: { 'Content-Type': 'application/json' } });

  try {
    const state = await loadState();
    if (state.status === 'completed') {
      await releaseLock();
      return new Response(JSON.stringify({ done: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    const refMap = await getReferenceMap();

    const { data: batch, error } = await supabase.rpc('get_phase3_batch', { p_limit: BATCH_SIZE });
    if (error) throw error;

    if (!batch || batch.length === 0) {
      state.status = 'completed';
      state.lastRunAt = new Date().toISOString();
      await saveState(state);
      await releaseLock();
      return new Response(JSON.stringify({ done: true, message: 'Phase 3 complete!' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const doneIds: bigint[] = [];
    const unavailIds: bigint[] = [];
    const insertRows: any[] = [];

    for (let i = 0; i < batch.length; i += PARALLEL_SIZE) {
      const chunk = batch.slice(i, i + PARALLEL_SIZE);
      const results = await Promise.all(chunk.map(async (item: any) => {
        const result = await fetchPrice(item, refMap);
        return { item, result };
      }));

      for (const { item, result } of results) {
        if (result) {
          insertRows.push({
            fipe_code: item.fipe_code,
            model_year: item.model_year,
            reference_code: item.reference_code,
            price: result.price,
            reference_month: result.reference_month,
            reference_year: result.reference_year,
            reference_label: result.reference_label,
            fuel_type: null,
            fetched_at: new Date().toISOString(),
          });
          doneIds.push(item.id);
        } else {
          unavailIds.push(item.id);
        }
      }
    }

    let inserted = 0;
    if (insertRows.length > 0) {
      const { error: insErr } = await supabase.from('fipe_price_history').upsert(insertRows, {
        onConflict: 'fipe_code,model_year,reference_code',
        ignoreDuplicates: false,
      });
      if (!insErr) inserted = insertRows.length;
      else console.error('Insert error:', insErr.message);
    }

    if (doneIds.length > 0) await supabase.rpc('mark_phase3_done', { p_ids: doneIds, p_status: 'done' });
    if (unavailIds.length > 0) await supabase.rpc('mark_phase3_done', { p_ids: unavailIds, p_status: 'unavailable' });

    state.iteration = (state.iteration as number) + 1;
    state.inserted = (state.inserted as number) + inserted;
    state.unavailable = (state.unavailable as number) + unavailIds.length;
    state.lastRunAt = new Date().toISOString();
    await saveState(state);
    await releaseLock();

    console.log(`iter=${state.iteration} batch=${batch.length} inserted=${inserted} unavail=${unavailIds.length}`);

    return new Response(JSON.stringify({ ok: true, inserted, unavailable: unavailIds.length, total_inserted: state.inserted }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('Phase3 error:', e);
    await releaseLock();
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
