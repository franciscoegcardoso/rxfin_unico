import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Categories for AI categorization
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
  installment?: string; // e.g., "2/5" for parcela 2 de 5
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Nenhum arquivo enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let transactions: Transaction[] = [];
    const fileType = file.type || file.name.split('.').pop()?.toLowerCase() || '';
    const isTextBased = fileType.includes('csv') || fileType.includes('text') || 
                        file.name.endsWith('.csv') || file.name.endsWith('.txt');

    if (isTextBased) {
      // For CSV/TXT files, read as text and use AI to extract
      const text = await file.text();
      transactions = await extractTransactionsFromText(text, LOVABLE_API_KEY);
    } else {
      // For PDF, Excel, and image files, use AI with vision
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid call stack issues
      let base64 = '';
      const chunkSize = 0x8000; // 32KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        base64 += String.fromCharCode.apply(null, Array.from(chunk));
      }
      base64 = btoa(base64);
      
      const mimeType = file.type || 'application/octet-stream';
      transactions = await extractTransactionsWithVision(base64, mimeType, LOVABLE_API_KEY);
    }

    // Now categorize all transactions
    if (transactions.length > 0) {
      transactions = await categorizeTransactions(transactions, LOVABLE_API_KEY);
    }

    console.log(`Extracted and categorized ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({ 
        transactions,
        transactionCount: transactions.length,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing statement:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao processar arquivo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractTransactionsFromText(text: string, apiKey: string): Promise<Transaction[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Você é um extrator especializado de dados de faturas de cartão de crédito brasileiro.
Analise o texto (CSV, TXT ou tabular) e extraia TODAS as transações.

ATENÇÃO ESPECIAL PARA PARCELAS:
- Em arquivos CSV/Excel, a informação de parcelas geralmente está em uma COLUNA SEPARADA (coluna D, E ou similar)
- NÃO confunda com o nome do estabelecimento
- Formatos comuns de parcelas: "2/5", "01/03", "02/12", "Parcela 2 de 5", "PARC 02/06"
- Se a coluna de parcelas contém "À vista", "1/1" ou está vazia = compra à vista (não inclua installment)
- Se contém qualquer formato X/Y onde Y > 1, é parcelado

Para cada transação, extraia:
- storeName: nome do estabelecimento/loja (LIMPO, sem informação de parcela)
- value: valor em reais (número positivo, usar valor da parcela individual)
- date: data no formato YYYY-MM-DD
- installment: informação de parcela se houver (OBRIGATÓRIO formato "X/Y", ex: "2/5")

REGRAS CRÍTICAS:
1. SEPARE a informação de parcela da coluna correta - geralmente é uma coluna específica
2. NÃO inclua "2/5", "01/12" etc no storeName
3. Ignore linhas de cabeçalho, totais, taxas e juros
4. Se o ano não estiver presente na data, use 2025
5. Para compras À VISTA (1/1 ou sem parcela), NÃO inclua o campo installment

Responda APENAS com um JSON array:
Parcelado: [{"storeName": "Nome Loja", "value": 123.45, "date": "2025-01-15", "installment": "2/5"}]
À vista: [{"storeName": "Nome Loja", "value": 50.00, "date": "2025-01-15"}]

Se não houver transações válidas, retorne: []`
        },
        {
          role: 'user',
          content: `Extraia as transações desta fatura de cartão. 

IMPORTANTE: Analise cuidadosamente as colunas. A coluna de PARCELAS geralmente é separada do nome do estabelecimento. 
Procure por uma coluna que contenha valores como "2/5", "01/12", "À vista", etc.

Conteúdo do arquivo:
${text.substring(0, 25000)}`
        }
      ],
    }),
  });

  if (!response.ok) {
    console.error('AI extraction failed:', response.status);
    return [];
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  console.log('AI extraction response (first 1000 chars):', content.substring(0, 1000));
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const filtered = parsed.filter((t: any) => t.storeName && t.value > 0);
      console.log(`Extracted ${filtered.length} transactions, ${filtered.filter((t: any) => t.installment).length} with installments`);
      return filtered;
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  
  return [];
}

async function extractTransactionsWithVision(base64: string, mimeType: string, apiKey: string): Promise<Transaction[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Você é um extrator especializado de dados de faturas de cartão de crédito brasileiro.
Analise este documento e extraia TODAS as transações de compras.

ATENÇÃO ESPECIAL PARA PARCELAS:
- Em arquivos Excel/CSV, procure pela COLUNA de parcelas (geralmente coluna D, E ou F)
- A informação de parcela está SEPARADA do nome do estabelecimento
- Formatos comuns: "2/5", "01/03", "02/12", "Parcela 2 de 5", "PARC 02/06"
- Se a coluna mostra "À vista", "1/1" ou está vazia = compra à vista
- Se mostra X/Y onde Y > 1 = compra parcelada

Para cada transação, identifique:
- storeName: nome do estabelecimento/loja (SEM informação de parcela, limpo)
- value: valor em reais (número positivo, valor da parcela individual)
- date: data no formato YYYY-MM-DD
- installment: informação de parcela SE HOUVER (OBRIGATÓRIO formato "X/Y", ex: "2/5")

REGRAS CRÍTICAS:
1. Identifique a coluna específica de parcelas e extraia de lá
2. NÃO inclua informação de parcela no storeName
3. Ignore totais, taxas, juros e encargos
4. Se o ano não estiver presente, use 2025
5. Para compras À VISTA, NÃO inclua o campo installment

Responda APENAS com um JSON array:
Parcelado: [{"storeName": "Nome Loja", "value": 123.45, "date": "2025-01-15", "installment": "2/5"}]
À vista: [{"storeName": "Nome Loja", "value": 50.00, "date": "2025-01-15"}]

Se não conseguir ler ou não houver transações, retorne: []`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI vision extraction failed:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  console.log('AI vision extraction response (first 1000 chars):', content.substring(0, 1000));
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const filtered = parsed.filter((t: any) => t.storeName && t.value > 0);
      console.log(`Vision extracted ${filtered.length} transactions, ${filtered.filter((t: any) => t.installment).length} with installments`);
      return filtered;
    }
  } catch (e) {
    console.error('Failed to parse AI vision response:', e, content);
  }
  
  return [];
}

async function categorizeTransactions(transactions: Transaction[], apiKey: string): Promise<any[]> {
  const categoryList = CATEGORIES.map(c => `- ${c.id}: ${c.name}`).join('\n');
  const transactionList = transactions.map((t, i) => 
    `${i + 1}. "${t.storeName}" - R$ ${t.value.toFixed(2)}`
  ).join('\n');

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Categorize transações de cartão de crédito brasileiro.

Categorias disponíveis:
${categoryList}

Regras de categorização:
1. Supermercados, mercados, padarias, açougues = food
2. Postos de gasolina, estacionamentos, Uber, 99, táxi = transport
3. Farmácias, drogarias, hospitais, clínicas = health
4. Restaurantes, bares, lanchonetes, pizzarias, iFood, Rappi = food
5. Lojas de roupas, calçados, acessórios, shopping = personal
6. Netflix, Spotify, Disney+, Amazon Prime, jogos = streaming
7. Academia, plano de celular, internet = services
8. Lojas de eletrônicos, informática = shopping
9. Livrarias, cursos, escolas, faculdades = education
10. Seguros, assistências = insurance
11. Cinema, teatro, shows, ingressos = leisure
12. Contas de água, luz, gás = home
13. Se não tiver certeza = outros

Responda APENAS com JSON array:
[{"index": 1, "categoryId": "food", "category": "Alimentação", "confidence": "high"}]

confidence: "high" = certeza, "medium" = provável, "low" = incerto`
          },
          {
            role: 'user',
            content: `Categorize as seguintes transações:\n${transactionList}`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Categorization failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return transactions.map((t, index) => {
        const suggestion = suggestions.find((s: any) => s.index === index + 1);
        return {
          ...t,
          suggestedCategoryId: suggestion?.categoryId || 'outros',
          suggestedCategory: suggestion?.category || 'Não atribuído',
          confidence: suggestion?.confidence || 'low'
        };
      });
    }
  } catch (e) {
    console.error('Categorization error:', e);
  }

  return transactions.map(t => ({
    ...t,
    suggestedCategoryId: 'outros',
    suggestedCategory: 'Não atribuído',
    confidence: 'low'
  }));
}
