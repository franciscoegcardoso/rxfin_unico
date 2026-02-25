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
    const { property } = await req.json();
    
    if (!property) {
      return new Response(JSON.stringify({ error: "Property data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Média de meses alugado por ano
    const avgRentedMonths = property.averageRentedMonths ?? 12;
    
    // Calcular yield do aluguel ajustado pela ocupação
    const effectiveAnnualRental = property.rentalValue 
      ? property.rentalValue * avgRentedMonths 
      : 0;
    
    const rentalYield = effectiveAnnualRental && property.value 
      ? ((effectiveAnnualRental) / property.value * 100).toFixed(2)
      : null;

    // Calcular valor por m² se disponível
    const pricePerSqm = property.propertyArea && property.value
      ? (property.value / property.propertyArea).toFixed(2)
      : null;

    // Responsabilidade por despesas
    const expenseResp = property.expenseResponsibility;
    const expenseResponsibilityText = expenseResp ? `
Responsabilidade por Despesas:
- IPTU: ${expenseResp.iptu === 'owner' ? 'Proprietário' : 'Inquilino'}
- Condomínio: ${expenseResp.condominio === 'owner' ? 'Proprietário' : 'Inquilino'}
- Água: ${expenseResp.agua === 'owner' ? 'Proprietário' : 'Inquilino'}
- Luz: ${expenseResp.luz === 'owner' ? 'Proprietário' : 'Inquilino'}
- Gás: ${expenseResp.gas === 'owner' ? 'Proprietário' : 'Inquilino'}
- Seguro: ${expenseResp.seguro === 'owner' ? 'Proprietário' : 'Inquilino'}
- Manutenção Ordinária: ${expenseResp.manutencaoOrdinaria === 'owner' ? 'Proprietário' : 'Inquilino'}
- Manutenção Extraordinária: ${expenseResp.manutencaoExtraordinaria === 'owner' ? 'Proprietário' : 'Inquilino'}` : '';

    const prompt = `Analise o seguinte imóvel e forneça insights financeiros detalhados em português brasileiro:

Imóvel: ${property.name}
Valor Atual: R$ ${property.value?.toLocaleString('pt-BR')}
${property.purchaseDate ? `Data de Compra: ${property.purchaseDate}` : ''}
${property.purchaseValue ? `Valor de Compra: R$ ${property.purchaseValue?.toLocaleString('pt-BR')}` : ''}
${property.propertyCep ? `CEP: ${property.propertyCep}` : ''}
${property.propertyArea ? `Área: ${property.propertyArea} m²` : ''}
${property.isRentalProperty ? 'É um imóvel de aluguel: Sim' : 'É um imóvel de aluguel: Não'}
${property.rentalValue ? `Valor do Aluguel Mensal: R$ ${property.rentalValue?.toLocaleString('pt-BR')}` : ''}
${property.isRentalProperty ? `Média de Meses Alugado por Ano: ${avgRentedMonths}` : ''}
${rentalYield ? `Yield Efetivo do Aluguel: ${rentalYield}% ao ano (considerando ${avgRentedMonths} meses de ocupação)` : ''}
${pricePerSqm ? `Valor por m²: R$ ${pricePerSqm}` : ''}
Tipo de Reajuste: ${property.propertyAdjustment || 'Não definido'}
${property.rentAdjustmentMonth ? `Mês de Reajuste do Aluguel: ${property.rentAdjustmentMonth}` : ''}
${expenseResponsibilityText}

Forneça uma análise completa incluindo:

1. **Yield de Aluguel (se aplicável)**:
   - Analise o rendimento do aluguel em relação ao valor do imóvel
   - Compare com benchmarks de mercado (yield médio de 0,3% a 0,5% ao mês no Brasil)
   - Considere a taxa de ocupação (${avgRentedMonths} meses/ano) na análise
   - Indique se o yield está acima ou abaixo da média

2. **Custo de Oportunidade**:
   - Compare o retorno do imóvel com investimentos em renda fixa (CDI ~12% a.a.)
   - Calcule o custo de oportunidade de manter o capital no imóvel
   - Considere liquidez e riscos

3. **Valorização do Imóvel**:
   - Analise o potencial de valorização baseado no CEP (se informado)
   - Compare com índices de valorização imobiliária (FipeZap, índices regionais)
   - Considere fatores como infraestrutura, desenvolvimento urbano

4. **Análise de Índices**:
   - IGPM: histórico recente e projeções
   - IPCA: impacto na valorização real
   - Salário Mínimo: relevância para reajustes

5. **Custos de Propriedade para o Proprietário**:
   - IPTU estimado (média de 1% a 2% do valor venal)
   - Condomínio (se aplicável)
   - Manutenção (1% a 2% do valor do imóvel por ano)
   - Vacância (risco de imóvel desocupado - considere ${12 - avgRentedMonths} meses/ano)
   - Analise a divisão de responsabilidades informada

6. **Valor por m² (se área informada)**:
   - Compare com médias da região
   - Indique se está acima, na média ou abaixo do mercado

7. **Recomendações**:
   - Sugestões para otimização do investimento
   - Melhor momento para venda ou renegociação de aluguel
   - Estratégias de valorização
   - Sugestões para reduzir vacância se aplicável

Responda de forma estruturada e profissional, com números e percentuais quando possível. Use benchmarks reais do mercado brasileiro.`;

    console.log("Generating property insights for:", property.name);

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
            content: "Você é um especialista financeiro imobiliário brasileiro. Forneça análises detalhadas e precisas sobre imóveis, incluindo yield de aluguel, custo de oportunidade, valorização, índices econômicos e recomendações de mercado. Use dados reais do mercado brasileiro quando possível, como índices FipeZap, IGPM, IPCA e CDI atualizados." 
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

    console.log("Successfully generated property insights");

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in property-insights function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
