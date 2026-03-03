/**
 * RXFin Pluggy Worker v2 — consumes from Redis Stream rxfin:pluggy:sync and enqueues to jobs_queue.
 * Requires: INTERNAL_SECRET, UPSTASH_*, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { getRedisClient, STREAM_PLUGGY_SYNC, CONSUMER_GROUP, isRedisConfigured } from '../shared-redis/index.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface WorkerBody {
  consumer?: string;
}

interface WorkerResponse {
  success: boolean;
  source: 'redis' | 'postgres_fallback';
  processed: number;
  failed: number;
  total: number;
  durationMs?: number;
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

  let body: WorkerBody = {};
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json();
    }
  } catch {
    // empty body ok
  }

  const consumerName = body.consumer ?? `worker-${Date.now()}`;
  const start = Date.now();
  const response: WorkerResponse = { success: true, source: 'postgres_fallback', processed: 0, failed: 0, total: 0 };

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    response.success = false;
    response.error = 'Supabase not configured';
    return new Response(JSON.stringify(response), { status: 500, headers: getCorsHeaders() });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      const stream = STREAM_PLUGGY_SYNC;
      const group = CONSUMER_GROUP;

      try {
        await redis.sendCommand(['XGROUP', 'CREATE', stream, group, '0', 'MKSTREAM']) as unknown;
      } catch (_e) {
        // GROUP already exists
      }

      const messages = await redis.xreadgroup(stream, group, consumerName, 25);
      response.total = messages.length;
      response.source = 'redis';

      for (const msg of messages) {
        try {
          const type = msg.data.type ?? '';
          const payloadStr = msg.data.payload ?? '{}';
          const priority = parseInt(msg.data.priority ?? '2', 10);
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(payloadStr) as Record<string, unknown>;
          } catch {
            payload = {};
          }

          const action = type.replace('pluggy:', '').replace(/:/g, '_');
          const { error } = await supabase.from('jobs_queue').insert({
            source: 'pluggy',
            action,
            payload,
            status: 'pending',
            result_metadata: { redis_stream_id: msg.id },
          });
          if (error) throw error;
          response.processed++;
          await redis.xack(stream, group, [msg.id]);
        } catch (err) {
          console.error('[pluggy-worker-v2] Message error:', msg.id, err);
          response.failed++;
        }
      }

      response.durationMs = Date.now() - start;
      return new Response(JSON.stringify(response), { headers: getCorsHeaders() });
    } catch (err) {
      console.error('[pluggy-worker-v2] Redis consume error:', err);
      response.success = false;
      response.error = err instanceof Error ? err.message : 'Redis consume failed';
      response.durationMs = Date.now() - start;
      return new Response(JSON.stringify(response), { status: 500, headers: getCorsHeaders() });
    }
  }

  response.durationMs = Date.now() - start;
  return new Response(JSON.stringify(response), { headers: getCorsHeaders() });
});
