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

async function loadDraftFromRpc(): Promise<Record<string, unknown>> {
  try {
    const { data, error } = await supabase.rpc('get_onboarding_draft' as never);
    if (error) return {};
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
  } catch {
    /* RPC pode não existir em ambientes antigos */
  }
  return {};
}

/**
 * Persists onboarding draft to user_kv_store + save_onboarding_draft RPC (server).
 */
export function useOnboardingDraft() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDraft = useCallback(async (): Promise<OnboardingDraft> => {
    if (!user?.id) return EMPTY_DRAFT;

    const [kvResult, rpcPayload] = await Promise.all([
      supabase.from('user_kv_store').select('value').eq('user_id', user.id).eq('key', DRAFT_KEY).maybeSingle(),
      loadDraftFromRpc(),
    ]);

    const base = (kvResult.data?.value as unknown as OnboardingDraft) ?? EMPTY_DRAFT;
    const mergedData =
      Object.keys(rpcPayload).length > 0 ? { ...base.data, ...rpcPayload } : base.data;

    return {
      ...base,
      data: mergedData,
    };
  }, [user?.id]);

  const persistDraft = useCallback(async (draft: OnboardingDraft) => {
    if (!user?.id) return;
    await (supabase as any)
      .from('user_kv_store')
      .upsert({ user_id: user.id, key: DRAFT_KEY, value: draft as any }, { onConflict: 'user_id,key' });
  }, [user?.id]);

  const saveDraft = useCallback(
    (stepKey: string, stepData: any) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`rxfin-draft-${stepKey}`, JSON.stringify(stepData));
        } catch {
          /* ignore */
        }
      }

      void supabase
        .rpc('save_onboarding_draft' as never, { p_key: stepKey, p_value: stepData as never } as never)
        .catch((err) => console.warn('[onboarding draft RPC]', err));

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
    },
    [getDraft, persistDraft]
  );

  const markFlushed = useCallback(
    async (id: string) => {
      const current = await getDraft();
      if (current.flushedIds.includes(id)) return;
      const updated: OnboardingDraft = {
        ...current,
        flushedIds: [...current.flushedIds, id],
        updatedAt: new Date().toISOString(),
      };
      await persistDraft(updated);
    },
    [getDraft, persistDraft]
  );

  const clearDraft = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from('user_kv_store').delete().eq('user_id', user.id).eq('key', DRAFT_KEY);
    void supabase.rpc('clear_onboarding_draft' as never).catch((e) => console.warn('[clear_onboarding_draft]', e));
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('rxfin-draft-'));
      keys.forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem('rxfin-onboarding-draft');
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  return { getDraft, saveDraft, markFlushed, clearDraft };
}
