/**
 * Mapeamento de modelos de IA por plano de assinatura.
 *
 * - Starter / Free: DeepSeek (custo baixo)
 * - Pro: Claude Sonnet 4.5 (previsão abril/2026)
 */

export interface AIModelConfig {
  id: string;
  label: string;
  provider: string;
  planSlugs: string[];
  tokenLimit: number;
  /** Custo estimado por 1M tokens (input) em USD */
  costPer1MInput: number;
  /** Custo estimado por 1M tokens (output) em USD */
  costPer1MOutput: number;
}

export const AI_MODELS: AIModelConfig[] = [
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    label: 'DeepSeek V3 (0324)',
    provider: 'DeepSeek',
    planSlugs: ['free', 'sem_cadastro', 'starter', 'basic'],
    tokenLimit: 8000,
    costPer1MInput: 0.27,
    costPer1MOutput: 1.10,
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    planSlugs: ['pro', 'premium'],
    tokenLimit: 16000,
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
  },
];

const DEFAULT_MODEL = AI_MODELS[0];

/**
 * Retorna o modelo de IA adequado para o plano do usuário.
 */
export function getModelForPlan(planSlug: string): AIModelConfig {
  return (
    AI_MODELS.find((m) => m.planSlugs.includes(planSlug)) ?? DEFAULT_MODEL
  );
}
