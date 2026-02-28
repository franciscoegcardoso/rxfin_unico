import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedReceipt {
  estabelecimento: string;
  valor: number;
  data: string;
  categoria_sugerida: string;
  forma_pagamento: string;
  confianca: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "Imagem não fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing receipt image...");

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
            content: `Você é um especialista em extrair informações de comprovantes de pagamento de cartão (filipetas de maquininha).
Analise a imagem e extraia as seguintes informações:
- Nome do estabelecimento
- Valor total da compra
- Data da transação
- Categoria sugerida (alimentação, transporte, lazer, saúde, educação, moradia, compras, serviços, outros)
- Forma de pagamento (crédito, débito)

IMPORTANTE:
- O valor deve ser um número (ex: 45.90, não "R$ 45,90")
- A data deve estar no formato YYYY-MM-DD
- Se não conseguir identificar alguma informação, use valores padrão sensatos
- Retorne APENAS o JSON, sem markdown ou explicações`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia as informações deste comprovante de pagamento. Retorne um JSON com: estabelecimento, valor (número), data (YYYY-MM-DD), categoria_sugerida, forma_pagamento, confianca (0-100 indicando certeza da leitura)"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_receipt",
              description: "Extrair dados estruturados de um comprovante de pagamento",
              parameters: {
                type: "object",
                properties: {
                  estabelecimento: {
                    type: "string",
                    description: "Nome do estabelecimento/loja"
                  },
                  valor: {
                    type: "number",
                    description: "Valor total da compra em reais (apenas número, ex: 45.90)"
                  },
                  data: {
                    type: "string",
                    description: "Data da transação no formato YYYY-MM-DD"
                  },
                  categoria_sugerida: {
                    type: "string",
                    enum: ["alimentação", "transporte", "lazer", "saúde", "educação", "moradia", "compras", "serviços", "outros"]
                  },
                  forma_pagamento: {
                    type: "string",
                    enum: ["crédito", "débito"]
                  },
                  confianca: {
                    type: "number",
                    description: "Nível de confiança na leitura (0-100)"
                  }
                },
                required: ["estabelecimento", "valor", "data", "categoria_sugerida", "forma_pagamento", "confianca"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_receipt" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao processar imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    // Extract tool call arguments
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível extrair dados do comprovante" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedData: ParsedReceipt = JSON.parse(toolCall.function.arguments);
    
    console.log("Parsed receipt:", parsedData);

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing receipt:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
