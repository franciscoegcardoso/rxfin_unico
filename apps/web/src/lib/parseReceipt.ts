import { supabase } from '@/integrations/supabase/client';

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
 * Chama a Edge Function parse-receipt ou parse-receipt-items com o usuário autenticado.
 * Usa supabase.functions.invoke para que o cliente anexe automaticamente o JWT válido
 * (evita "invalid JWT" por token em cache expirado ou não enviado).
 */
export async function parseReceiptWithAuth(
  body: ParseReceiptBody
): Promise<{ data: ParseReceiptResponse | null; error: Error | null }> {
  const functionName = body.mode === 'bill' ? 'parse-receipt-items' : 'parse-receipt';
  const requestBody = body.mode === 'bill' ? { imageBase64: body.imageBase64 } : body;

  try {
    const { data: json, error: fnError } = await supabase.functions.invoke(functionName, {
      body: requestBody,
    });

    if (fnError) {
      const msg = typeof fnError.message === 'string' ? fnError.message : 'Erro ao processar comprovante';
      return { data: null, error: new Error(msg) };
    }

    const parsed = json as ParseReceiptResponse & { message?: string } | null;
    if (parsed && !parsed.success) {
      const msg = parsed?.error || parsed?.message || 'Nenhum item encontrado. Tente outra foto.';
      return { data: parsed, error: new Error(msg) };
    }

    return { data: parsed ?? null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Erro ao processar comprovante'),
    };
  }
}
