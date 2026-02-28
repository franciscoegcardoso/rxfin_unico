// supabase/functions/__tests__/helpers.ts
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

let envLoaded = false;

export async function loadEnv() {
  if (envLoaded) return;
  const paths = [".env.test", "../.env.test", "../../.env.test", "../../../.env.test"];
  for (const path of paths) {
    try {
      const text = await Deno.readTextFile(path);
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        if (key && value) Deno.env.set(key, value);
      }
      console.log(`[helpers] Loaded env from: ${path}`);
      envLoaded = true;
      return;
    } catch { /* try next */ }
  }
  console.log("[helpers] No .env.test found, using existing env vars");
  envLoaded = true;
}

export function getEnv(key: string): string {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export async function getAnonClient(): Promise<SupabaseClient> {
  await loadEnv();
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"));
}

export async function getServiceClient(): Promise<SupabaseClient> {
  await loadEnv();
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export async function getAuthenticatedClient(
  email?: string, password?: string
): Promise<{ client: SupabaseClient; user: any; accessToken: string }> {
  await loadEnv();
  const e = email || getEnv("TEST_ADMIN_EMAIL");
  const p = password || getEnv("TEST_ADMIN_PASSWORD");
  const client = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"));
  const { data, error } = await client.auth.signInWithPassword({ email: e, password: p });
  if (error) throw new Error(`Auth failed: ${error.message}`);
  return { client, user: data.user, accessToken: data.session!.access_token };
}

export async function invokeFunction(
  functionName: string, body: Record<string, any>, accessToken?: string
): Promise<{ status: number; data: any }> {
  await loadEnv();
  const url = `${getEnv("SUPABASE_URL")}/functions/v1/${functionName}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: getEnv("SUPABASE_ANON_KEY"),
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}
