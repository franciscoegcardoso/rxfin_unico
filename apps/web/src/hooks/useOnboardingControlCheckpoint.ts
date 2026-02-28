import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback } from 'react';

type ControlPhase = 'not_started' | 'started' | 'planejamento_done' | 'fluxo_done' | 'cartao_done' | 'metas_done' | 'patrimonio_done' | 'completed';

export function useOnboardingControlCheckpoint() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const advanceControlPhase = useCallback(async (newPhase: ControlPhase): Promise<boolean> => {
    if (!user?.id) return false;
    const { error } = await supabase.rpc('advance_onboarding_control_phase', { new_phase: newPhase });
    if (error) {
      console.error('Failed to advance control phase:', error);
      toast.error('Erro ao avançar etapa');
      return false;
    }
    queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoint'] });
    queryClient.invalidateQueries({ queryKey: ['profile-onboarding-status'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    return true;
  }, [user?.id, queryClient]);

  const logControlEvent = useCallback(async (eventType: string) => {
    if (!user?.id) return;
    await supabase.from('ai_onboarding_events').insert({
      user_id: user.id,
      event_type: eventType,
      metadata: { timestamp: new Date().toISOString() } as any,
    });
  }, [user?.id]);

  return { advanceControlPhase, logControlEvent };
}
