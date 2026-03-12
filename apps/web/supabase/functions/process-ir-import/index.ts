import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BemDireito {
  codigo: string;
  descricao: string;
  situacaoAnterior: number;
  situacaoAtual: number;
  discriminacao: string;
}

interface Rendimento {
  tipo: string;
  cnpjFonte: string;
  nomeFonte: string;
  valor: number;
}

interface Divida {
  codigo: string;
  descricao: string;
  situacaoAnterior: number;
  situacaoAtual: number;
  discriminacao: string;
}

interface IRData {
  anoExercicio: number;
  anoCalendario: number;
  bensDireitos: BemDireito[];
  rendimentosTributaveis: Rendimento[];
  rendimentosIsentos: Rendimento[];
  dividas: Divida[];
}

// Parse XML declaration file
function parseXmlDeclaracao(xmlContent: string): IRData {
  console.log('Parsing XML declaration...');
  
  // Validate that it looks like XML
  if (!xmlContent || typeof xmlContent !== 'string') {
    throw new Error('Arquivo vazio ou inválido');
  }

  // Check if it's actually XML content
  const trimmedContent = xmlContent.trim();
  if (!trimmedContent.startsWith('<?xml') && !trimmedContent.startsWith('<')) {
    throw new Error('O arquivo não está no formato XML esperado. Certifique-se de enviar o arquivo .dec ou .xml exportado do programa IRPF.');
  }

  // Check for common IRPF tags to validate it's an IR declaration
  const irpfIndicators = [
    'declaracao', 'DECLARACAO', 'irpf', 'IRPF', 'anoExercicio', 'AnoExercicio',
    'bens', 'Bens', 'rendimento', 'Rendimento', 'contribuinte', 'Contribuinte'
  ];
  
  const hasIrpfContent = irpfIndicators.some(indicator => 
    xmlContent.toLowerCase().includes(indicator.toLowerCase())
  );

  if (!hasIrpfContent) {
    throw new Error('O arquivo XML não parece ser uma declaração de Imposto de Renda. Verifique se você selecionou o arquivo correto exportado do programa IRPF.');
  }

  const getTagContent = (xml: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  };

  const getAttrValue = (xml: string, attr: string): string => {
    const regex = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  };

  // Extract year info
  const anoExercicio = parseInt(getTagContent(xmlContent, 'anoExercicio') || getAttrValue(xmlContent, 'anoExercicio')) || new Date().getFullYear();
  const anoCalendario = anoExercicio - 1;

  // Parse bens e direitos
  const bensDireitos: BemDireito[] = [];
  const bensMatches = xmlContent.matchAll(/<bem[^>]*>([\s\S]*?)<\/bem>/gi);
  for (const match of bensMatches) {
    const bemXml = match[1];
    bensDireitos.push({
      codigo: getTagContent(bemXml, 'codigo') || getAttrValue(bemXml, 'codigo'),
      descricao: getTagContent(bemXml, 'descricao'),
      situacaoAnterior: parseFloat(getTagContent(bemXml, 'situacaoAnterior') || getTagContent(bemXml, 'valorAnterior') || '0'),
      situacaoAtual: parseFloat(getTagContent(bemXml, 'situacaoAtual') || getTagContent(bemXml, 'valor') || '0'),
      discriminacao: getTagContent(bemXml, 'discriminacao'),
    });
  }

  // Alternative parsing for different XML structures
  if (bensDireitos.length === 0) {
    const bensAlt = xmlContent.matchAll(/<BensDireitos[^>]*>([\s\S]*?)<\/BensDireitos>/gi);
    for (const match of bensAlt) {
      const bemXml = match[1];
      bensDireitos.push({
        codigo: getTagContent(bemXml, 'Codigo'),
        descricao: getTagContent(bemXml, 'Descricao'),
        situacaoAnterior: parseFloat(getTagContent(bemXml, 'SituacaoAnterior') || '0'),
        situacaoAtual: parseFloat(getTagContent(bemXml, 'SituacaoAtual') || '0'),
        discriminacao: getTagContent(bemXml, 'Discriminacao'),
      });
    }
  }

  // Parse rendimentos tributáveis
  const rendimentosTributaveis: Rendimento[] = [];
  const rendTribMatches = xmlContent.matchAll(/<rendimentoTributavel[^>]*>([\s\S]*?)<\/rendimentoTributavel>/gi);
  for (const match of rendTribMatches) {
    const rendXml = match[1];
    rendimentosTributaveis.push({
      tipo: 'tributavel',
      cnpjFonte: getTagContent(rendXml, 'cnpjFonte') || getTagContent(rendXml, 'cnpj'),
      nomeFonte: getTagContent(rendXml, 'nomeFonte') || getTagContent(rendXml, 'fonte'),
      valor: parseFloat(getTagContent(rendXml, 'valor') || getTagContent(rendXml, 'rendimentos') || '0'),
    });
  }

  // Parse rendimentos isentos
  const rendimentosIsentos: Rendimento[] = [];
  const rendIsentMatches = xmlContent.matchAll(/<rendimentoIsento[^>]*>([\s\S]*?)<\/rendimentoIsento>/gi);
  for (const match of rendIsentMatches) {
    const rendXml = match[1];
    rendimentosIsentos.push({
      tipo: 'isento',
      cnpjFonte: getTagContent(rendXml, 'cnpjFonte') || getTagContent(rendXml, 'cnpj'),
      nomeFonte: getTagContent(rendXml, 'nomeFonte') || getTagContent(rendXml, 'fonte'),
      valor: parseFloat(getTagContent(rendXml, 'valor') || '0'),
    });
  }

  // Parse dívidas e ônus
  const dividas: Divida[] = [];
  const dividaMatches = xmlContent.matchAll(/<divida[^>]*>([\s\S]*?)<\/divida>/gi);
  for (const match of dividaMatches) {
    const divXml = match[1];
    dividas.push({
      codigo: getTagContent(divXml, 'codigo'),
      descricao: getTagContent(divXml, 'descricao'),
      situacaoAnterior: parseFloat(getTagContent(divXml, 'situacaoAnterior') || '0'),
      situacaoAtual: parseFloat(getTagContent(divXml, 'situacaoAtual') || '0'),
      discriminacao: getTagContent(divXml, 'discriminacao'),
    });
  }

  // Check if any data was extracted
  const totalItems = bensDireitos.length + rendimentosTributaveis.length + rendimentosIsentos.length + dividas.length;
  
  if (totalItems === 0) {
    throw new Error('Não foi possível extrair dados do arquivo XML. O formato pode estar diferente do esperado. Tente exportar novamente o arquivo do programa IRPF ou use o formato PDF.');
  }

  console.log(`Parsed XML: ${bensDireitos.length} bens, ${rendimentosTributaveis.length} rend. trib., ${rendimentosIsentos.length} rend. isentos, ${dividas.length} dívidas`);

  return {
    anoExercicio,
    anoCalendario,
    bensDireitos,
    rendimentosTributaveis,
    rendimentosIsentos,
    dividas,
  };
}

// Process PDF using AI
async function processPdfWithAI(pdfBase64: string): Promise<IRData> {
  console.log('Processing PDF with AI...');
  
  // Validate PDF content
  if (!pdfBase64 || pdfBase64.length < 100) {
    throw new Error('O arquivo PDF está vazio ou corrompido. Por favor, selecione outro arquivo.');
  }

  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENROUTER_KEY') || '';
  if (!OPENROUTER_API_KEY) {
    throw new Error('Serviço de processamento de PDF não configurado. Entre em contato com o suporte.');
  }

  const systemPrompt = `Você é um especialista em extrair dados de declarações de Imposto de Renda brasileiro (IRPF).
Analise o documento e extraia os seguintes dados em formato JSON:
- anoExercicio: ano do exercício fiscal
- anoCalendario: ano-calendário (exercício - 1)
- bensDireitos: array de bens e direitos com código, descrição, situacaoAnterior (valor em 31/12 do ano anterior), situacaoAtual (valor em 31/12), discriminacao
- rendimentosTributaveis: array com tipo, cnpjFonte, nomeFonte, valor
- rendimentosIsentos: array com tipo, cnpjFonte, nomeFonte, valor
- dividas: array com código, descrição, situacaoAnterior, situacaoAtual, discriminacao

Se o documento NÃO for uma declaração de Imposto de Renda, retorne exatamente: {"error": "NOT_IRPF"}

IMPORTANTE: Retorne APENAS o JSON, sem markdown ou texto adicional.`;

  const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

  // Plugin file-parser: OpenRouter converte o PDF em texto antes de enviar ao modelo (funciona com qualquer modelo)
  const plugins = [
    { id: 'file-parser', pdf: { engine: 'pdf-text' as const } },
  ];

  const MODELS_TO_TRY = ['google/gemini-2.0-flash-exp', 'openai/gpt-4o-mini'] as const;

  async function callOpenRouter(content: unknown[], usePlugins: boolean, modelIndex = 0): Promise<Response> {
    const model = MODELS_TO_TRY[modelIndex] ?? MODELS_TO_TRY[0];
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
    };
    if (usePlugins) body.plugins = plugins;
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://app.rxfin.com.br',
        'X-Title': 'RXFin IR Import',
      },
      body: JSON.stringify(body),
    });
  }

  // 1) Tentar com plugin file-parser (OpenRouter extrai texto do PDF e envia ao modelo)
  // Documentação: file com file_data (snake_case) ou fileData; plugins com id "file-parser" e engine "pdf-text"
  let userContent: unknown[] = [
    { type: 'text', text: 'Extraia os dados desta declaração de Imposto de Renda:' },
    { type: 'file', file: { filename: 'declaracao-ir.pdf', file_data: dataUrl } },
  ];
  let response = await callOpenRouter(userContent, true);

  // 2) Se 400, tentar fileData (camelCase) sem plugin
  if (response.status === 400) {
    console.log('OpenRouter rejeitou file+plugin, tentando fileData sem plugin...');
    userContent = [
      { type: 'text', text: 'Extraia os dados desta declaração de Imposto de Renda:' },
      { type: 'file', file: { filename: 'declaracao-ir.pdf', fileData: dataUrl } },
    ];
    response = await callOpenRouter(userContent, false);
  }

  // 3) Se ainda 400, tentar só o file (um único bloco) com plugin
  if (response.status === 400) {
    console.log('OpenRouter rejeitou file+text, tentando apenas file com plugin...');
    userContent = [
      { type: 'file', file: { filename: 'declaracao-ir.pdf', file_data: dataUrl } },
    ];
    response = await callOpenRouter(userContent, true);
  }

  // 4) Se ainda 400, fallback para image_url (alguns modelos aceitam PDF como "imagem")
  if (response.status === 400) {
    console.log('OpenRouter rejeitou tipo file, tentando image_url...');
    userContent = [
      { type: 'text', text: 'Extraia os dados desta declaração de Imposto de Renda:' },
      { type: 'image_url', image_url: { url: dataUrl } },
    ];
    response = await callOpenRouter(userContent, false);
  }

  // 5) Se ainda 400, tentar modelo alternativo (gpt-4o-mini) com text+file+plugin
  if (response.status === 400) {
    console.log('Tentando modelo alternativo (gpt-4o-mini) com file+plugin...');
    userContent = [
      { type: 'text', text: 'Extraia os dados desta declaração de Imposto de Renda:' },
      { type: 'file', file: { filename: 'declaracao-ir.pdf', file_data: dataUrl } },
    ];
    response = await callOpenRouter(userContent, true, 1);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter error:', response.status, 'body length:', errorText.length, 'preview:', errorText.slice(0, 300));
    let userMessage = 'Não foi possível processar o PDF. Use o arquivo XML ou .dec exportado pelo programa IRPF da Receita Federal.';
    if (response.status === 401) {
      userMessage = 'Serviço de processamento temporariamente indisponível. Use o arquivo XML ou .dec exportado pelo programa IRPF.';
    } else if (response.status === 403) {
      userMessage = 'Acesso ao processamento de PDF não autorizado. Use o arquivo XML ou .dec do programa IRPF.';
    } else if (response.status === 429) {
      userMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
    } else if (response.status === 402) {
      userMessage = 'Limite de processamento atingido. Entre em contato com o suporte.';
    } else if (response.status === 400 || response.status === 422) {
      try {
        const errJson = JSON.parse(errorText);
        const detail = (errJson as { error?: { message?: string }; message?: string }).error?.message ?? (errJson as { message?: string }).message;
        if (typeof detail === 'string' && detail.length > 0 && detail.length < 200) {
          userMessage = `PDF não aceito: ${detail}. Use o arquivo XML ou .dec do programa IRPF.`;
        }
      } catch {
        userMessage = 'O PDF não pôde ser analisado. Use o arquivo XML ou .dec exportado pelo programa IRPF.';
      }
    } else if (response.status >= 500) {
      userMessage = 'Serviço de processamento indisponível no momento. Tente novamente em alguns minutos ou use o arquivo XML/.dec do programa IRPF.';
    }
    throw new Error(userMessage);
  }

  const aiResult = await response.json();
  const content = aiResult.choices?.[0]?.message?.content || '';
  
  console.log('AI response:', content.substring(0, 500));

  // Parse AI response
  try {
    // Remove markdown code blocks if present
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    // Check if AI detected it's not an IRPF document
    if (parsed.error === 'NOT_IRPF') {
      throw new Error('O arquivo PDF não parece ser uma declaração de Imposto de Renda. Verifique se você selecionou o arquivo correto.');
    }

    // Validate that we got some data
    const totalItems = (parsed.bensDireitos?.length || 0) + 
                       (parsed.rendimentosTributaveis?.length || 0) + 
                       (parsed.rendimentosIsentos?.length || 0) + 
                       (parsed.dividas?.length || 0);

    if (totalItems === 0 && !parsed.anoExercicio) {
      throw new Error('Não foi possível extrair dados do PDF. O arquivo pode estar em formato não suportado ou não é uma declaração de IR. Tente usar o arquivo XML exportado do programa IRPF.');
    }

    return {
      anoExercicio: parsed.anoExercicio || new Date().getFullYear(),
      anoCalendario: parsed.anoCalendario || new Date().getFullYear() - 1,
      bensDireitos: parsed.bensDireitos || [],
      rendimentosTributaveis: parsed.rendimentosTributaveis || [],
      rendimentosIsentos: parsed.rendimentosIsentos || [],
      dividas: parsed.dividas || [],
    };
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    
    // Re-throw if it's our custom error
    if (parseError instanceof Error && parseError.message.includes('declaração de Imposto de Renda')) {
      throw parseError;
    }
    
    throw new Error('Não foi possível ler os dados do arquivo PDF. O formato pode não ser compatível. Recomendamos usar o arquivo XML (.dec) exportado diretamente do programa IRPF da Receita Federal.');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header (validar JWT via client com header — compatível com Edge)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente com anon key + header do usuário para validar JWT (getUser sem args usa o header)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error('process-ir-import auth failed:', authError?.message ?? 'no user');
      return new Response(
        JSON.stringify({
          error: authError?.message?.toLowerCase().includes('jwt')
            ? 'Sessão expirada ou inválida. Faça login novamente.'
            : 'Não foi possível validar sua sessão. Faça login novamente.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com service role para DB e storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let fileContent: string;
    let fileType: string;
    let fileName: string;
    try {
      const body = await req.json();
      fileContent = body?.fileContent;
      fileType = body?.fileType;
      fileName = body?.fileName ?? 'arquivo';
    } catch {
      return new Response(
        JSON.stringify({ error: 'Requisição inválida. Envie o arquivo novamente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fileContent || !fileType) {
      return new Response(
        JSON.stringify({ error: 'Arquivo ou tipo não informado. Selecione um arquivo XML, DEC ou PDF.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${fileType} file: ${fileName} for user ${user.id}`);

    let irData: IRData;

    if (fileType === 'xml') {
      let xmlContent: string;
      try {
        xmlContent = atob(fileContent);
      } catch {
        return new Response(
          JSON.stringify({
            error:
              'O conteúdo do arquivo está corrompido ou em formato inválido. Tente exportar novamente o arquivo .dec ou .xml do programa IRPF.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      irData = parseXmlDeclaracao(xmlContent);
    } else if (fileType === 'pdf') {
      irData = await processPdfWithAI(fileContent);
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Use XML or PDF.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload file to storage
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || fileType;
    const storagePath = `${user.id}/${irData.anoExercicio}_${Date.now()}.${fileExtension}`;
    
    // Decode base64 and create file buffer
    const fileBuffer = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    
    const { error: uploadError } = await supabase.storage
      .from('ir-imports')
      .upload(storagePath, fileBuffer, {
        contentType: fileType === 'pdf' ? 'application/pdf' : 'application/xml',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Continue without file storage - not critical
    }

    // Save to database
    const { data: savedData, error: dbError } = await supabase
      .from('ir_imports')
      .upsert({
        user_id: user.id,
        ano_exercicio: irData.anoExercicio,
        ano_calendario: irData.anoCalendario,
        bens_direitos: irData.bensDireitos,
        rendimentos_tributaveis: irData.rendimentosTributaveis,
        rendimentos_isentos: irData.rendimentosIsentos,
        dividas: irData.dividas,
        source_type: fileType,
        file_name: fileName,
        file_path: uploadError ? null : storagePath,
      }, {
        onConflict: 'user_id,ano_exercicio',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError.message, dbError.code);
      return new Response(
        JSON.stringify({
          error: 'Não foi possível salvar os dados da declaração. Tente novamente ou entre em contato com o suporte.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully imported IR data for year ${irData.anoExercicio}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: irData,
        savedId: savedData?.id,
        fileName: fileName,
        filePath: uploadError ? null : storagePath,
        message: `Declaração ${irData.anoExercicio} importada com sucesso`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Process IR Import error:', err.message, err.stack);
    const errorMessage = (err.message && String(err.message).trim()) || 'Erro inesperado ao processar a declaração. Tente novamente ou use o arquivo XML/DEC do programa IRPF.';

    const validationErrorKeywords = [
      'não parece ser uma declaração',
      'Arquivo vazio',
      'não está no formato',
      'Não foi possível extrair',
      'Não foi possível ler',
      'corrompido',
      'inválido',
      'não informado',
      'Unsupported file type',
    ];
    const isValidationError = validationErrorKeywords.some((keyword) =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: isValidationError ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
