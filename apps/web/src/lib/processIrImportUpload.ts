import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

/** Corpo JSON típico da Edge Function `process-ir-import` (multipart ou legado). */
export interface ProcessIrImportResponse {
  success?: boolean;
  error?: string;
  message?: string;
  savedId?: string;
  data?: {
    anoExercicio?: number;
    anoCalendario?: number;
    bensDireitos?: unknown[];
    rendimentosTributaveis?: unknown[];
    rendimentosIsentos?: unknown[];
    dividas?: unknown[];
  };
  fileName?: string;
  filePath?: string;
}

/**
 * Envia o arquivo como multipart/form-data para a Edge Function `process-ir-import` (v140+).
 * - Campo no FormData DEVE ser `"file"` (a função lê formData.get('file')).
 * - NÃO setar Content-Type: o browser define automaticamente com o boundary correto.
 * Evita limite de payload JSON com base64 em PDFs grandes (~6MB+).
 */
export async function uploadIRFileMultipart(
  file: File
): Promise<{ data: ProcessIrImportResponse | null; error: Error | null }> {
  // eslint-disable-next-line no-console -- temporary log for IR upload flow verification
  console.log('[IR Import] uploadIRFileMultipart called, file:', file.name, 'size:', file.size);
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token?.trim()) {
    return { data: null, error: new Error('Sessão inválida') };
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  const baseUrl = String(SUPABASE_URL).replace(/\/$/, '');
  const url = `${baseUrl}/functions/v1/process-ir-import`;
  // eslint-disable-next-line no-console -- temporary log for IR upload flow verification
  console.log('[IR Import] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  let json: ProcessIrImportResponse;
  try {
    const text = await res.text();
    if (!text?.trim()) {
      return {
        data: null,
        error: new Error(
          res.status >= 500
            ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
            : `HTTP ${res.status}`
        ),
      };
    }
    json = JSON.parse(text) as ProcessIrImportResponse;
  } catch {
    return { data: null, error: new Error(`HTTP ${res.status}: resposta inválida`) };
  }

  if (!res.ok) {
    const msg =
      typeof json.error === 'string' && json.error.trim()
        ? json.error.trim()
        : `HTTP ${res.status}`;
    return { data: null, error: new Error(msg) };
  }

  if (json.success === false) {
    return {
      data: null,
      error: new Error(typeof json.error === 'string' ? json.error : 'Erro desconhecido'),
    };
  }

  return { data: json, error: null };
}
