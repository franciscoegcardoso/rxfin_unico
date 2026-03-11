import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ParsedReceipt {
  estabelecimento: string;
  valor: number;
  data: string;
  categoria_sugerida: string;
  forma_pagamento: string;
  confianca: number;
}

interface BillItem {
  description: string;
  qty: number;
  unitPrice: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { imageBase64, mode = "receipt" } = body as { imageBase64?: string; mode?: "receipt" | "bill" };

    if (!imageBase64) {
      return jsonResponse({ success: false, error: "Imagem não fornecida" }, 200);
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("OPENROUTER_KEY") || "";
    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured");
      return jsonResponse({ success: false, error: "Serviço de leitura de imagem indisponível. Tente mais tarde." }, 200);
    }

    const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    if (mode === "bill") {
      // --- Bill split: extract line items (description, qty, unitPrice) ---
      console.log("Processing bill image (line items)...");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em extrair itens de contas de restaurante ou comandas.
Analise a imagem e extraia cada item da conta com:
- description: nome do item (ex: "Hambúrguer", "Refrigerante 350ml")
- qty: quantidade (número inteiro, ex: 1, 2)
- unitPrice: preço unitário em reais (número com até 2 decimais, ex: 35.00, 8.50)

Regras:
- Um item por linha da conta. Não agrupe itens diferentes.
- unitPrice é o valor unitário; se na conta só tiver total, divida pelo qty.
- Retorne APENAS a lista de itens no formato da ferramenta parse_bill.`
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extraia todos os itens desta conta/comanda. Para cada item: descrição, quantidade e preço unitário em reais (número)." },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "parse_bill",
                description: "Lista de itens da conta para divisão",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          description: { type: "string", description: "Nome do item" },
                          qty: { type: "number", description: "Quantidade" },
                          unitPrice: { type: "number", description: "Preço unitário em reais" }
                        },
                        required: ["description", "qty", "unitPrice"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["items"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "parse_bill" } }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error (bill):", response.status, errorText);
        if (response.status === 429) {
          return jsonResponse({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns segundos." }, 200);
        }
        if (response.status === 402) {
          return jsonResponse({ success: false, error: "Créditos insuficientes." }, 200);
        }
        return jsonResponse({ success: false, error: "Não foi possível ler os itens da conta. Tente outra foto ou digite manualmente." }, 200);
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function?.name !== "parse_bill") {
        return jsonResponse({ success: false, error: "Nenhum item encontrado na imagem. Tente outra foto ou adicione os itens manualmente." }, 200);
      }

      const args = JSON.parse(toolCall.function.arguments || "{}");
      const items: BillItem[] = Array.isArray(args.items) ? args.items : [];
      const normalized = items
        .filter((i: any) => i && typeof i.description === "string" && Number(i.qty) >= 0 && Number(i.unitPrice) >= 0)
        .map((i: any) => ({
          description: String(i.description).trim() || "Item",
          qty: Math.max(0, Number(i.qty) || 1),
          unitPrice: Math.max(0, Number(i.unitPrice) || 0),
        }));

      if (normalized.length === 0) {
        return jsonResponse({ success: false, error: "Nenhum item encontrado. Tente outra foto." }, 200);
      }
      return jsonResponse({ success: true, items: normalized }, 200);
    }

    // --- Receipt mode: single transaction (estabelecimento, valor, data, etc.) ---
    console.log("Processing receipt image...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
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
                image_url: { url: imageUrl }
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
                  estabelecimento: { type: "string", description: "Nome do estabelecimento/loja" },
                  valor: { type: "number", description: "Valor total da compra em reais (apenas número, ex: 45.90)" },
                  data: { type: "string", description: "Data da transação no formato YYYY-MM-DD" },
                  categoria_sugerida: {
                    type: "string",
                    enum: ["alimentação", "transporte", "lazer", "saúde", "educação", "moradia", "compras", "serviços", "outros"]
                  },
                  forma_pagamento: { type: "string", enum: ["crédito", "débito"] },
                  confianca: { type: "number", description: "Nível de confiança na leitura (0-100)" }
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return jsonResponse({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns segundos." }, 200);
      }
      if (response.status === 402) {
        return jsonResponse({ success: false, error: "Créditos insuficientes." }, 200);
      }
      return jsonResponse({ success: false, error: "Erro ao processar imagem" }, 200);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return jsonResponse({ success: false, error: "Não foi possível extrair dados do comprovante" }, 200);
    }

    const parsedData: ParsedReceipt = JSON.parse(toolCall.function.arguments);
    return jsonResponse({ success: true, data: parsedData }, 200);
  } catch (error) {
    console.error("Error parsing receipt:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" },
      200
    );
  }
});
