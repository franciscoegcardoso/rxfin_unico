import { useMemo } from 'react';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { getModelForPlan, type AIModelConfig } from '@/lib/ai-models';

/**
 * Hook que retorna o modelo de IA correto baseado no plano do usuário.
 */
export function useAIModel(): { model: AIModelConfig; loading: boolean } {
  const { planSlug, loading } = usePlanAccess();

  const model = useMemo(
    () => getModelForPlan(planSlug ?? 'free'),
    [planSlug],
  );

  return { model, loading };
}
// sync
