import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';
import { toast } from 'sonner';

type OnboardingPhase = 'not_started' | 'started' | 'block_a_done' | 'block_b_done' | 'block_c_done' | 'completed';
type ControlPhase = 'not_started' | 'started' | 'planejamento_done' | 'fluxo_done' | 'cartao_done' | 'metas_done' | 'patrimonio_done' | 'completed';

const LEVEL_MAP: Record<string, number> = {
  not_started: 0,
  started: 0,
  block_a_done: 1,
  block_b_done: 2,
  block_c_done: 3,
  completed: 4,
};

export function useOnboardingCheckpoint() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['onboarding-checkpoint', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_phase, onboarding_control_done, onboarding_control_phase')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const currentPhase: OnboardingPhase = (data?.onboarding_phase as OnboardingPhase) ?? 'not_started';
  const currentControlPhase: ControlPhase = (data?.onboarding_control_phase as ControlPhase) ?? 'not_started';
  const controlDone: boolean = data?.onboarding_control_done ?? false;
  const currentLevel = LEVEL_MAP[currentPhase] ?? 0;

  const advancePhase = useCallback(async (newPhase: OnboardingPhase): Promise<boolean> => {
    if (!user?.id) return false;
    const { error } = await supabase.rpc('advance_onboarding_phase', { new_phase: newPhase });
    if (error) {
      console.error('[advancePhase] Failed:', error);
      toast.error('Erro ao avançar etapa');
      return false;
    }
    queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoint', user.id] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-phase', user.id] });
    queryClient.invalidateQueries({ queryKey: ['profile-onboarding-status', user.id] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    return true;
  }, [user?.id, queryClient]);

  const advanceControlPhase = useCallback(async (newPhase: ControlPhase) => {
    if (!user?.id) return;
    const updates: Record<string, any> = { onboarding_control_phase: newPhase };
    if (newPhase === 'completed') {
      updates.onboarding_control_done = true;
    }
    await supabase.from('profiles').update(updates).eq('id', user.id);
    queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoint', user.id] });
  }, [user?.id, queryClient]);

  const getMilestone = useCallback(async (rpcName: string) => {
    if (!user?.id) return null;
    const { data, error } = await supabase.rpc(rpcName as any, { p_user_id: user.id });
    if (error) {
      console.error(`[getMilestone] ${rpcName} failed:`, error);
      return null;
    }
    return data;
  }, [user?.id]);

  const registerEvent = useCallback(async (eventType: string, metadata?: Record<string, any>) => {
    if (!user?.id) return;
    await supabase.from('ai_onboarding_events').insert({
      user_id: user.id,
      event_type: eventType,
      metadata: metadata ?? null,
    });
  }, [user?.id]);

  return {
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
