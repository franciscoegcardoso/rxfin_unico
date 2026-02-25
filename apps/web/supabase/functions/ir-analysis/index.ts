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

interface IRDeclaration {
  anoExercicio: number;
  anoCalendario: number;
  bensDireitos: BemDireito[];
  rendimentosTributaveis: Rendimento[];
  rendimentosIsentos: Rendimento[];
  dividas: Divida[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Check if this is a chat request
    if (body.chatMode) {
      return handleChatRequest(body);
    }
    
    // Original analysis flow
    const { declarations } = body as { declarations: IRDeclaration[] };

    if (!declarations || declarations.length < 2) {
      return new Response(
        JSON.stringify({ error: 'São necessárias pelo menos 2 declarações para comparação' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Sort by year (most recent first)
    const sorted = [...declarations].sort((a, b) => b.anoExercicio - a.anoExercicio);
    const current = sorted[0];
    const previous = sorted[1];

    // Prepare summary for AI analysis
    const currentSummary = {
      ano: current.anoExercicio,
      totalBens: current.bensDireitos.reduce((s, b) => s + b.situacaoAtual, 0),
      qtdBens: current.bensDireitos.length,
      bensAgrupados: groupBens(current.bensDireitos),
      totalRendimentos: current.rendimentosTributaveis.reduce((s, r) => s + r.valor, 0),
      qtdFontes: current.rendimentosTributaveis.length,
      totalDividas: current.dividas.reduce((s, d) => s + d.situacaoAtual, 0),
      qtdDividas: current.dividas.length,
      detalhes: {
        bens: current.bensDireitos.map(b => ({
          codigo: b.codigo,
          descricao: truncate(b.descricao, 100),
          valorAnterior: b.situacaoAnterior,
          valorAtual: b.situacaoAtual,
        })),
        rendimentos: current.rendimentosTributaveis.map(r => ({
          fonte: r.nomeFonte,
          valor: r.valor,
        })),
        dividas: current.dividas.map(d => ({
          descricao: truncate(d.descricao, 100),
          valorAnterior: d.situacaoAnterior,
          valorAtual: d.situacaoAtual,
        })),
      }
    };

    const previousSummary = {
      ano: previous.anoExercicio,
      totalBens: previous.bensDireitos.reduce((s, b) => s + b.situacaoAtual, 0),
      qtdBens: previous.bensDireitos.length,
      bensAgrupados: groupBens(previous.bensDireitos),
      totalRendimentos: previous.rendimentosTributaveis.reduce((s, r) => s + r.valor, 0),
      qtdFontes: previous.rendimentosTributaveis.length,
      totalDividas: previous.dividas.reduce((s, d) => s + d.situacaoAtual, 0),
      qtdDividas: previous.dividas.length,
      detalhes: {
        bens: previous.bensDireitos.map(b => ({
          codigo: b.codigo,
          descricao: truncate(b.descricao, 100),
          valorAnterior: b.situacaoAnterior,
          valorAtual: b.situacaoAtual,
        })),
        rendimentos: previous.rendimentosTributaveis.map(r => ({
          fonte: r.nomeFonte,
          valor: r.valor,
        })),
        dividas: previous.dividas.map(d => ({
          descricao: truncate(d.descricao, 100),
          valorAnterior: d.situacaoAnterior,
          valorAtual: d.situacaoAtual,
        })),
      }
    };

    const prompt = `Você é um especialista em análise de declarações de Imposto de Renda brasileiro.

Analise as duas declarações de IR abaixo e forneça um relatório comparativo focado nas PRINCIPAIS mudanças.

DECLARAÇÃO MAIS RECENTE (${currentSummary.ano}):
${JSON.stringify(currentSummary, null, 2)}

DECLARAÇÃO ANTERIOR (${previousSummary.ano}):
${JSON.stringify(previousSummary, null, 2)}

Forneça sua análise em JSON com a seguinte estrutura:
{
  "resumoGeral": "Uma frase resumindo a situação patrimonial geral",
  "variacaoPatrimonio": {
    "valor": número (diferença absoluta),
    "percentual": número (percentual de variação),
    "direcao": "aumento" | "reducao" | "estavel"
  },
  "variacaoRendimentos": {
    "valor": número,
    "percentual": número,
    "direcao": "aumento" | "reducao" | "estavel"
  },
  "variacaoDividas": {
    "valor": número,
    "percentual": número,
    "direcao": "aumento" | "reducao" | "estavel"
  },
  "principaisMudancas": [
    {
      "tipo": "bem_adquirido" | "bem_vendido" | "investimento_cresceu" | "investimento_reduziu" | "nova_divida" | "divida_quitada" | "renda_aumentou" | "renda_diminuiu" | "outro",
      "descricao": "descrição curta da mudança",
      "valor": número (valor envolvido na mudança),
      "impacto": "positivo" | "negativo" | "neutro"
    }
  ],
  "oquePermaneceuIgual": [
    "item que não mudou significativamente"
  ],
  "insightsFinanceiros": [
    "insight ou observação relevante sobre a evolução patrimonial"
  ],
  "alertas": [
    "ponto de atenção que o usuário deveria considerar"
  ]
}

Regras:
- Limite principaisMudancas a no máximo 5 itens mais relevantes
- Limite oquePermaneceuIgual a no máximo 3 itens
- Limite insightsFinanceiros a no máximo 3 insights
- Limite alertas a no máximo 2 alertas (se houver)
- Valores devem ser em reais (números)
- Seja objetivo e direto`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista fiscal especializado em Imposto de Renda brasileiro. Responda sempre em JSON válido." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao processar análise");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Parse JSON from response (handle markdown code blocks)
    let analysis;
    try {
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0].trim();
      }
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Erro ao interpretar análise");
    }

    return new Response(
      JSON.stringify({
        success: true,
        anoAtual: current.anoExercicio,
        anoAnterior: previous.anoExercicio,
        analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("ir-analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleChatRequest(body: { 
  chatMode: boolean; 
  analysisContext: string; 
  chatHistory: ChatMessage[]; 
  userMessage: string; 
}): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const { analysisContext, chatHistory, userMessage } = body;

  const systemPrompt = `Você é um especialista em Imposto de Renda brasileiro e consultor financeiro.
O usuário está analisando uma comparação entre duas declarações de IR. Aqui está o contexto da análise:

${analysisContext}

Baseado neste contexto, responda às perguntas do usuário de forma clara, objetiva e educativa.
- Explique conceitos tributários de forma simples quando necessário
- Dê sugestões práticas quando apropriado
- Seja específico referenciando os dados da análise
- Responda em português brasileiro
- Seja conciso, mas completo`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...chatHistory.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
    { role: "user" as const, content: userMessage }
  ];

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway chat error:", response.status, errorText);
      throw new Error("Erro ao processar mensagem");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    return new Response(
      JSON.stringify({ success: true, response: content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function groupBens(bens: BemDireito[]): Record<string, { qtd: number; total: number }> {
  const groups: Record<string, { qtd: number; total: number }> = {};
  
  for (const bem of bens) {
    const codigo = parseInt(bem.codigo);
    let categoria: string;
    
    if (codigo >= 1 && codigo <= 19) categoria = 'Imóveis';
    else if (codigo >= 21 && codigo <= 29) categoria = 'Veículos';
    else if (codigo >= 31 && codigo <= 99) categoria = 'Investimentos';
    else categoria = 'Outros';
    
    if (!groups[categoria]) {
      groups[categoria] = { qtd: 0, total: 0 };
    }
    groups[categoria].qtd++;
    groups[categoria].total += bem.situacaoAtual;
  }
  
  return groups;
}

function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}
