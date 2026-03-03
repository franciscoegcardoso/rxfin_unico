/**
 * RXFin Ingest Dispatcher — receives job requests and enqueues to Redis Stream (or fallback to Postgres).
 * Requires: INTERNAL_SECRET, UPSTASH_* for Redis. Optional: SUPABASE_URL for fallback.
 */
import { getRedisClient, STREAM_PLUGGY_SYNC, isRedisConfigured } from '../shared-redis/index.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface DispatchBody {
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  idempotencyKey?: string;
}

interface DispatchResponse {
  success: boolean;
  messageId?: string;
  stream?: string;
  fallback?: boolean;
  error?: string;
}

function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-internal-secret, content-type',
    'Content-Type': 'application/json',
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: getCorsHeaders(),
    });
  }

  const secret = req.headers.get('x-internal-secret');
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: getCorsHeaders(),
    });
  }

  let body: DispatchBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: getCorsHeaders(),
    });
  }

  const { type, payload, priority = 2, idempotencyKey } = body;
  if (!type || typeof payload !== 'object') {
    return new Response(JSON.stringify({ success: false, error: 'type and payload required' }), {
      status: 400,
      headers: getCorsHeaders(),
    });
  }

  const response: DispatchResponse = { success: true };

  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      const stream = STREAM_PLUGGY_SYNC;

      if (idempotencyKey) {
        const dedupKey = `rxfin:dedup:${idempotencyKey}`;
        const setResult = await redis.sendCommand(['SET', dedupKey, '1', 'NX', 'EX', '86400']) as string | null;
        if (setResult !== 'OK') {
          response.messageId = 'DUPLICATE_SUPPRESSED';
          response.stream = stream;
          return new Response(JSON.stringify(response), { headers: getCorsHeaders() });
        }
      }

      const fields: Record<string, string> = {
        type,
        payload: JSON.stringify(payload),
        priority: String(priority ?? 2),
        ts: new Date().toISOString(),
      };
      if (idempotencyKey) fields.idempotencyKey = idempotencyKey;

      const messageId = await redis.xadd(stream, fields);
      response.messageId = messageId ?? undefined;
      response.stream = stream;
      return new Response(JSON.stringify(response), { headers: getCorsHeaders() });
    } catch (err) {
      console.error('[ingest-dispatcher] Redis error:', err);
      response.fallback = true;
    }
  } else {
    response.fallback = true;
  }

  // Fallback: insert into jobs_queue (Postgres)
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: row, error } = await supabase
        .from('jobs_queue')
        .insert({
          source: type.startsWith('pluggy:') ? 'pluggy' : 'ingest',
          action: type.replace('pluggy:', '').replace(/:/g, '_'),
          payload: payload as Record<string, unknown>,
          status: 'pending',
          result_metadata: idempotencyKey ? { idempotency_key: idempotencyKey } : {},
        })
        .select('id')
        .single();
      if (error) throw error;
      response.messageId = row?.id ?? 'unknown';
      return new Response(JSON.stringify(response), { headers: getCorsHeaders() });
    } catch (err) {
      console.error('[ingest-dispatcher] Fallback insert error:', err);
      response.success = false;
      response.error = err instanceof Error ? err.message : 'Fallback failed';
    }
  } else {
    response.success = false;
    response.error = 'Redis not configured and fallback (jobs_queue) not available';
  }

  return new Response(JSON.stringify(response), {
    status: 500,
    headers: getCorsHeaders(),
  });
});
