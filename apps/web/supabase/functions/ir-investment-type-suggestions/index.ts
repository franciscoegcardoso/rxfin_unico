import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IRItem {
  codigo: string;
  descricao: string;
  discriminacao: string;
  situacaoAnterior: number;
  situacaoAtual: number;
}

interface InvestmentType {
  value: string;
  label: string;
  description: string;
}

interface IRSuggestion {
  investmentType: string;
  irItems: {
    codigo: string;
    descricao: string;
    discriminacao: string;
    situacaoAtual: number;
    confidence: number;
    reason: string;
  }[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { irItems, institutionId, investmentTypes } = await req.json() as { 
      irItems: IRItem[];
      institutionId: string;
      investmentTypes: InvestmentType[];
    };

    if (!irItems || irItems.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build descriptions for the AI
    const irItemsDescription = irItems.map((item, idx) => 
      `[${idx}] Código: ${item.codigo}, Descrição: "${item.descricao || 'N/A'}", Discriminação: "${item.discriminacao || 'N/A'}", Valor: R$ ${item.situacaoAtual.toFixed(2)}`
    ).join('\n');

    const investmentTypesDescription = investmentTypes.map(t => 
      `- ${t.value}: "${t.label}" - ${t.description}`
    ).join('\n');

    const systemPrompt = `Você é um especialista em finanças pessoais e declaração de Imposto de Renda brasileiro.
Sua tarefa é analisar itens de investimento da declaração de IR e classificá-los nos tipos de investimento corretos.

TIPOS DE INVESTIMENTO DISPONÍVEIS:
${investmentTypesDescription}

REGRAS DE CLASSIFICAÇÃO (use os códigos do IR como guia):
- Código 31: Ações - classifique como "renda_variavel"
- Código 32: Quotas de capital - classifique como "renda_variavel" ou "clubes_investimento"
- Código 39: Aplicações de renda fixa - classifique como "renda_fixa"
- Código 41: Poupança - classifique como "renda_fixa" ou "reserva_emergencia"
- Código 45: Aplicações financeiras gerais - classifique como "aplicacao_financeira" 
- Código 46: Fundos de investimento - classifique como "fundos_investimento"
- Código 47: Mercado futuro e opções - classifique como "renda_variavel"
- Código 49: Outros investimentos - analise a discriminação para decidir
- Código 71: Fundo de ações - classifique como "fundos_investimento"
- Código 72: FII - classifique como "fii"
- Código 73: FIP/FIC - classifique como "fundos_investimento"
- Código 74: ETF - classifique como "etf"
- Código 79: Criptoativos - classifique como "criptoativos"
- Código 81: PGBL/VGBL - classifique como "previdencia_privada"
- Código 89: Outros fundos - analise a discriminação

IMPORTANTE:
- Analise a discriminação do item para refinar a classificação
- Se mencionar "CDB", "LCI", "LCA", "Tesouro" → renda_fixa
- Se mencionar "Ação", "BDR", ticker como PETR4, VALE3 → renda_variavel
- Se mencionar "FII", "fundo imobiliário" → fii
- Se mencionar "Bitcoin", "cripto", "ETH" → criptoativos
- Se mencionar "exterior", "global", "BDR" → pode ser investimento_global
- Se mencionar "debênture" → debentures
- Se mencionar "CRI", "CRA" → cri_cra
- Retorne confiança alta (80+) apenas quando tiver certeza`;

    const userPrompt = `Analise estes itens de investimento da declaração de IR e classifique-os nos tipos de investimento:

ITENS DO IR:
${irItemsDescription}

Para cada item, identifique o tipo de investimento mais adequado e agrupe por tipo.`;

    console.log('Calling AI for investment type suggestions...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_investments",
              description: "Classify IR items into investment types",
              parameters: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemIndex: { type: "number", description: "Index of the IR item (0-based)" },
                        investmentType: { type: "string", description: "The investment type value (e.g., renda_fixa, renda_variavel)" },
                        confidence: { type: "number", description: "Confidence score from 0 to 100" },
                        reason: { type: "string", description: "Brief explanation in Portuguese" }
                      },
                      required: ["itemIndex", "investmentType", "confidence", "reason"]
                    }
                  }
                },
                required: ["classifications"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_investments" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'classify_investments') {
      console.error('Unexpected AI response format:', JSON.stringify(data));
      throw new Error('Invalid AI response format');
    }

    const { classifications } = JSON.parse(toolCall.function.arguments);

    // Group by investment type
    const suggestionsByType: Record<string, IRSuggestion['irItems']> = {};
    
    for (const classification of classifications) {
      const irItem = irItems[classification.itemIndex];
      if (!irItem) continue;

      const type = classification.investmentType;
      if (!suggestionsByType[type]) {
        suggestionsByType[type] = [];
      }

      suggestionsByType[type].push({
        codigo: irItem.codigo,
        descricao: irItem.descricao,
        discriminacao: irItem.discriminacao,
        situacaoAtual: irItem.situacaoAtual,
        confidence: classification.confidence,
        reason: classification.reason
      });
    }

    // Convert to array format
    const suggestions: IRSuggestion[] = Object.entries(suggestionsByType).map(([type, items]) => ({
      investmentType: type,
      irItems: items.sort((a, b) => b.confidence - a.confidence)
    }));

    // Sort by number of items
    suggestions.sort((a, b) => b.irItems.length - a.irItems.length);

    console.log(`Generated suggestions for ${suggestions.length} investment types`);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ir-investment-type-suggestions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
