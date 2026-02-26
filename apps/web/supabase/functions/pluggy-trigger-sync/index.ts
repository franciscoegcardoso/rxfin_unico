import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // ─── Nightly Sync All (called by pg_cron) ─────────────────────
    if (body.action === 'nightly-sync-all') {
      // Validate internal secret for cron-triggered calls
      const internalSecret = req.headers.get('x-internal-secret');
      const expectedSecret = Deno.env.get('INTERNAL_SECRET');
      const authHeader = req.headers.get('Authorization');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
      const isInternalSecret = internalSecret && expectedSecret && internalSecret === expectedSecret;

      if (!isServiceRole && !isInternalSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized — nightly sync requires service role or internal secret' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        serviceRoleKey,
      );

      // List all active connections with status UPDATED
      const { data: connections, error: connError } = await supabase
        .from('pluggy_connections')
        .select('item_id, user_id')
        .eq('status', 'UPDATED')
        .is('deleted_at', null);

      if (connError) {
        console.error('nightly-sync-all: failed to list connections', connError);
        return new Response(JSON.stringify({ error: 'Failed to list connections' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!connections || connections.length === 0) {
        return new Response(
          JSON.stringify({ success: true, queued: 0, message: 'No connections to sync' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Filter out connections that already have pending/running jobs
      const itemIds = connections.map(c => c.item_id);
      const { data: activeJobs } = await supabase
        .from('pluggy_sync_jobs')
        .select('item_id')
        .in('item_id', itemIds)
        .in('status', ['pending', 'running']);

      const busyItems = new Set((activeJobs || []).map(j => j.item_id));
      const toSync = connections.filter(c => !busyItems.has(c.item_id));

      if (toSync.length === 0) {
        return new Response(
          JSON.stringify({ success: true, queued: 0, message: 'All connections already syncing' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Enqueue sync jobs
      const jobs = toSync.map(c => ({
        user_id: c.user_id,
        item_id: c.item_id,
        action: 'full-sync',
        priority: 5, // low priority (nightly)
        status: 'pending',
      }));

      const { error: insertError } = await supabase
        .from('pluggy_sync_jobs')
        .insert(jobs);

      if (insertError) {
        console.error('nightly-sync-all: failed to insert jobs', insertError);
        return new Response(JSON.stringify({ error: 'Failed to queue jobs' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`nightly-sync-all: queued ${toSync.length} sync jobs`);

      return new Response(
        JSON.stringify({ success: true, queued: toSync.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Manual Sync (user-triggered) ─────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { itemId } = body;
    if (!itemId || typeof itemId !== 'string') {
      return new Response(JSON.stringify({ error: 'itemId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for DB writes (bypass RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check if there's already an active job for this item
    const { data: existingJob } = await supabase
      .from('pluggy_sync_jobs')
      .select('id')
      .eq('item_id', itemId)
      .in('status', ['pending', 'running'])
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      return new Response(
        JSON.stringify({
          success: true,
          jobId: existingJob.id,
          message: 'Sync já em andamento',
          alreadyRunning: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Cooldown: prevent manual sync if last_sync_at < 1 hour ago ───
    const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

    const { data: conn } = await supabase
      .from('pluggy_connections')
      .select('last_sync_at')
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (conn?.last_sync_at) {
      const lastSyncMs = new Date(conn.last_sync_at).getTime();
      const elapsedMs = Date.now() - lastSyncMs;

      if (elapsedMs < COOLDOWN_MS) {
        const remainingMin = Math.ceil((COOLDOWN_MS - elapsedMs) / 60000);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Esta conta foi atualizada recentemente. Tente novamente em ${remainingMin} minuto(s).`,
            cooldown: true,
            retryAfterMs: COOLDOWN_MS - elapsedMs,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Insert high-priority sync job
    const { data: job, error: jobError } = await supabase
      .from('pluggy_sync_jobs')
      .insert({
        user_id: userId,
        item_id: itemId,
        action: 'refresh',
        priority: 1,
        status: 'pending',
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Error inserting sync job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to queue sync job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fire-and-forget: call pluggy-worker asynchronously
    const workerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pluggy-worker`;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const workerPromise = fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((err) => {
      console.error('Fire-and-forget pluggy-worker call failed (non-blocking):', err);
    });

    try {
      // @ts-ignore - EdgeRuntime.waitUntil may not be typed
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(workerPromise);
      }
    } catch {
      // Ignore - the fetch is already running
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'Sync iniciado',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('pluggy-trigger-sync error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
