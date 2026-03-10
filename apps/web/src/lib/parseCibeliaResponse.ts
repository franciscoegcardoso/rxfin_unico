import type {
  CibeliaStructuredResponse,
  CibeliaDataItem,
  CibeliaNextStep,
} from '@/types/cibelia';

/**
 * Extrai JSON de uma string (markdown, texto com JSON embutido, etc.).
 */
function extractJson(raw: string): unknown | null {
  const stripped = raw.replace(/```json\n?|```/g, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Cenário D: JSON embutido no meio do texto
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // ignora
      }
    }
  }
  return null;
}

/**
 * Normaliza o campo "data" (Cenário E: objeto → array; Cenário G: value number → string).
 */
function normalizeData(raw: unknown): CibeliaDataItem[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw.map((item: Record<string, unknown>) => ({
      label: String(item.label ?? ''),
      value: normalizeDataValue(item.value),
      highlight: Boolean(item.highlight ?? false),
    }));
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw as Record<string, unknown>).map(([label, value]) => ({
      label,
      value: normalizeDataValue(value),
      highlight: false,
    }));
  }
  return null;
}

/**
 * Converte value para string; se for número, formata como R$ quando parecer monetário (Cenário G).
 */
function normalizeDataValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 999_999_999
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
      : String(value);
  }
  return String(value);
}

/**
 * Normaliza "nextSteps" (Cenário F: array de strings → { icon: 'check-circle', text }).
 */
function normalizeNextSteps(raw: unknown): CibeliaNextStep[] | null {
  if (raw == null || !Array.isArray(raw)) return null;
  return raw
    .map((item: unknown) => {
      if (typeof item === 'string') {
        return { icon: 'check-circle', text: item };
      }
      if (item != null && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const text = String(o.text ?? o.label ?? o.action ?? '');
        if (text.length === 0) return null;
        return {
          icon: String(o.icon ?? 'check-circle'),
          text,
        };
      }
      return null;
    })
    .filter((s): s is CibeliaNextStep => s != null && s.text.length > 0);
}

/**
 * Tenta fazer parse do conteúdo retornado pela Edge Function ai-chat.
 * Cobre: JSON com campos extras (A), campos ausentes (B), markdown ```json (C),
 * JSON embutido no texto (D), data como objeto (E), nextSteps como strings (F), value numérico (G).
 */
export function parseCibeliaResponse(
  content: string,
  structured: boolean
): CibeliaStructuredResponse {
  const parsed = extractJson(content);

  if (!parsed || typeof parsed !== 'object') {
    return {
      greeting: null,
      data: null,
      analysis: content,
      nextSteps: null,
      cta: null,
      _fallback: true,
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Backend envia _fallback: true quando structured === false
  if (structured === false && obj._fallback === true) {
    return {
      greeting: typeof obj.greeting === 'string' ? obj.greeting : null,
      data: normalizeData(obj.data),
      analysis: typeof obj.analysis === 'string' ? obj.analysis : content,
      nextSteps: normalizeNextSteps(obj.nextSteps),
      cta: typeof obj.cta === 'string' ? obj.cta : null,
      _fallback: true,
    };
  }

  // Valida que tem ao menos um campo relevante
  if (
    obj.greeting == null &&
    obj.data == null &&
    obj.analysis == null &&
    obj.nextSteps == null &&
    obj.cta == null
  ) {
    return {
      greeting: null,
      data: null,
      analysis: content,
      nextSteps: null,
      cta: null,
      _fallback: true,
    };
  }

  return {
    greeting: typeof obj.greeting === 'string' ? obj.greeting : null,
    data: normalizeData(obj.data),
    analysis: typeof obj.analysis === 'string' ? obj.analysis : null,
    nextSteps: normalizeNextSteps(obj.nextSteps),
    cta: typeof obj.cta === 'string' ? obj.cta : null,
    _fallback: Boolean(obj._fallback),
  };
}
