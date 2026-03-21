/**
 * process-insights — Pluggy Insights API → `upsert_pluggy_insights`
 *
 * - Book (KPIs): POST https://insights-api.pluggy.ai/book?itemIds=<itemId>
 * - Categorias (top DEBIT / períodos M3/M6): POST https://insights-api.pluggy.ai/categories
 *   Body: { "itemIds": ["<itemId>"] } — necessário para popular top_categories_m3 / top_categories_m6.
 *
 * Cron: `pluggy-process-insights-daily` | trigger após sync pode chamar com service role / internal secret.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPluggyApiKey } from '../_shared/pluggy-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

const INSIGHTS_API = 'https://insights-api.pluggy.ai';

function isServiceRoleAuth(authHeader: string | null): boolean {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key || !authHeader?.startsWith('Bearer ')) return false;
  return authHeader.replace('Bearer ', '').trim() === key;
}

function isInternalSecret(req: Request): boolean {
  const secret = Deno.env.get('INTERNAL_SECRET');
  return !!secret && req.headers.get('x-internal-secret') === secret;
}

/**
 * Financial KPIs book — não alterar estrutura retornada pela Pluggy (apenas repassamos `book` à RPC).
 */
async function fetchInsightsBook(
  pluggyApiKey: string,
  itemId: string,
): Promise<{ book: unknown; categoriesInResponse: unknown[]; topLevelKeys: string[] }> {
  const url = `${INSIGHTS_API}/book?itemIds=${encodeURIComponent(itemId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': pluggyApiKey,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[process-insights] book HTTP ${res.status} item=${itemId}: ${text.slice(0, 600)}`);
    throw new Error(`Pluggy insights book failed: ${res.status}`);
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error(`[process-insights] book not JSON item=${itemId}: ${text.slice(0, 400)}`);
    throw new Error('book response is not JSON');
  }
  const topLevelKeys = Object.keys(data);
  const book = data.book !== undefined ? data.book : data;
  const categoriesInResponse = Array.isArray(data.categories) ? data.categories : [];
  return { book, categoriesInResponse, topLevelKeys };
}

/**
 * Categorias agregadas por período (M3, M6, …) — endpoint dedicado da Insights API.
 */
async function fetchInsightsCategories(pluggyApiKey: string, itemId: string): Promise<unknown[]> {
  const res = await fetch(`${INSIGHTS_API}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': pluggyApiKey,
    },
    body: JSON.stringify({ itemIds: [itemId] }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.warn(`[process-insights] categories HTTP ${res.status} item=${itemId}: ${text.slice(0, 900)}`);
    return [];
  }
  let catData: unknown;
  try {
    catData = JSON.parse(text);
  } catch {
    console.warn(`[process-insights] categories response not JSON item=${itemId}: ${text.slice(0, 400)}`);
    return [];
  }
  if (Array.isArray(catData)) return catData;
  if (catData && typeof catData === 'object') {
    const o = catData as Record<string, unknown>;
    const nested = o.results ?? o.categories ?? o.data;
    if (Array.isArray(nested)) return nested;
  }
  console.warn(
    `[process-insights] categories unexpected shape item=${itemId}:`,
    typeof catData === 'object' && catData !== null ? Object.keys(catData as object) : typeof catData,
  );
  return [];
}

async function processItem(
  supabaseAdmin: ReturnType<typeof createClient>,
  pluggyApiKey: string,
  userId: string,
  itemId: string,
): Promise<{ ok: boolean; error?: string }> {
  let book: unknown;
  let categoriesFromBook: unknown[] = [];
  let topLevelKeys: string[] = [];

  try {
    const parsed = await fetchInsightsBook(pluggyApiKey, itemId);
    book = parsed.book;
    categoriesFromBook = parsed.categoriesInResponse;
    topLevelKeys = parsed.topLevelKeys;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[process-insights] book error item=${itemId}:`, msg);
    return { ok: false, error: msg };
  }

  let categories: unknown[] = [];
  try {
    categories = await fetchInsightsCategories(pluggyApiKey, itemId);
  } catch (e) {
    console.warn(`[process-insights] categories fetch threw item=${itemId}:`, e);
  }

  if (categories.length === 0 && categoriesFromBook.length > 0) {
    console.log(
      `[process-insights] categories endpoint empty; using ${categoriesFromBook.length} categories from book response (keys on book payload: ${topLevelKeys.join(', ')}) item=${itemId}`,
    );
    categories = categoriesFromBook;
  }

  const { error: rpcError } = await supabaseAdmin.rpc('upsert_pluggy_insights', {
    p_user_id: userId,
    p_item_id: itemId,
    p_book: book,
    p_categories: categories,
  });

  if (rpcError) {
    console.error(`[process-insights] upsert_pluggy_insights item=${itemId}:`, rpcError);
    return { ok: false, error: rpcError.message };
  }

  return { ok: true };
}

async function assertAuthorized(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceKey: string,
): Promise<boolean> {
  if (isServiceRoleAuth(req.headers.get('Authorization'))) return true;
  if (isInternalSecret(req)) return true;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) return false;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: adminRole } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  return !!adminRole;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authorized = await assertAuthorized(req, supabaseUrl, anonKey, serviceKey);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown> = {};
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = (await req.json()) as Record<string, unknown>;
    }
  } catch {
    // empty body ok (cron)
  }

  let pluggyApiKey: string;
  try {
    pluggyApiKey = await getPluggyApiKey(supabaseAdmin);
  } catch (e) {
    console.error('[process-insights] getPluggyApiKey failed:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Pluggy auth failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const action = typeof body.action === 'string' ? body.action : '';

  // Single item (ex.: trigger após sync)
  if (action === 'sync-item') {
    if (typeof body.user_id !== 'string' || typeof body.item_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'sync-item requires user_id and item_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const r = await processItem(supabaseAdmin, pluggyApiKey, body.user_id, body.item_id);
    return new Response(JSON.stringify(r), {
      status: r.ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const runAll = action === 'sync-all-users' || action === '' || action === 'sync-all';

  if (!runAll) {
    return new Response(JSON.stringify({ error: 'Unknown action', hint: 'sync-all-users | sync-item' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: connections, error: qErr } = await supabaseAdmin
    .from('pluggy_connections')
    .select('user_id, item_id')
    .is('deleted_at', null);

  if (qErr) {
    console.error('[process-insights] query pluggy_connections:', qErr);
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rows = connections ?? [];
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const userId = row.user_id as string;
    const itemId = row.item_id as string;
    const r = await processItem(supabaseAdmin, pluggyApiKey, userId, itemId);
    if (r.ok) ok++;
    else {
      failed++;
      if (r.error) errors.push(`${itemId}: ${r.error}`);
    }
  }

  console.log(`[process-insights] batch done: ok=${ok} failed=${failed} total=${rows.length}`);

  return new Response(
    JSON.stringify({
      success: failed === 0,
      processed: rows.length,
      ok,
      failed,
      errors: errors.slice(0, 50),
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
