export async function getPluggyApiKey(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'pluggy_api_token')
    .maybeSingle();

  const now = Date.now();

  // Return cached token if valid (with 5min buffer)
  if (data?.setting_value?.token && data.setting_value.expires_at > now + 300_000) {
    return data.setting_value.token;
  }

  // Request new token from Pluggy
  const res = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: Deno.env.get('PLUGGY_CLIENT_ID'),
      clientSecret: Deno.env.get('PLUGGY_CLIENT_SECRET'),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Pluggy auth failed (${res.status}): ${errorText}`);
  }

  const { apiKey } = await res.json();

  // Cache token with 110min TTL
  await supabase.from('app_settings').upsert(
    {
      setting_key: 'pluggy_api_token',
      setting_value: { token: apiKey, expires_at: now + 110 * 60 * 1000 },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'setting_key' }
  );

  return apiKey;
}
