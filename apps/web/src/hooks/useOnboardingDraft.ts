import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const DRAFT_KEY = 'onboarding_draft';
const DEBOUNCE_MS = 2000;

export interface OnboardingDraft {
  currentBlock: string;
  currentStep: number;
  data: Record<string, any>;
  flushedIds: string[];
  updatedAt: string;
}

const EMPTY_DRAFT: OnboardingDraft = {
  currentBlock: 'A',
  currentStep: 0,
  data: {},
  flushedIds: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Persists onboarding draft to user_kv_store with debounce.
 * Supports idempotent flush via flushedIds.
 */
export function useOnboardingDraft() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDraft = useCallback(async (): Promise<OnboardingDraft> => {
    if (!user?.id) return EMPTY_DRAFT;
    const { data } = await supabase
      .from('user_kv_store')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', DRAFT_KEY)
      .maybeSingle();
    return (data?.value as unknown as OnboardingDraft) ?? EMPTY_DRAFT;
  }, [user?.id]);

  const persistDraft = useCallback(async (draft: OnboardingDraft) => {
    if (!user?.id) return;
    await (supabase as any)
      .from('user_kv_store')
      .upsert(
        { user_id: user.id, key: DRAFT_KEY, value: draft as any },
        { onConflict: 'user_id,key' }
      );
  }, [user?.id]);

  const saveDraft = useCallback((stepKey: string, stepData: any) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const current = await getDraft();
      const updated: OnboardingDraft = {
        ...current,
        data: { ...current.data, [stepKey]: stepData },
        updatedAt: new Date().toISOString(),
      };
      await persistDraft(updated);
    }, DEBOUNCE_MS);
  }, [getDraft, persistDraft]);

  const markFlushed = useCallback(async (id: string) => {
    const current = await getDraft();
    if (current.flushedIds.includes(id)) return; // idempotent
    const updated: OnboardingDraft = {
      ...current,
      flushedIds: [...current.flushedIds, id],
      updatedAt: new Date().toISOString(),
    };
    await persistDraft(updated);
  }, [getDraft, persistDraft]);

  const clearDraft = useCallback(async () => {
    if (!user?.id) return;
    await supabase
      .from('user_kv_store')
      .delete()
      .eq('user_id', user.id)
      .eq('key', DRAFT_KEY);
  }, [user?.id]);

  return { getDraft, saveDraft, markFlushed, clearDraft };
}
