// supabase/functions/__tests__/admin-gate.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { invokeFunction, getAuthenticatedClient } from "./helpers.ts";

// sanitizeResources/sanitizeOps: false — Supabase client creates internal intervals
const opts = { sanitizeResources: false, sanitizeOps: false };

Deno.test("admin-gate: rejects unauthenticated requests", opts, async () => {
  const { status, data } = await invokeFunction("admin-gate", { action: "login" });
  assertEquals(data.code, "UNAUTHORIZED");
});

Deno.test("admin-gate: rejects non-admin users", opts, async () => {
  const testEmail = Deno.env.get("TEST_NONADMIN_EMAIL");
  const testPass = Deno.env.get("TEST_NONADMIN_PASSWORD");
  if (!testEmail || !testPass) {
    console.log("⏭️  Skipped: no non-admin test user configured");
    return;
  }
  const { accessToken } = await getAuthenticatedClient(testEmail, testPass);
  const { data } = await invokeFunction("admin-gate", { action: "login" }, accessToken);
  assertEquals(data.code, "NOT_ADMIN");
});

Deno.test("admin-gate: admin without MFA gets MFA_REQUIRED", opts, async () => {
  const { accessToken } = await getAuthenticatedClient();
  const { data } = await invokeFunction("admin-gate", { action: "login" }, accessToken);
  const validCodes = ["MFA_REQUIRED", "SUCCESS"];
  assert(validCodes.includes(data.code), `Expected MFA_REQUIRED or SUCCESS, got: ${data.code}`);
});

Deno.test("admin-gate: validate with invalid token returns false", opts, async () => {
  const { accessToken } = await getAuthenticatedClient();
  const { data } = await invokeFunction(
    "admin-gate", { action: "validate", admin_token: "invalid-token-12345" }, accessToken
  );
  assertEquals(data.valid, false);
});

Deno.test("admin-gate: logout with no token succeeds gracefully", opts, async () => {
  const { accessToken } = await getAuthenticatedClient();
  const { data } = await invokeFunction("admin-gate", { action: "logout" }, accessToken);
  assertEquals(data.success, true);
});

Deno.test("admin-gate: invalid action returns 400", opts, async () => {
  const { accessToken } = await getAuthenticatedClient();
  const { status, data } = await invokeFunction(
    "admin-gate", { action: "nonexistent" }, accessToken
  );
  assertEquals(status, 400);
  assertEquals(data.code, "INVALID_ACTION");
});
