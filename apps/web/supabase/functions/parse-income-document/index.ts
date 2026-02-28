import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedIncome {
  name: string;
  value: number;
  type: string;
  confidence: number;
  sourceField?: string;
}

interface ParseResult {
  success: boolean;
  documentType: 'contracheque' | 'declaracao_anual' | 'unknown';
  referenceMonth?: string;
  referenceYear?: string;
  extractedIncomes: ExtractedIncome[];
  rawText?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const incomeItemsJson = formData.get('incomeItems') as string;
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const incomeItems = incomeItemsJson ? JSON.parse(incomeItemsJson) : [];
    
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Determine file type
    const mimeType = file.type || 'application/pdf';
    const isImage = mimeType.startsWith('image/');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the income items context for the AI
    const incomeItemsContext = incomeItems.length > 0 
      ? `\n\nCategorias de receita disponíveis no sistema:\n${incomeItems.map((item: { id: string, name: string }) => `- ${item.name} (id: ${item.id})`).join('\n')}`
      : '';

    const systemPrompt = `Você é um especialista em análise de documentos financeiros brasileiros. 
Sua tarefa é extrair informações de receitas/rendimentos de contracheques (holerites) e declarações anuais de imposto de renda.

Para CONTRACHEQUES, extraia:
- Salário Bruto
- Salário Líquido  
- Vale Refeição/Alimentação
- Bônus/Gratificações
- Horas extras
- Outros proventos

Para DECLARAÇÕES ANUAIS (IRPF), extraia:
- Rendimentos tributáveis (salários, aluguéis, etc)
- Rendimentos isentos
- 13º salário
- PLR (Participação nos Lucros)

${incomeItemsContext}

IMPORTANTE: 
- Associe cada valor extraído à categoria de receita mais apropriada do sistema
- Valores devem ser numéricos (sem R$, pontos de milhar - use ponto para decimal)
- Indique a confiança da extração (0.0 a 1.0)
- Se não conseguir identificar o tipo de documento, retorne documentType: "unknown"

Responda APENAS em JSON válido, sem markdown ou explicações.`;

    const userPrompt = `Analise este documento financeiro e extraia todas as informações de receitas/rendimentos.

Retorne um JSON com esta estrutura:
{
  "documentType": "contracheque" | "declaracao_anual" | "unknown",
  "referenceMonth": "MM" (se aplicável),
  "referenceYear": "YYYY",
  "extractedIncomes": [
    {
      "name": "Nome da receita",
      "value": 1234.56,
      "type": "categoria do sistema mais apropriada",
      "confidence": 0.95,
      "sourceField": "campo original no documento"
    }
  ]
}`;

    console.log('Sending request to Lovable AI for document parsing...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:${mimeType};base64,${base64}` 
                } 
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Parse the JSON response from AI
    let parsedResult: ParseResult;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      const parsed = JSON.parse(cleanContent);
      parsedResult = {
        success: true,
        documentType: parsed.documentType || 'unknown',
        referenceMonth: parsed.referenceMonth,
        referenceYear: parsed.referenceYear,
        extractedIncomes: parsed.extractedIncomes || [],
      };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      parsedResult = {
        success: false,
        documentType: 'unknown',
        extractedIncomes: [],
        rawText: content,
        error: 'Não foi possível extrair dados estruturados do documento',
      };
    }

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-income-document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        documentType: 'unknown',
        extractedIncomes: [],
        error: error instanceof Error ? error.message : 'Erro ao processar documento' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
