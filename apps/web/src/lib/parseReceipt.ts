import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

export interface ParseReceiptBody {
  imageBase64: string;
  mode?: 'bill';
}

export interface ParseReceiptResponse {
  success: boolean;
  data?: Record<string, unknown>;
  items?: Array<{ description?: string; qty?: number; unitPrice?: number }>;
  error?: string;
}

/**
 * Chama a Edge Function parse-receipt com o JWT do usuário garantido no header.
 * Evita 401 em mobile (iOS Safari) onde o SDK às vezes envia apenas anon key.
 */
export async function parseReceiptWithAuth(
  body: ParseReceiptBody
): Promise<{ data: ParseReceiptResponse | null; error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { data: null, error: new Error('Não autenticado. Faça login novamente.') };
  }

  const functionName = body.mode === 'bill' ? 'parse-receipt-items' : 'parse-receipt';
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${functionName}`;
  const token = String(session.access_token).trim();
  const apikey = String(SUPABASE_ANON_KEY ?? '').trim();
  if (!url.startsWith('http') || !apikey) {
    return { data: null, error: new Error('Configuração inválida.') };
  }

  const requestBody = body.mode === 'bill' ? { imageBase64: body.imageBase64 } : body;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': apikey,
      },
      body: JSON.stringify(requestBody),
    });

    const json = (await res.json()) as ParseReceiptResponse & { message?: string };
    if (!res.ok) {
      const msg = json?.error || json?.message || `Erro ${res.status}`;
      return { data: null, error: new Error(msg) };
    }
    return { data: json, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Erro ao processar comprovante'),
    };
  }
}
