import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type OnboardingPersona = 'dividas' | 'patrimonio' | 'dia_a_dia' | 'ir';
export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type IRImportStatus = 'not_started' | 'skipped' | 'processing' | 'completed' | 'error';

interface OnboardingV2Slice {
  persona: OnboardingPersona | null;
  currentStep: OnboardingStep;
  stepsCompleted: OnboardingStep[];
  irImportStatus: IRImportStatus;
  openFinanceConnected: boolean;
  checklistScore: number;
  onboardingCompleted: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface OnboardingV2Actions {
  loadState: () => Promise<void>;
  setPersona: (persona: OnboardingPersona) => Promise<void>;
  advanceStep: (step: OnboardingStep, metadata?: Record<string, unknown>) => Promise<{ nextStep: OnboardingStep }>;
  goToStep: (step: OnboardingStep) => void;
  markAbandoned: (step: OnboardingStep) => Promise<void>;
  setOpenFinanceConnected: (v: boolean) => Promise<void>;
  setIRImportStatus: (status: IRImportStatus) => Promise<void>;
  updateChecklistScore: (score: number) => Promise<void>;
  reset: () => void;
}

const initialState: OnboardingV2Slice = {
  persona: null,
  currentStep: 0,
  stepsCompleted: [],
  irImportStatus: 'not_started',
  openFinanceConnected: false,
  checklistScore: 0,
  onboardingCompleted: false,
  isLoading: false,
  isSaving: false,
  error: null,
};

export type OnboardingV2State = OnboardingV2Slice & OnboardingV2Actions;

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const useOnboardingV2Store = create<OnboardingV2State>((set, get) => ({
  ...initialState,

  loadState: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getUserId();
      if (!userId) {
        set({ ...initialState, isLoading: false });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onboarding_state may not be in generated types yet
      const { data, error: err } = await (supabase as any)
        .from('onboarding_state')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (err) {
        set({ error: err.message, isLoading: false });
        return;
      }

      const row = data as Record<string, unknown> | null;
      if (!row) {
        set({ ...initialState, isLoading: false });
        return;
      }

      set({
        persona: (row.persona as OnboardingPersona) ?? null,
        currentStep: Math.min(6, Math.max(0, Number(row.current_step) ?? 0)) as OnboardingStep,
        stepsCompleted: Array.isArray(row.steps_completed) ? (row.steps_completed as number[]).filter((s) => s >= 0 && s <= 6) as OnboardingStep[] : [],
        irImportStatus: (row.ir_import_status as IRImportStatus) ?? 'not_started',
        openFinanceConnected: Boolean(row.open_finance_connected),
        checklistScore: Number(row.checklist_score) ?? 0,
        onboardingCompleted: Boolean(row.onboarding_completed),
        isLoading: false,
        error: null,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erro ao carregar', isLoading: false });
    }
  },

  setPersona: async (persona) => {
    const userId = await getUserId();
    if (!userId) return;
    set({ isSaving: true, error: null });
    try {
      const { error: err } = await supabase.rpc('set_onboarding_persona', { p_persona: persona });
      if (err) throw err;
      set({ persona, isSaving: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erro ao salvar', isSaving: false });
    }
  },

  advanceStep: async (step, metadata) => {
    const userId = await getUserId();
    if (!userId) return { nextStep: step };
    const { currentStep, stepsCompleted } = get();
    const nextStep = Math.min(6, step + 1) as OnboardingStep;
    const newCompleted = stepsCompleted.includes(step) ? stepsCompleted : [...stepsCompleted, step].sort((a, b) => a - b);

    set({
      currentStep: nextStep,
      stepsCompleted: newCompleted,
      onboardingCompleted: nextStep === 6 && newCompleted.includes(6),
      isSaving: true,
      error: null,
    });

    try {
      const { error: err } = await supabase.rpc('advance_onboarding_step', {
        p_step_completed: step,
        p_metadata: metadata ?? {},
      });
      if (err) throw err;
      set({ isSaving: false });
      return { nextStep };
    } catch (e) {
      set({
        currentStep,
        stepsCompleted,
        isSaving: false,
        error: e instanceof Error ? e.message : 'Erro ao avançar',
      });
      return { nextStep: currentStep };
    }
  },

  goToStep: (step) => {
    const { stepsCompleted } = get();
    const allowed = step === 0 || stepsCompleted.includes(step);
    if (allowed) set({ currentStep: step });
  },

  markAbandoned: async (step) => {
    const userId = await getUserId();
    if (!userId) return;
    try {
      await supabase.rpc('mark_onboarding_abandoned', { p_step: step });
    } catch {
      // best-effort
    }
  },

  setOpenFinanceConnected: async (v) => {
    const userId = await getUserId();
    if (!userId) return;
    set({ isSaving: true, error: null });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onboarding_state may not be in generated types yet
      const { error: err } = await (supabase as any)
        .from('onboarding_state')
        .update({ open_finance_connected: v })
        .eq('user_id', userId);
      if (err) throw err;
      set({ openFinanceConnected: v, isSaving: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erro ao salvar', isSaving: false });
    }
  },

  setIRImportStatus: async (status) => {
    const userId = await getUserId();
    if (!userId) return;
    set({ isSaving: true, error: null });
    try {
      const { error: err } = await supabase
        .from('onboarding_state' as any)
        .update({ ir_import_status: status })
        .eq('user_id', userId);
      if (err) throw err;
      set({ irImportStatus: status, isSaving: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erro ao salvar', isSaving: false });
    }
  },

  updateChecklistScore: async (score) => {
    const userId = await getUserId();
    if (!userId) return;
    set({ isSaving: true, error: null });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onboarding_state may not be in generated types yet
      const { error: err } = await (supabase as any)
        .from('onboarding_state')
        .update({ checklist_score: score })
        .eq('user_id', userId);
      if (err) throw err;
      set({ checklistScore: score, isSaving: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erro ao salvar', isSaving: false });
    }
  },

  reset: () => set(initialState),
}));
