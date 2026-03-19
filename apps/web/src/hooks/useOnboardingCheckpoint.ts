import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type OnboardingCheckpoint = {
  onboarding_phase: string | null;
  onboarding_completed: boolean;
  onboarding_control_phase: string | null;
  onboarding_control_done: boolean;
  current_step: number;
  open_finance_connected: boolean;
  ir_import_status: string;
  abandoned_at: string | null;
};

type OnboardingPhase = 'not_started' | 'started' | 'block_a_done' | 'block_b_done' | 'block_c_done' | 'completed';
type ControlPhase =
  | 'not_started'
  | 'started'
  | 'planejamento_done'
  | 'fluxo_done'
  | 'cartao_done'
  | 'metas_done'
  | 'patrimonio_done'
  | 'completed';

const LEVEL_MAP: Record<string, number> = {
  not_started: 0,
  started: 0,
  block_a_done: 1,
  block_b_done: 2,
  block_c_done: 3,
  completed: 4,
};

const DEFAULT_CHECKPOINT: OnboardingCheckpoint = {
  onboarding_phase: 'not_started',
  onboarding_completed: false,
  onboarding_control_phase: 'not_started',
  onboarding_control_done: false,
  current_step: 0,
  open_finance_connected: false,
  ir_import_status: '',
  abandoned_at: null,
};

function normalizeRow(row: Record<string, unknown> | null): OnboardingCheckpoint {
  if (!row) return { ...DEFAULT_CHECKPOINT };
  return {
    onboarding_phase: (row.onboarding_phase as string) ?? 'not_started',
    onboarding_completed: Boolean(row.onboarding_completed),
    onboarding_control_phase: (row.onboarding_control_phase as string) ?? 'not_started',
    onboarding_control_done: Boolean(row.onboarding_control_done),
    current_step: Number(row.current_step ?? 0),
    open_finance_connected: Boolean(row.open_finance_connected),
    ir_import_status: String(row.ir_import_status ?? ''),
    abandoned_at: (row.abandoned_at as string) ?? null,
  };
}

export function useOnboardingCheckpoint() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['onboarding-checkpoint', user?.id],
    queryFn: async (): Promise<OnboardingCheckpoint> => {
      if (!user?.id) return { ...DEFAULT_CHECKPOINT };

      const { data: stateData, error } = await supabase
        .from('onboarding_state' as never)
        .select(
          `
          onboarding_phase,
          onboarding_completed,
          onboarding_control_phase,
          onboarding_control_done,
          current_step,
          open_finance_connected,
          ir_import_status,
          abandoned_at
        `
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useOnboardingCheckpoint] onboarding_state:', error);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('onboarding_phase, onboarding_completed, onboarding_control_phase, onboarding_control_done')
          .eq('id', user.id)
          .maybeSingle();
        const p = profileData as Record<string, unknown> | null;
        if (p) {
          return normalizeRow({
            ...p,
            current_step: 0,
            open_finance_connected: false,
            ir_import_status: '',
            abandoned_at: null,
          });
        }
        return { ...DEFAULT_CHECKPOINT };
      }

      return normalizeRow(stateData as Record<string, unknown> | null);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`onboarding-checkpoint-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding_state',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoint', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['onboarding-phase', user.id] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const checkpoint = data ?? DEFAULT_CHECKPOINT;
  const currentPhase: OnboardingPhase = (checkpoint.onboarding_phase as OnboardingPhase) ?? 'not_started';
  const currentControlPhase: ControlPhase = (checkpoint.onboarding_control_phase as ControlPhase) ?? 'not_started';
  const controlDone: boolean = checkpoint.onboarding_control_done ?? false;
  const currentLevel = LEVEL_MAP[currentPhase] ?? 0;

  const advancePhase = useCallback(
    async (newPhase: OnboardingPhase): Promise<boolean> => {
      if (!user?.id) return false;
      const { error } = await supabase.rpc('advance_onboarding_phase', { new_phase: newPhase });
      if (error) {
        console.error('[advancePhase] Failed:', error);
        if (newPhase !== 'started') {
          toast.error('Erro ao avançar etapa');
        }
        return false;
      }
      queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoint', user.id] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-phase', user.id] });
      queryClient.invalidateQueries({ queryKey: ['profile-onboarding-status', user.id] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      return true;
    },
    [user?.id, queryClient]
  );

  const advanceControlPhase = useCallback(
    async (newPhase: ControlPhase) => {
      if (!user?.id) return;
      const { error } = await supabase.rpc('advance_onboarding_control_phase', { new_phase: newPhase });
      if (error) {
        console.error('[advanceControlPhase] Failed:', error);
      }
      queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoint', user.id] });
    },
    [user?.id, queryClient]
  );

  const getMilestone = useCallback(
    async (rpcName: string) => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc(rpcName as never, { p_user_id: user.id } as never);
      if (error) {
        console.error(`[getMilestone] ${rpcName} failed:`, error);
        return null;
      }
      return data;
    },
    [user?.id]
  );

  const registerEvent = useCallback(async (eventType: string, metadata?: Record<string, unknown>) => {
    if (!user?.id) return;
    await supabase.from('ai_onboarding_events').insert({
      user_id: user.id,
      event_type: eventType,
      metadata: metadata ?? null,
    });
  }, [user?.id]);

  return {
    checkpoint,
    currentPhase,
    currentControlPhase,
    controlDone,
    currentLevel,
    isLoading: isPending,
    advancePhase,
    advanceControlPhase,
    getMilestone,
    registerEvent,
  };
}
