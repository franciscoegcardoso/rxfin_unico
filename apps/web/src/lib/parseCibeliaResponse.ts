import type { CibeliaStructuredResponse } from '@/types/cibelia';

/**
 * Tenta fazer parse do conteúdo retornado pela Edge Function ai-chat.
 * Se o conteúdo for JSON estruturado válido, retorna o objeto parseado.
 * Se for texto puro ou JSON inválido, retorna envelope de fallback.
 */
export function parseCibeliaResponse(
  content: string,
  structured: boolean
): CibeliaStructuredResponse {
  if (!structured) {
    try {
      const parsed = JSON.parse(content) as CibeliaStructuredResponse;
      if (parsed._fallback) return parsed;
    } catch {
      // ignora
    }
    return {
      greeting: null,
      data: null,
      analysis: content,
      nextSteps: null,
      cta: null,
      _fallback: true,
    };
  }

  try {
    const cleaned = content.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as CibeliaStructuredResponse;
    if (
      parsed.analysis !== undefined ||
      parsed.data !== undefined ||
      parsed.greeting !== undefined
    ) {
      return parsed;
    }
  } catch {
    // JSON inválido — fallback
  }

  return {
    greeting: null,
    data: null,
    analysis: content,
    nextSteps: null,
    cta: null,
    _fallback: true,
  };
}
