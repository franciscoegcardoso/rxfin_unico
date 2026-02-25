import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicle } = await req.json();
    
    if (!vehicle) {
      return new Response(JSON.stringify({ error: "Vehicle data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Analise o seguinte veículo e forneça insights financeiros detalhados em português brasileiro:

Veículo: ${vehicle.name}
Tipo: ${vehicle.type === 'vehicle' ? 'Veículo' : vehicle.type}
Valor Atual: R$ ${vehicle.value?.toLocaleString('pt-BR')}
${vehicle.purchaseDate ? `Data de Compra: ${vehicle.purchaseDate}` : ''}
${vehicle.purchaseValue ? `Valor de Compra: R$ ${vehicle.purchaseValue?.toLocaleString('pt-BR')}` : ''}
${vehicle.isZeroKm ? 'Comprado Zero KM' : 'Comprado Usado'}
${vehicle.fipePercentage ? `Percentual FIPE: ${vehicle.fipePercentage}%` : ''}

Forneça uma análise completa incluindo:
1. **Depreciação Estimada**: Calcule a depreciação anual típica para este tipo de veículo
2. **Projeção de Valor**: Estime o valor do veículo nos próximos 1, 2 e 5 anos
3. **Custo de Propriedade**: Estime custos anuais com IPVA, seguro, manutenção
4. **Recomendações**: Sugira o melhor momento para venda ou troca
5. **Comparativo de Mercado**: Compare com veículos similares

Responda de forma estruturada e profissional, com números e percentuais quando possível.`;

    console.log("Generating vehicle insights for:", vehicle.name);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Você é um especialista financeiro automotivo brasileiro. Forneça análises detalhadas e precisas sobre veículos, incluindo depreciação, custos de propriedade e recomendações de mercado. Use dados reais do mercado brasileiro quando possível." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar insights" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || "Não foi possível gerar insights.";

    console.log("Successfully generated insights");

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in vehicle-insights function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
