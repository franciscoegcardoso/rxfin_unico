import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ComparisonData {
  carroA: {
    nome: string;
    valorFipe: number;
    custoMensalTotal: number;
    perda5Anos: number;
    tco5Anos: number;
    depreciacao: number;
    ipva: number;
    seguro: number;
    manutencao: number;
    combustivel: number;
    custoOportunidade: number;
  };
  carroB: {
    nome: string;
    valorFipe: number;
    custoMensalTotal: number;
    perda5Anos: number;
    tco5Anos: number;
    depreciacao: number;
    ipva: number;
    seguro: number;
    manutencao: number;
    combustivel: number;
    custoOportunidade: number;
  };
  horizonte: number;
  economia: number;
  economiaMensal: number;
  vencedor: 'A' | 'B' | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ComparisonData = await req.json();
    
    if (!data.carroA || !data.carroB) {
      return new Response(JSON.stringify({ error: "Dados de comparação são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formatMoney = (value: number): string => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatMoneyShort = (value: number): string => {
      if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}Mn`;
      if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
      return formatMoney(value);
    };

    // Calcular métricas de impacto para micro-copy
    const diferencaTCO = Math.abs(data.carroA.tco5Anos - data.carroB.tco5Anos);
    const percentualDiferenca = (diferencaTCO / Math.min(data.carroA.tco5Anos, data.carroB.tco5Anos)) * 100;
    const diferencaValorFipe = Math.abs(data.carroA.valorFipe - data.carroB.valorFipe);
    const rendimentoMensalDiferenca = diferencaValorFipe * 0.1365 / 12; // CDI mensal
    const carroMaisCaro = data.carroA.valorFipe > data.carroB.valorFipe ? 'A' : 'B';
    const carroMaisBarato = carroMaisCaro === 'A' ? 'B' : 'A';
    
    // Depreciação diária do perdedor
    const depDiariaA = data.carroA.depreciacao / 365;
    const depDiariaB = data.carroB.depreciacao / 365;
    const carroQueMaisDerrete = depDiariaA > depDiariaB ? 'A' : 'B';
    const depreciaDiariaMaior = Math.max(depDiariaA, depDiariaB);
    
    // Quantos tanques a economia paga (considerando tanque médio de R$300)
    const tanquesMensais = data.economiaMensal / 300;
    
    // Identificar o maior vilão de custo
    const custosDiff = {
      depreciacao: Math.abs(data.carroA.depreciacao - data.carroB.depreciacao),
      seguro: Math.abs(data.carroA.seguro - data.carroB.seguro),
      ipva: Math.abs(data.carroA.ipva - data.carroB.ipva),
      manutencao: Math.abs(data.carroA.manutencao - data.carroB.manutencao),
      custoOportunidade: Math.abs(data.carroA.custoOportunidade - data.carroB.custoOportunidade),
    };
    const maiorVilao = Object.entries(custosDiff).sort((a, b) => b[1] - a[1])[0];

    const prompt = `Você é um especialista em inteligência de mercado automotivo e finanças pessoais da RXFin. Sua missão é entregar um VEREDITO IMPACTANTE que seja um "tapa na cara" - didático e visual.

## DADOS DA COMPARAÇÃO (Horizonte: ${data.horizonte} anos)

### Carro A: ${data.carroA.nome}
- Valor FIPE: ${formatMoney(data.carroA.valorFipe)}
- Custo Mensal Total: ${formatMoney(data.carroA.custoMensalTotal)}
- Perda em ${data.horizonte} anos: ${formatMoneyShort(data.carroA.perda5Anos)}
- TCO ${data.horizonte} anos: ${formatMoneyShort(data.carroA.tco5Anos)}
- Depreciação Anual: ${formatMoney(data.carroA.depreciacao)} (${formatMoney(depDiariaA)}/dia)
- Custo de Oportunidade Anual: ${formatMoney(data.carroA.custoOportunidade)}

### Carro B: ${data.carroB.nome}
- Valor FIPE: ${formatMoney(data.carroB.valorFipe)}
- Custo Mensal Total: ${formatMoney(data.carroB.custoMensalTotal)}
- Perda em ${data.horizonte} anos: ${formatMoneyShort(data.carroB.perda5Anos)}
- TCO ${data.horizonte} anos: ${formatMoneyShort(data.carroB.tco5Anos)}
- Depreciação Anual: ${formatMoney(data.carroB.depreciacao)} (${formatMoney(depDiariaB)}/dia)
- Custo de Oportunidade Anual: ${formatMoney(data.carroB.custoOportunidade)}

### MÉTRICAS DE IMPACTO PRÉ-CALCULADAS
- Diferença de TCO: ${formatMoney(diferencaTCO)} (${percentualDiferenca.toFixed(1)}%)
- Economia Mensal: ${formatMoney(data.economiaMensal)}
- Tanques de combustível pagos com economia mensal: ${tanquesMensais.toFixed(1)} tanques
- Diferença de preço FIPE: ${formatMoney(diferencaValorFipe)}
- Rendimento mensal se investisse a diferença: ${formatMoney(rendimentoMensalDiferenca)}
- Carro que mais "derrete" parado: Carro ${carroQueMaisDerrete} (${formatMoney(depreciaDiariaMaior)}/dia)
- Maior vilão de custo: ${maiorVilao[0]} (diferença de ${formatMoney(maiorVilao[1])}/ano)
- Vencedor: Carro ${data.vencedor || 'Empate'}

## DIRETRIZES PARA MICRO-COPY IMPACTANTE

Use estas fórmulas de texto baseadas nos dados:

**Se diferença TCO > 20%:** "O Carro [VENCEDOR] é uma escolha racional esmagadora. A economia mensal de ${formatMoney(data.economiaMensal)} paga ${tanquesMensais.toFixed(1)} tanques de combustível todo mês."

**Se Custo de Oportunidade for o maior vilão:** "Atenção: A diferença de ${formatMoney(diferencaValorFipe)} investida renderia ${formatMoney(rendimentoMensalDiferenca)}/mês. Comprar o Carro ${carroMaisCaro} significa abrir mão desse rendimento passivo."

**Sempre use a depreciação diária:** "O Carro ${carroQueMaisDerrete} 'derrete' ${formatMoney(depreciaDiariaMaior)} por dia só de ficar parado na garagem."

**Use comparações tangíveis:** Netflix, tanques de gasolina, jantares, etc.

## TOM DE VOZ
- Direto ao ponto, sem rodeios
- Use números impactantes e comparações do dia a dia
- Frases curtas e assertivas
- O usuário deve sentir o peso financeiro da decisão

## OUTPUT OBRIGATÓRIO

Retorne EXATAMENTE um JSON com:
{
  "veredito": "2-3 frases IMPACTANTES. Use os números calculados. Exemplo: 'A diferença de R$ X por mês paga Y tanques de gasolina.'",
  "gargalo": "2 frases identificando o VILÃO de custo. Use depreciação diária ou custo de oportunidade como gancho.",
  "recomendacao": "2 frases com recomendação prática. Se for revenda, quanto perde. Se for uso urbano, qual escolher."
}

Importante: Responda APENAS com o JSON válido, sem markdown.`;

    console.log("Generating car comparison verdict...");

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
            content: "Você é um especialista em inteligência de mercado automotivo e finanças pessoais. Forneça análises objetivas, didáticas e baseadas em dados. Sempre retorne JSON válido." 
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar veredito" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks if present)
    let verdict;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      verdict = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", content);
      // Fallback: try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verdict = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON response from AI");
      }
    }

    console.log("Successfully generated verdict");

    return new Response(JSON.stringify(verdict), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in car-comparison-verdict function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
