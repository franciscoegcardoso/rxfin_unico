/**
 * Parte B.1 — Connection pooling (PgBouncer transaction mode, porta 6543).
 *
 * No Dashboard: Settings → Database → Connection pooling → Transaction mode.
 * Defina o secret `DATABASE_URL_POOLED` (URI pooled) nas Edge Functions.
 *
 * Uso futuro com `postgres` / `pg.Pool`:
 * ```ts
 * import { getPooledOrDirectDatabaseUrl } from "../_shared/db-pooled-url.ts";
 * const pool = new Pool({ connectionString: getPooledOrDirectDatabaseUrl() });
 * ```
 *
 * `DATABASE_URL` (5432) permanece para migrations e operações que exigem sessão
 * (SET local, temp tables, advisory locks).
 */
export function getPooledOrDirectDatabaseUrl(): string {
  const pooled = Deno.env.get("DATABASE_URL_POOLED")?.trim();
  const direct = Deno.env.get("DATABASE_URL")?.trim();
  if (pooled && pooled.length > 0) return pooled;
  return direct ?? "";
}
