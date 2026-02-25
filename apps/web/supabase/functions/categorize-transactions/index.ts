import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Categories from the application
const CATEGORIES = [
  { id: 'debts', name: 'Pagamento Dívidas' },
  { id: 'home', name: 'Contas da Casa' },
  { id: 'food', name: 'Alimentação' },
  { id: 'transport', name: 'Transporte e Veículo' },
  { id: 'health', name: 'Saúde' },
  { id: 'personal', name: 'Vestuário e Pessoal' },
  { id: 'housing', name: 'Casa e Moradia' },
  { id: 'leisure', name: 'Lazer e Social' },
  { id: 'shopping', name: 'Compras e Outros' },
  { id: 'streaming', name: 'Entretenimento e Streaming' },
  { id: 'tech', name: 'Tecnologia e Produtividade' },
  { id: 'services', name: 'Serviços e Utilidades' },
  { id: 'subscriptions', name: 'Clubes de Assinatura' },
  { id: 'education', name: 'Educação e Desenvolvimento' },
  { id: 'insurance', name: 'Seguros e Assistências' },
  { id: 'extras', name: 'Gastos Extras' },
  { id: 'outros', name: 'Não atribuído' },
];

interface Transaction {
  storeName: string;
  value: number;
  date: string;
}

interface CategorizedTransaction extends Transaction {
  suggestedCategoryId: string;
  suggestedCategory: string;
  confidence: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions } = await req.json() as { transactions: Transaction[] };
    
    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No transactions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const categoryList = CATEGORIES.map(c => `- ${c.id}: ${c.name}`).join('\n');
    const transactionList = transactions.map((t, i) => 
      `${i + 1}. Loja: "${t.storeName}", Valor: R$ ${t.value.toFixed(2)}`
    ).join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em categorização de despesas de cartão de crédito no Brasil. 
Sua tarefa é analisar nomes de estabelecimentos/lojas e sugerir a categoria mais adequada.

Categorias disponíveis:
${categoryList}

Regras importantes:
1. Supermercados, mercados, padarias = food (Alimentação)
2. Postos de combustível, estacionamentos, Uber, 99 = transport (Transporte e Veículo)
3. Farmácias, drogarias, planos de saúde = health (Saúde)
4. Restaurantes, bares, lanchonetes, iFood, Rappi = food (Alimentação)
5. Lojas de roupas, calçados, acessórios = personal (Vestuário e Pessoal)
6. Netflix, Spotify, Disney+, Amazon Prime, jogos = streaming (Entretenimento e Streaming)
7. Academias, plano de celular = services (Serviços e Utilidades)
8. Lojas de eletrônicos, tecnologia = shopping (Compras e Outros)
9. Livrarias, cursos, escolas = education (Educação e Desenvolvimento)
10. Seguros, assistências = insurance (Seguros e Assistências)
11. Cinema, teatro, shows, viagens = leisure (Lazer e Social)
12. Contas de água, luz, gás, internet = home (Contas da Casa)
13. Se não tiver certeza, use "outros" (Não atribuído)

Responda APENAS com um JSON array no formato:
[{"index": 1, "categoryId": "food", "category": "Alimentação", "confidence": "high"}]

confidence pode ser: "high" (certeza), "medium" (provável), "low" (incerto)`
          },
          {
            role: 'user',
            content: `Categorize as seguintes transações do cartão de crédito:\n\n${transactionList}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Taxa de requisições excedida. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Erro ao conectar com IA');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', content);
      // Return default categories
      const defaultResult: CategorizedTransaction[] = transactions.map(t => ({
        ...t,
        suggestedCategoryId: 'outros',
        suggestedCategory: 'Não atribuído',
        confidence: 'low' as const,
      }));
      return new Response(
        JSON.stringify({ categorizedTransactions: defaultResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    
    const categorizedTransactions: CategorizedTransaction[] = transactions.map((t, index) => {
      const suggestion = suggestions.find((s: any) => s.index === index + 1);
      if (suggestion) {
        const category = CATEGORIES.find(c => c.id === suggestion.categoryId);
        return {
          ...t,
          suggestedCategoryId: suggestion.categoryId || 'outros',
          suggestedCategory: category?.name || suggestion.category || 'Não atribuído',
          confidence: suggestion.confidence || 'low',
        };
      }
      return {
        ...t,
        suggestedCategoryId: 'outros',
        suggestedCategory: 'Não atribuído',
        confidence: 'low' as const,
      };
    });

    console.log(`Categorized ${categorizedTransactions.length} transactions`);

    return new Response(
      JSON.stringify({ categorizedTransactions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in categorize-transactions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
