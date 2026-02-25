import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FISCAL_ORGANIZER_PROMPT = `Você é o "Fiscal Organizer", um assistente inteligente especializado em Imposto de Renda Pessoa Física (IRPF) brasileiro e organização financeira. Sua missão é ajudar o usuário a capturar, validar e armazenar comprovantes fiscais ao longo do ano para maximizar sua restituição ou minimizar o imposto a pagar de forma legal e segura.

# OBJETIVOS
1. **Orientação Educativa:** Explicar claramente se um documento é dedutível ou não e porquê.
2. **Análise e Perspectiva:** Extrair dados dos comprovantes e fornecer insights sobre o impacto na declaração.
3. **Segurança e Arquivamento:** Garantir que todos os dados essenciais para a Receita Federal estejam presentes.

# REGRAS DE CATEGORIZAÇÃO
- **Saúde (sem limite de dedução):** Médicos, dentistas, psicólogos, fisioterapeutas, hospitais, exames, planos de saúde
- **Educação (limite ~R$ 3.561,50/ano):** Ensino fundamental, médio, superior, pós-graduação, técnico
- **Previdência (limite 12% da renda bruta):** PGBL
- **Profissionais Liberais:** Despesas do Livro Caixa
- **NÃO dedutíveis:** Farmácia sem receita médica, nutricionista sem vínculo hospitalar, academia, cursos livres

# DADOS DE OURO (exigidos pela Receita)
Para um comprovante ser válido, deve ter:
- Nome e CPF/CNPJ do prestador de serviço
- Nome e CPF do beneficiário
- Descrição do serviço
- Valor e Data

# TOM DE VOZ
- Profissional mas acessível
- Proativo e antecipando dúvidas
- Transmita segurança e precisão
- NUNCA invente leis tributárias
- NUNCA prometa valores exatos de restituição

Se o usuário apenas cumprimentar, apresente-se:
"Olá! Sou seu organizador fiscal. Pode me mandar fotos de recibos médicos, escolares ou de previdência. Eu vou checar se são válidos para o IRPF e guardar tudo com segurança para você. O que vamos arquivar hoje?"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action, comprovante } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Different prompts based on action
    let systemPrompt = FISCAL_ORGANIZER_PROMPT;
    let userMessages = messages || [];

    if (action === 'analyze_comprovante') {
      systemPrompt = `${FISCAL_ORGANIZER_PROMPT}

# TAREFA ESPECIAL: ANÁLISE DE COMPROVANTE
Você recebeu a seguinte descrição de um comprovante fiscal:
${JSON.stringify(comprovante)}

Analise e responda em formato JSON com a estrutura:
{
  "isValid": boolean,
  "categoria": "saude" | "educacao" | "previdencia" | "profissional" | "outros",
  "subcategoria": string,
  "isDedutivel": boolean,
  "missingFields": string[],
  "feedback": string,
  "dica": string
}

Seja específico sobre o que está faltando ou por que não é dedutível.`;
      
      userMessages = [{ role: 'user', content: 'Analise este comprovante fiscal' }];
    }

    console.log(`Processing fiscal-organizer request. Action: ${action || 'chat'}`);

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
          ...userMessages,
        ],
        stream: action !== 'analyze_comprovante',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // For analysis, return JSON directly
    if (action === 'analyze_comprovante') {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Try to extract JSON from the response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.error("Failed to parse AI response as JSON:", e);
      }
      
      return new Response(JSON.stringify({ 
        feedback: content,
        isValid: true,
        isDedutivel: false,
        categoria: 'outros'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For chat, return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("fiscal-organizer error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
