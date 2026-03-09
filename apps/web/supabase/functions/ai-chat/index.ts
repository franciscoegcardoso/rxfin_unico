import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  PHASE_SALES_PROMPT,
  PHASE_ACCESS_PROMPT,
  buildOnboardingPrompt,
  buildFinancialPrompt,
} from "./prompts.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("OPENROUTER_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENROUTER_FETCH_TIMEOUT_MS = 55_000; // under 60s Edge Function limit

// ─── Fetch OpenRouter with timeout and retry ───────────────────────────────────
async function fetchOpenRouter(
  url: string,
  options: RequestInit,
  timeoutMs: number = OPENROUTER_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ─── Phase Detector ───────────────────────────────────────────────────────────
function detectPhase(
  pageContext: { phase?: string; path?: string } | null,
  isAuthenticated: boolean,
  onboardingCompleted: boolean
): 'sales' | 'access' | 'onboarding' | 'financial' {
  if (pageContext?.phase === 'sales') return 'sales';
  if (pageContext?.phase === 'access') return 'access';
  if (pageContext?.phase === 'onboarding') return 'onboarding';
  if (pageContext?.phase === 'financial') return 'financial';
  const path = pageContext?.path || '';
  if (path.match(/\/(login|signup|cadastro|recuperar|verificar)/i)) return 'access';
  if (isAuthenticated) return onboardingCompleted ? 'financial' : 'onboarding';
  return 'sales';
}

// ─── Lead Capture (fire-and-forget) ───────────────────────────────────────────
async function saveLeadIfPresent(
  supabaseAdmin: ReturnType<typeof createClient>,
  sessionId: string,
  messages: Array<{ role: string; content: string }>,
  assistantResponse: string
): Promise<void> {
  try {
    const fullConversation = messages.map((m) => m.content).join(' ') + ' ' + assistantResponse;
    const emailMatch = fullConversation.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = fullConversation.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[\s\-]?\d{4}/);
    const nameMatch = fullConversation.match(/(?:pode me chamar de|meu nome é|me chamo|sou o|sou a)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i);
    const email = emailMatch?.[0] || null;
    const phone = phoneMatch?.[0]?.replace(/\D/g, '') || null;
    const name = nameMatch?.[1] || null;
    if (!email && !phone) return;
    await supabaseAdmin.from('cibelias_leads').upsert(
      { session_id: sessionId, name, email, phone, source: 'cibelias_chat_sales', consent_given: true, updated_at: new Date().toISOString() },
      { onConflict: 'session_id', ignoreDuplicates: false }
    );
  } catch (e) {
    console.warn('[ai-chat] saveLeadIfPresent falhou:', e);
  }
}

// ─── Memory Extraction (fire-and-forget) ──────────────────────────────────────
async function extractAndSaveMemory(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  messages: Array<{ role: string; content: string }>,
  assistantResponse: string
): Promise<void> {
  try {
    if (messages.length < 4) return;
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'Usuário' : 'Cibélia'}: ${m.content}`)
      .join('\n') + `\nCibélia: ${assistantResponse}`;
    const extractionPrompt = `Analise esta conversa entre um usuário e a Cibélia (assistente do RXFin) e extraia fatos relevantes para memória futura.\n\nCONVERSA:\n${conversationText}\n\nRetorne APENAS um JSON válido (sem markdown) com esta estrutura:\n{\n  "financial_problems": [],\n  "goals_mentioned": [],\n  "preferred_name": null,\n  "communication_style": null,\n  "topics_of_interest": [],\n  "last_questions": [],\n  "last_insights": [],\n  "last_session_summary": null\n}`;
    const extractRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'HTTP-Referer': 'https://rxfin.com.br', 'X-Title': 'RXFin — Cibélia Memory' },
      body: JSON.stringify({ model: 'deepseek/deepseek-chat-v3-0324', messages: [{ role: 'user', content: extractionPrompt }], max_tokens: 400, temperature: 0.1 }),
    });
    if (!extractRes.ok) return;
    const extractData = await extractRes.json();
    const rawJson = extractData.choices?.[0]?.message?.content || '{}';
    let extracted: Record<string, unknown> = {};
    try { extracted = JSON.parse(rawJson.replace(/```json\n?|```/g, '').trim()); } catch { return; }
    await supabaseAdmin.rpc('upsert_cibelia_memory', {
      p_user_id: userId,
      p_financial_problems: extracted.financial_problems || [],
      p_goals_mentioned: extracted.goals_mentioned || [],
      p_preferred_name: extracted.preferred_name || null,
      p_communication_style: extracted.communication_style || null,
      p_topics_of_interest: extracted.topics_of_interest || [],
      p_last_questions: extracted.last_questions || [],
      p_last_insights: extracted.last_insights || [],
      p_last_session_summary: extracted.last_session_summary || null,
    });
    console.log(`[ai-chat] Memory saved for user ${userId}`);
  } catch (e) {
    console.warn('[ai-chat] extractAndSaveMemory falhou:', e);
  }
}

// ─── Handler Principal ─────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: 'Configuração interna ausente.', code: 'MISSING_CONFIG' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    let body: { messages?: unknown; session_id?: string; page_context?: { phase?: string; path?: string } | null };
    try { body = await req.json(); }
    catch { return new Response(JSON.stringify({ error: 'Body inválido', code: 'INVALID_BODY' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    const { messages, session_id, page_context } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Campo 'messages' obrigatório", code: 'INVALID_MESSAGES' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization');
    let user: { id: string } | null = null;
    let onboardingCompleted = false;
    let userContext: Record<string, unknown> = {};
    let monthlySummary: Record<string, unknown> = {};
    let raioX: Record<string, unknown> = {};
    let cibeliaMemory: Record<string, unknown> = {};
    let cibeliaAlerts: Record<string, unknown> = {};

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (authHeader) {
      const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: { user: authUser } } = await supabaseAuth.auth.getUser();
      user = authUser;

      if (user) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const [ctxRes, sumRes, rxRes, memRes, alertsRes] = await Promise.allSettled([
          supabaseAdmin.rpc('get_ai_user_context',    { p_user_id: user.id }),
          supabaseAdmin.rpc('get_ai_monthly_summary', { p_user_id: user.id, p_month: currentMonth }),
          supabaseAdmin.rpc('get_ai_raio_x_analysis', { p_user_id: user.id, p_month: currentMonth }),
          supabaseAdmin.rpc('get_cibelia_memory',     { p_user_id: user.id }),
          supabaseAdmin.rpc('get_cibelia_alerts',     { p_user_id: user.id, p_limit: 3 }),
        ]);
        userContext    = ctxRes.status    === 'fulfilled' ? (ctxRes.value.data    || {}) : {};
        monthlySummary = sumRes.status    === 'fulfilled' ? (sumRes.value.data    || {}) : {};
        raioX          = rxRes.status     === 'fulfilled' ? (rxRes.value.data     || {}) : {};
        cibeliaMemory  = memRes.status    === 'fulfilled' ? (memRes.value.data    || {}) : {};
        cibeliaAlerts  = alertsRes.status === 'fulfilled' ? (alertsRes.value.data || {}) : {};
        onboardingCompleted = !!(userContext.onboarding_completed);

        try {
          const { data: rateCheck } = await supabaseAdmin.rpc('check_ai_rate_limit', { p_function_name: 'ai-chat' });
          if (rateCheck && !rateCheck.allowed) {
            return new Response(JSON.stringify({ error: 'Limite de mensagens atingido.', code: 'RATE_LIMIT', retry_after: rateCheck.retry_after_seconds }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (rateErr) { console.warn('[ai-chat] Rate limit check falhou:', rateErr); }
      }
    }

    const phase = detectPhase(page_context || null, !!user, onboardingCompleted);
    const isFirstTurn = (messages as Array<{ role: string }>).filter(m => m.role === 'user').length === 1;
    console.log(`[ai-chat] phase=${phase} user=${user?.id || 'anon'} firstTurn=${isFirstTurn} alerts=${(cibeliaAlerts as Record<string,unknown>).count || 0}`);

    let systemPrompt: string;
    const currentMonth = new Date().toISOString().slice(0, 7);

    switch (phase) {
      case 'sales':      systemPrompt = PHASE_SALES_PROMPT; break;
      case 'access':     systemPrompt = PHASE_ACCESS_PROMPT; break;
      case 'onboarding': systemPrompt = buildOnboardingPrompt(userContext, cibeliaMemory); break;
      case 'financial':
      default:           systemPrompt = buildFinancialPrompt(userContext, raioX, monthlySummary, currentMonth, cibeliaMemory, isFirstTurn ? cibeliaAlerts : {}); break;
    }

    if (user && phase === 'financial' && isFirstTurn && (cibeliaAlerts as Record<string,unknown>).count) {
      supabaseAdmin.rpc('mark_cibelia_alerts_read', { p_user_id: user.id })
        .then(() => {})
        .catch((e: Error) => console.warn('[ai-chat] mark_cibelia_alerts_read falhou:', e));
    }

    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages as Array<{ role: string; content: string }>).slice(-12),
    ];

    const isPro = userContext.plan_slug === 'pro' || userContext.plan_slug === 'admin';
    const maxTokens = phase === 'sales' ? 400 : phase === 'access' ? 450 : phase === 'onboarding' ? 500 : isPro ? 800 : 500;

    const startTime = Date.now();
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const openRouterBody = JSON.stringify({
      model: 'deepseek/deepseek-chat-v3-0324',
      messages: llmMessages,
      max_tokens: maxTokens,
      temperature: phase === 'sales' ? 0.5 : 0.3,
    });
    const openRouterOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://rxfin.com.br',
        'X-Title': 'RXFin — Cibélia',
      },
      body: openRouterBody,
    };

    let llmResponse: Response | null = null;
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        llmResponse = await fetchOpenRouter(openRouterUrl, openRouterOptions);
        break;
      } catch (fetchErr: unknown) {
        if (attempt === 0) {
          console.warn('[ai-chat] Tentativa 1 falhou, retry em 2s:', fetchErr instanceof Error ? fetchErr.message : fetchErr);
          await new Promise((r) => setTimeout(r, 2000));
        } else {
          const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
          console.error('[ai-chat] Erro de rede após retry:', isAbort ? 'timeout' : fetchErr);
          const retryMsg = isAbort ? 'A resposta da IA demorou demais. Tente novamente.' : 'Serviço de IA indisponível. Tente novamente em instantes.';
          return new Response(
            JSON.stringify({ error: retryMsg, code: isAbort ? 'LLM_TIMEOUT' : 'LLM_NETWORK_ERROR' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    if (!llmResponse) {
      return new Response(
        JSON.stringify({ error: 'Serviço de IA indisponível. Tente novamente.', code: 'LLM_NETWORK_ERROR' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('[ai-chat] OpenRouter erro:', llmResponse.status, errorText);
      let friendlyMsg = 'Erro ao processar. Tente novamente.';
      if (llmResponse.status === 429) friendlyMsg = 'IA sobrecarregada. Tente em segundos.';
      else if (llmResponse.status === 401) friendlyMsg = 'Chave de API da IA não configurada ou inválida. Contate o suporte.';
      return new Response(JSON.stringify({ error: friendlyMsg, code: `LLM_ERROR_${llmResponse.status}` }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const llmData = await llmResponse.json();
    const assistantMessage = llmData.choices?.[0]?.message?.content || 'Desculpe, não consegui processar. Tente novamente.';
    const tokensUsed = llmData.usage?.total_tokens || 0;
    const latencyMs = Date.now() - startTime;

    if (phase === 'sales' && session_id) {
      saveLeadIfPresent(supabaseAdmin, session_id, messages as Array<{ role: string; content: string }>, assistantMessage);
    }
    if (user && (phase === 'onboarding' || phase === 'financial')) {
      const userMsgCount = (messages as Array<{ role: string }>).filter(m => m.role === 'user').length;
      if (userMsgCount % 3 === 0) {
        extractAndSaveMemory(supabaseAdmin, user.id, messages as Array<{ role: string; content: string }>, assistantMessage);
      }
    }
    if (user) {
      supabaseAdmin.from('ai_query_audit').insert({
        user_id: user.id, session_id: session_id || null,
        sql_query: `phase=${phase} | ctx+summary+raioX+memory+alerts`,
        result_summary: { tokens_used: tokensUsed, model: 'deepseek/deepseek-chat-v3-0324', phase, source: 'edge_function_ai_chat_v16' },
        rows_returned: 1, execution_time_ms: latencyMs, status: 'success',
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }).then(() => {}).catch((e: Error) => console.error('[ai-chat] Audit log error:', e));
    }

    return new Response(
      JSON.stringify({ content: assistantMessage, tokens_used: tokensUsed, model: 'deepseek/deepseek-chat-v3-0324', session_id, phase, has_alerts: !!((cibeliaAlerts as Record<string,unknown>).count) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ai-chat] Erro não tratado:', error);
    return new Response(JSON.stringify({ error: 'Erro interno.', code: 'INTERNAL_ERROR', details: error instanceof Error ? error.message : 'Unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
