/**
 * RXFin Redis Ingest Layer — shared client for Upstash Redis (Streams).
 * Requires: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

export const STREAM_PLUGGY_SYNC = 'rxfin:pluggy:sync';
export const CONSUMER_GROUP = 'rxfin-workers';
export const CONSUMER_PREFIX = 'worker';

export interface RedisClient {
  xadd(stream: string, fields: Record<string, string>): Promise<string | null>;
  xreadgroup(stream: string, group: string, consumer: string, count?: number): Promise<Array<{ id: string; data: Record<string, string> }>>;
  xack(stream: string, group: string, ids: string[]): Promise<number>;
  xlen(stream: string): Promise<number>;
  sendCommand(args: (string | number)[]): Promise<unknown>;
}

async function sendCommand(args: (string | number)[]): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set');
  }
  const res = await fetch(`${REDIS_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash Redis error: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export function getRedisClient(): RedisClient {
  return {
    async xadd(stream: string, fields: Record<string, string>): Promise<string | null> {
      const flat: (string | number)[] = ['XADD', stream, '*'];
      for (const [k, v] of Object.entries(fields)) {
        flat.push(k, v);
      }
      const result = await sendCommand(flat) as string | null;
      return result;
    },

    async xreadgroup(stream: string, group: string, consumer: string, count = 10): Promise<Array<{ id: string; data: Record<string, string> }>> {
      try {
        await sendCommand(['XGROUP', 'CREATECONSUMER', stream, group, consumer]);
      } catch (_e) {
        // BUSYGROUP or consumer exists — ignore
      }
      const result = await sendCommand(['XREADGROUP', 'GROUP', group, consumer, 'COUNT', count, 'STREAMS', stream, '>']) as unknown;
      if (result == null || !Array.isArray(result) || result.length === 0) return [];
      const [, entries] = result[0] as [string, [string, string[]][]];
      if (!Array.isArray(entries)) return [];
      return entries.map(([id, pairs]) => {
        const data: Record<string, string> = {};
        for (let i = 0; i < pairs.length; i += 2) data[pairs[i]] = pairs[i + 1] ?? '';
        return { id, data };
      });
    },

    async xack(stream: string, group: string, ids: string[]): Promise<number> {
      const result = await sendCommand(['XACK', stream, group, ...ids]) as number;
      return result;
    },

    async xlen(stream: string): Promise<number> {
      const result = await sendCommand(['XLEN', stream]) as number;
      return result ?? 0;
    },

    sendCommand,
  };
}

export function isRedisConfigured(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}
