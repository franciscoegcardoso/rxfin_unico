import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialData {
  currentMonth: string;
  recurringExpenses: Array<{
    name: string;
    category: string;
    value: number;
    paymentMethod: string;
  }>;
  installments: Array<{
    name: string;
    value: number;
    currentInstallment: number;
    totalInstallments: number;
  }>;
  creditCardTotal: number;
  monthlyBudget: number;
  previousMonthData: {
    totalExpenses: number;
    totalIncome: number;
    savingsRate: number;
  };
  twoMonthsAgoData: {
    totalExpenses: number;
    totalIncome: number;
    savingsRate: number;
  };
  categoryBreakdown: Array<{
    category: string;
    projected: number;
    previousMonth: number;
    twoMonthsAgo: number;
  }>;
  incomeProjected: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENROUTER_KEY') || '';
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const financialData: FinancialData = await req.json();

    console.log('Received financial data for insights:', JSON.stringify(financialData, null, 2));

    // Helper function to safely format currency
    const formatCurrency = (value: number | null | undefined): string => {
      if (value === null || value === undefined) return 'N/A';
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    };

    // Calculate pre-committed budget (filter out null values)
    const recurringTotal = financialData.recurringExpenses
      .filter(e => e.value != null)
      .reduce((sum, e) => sum + (e.value || 0), 0);
    const installmentsTotal = financialData.installments
      .filter(i => i.value != null)
      .reduce((sum, i) => sum + (i.value || 0), 0);
    const preCommittedTotal = recurringTotal + installmentsTotal;
    const monthlyBudget = financialData.monthlyBudget || 0;
    const preCommittedPercentage = monthlyBudget > 0 
      ? (preCommittedTotal / monthlyBudget * 100).toFixed(1)
      : '0';

    // Prepare data summary for AI
    const creditCardTotal = financialData.creditCardTotal || 0;
    const incomeProjected = financialData.incomeProjected || 0;
    const prevExpenses = financialData.previousMonthData?.totalExpenses || 0;
    const prevIncome = financialData.previousMonthData?.totalIncome || 0;
    const prevSavingsRate = financialData.previousMonthData?.savingsRate || 0;
    const twoMonthsExpenses = financialData.twoMonthsAgoData?.totalExpenses || 0;
    const twoMonthsIncome = financialData.twoMonthsAgoData?.totalIncome || 0;
    const twoMonthsSavingsRate = financialData.twoMonthsAgoData?.savingsRate || 0;

    const dataSummary = `
## Dados Financeiros do Mês (${financialData.currentMonth})

### Orçamento Pré-Comprometido (início do mês)
- Despesas Recorrentes: R$ ${formatCurrency(recurringTotal)}
- Parcelas em Andamento: R$ ${formatCurrency(installmentsTotal)}
- Total Pré-Comprometido: R$ ${formatCurrency(preCommittedTotal)} (${preCommittedPercentage}% do orçamento)
- Cartão de Crédito Projetado: R$ ${formatCurrency(creditCardTotal)}
- Orçamento Total do Mês: R$ ${formatCurrency(monthlyBudget)}
- Receita Projetada: R$ ${formatCurrency(incomeProjected)}

### Comparativo Mês a Mês
**Mês Anterior:**
- Despesas: R$ ${formatCurrency(prevExpenses)}
- Receitas: R$ ${formatCurrency(prevIncome)}
- Taxa de Economia: ${prevSavingsRate.toFixed(1)}%

**Dois Meses Atrás:**
- Despesas: R$ ${formatCurrency(twoMonthsExpenses)}
- Receitas: R$ ${formatCurrency(twoMonthsIncome)}
- Taxa de Economia: ${twoMonthsSavingsRate.toFixed(1)}%

### Despesas Recorrentes por Categoria
${financialData.recurringExpenses
  .filter(e => e.value != null)
  .map(e => `- ${e.name} (${e.category}): R$ ${formatCurrency(e.value)} [${e.paymentMethod}]`)
  .join('\n') || 'Nenhuma despesa recorrente com valor definido'}

### Parcelas em Andamento
${financialData.installments.map(i => `- ${i.name}: R$ ${formatCurrency(i.value)} (${i.currentInstallment}/${i.totalInstallments})`).join('\n') || 'Nenhuma parcela'}

### Projeção por Categoria
${financialData.categoryBreakdown
  .filter(c => c.projected != null)
  .map(c => {
    const projected = c.projected || 0;
    const prevMonth = c.previousMonth || 0;
    const variation = prevMonth > 0 ? ((projected - prevMonth) / prevMonth * 100).toFixed(1) : '0';
    const variationNum = parseFloat(variation);
    return `- ${c.category}: Projetado R$ ${formatCurrency(projected)} | Mês anterior R$ ${formatCurrency(prevMonth)} (${variationNum > 0 ? '+' : ''}${variation}%)`;
  }).join('\n') || 'Nenhuma categoria com projeção definida'}
`;

    const systemPrompt = `Você é um consultor financeiro pessoal especializado em orçamento familiar brasileiro. 
Analise os dados financeiros fornecidos e gere insights acionáveis e personalizados.

REGRAS:
1. Seja direto e objetivo
2. Use linguagem simples e acessível
3. Foque em insights práticos que o usuário pode agir
4. Identifique padrões, tendências e anomalias
5. Destaque riscos e oportunidades
6. Use emojis para tornar a leitura mais agradável
7. Responda SEMPRE em português brasileiro

FORMATO DE RESPOSTA (JSON):
{
  "monthStartSummary": {
    "title": "Como você começa o mês",
    "preCommittedAmount": number,
    "preCommittedPercentage": number,
    "analysis": "Análise de como o usuário começa o mês com despesas já comprometidas",
    "trend": "up" | "down" | "stable",
    "trendDescription": "Comparação com meses anteriores"
  },
  "concerns": [
    {
      "title": "Título do ponto de atenção",
      "description": "Descrição detalhada do problema ou risco identificado",
      "severity": "high" | "medium" | "low",
      "category": "categoria relacionada se houver"
    }
  ],
  "opportunities": [
    {
      "title": "Título da oportunidade",
      "description": "Descrição da oportunidade de economia ou melhoria",
      "potentialSaving": number ou null,
      "category": "categoria relacionada se houver"
    }
  ],
  "creditCardInsight": {
    "analysis": "Análise específica do cartão de crédito",
    "recommendation": "Recomendação específica"
  },
  "monthlyComparison": {
    "trend": "improving" | "worsening" | "stable",
    "analysis": "Análise da evolução mês a mês",
    "keyChanges": ["Mudança 1", "Mudança 2"]
  },
  "quickTip": "Uma dica rápida e acionável para este mês"
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise os seguintes dados financeiros e gere insights:\n\n${dataSummary}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no OpenRouter." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    console.log('AI Response:', aiResponse);

    // Try to parse the JSON response
    let insights;
    try {
      // Extract JSON from the response (handling markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                        aiResponse.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, aiResponse];
      const jsonString = jsonMatch[1] || aiResponse;
      insights = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Return a fallback response
      insights = {
        monthStartSummary: {
          title: "Como você começa o mês",
          preCommittedAmount: preCommittedTotal,
          preCommittedPercentage: Number(preCommittedPercentage),
          analysis: `Você começa o mês com R$ ${preCommittedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} já comprometidos entre despesas recorrentes e parcelas.`,
          trend: "stable",
          trendDescription: "Análise baseada nos dados disponíveis"
        },
        concerns: [],
        opportunities: [],
        creditCardInsight: {
          analysis: `Projeção de gastos no cartão: R$ ${financialData.creditCardTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          recommendation: "Continue monitorando seus gastos no cartão."
        },
        monthlyComparison: {
          trend: "stable",
          analysis: "Dados insuficientes para análise completa.",
          keyChanges: []
        },
        quickTip: "Acompanhe seus gastos diariamente para manter o controle do orçamento."
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in budget-insights function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
