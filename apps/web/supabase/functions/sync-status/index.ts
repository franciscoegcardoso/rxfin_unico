import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = claimsData.claims.sub as string

    const { jobId } = await req.json()
    if (!jobId || typeof jobId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid jobId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Query job scoped to the authenticated user (RLS + explicit filter)
    const { data: job, error: queryError } = await supabase
      .from('pluggy_sync_jobs')
      .select('id, status, action, error_message, started_at, finished_at, created_at, attempts')
      .eq('id', jobId)
      .eq('user_id', userId)
      .maybeSingle()

    if (queryError) {
      console.error('[sync-status] Query error:', queryError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch job status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!job) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Derive progress and currentStep from status + action
    const statusMap: Record<string, { progress: number; currentStep: string }> = {
      pending: { progress: 0, currentStep: 'Na fila' },
      running: { progress: 50, currentStep: `Sincronizando (${job.action})` },
      done: { progress: 100, currentStep: 'Concluído' },
      error: { progress: 100, currentStep: 'Erro' },
    }

    const mapped = statusMap[job.status] || { progress: 0, currentStep: job.status }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: job.status,
          progress: mapped.progress,
          currentStep: mapped.currentStep,
          error: job.error_message || null,
          action: job.action,
          startedAt: job.started_at,
          finishedAt: job.finished_at,
          attempts: job.attempts,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[sync-status] Unexpected error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
