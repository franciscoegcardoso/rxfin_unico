import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  investmentType?: string;
  investmentInstitutionId?: string;
}

interface FinancialInstitution {
  id: string;
  institutionId: string;
  customName?: string;
  hasInvestments: boolean;
}

interface LinkSuggestion {
  bemIndex: number;
  suggestedAssetId: string | null;
  confidence: number;
  reason: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bens, assets, financialInstitutions } = await req.json() as { 
      bens: BemDireito[]; 
      assets: Asset[];
      financialInstitutions?: FinancialInstitution[];
    };

    if (!bens || bens.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter assets based on IR item type
    // For stocks/funds (codes 31-99), only show investments linked to institutions with hasInvestments
    const institutionsWithInvestments = (financialInstitutions || [])
      .filter(fi => fi.hasInvestments)
      .map(fi => fi.id);

    const investmentAssets = assets.filter(a => 
      a.type === 'investment' && 
      a.investmentInstitutionId &&
      institutionsWithInvestments.includes(a.investmentInstitutionId)
    );

    const nonInvestmentAssets = assets.filter(a => a.type !== 'investment');

    // Create mapping of which assets are available for each IR code type
    const getAvailableAssetsForCode = (codigo: string): Asset[] => {
      const codigoNum = parseInt(codigo);
      // Stocks, funds, financial applications (31-99)
      if (codigoNum >= 31 && codigoNum <= 99) {
        return investmentAssets;
      }
      // Properties (01-19) and Vehicles (21-29)
      return nonInvestmentAssets;
    };

    if (!assets || assets.length === 0) {
      // No assets to match against
      const emptySuggestions: LinkSuggestion[] = bens.map((_, idx) => ({
        bemIndex: idx,
        suggestedAssetId: null,
        confidence: 0,
        reason: 'Nenhum bem cadastrado no sistema para vincular',
      }));
      return new Response(
        JSON.stringify({ suggestions: emptySuggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt with filtered assets per item
    const bensDescription = bens.map((bem, idx) => {
      const availableAssets = getAvailableAssetsForCode(bem.codigo);
      const assetsList = availableAssets.length > 0 
        ? availableAssets.map(a => `"${a.id}"`).join(', ')
        : 'nenhum';
      return `[${idx}] Código: ${bem.codigo}, Descrição: "${bem.descricao || 'Sem descrição'}", Discriminação: "${bem.discriminacao || ''}", Valor: R$ ${bem.situacaoAtual.toFixed(2)} | Assets disponíveis: ${assetsList}`;
    }).join('\n');

    const allAvailableAssets = [...new Set([...investmentAssets, ...nonInvestmentAssets])];
    const assetsDescription = allAvailableAssets.map(asset => 
      `ID: "${asset.id}", Nome: "${asset.name}", Tipo: ${asset.type}${asset.investmentType ? ` (${asset.investmentType})` : ''}, Valor: R$ ${asset.value.toFixed(2)}, Descrição: "${asset.description || ''}"`
    ).join('\n');

    const systemPrompt = `Você é um assistente especializado em análise de declarações de Imposto de Renda brasileiro.
Sua tarefa é analisar itens da declaração de IR e sugerir correspondências com bens cadastrados no sistema do usuário.

REGRAS IMPORTANTES:
- Código do IR: 01-19 são imóveis, 21-29 são veículos, 31-99 são investimentos/aplicações financeiras/ações/fundos
- Para cada item, observe a lista de "Assets disponíveis" - você SÓ pode sugerir IDs que estejam nessa lista
- Para ações e fundos (códigos 31-99), vincule APENAS a investimentos de instituições financeiras
- Considere similaridade de nomes, descrições e valores (margem de 20%)
- Se a discriminação mencionar um ticker (ex: BBAS3, PETR4), busque por ele no nome do asset

Seja conservador nas sugestões - só sugira match com alta confiança.
Se não houver correspondência clara ou nenhum asset disponível, deixe suggestedAssetId como null.`;

    const userPrompt = `Analise estes itens da declaração de IR e sugira correspondências com os bens cadastrados:

ITENS DA DECLARAÇÃO DE IR:
${bensDescription}

BENS CADASTRADOS NO SISTEMA:
${assetsDescription}

IMPORTANTE: Para cada item, sugira APENAS um asset da lista de "Assets disponíveis" indicada para aquele item.
Para cada item do IR, retorne uma sugestão de vinculação.`;

    console.log('Calling AI for IR link suggestions...');

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
              name: "suggest_links",
              description: "Return link suggestions for IR items to existing assets",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        bemIndex: { type: "number", description: "Index of the IR item (0-based)" },
                        suggestedAssetId: { type: "string", nullable: true, description: "ID of the suggested asset or null if no match" },
                        confidence: { type: "number", description: "Confidence score from 0 to 100" },
                        reason: { type: "string", description: "Brief explanation in Portuguese of why this match was suggested" }
                      },
                      required: ["bemIndex", "suggestedAssetId", "confidence", "reason"]
                    }
                  }
                },
                required: ["suggestions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_links" } }
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
    if (!toolCall || toolCall.function.name !== 'suggest_links') {
      console.error('Unexpected AI response format:', JSON.stringify(data));
      throw new Error('Invalid AI response format');
    }

    const suggestions = JSON.parse(toolCall.function.arguments).suggestions as LinkSuggestion[];

    // Validate suggestions - ensure suggested assets are in the allowed list for each item
    const validatedSuggestions = suggestions.map((s, idx) => {
      const bem = bens[s.bemIndex] || bens[idx];
      const availableAssets = bem ? getAvailableAssetsForCode(bem.codigo) : [];
      const assetExists = s.suggestedAssetId && availableAssets.some(a => a.id === s.suggestedAssetId);
      
      return {
        ...s,
        suggestedAssetId: assetExists ? s.suggestedAssetId : null,
        confidence: assetExists ? s.confidence : 0,
        reason: assetExists ? s.reason : (
          parseInt(bem?.codigo || '0') >= 31 
            ? 'Cadastre uma instituição financeira com investimentos para vincular ações e fundos'
            : 'Nenhuma correspondência encontrada'
        )
      };
    });

    console.log(`Generated ${validatedSuggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions: validatedSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ir-link-suggestions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
