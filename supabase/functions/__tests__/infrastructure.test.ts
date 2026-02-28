// supabase/functions/__tests__/infrastructure.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getServiceClient, getAnonClient } from "./helpers.ts";

const opts = { sanitizeResources: false, sanitizeOps: false };

Deno.test("INFRA: RLS blocks anonymous access to user_roles", opts, async () => {
  const anon = await getAnonClient();
  const { data, error } = await anon.from("user_roles").select("*");
  // RLS should block: either error or empty result
  assert(!data || data.length === 0 || error, "user_roles should be RLS-protected");
});

Deno.test("INFRA: migration_rollbacks table exists", opts, async () => {
  const service = await getServiceClient();
  const { data, error } = await service
    .from("migration_rollbacks")
    .select("migration_name, is_reversible")
    .limit(5);
  assertEquals(error, null, "migration_rollbacks table should be accessible");
});

Deno.test("INFRA: user_device_tokens table exists", opts, async () => {
  const service = await getServiceClient();
  const { error } = await service.from("user_device_tokens").select("id").limit(1);
  assertEquals(error, null, "user_device_tokens table should be accessible");
});

Deno.test("INFRA: admin_sessions table exists", opts, async () => {
  const service = await getServiceClient();
  const { error } = await service.from("admin_sessions").select("id").limit(1);
  assertEquals(error, null, "admin_sessions table should be accessible via service role");
});

Deno.test("INFRA: audit_logs table is functional", opts, async () => {
  const service = await getServiceClient();
  const { data, error } = await service
    .from("audit_logs")
    .select("id, action, severity")
    .order("created_at", { ascending: false })
    .limit(5);
  assertEquals(error, null, "audit_logs should be queryable");
  assert(data && data.length > 0, "audit_logs should have entries");
  console.log(`Latest ${data.length} audit entries found`);
});
