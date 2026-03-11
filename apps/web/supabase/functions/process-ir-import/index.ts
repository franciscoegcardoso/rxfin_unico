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

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: 'Extraia os dados desta declaração de Imposto de Renda:' },
            { 
              type: 'image_url', 
              image_url: { url: `data:application/pdf;base64,${pdfBase64}` }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    let userMessage = 'Não foi possível processar o PDF. Tente usar o formato XML (.dec) exportado do programa IRPF.';
    if (response.status === 429) userMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
    else if (response.status === 402) userMessage = 'Limite de processamento atingido. Entre em contato com o suporte.';
    else if (response.status === 400) userMessage = 'O PDF não pôde ser analisado. Use o arquivo XML ou DEC do programa IRPF.';
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
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const errorMessage = err.message || 'Erro inesperado ao processar a declaração.';

    const validationErrorKeywords = [
      'não parece ser uma declaração',
      'Arquivo vazio',
      'não está no formato',
      'Não foi possível extrair',
      'Não foi possível ler',
      'corrompido',
      'inválido',
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
