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
 * Atualiza a sessão antes da chamada para evitar 401 por token expirado.
 */
export async function parseReceiptWithAuth(
  body: ParseReceiptBody
): Promise<{ data: ParseReceiptResponse | null; error: Error | null }> {
  const functionName = body.mode === 'bill' ? 'parse-receipt-items' : 'parse-receipt';
  const requestBody = body.mode === 'bill' ? { imageBase64: body.imageBase64 } : body;

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError || !sessionData.session) {
      return {
        data: null,
        error: new Error('Sessão expirada. Faça login novamente.'),
      };
    }

    const { data: json, error: fnError } = await supabase.functions.invoke(functionName, {
      body: requestBody,
    });

    if (fnError) {
      const raw = typeof fnError.message === 'string' ? fnError.message : '';
      const is401 = raw.includes('401') || (fnError as { context?: { status?: number } }).context?.status === 401;
      const msg = is401
        ? 'Não autorizado. Faça login novamente e tente de novo.'
        : (raw || 'Erro ao processar comprovante.');
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
