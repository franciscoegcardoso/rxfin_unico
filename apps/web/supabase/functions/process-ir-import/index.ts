import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BemDireito { codigo: string; descricao: string; situacaoAnterior: number; situacaoAtual: number; discriminacao: string; }
interface Rendimento { tipo: string; cnpjFonte: string; nomeFonte: string; valor: number; }
interface Divida { codigo: string; descricao: string; situacaoAnterior: number; situacaoAtual: number; discriminacao: string; }
interface IRData { anoExercicio: number; anoCalendario: number; bensDireitos: BemDireito[]; rendimentosTributaveis: Rendimento[]; rendimentosIsentos: Rendimento[]; dividas: Divida[]; }

function parseXmlDeclaracao(xmlContent: string): IRData {
  if (!xmlContent?.trim()) throw new Error('Arquivo vazio ou inválido');
  const t = xmlContent.trim();
  if (!t.startsWith('<?xml') && !t.startsWith('<')) throw new Error('O arquivo não está no formato XML esperado.');
  if (!['declaracao','irpf','anoExercicio','bens','rendimento','contribuinte'].some(i => xmlContent.toLowerCase().includes(i)))
    throw new Error('O arquivo XML não parece ser uma declaração de Imposto de Renda.');
  const tag = (xml: string, t: string) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, 'i')); return m ? m[1].trim() : ''; };
  const attr = (xml: string, a: string) => { const m = xml.match(new RegExp(`${a}\\s*=\\s*["']([^"']*)["']`, 'i')); return m ? m[1] : ''; };
  const anoExercicio = parseInt(tag(xmlContent,'anoExercicio') || attr(xmlContent,'anoExercicio')) || new Date().getFullYear();
  const bensDireitos: BemDireito[] = [];
  for (const m of xmlContent.matchAll(/<bem[^>]*>([\s\S]*?)<\/bem>/gi)) { const b=m[1]; bensDireitos.push({codigo:tag(b,'codigo')||attr(b,'codigo'),descricao:tag(b,'descricao'),situacaoAnterior:parseFloat(tag(b,'situacaoAnterior')||tag(b,'valorAnterior')||'0'),situacaoAtual:parseFloat(tag(b,'situacaoAtual')||tag(b,'valor')||'0'),discriminacao:tag(b,'discriminacao')}); }
  if (!bensDireitos.length) for (const m of xmlContent.matchAll(/<BensDireitos[^>]*>([\s\S]*?)<\/BensDireitos>/gi)) { const b=m[1]; bensDireitos.push({codigo:tag(b,'Codigo'),descricao:tag(b,'Descricao'),situacaoAnterior:parseFloat(tag(b,'SituacaoAnterior')||'0'),situacaoAtual:parseFloat(tag(b,'SituacaoAtual')||'0'),discriminacao:tag(b,'Discriminacao')}); }
  const rendimentosTributaveis: Rendimento[] = [];
  for (const m of xmlContent.matchAll(/<rendimentoTributavel[^>]*>([\s\S]*?)<\/rendimentoTributavel>/gi)) { const r=m[1]; rendimentosTributaveis.push({tipo:'tributavel',cnpjFonte:tag(r,'cnpjFonte')||tag(r,'cnpj'),nomeFonte:tag(r,'nomeFonte')||tag(r,'fonte'),valor:parseFloat(tag(r,'valor')||tag(r,'rendimentos')||'0')}); }
  const rendimentosIsentos: Rendimento[] = [];
  for (const m of xmlContent.matchAll(/<rendimentoIsento[^>]*>([\s\S]*?)<\/rendimentoIsento>/gi)) { const r=m[1]; rendimentosIsentos.push({tipo:'isento',cnpjFonte:tag(r,'cnpjFonte')||tag(r,'cnpj'),nomeFonte:tag(r,'nomeFonte')||tag(r,'fonte'),valor:parseFloat(tag(r,'valor')||'0')}); }
  const dividas: Divida[] = [];
  for (const m of xmlContent.matchAll(/<divida[^>]*>([\s\S]*?)<\/divida>/gi)) { const d=m[1]; dividas.push({codigo:tag(d,'codigo'),descricao:tag(d,'descricao'),situacaoAnterior:parseFloat(tag(d,'situacaoAnterior')||'0'),situacaoAtual:parseFloat(tag(d,'situacaoAtual')||'0'),discriminacao:tag(d,'discriminacao')}); }
  if (!bensDireitos.length && !rendimentosTributaveis.length && !rendimentosIsentos.length && !dividas.length)
    throw new Error('Não foi possível extrair dados do arquivo XML.');
  return { anoExercicio, anoCalendario: anoExercicio-1, bensDireitos, rendimentosTributaveis, rendimentosIsentos, dividas };
}

function tryParseAIJson(content: string): IRData | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error === 'NOT_IRPF') throw new Error('NOT_IRPF');
    if (typeof parsed.anoExercicio !== 'number') return null;
    return {
      anoExercicio: parsed.anoExercicio,
      anoCalendario: parsed.anoCalendario || parsed.anoExercicio - 1,
      bensDireitos: parsed.bensDireitos || [],
      rendimentosTributaveis: parsed.rendimentosTributaveis || [],
      rendimentosIsentos: parsed.rendimentosIsentos || [],
      dividas: parsed.dividas || [],
    };
  } catch(e) {
    if (e instanceof Error && e.message === 'NOT_IRPF') throw new Error('NOT_IRPF');
    return null;
  }
}

const PROMPT = `You are a data extraction specialist for Brazilian IRPF tax returns (Receita Federal software output).
Extract ALL data and return ONLY valid JSON with this structure:
{"anoExercicio":2024,"anoCalendario":2023,"bensDireitos":[{"codigo":"","descricao":"","situacaoAnterior":0,"situacaoAtual":0,"discriminacao":""}],"rendimentosTributaveis":[{"tipo":"tributavel","cnpjFonte":"","nomeFonte":"","valor":0}],"rendimentosIsentos":[{"tipo":"isento","cnpjFonte":"","nomeFonte":"","valor":0}],"dividas":[{"codigo":"","descricao":"","situacaoAnterior":0,"situacaoAtual":0,"discriminacao":""}]}
If NOT an IRPF document: {"error":"NOT_IRPF"}
OUTPUT ONLY JSON. No text before or after.`;

async function callModel(apiKey: string, pdfBase64: string, model: string, useImageUrl: boolean): Promise<string> {
  const content = useImageUrl
    ? [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }]
    : [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } }, { type: 'text', text: PROMPT }];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://app.rxfin.com.br',
      'X-Title': 'RXFin',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: 'user', content }] }),
  });
  console.log(`${model} status:`, res.status);
  if (!res.ok) {
    const e = await res.text();
    console.error(`${model} error:`, e.slice(0, 200));
    throw new Error(`HTTP_${res.status}`);
  }
  const result = await res.json();
  const text = result.choices?.[0]?.message?.content || '';
  console.log(`${model} tokens:`, result.usage?.prompt_tokens, 'resp[:80]:', text.slice(0, 80));
  return text;
}

async function processPdfWithAI(pdfBase64: string): Promise<IRData> {
  if (!pdfBase64 || pdfBase64.length < 100) throw new Error('O arquivo PDF está vazio ou corrompido.');
  const apiKey = Deno.env.get('OPENROUTER_API_KEY') || '';
  if (!apiKey) throw new Error('Serviço de IA não configurado.');
  console.log(`PDF len=${pdfBase64.length} (~${Math.round(pdfBase64.length * 3 / 4 / 1024)}KB)`);

  // Gemini tem OCR nativo e 1M tokens — ideal para PDFs do IRPF
  // Claude sonnet-4.6 como fallback (1M ctx, documento nativo)
  const attempts = [
    { model: 'google/gemini-3.1-flash-lite-preview', imageUrl: true },
    { model: 'google/gemini-3-flash-preview', imageUrl: true },
    { model: 'anthropic/claude-sonnet-4.6', imageUrl: false },
  ];

  let lastErr = '';
  for (const { model, imageUrl } of attempts) {
    try {
      const content = await callModel(apiKey, pdfBase64, model, imageUrl);
      if (!content) { lastErr = `empty_${model}`; continue; }
      const trimmed = content.trim();
      if (!trimmed.startsWith('{')) {
        console.log(`${model} non-JSON:`, trimmed.slice(0, 80));
        lastErr = `refused_${model}`;
        continue;
      }
      try {
        const data = tryParseAIJson(content);
        if (data) { console.log('✅ Success with', model, 'year:', data.anoExercicio); return data; }
        lastErr = `bad_structure_${model}`;
      } catch(e) {
        if (e instanceof Error && e.message === 'NOT_IRPF') { lastErr = `NOT_IRPF_${model}`; continue; }
        lastErr = `parse_${model}`;
      }
    } catch(e) { lastErr = e instanceof Error ? e.message : String(e); }
  }

  console.error('All failed. lastErr:', lastErr);
  if (lastErr.includes('NOT_IRPF')) {
    throw new Error('Não foi possível extrair dados deste PDF. Certifique-se de usar a declaração completa (não o recibo), ou use o arquivo XML/.dec exportado pelo programa IRPF.');
  }
  throw new Error('Falha ao processar o PDF. Tente novamente ou use o arquivo XML/.dec.');
}

function parseExpectedAnoExercicio(value: string | null | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const n = parseInt(String(value).trim(), 10);
  if (Number.isNaN(n) || n < 2015 || n > 2030) return undefined;
  return n;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Sessão inválida.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let fileContent: string;
    let fileType: string;
    let fileName: string;
    let expectedAnoExercicio: number | undefined;

    const contentType = req.headers.get('Content-Type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return new Response(JSON.stringify({ success: false, error: 'Arquivo não informado.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const expectedRaw = formData.get('expected_ano_exercicio');
      expectedAnoExercicio = parseExpectedAnoExercicio(typeof expectedRaw === 'string' ? expectedRaw : null);
      fileName = file.name || 'declaracao.pdf';
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      fileType = (ext === 'xml' || ext === 'dec') ? 'xml' : (ext === 'pdf' ? 'pdf' : 'pdf');
      const arr = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
      fileContent = btoa(binary);
      console.log(`multipart: ${fileType} ${fileName} len=${fileContent.length} expected_ano=${expectedAnoExercicio ?? 'n/a'}`);
    } else {
      const body = await req.json() as { fileContent?: string; fileType?: string; fileName?: string; expected_ano_exercicio?: number };
      fileContent = body.fileContent;
      fileType = body.fileType;
      fileName = body.fileName ?? 'declaracao';
      expectedAnoExercicio = body.expected_ano_exercicio != null ? parseExpectedAnoExercicio(String(body.expected_ano_exercicio)) : undefined;
      if (!fileContent || !fileType) return new Response(JSON.stringify({ error: 'Arquivo ou tipo não informado.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      console.log(`json: ${fileType} ${fileName} len=${fileContent.length} expected_ano=${expectedAnoExercicio ?? 'n/a'}`);
    }

    let irData: IRData;
    if (fileType === 'xml') {
      irData = parseXmlDeclaracao(atob(fileContent));
    } else if (fileType === 'pdf') {
      irData = await processPdfWithAI(fileContent);
    } else {
      return new Response(JSON.stringify({ error: 'Tipo não suportado. Use XML, DEC ou PDF.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (expectedAnoExercicio != null && irData.anoExercicio !== expectedAnoExercicio) {
      const msg = `O arquivo anexado refere-se ao Exercício ${irData.anoExercicio}. Você selecionou o Exercício ${expectedAnoExercicio}. Anexe o arquivo do exercício ${expectedAnoExercicio} na linha correspondente ou use a linha do Exercício ${irData.anoExercicio} para este arquivo.`;
      return new Response(JSON.stringify({ success: false, error: msg }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fileExt = fileName.split('.').pop()?.toLowerCase() || fileType;
    const storagePath = `${user.id}/${irData.anoExercicio}_${Date.now()}.${fileExt}`;
    const fileBuffer = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    const { error: uploadError } = await supabase.storage.from('ir-imports').upload(storagePath, fileBuffer, {
      contentType: fileType === 'pdf' ? 'application/pdf' : 'application/xml',
      upsert: true,
    });
    if (uploadError) console.error('Storage upload error:', uploadError);

    const { data: savedData, error: dbError } = await supabase.from('ir_imports').upsert(
      { user_id: user.id, ano_exercicio: irData.anoExercicio, ano_calendario: irData.anoCalendario, bens_direitos: irData.bensDireitos, rendimentos_tributaveis: irData.rendimentosTributaveis, rendimentos_isentos: irData.rendimentosIsentos, dividas: irData.dividas, source_type: fileType, file_name: fileName, file_path: uploadError ? null : storagePath },
      { onConflict: 'user_id,ano_exercicio' }
    ).select().single();

    if (dbError) { console.error('DB error:', dbError); return new Response(JSON.stringify({ error: 'Falha ao salvar.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    console.log('✅ IR', irData.anoExercicio, 'saved for', user.id);
    return new Response(JSON.stringify({
      success: true, data: irData, savedId: savedData?.id, fileName,
      filePath: uploadError ? null : storagePath,
      message: `Declaração ${irData.anoExercicio} importada com sucesso`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('error:', error);
    const msg = error instanceof Error ? error.message : 'Erro inesperado.';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('vazio') || msg.includes('extrair') || msg.includes('deste PDF') ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
