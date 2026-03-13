import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';
import { useStartRaioXContext } from '@/contexts/StartRaioXContext';
import { supabase } from '@/integrations/supabase/client';

export const RAIOX_ONBOARDING_PATH = '/onboarding-raio-x';

export type StartRaioXSource = 'banner' | 'cta_card' | 'welcome_modal';

export interface UseStartRaioXOptions {
  /** Se definido, em vez de navegar imediatamente, chama este callback (ex.: abrir modal de transição). A navegação fica a cargo do modal. */
  onShowTransitionModal?: () => void;
}

function useStartRaioXInternal(options: UseStartRaioXOptions = {}) {
  const navigate = useNavigate();
  const { advancePhase } = useOnboardingCheckpoint();
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false);
  const { onShowTransitionModal } = options;

  const handleStartRaioX = useCallback(
    async (source: StartRaioXSource) => {
      setIsStartingOnboarding(true);
      try {
        const ok = await advancePhase('started');
        if (!ok) {
          console.warn('[useStartRaioX] advance_onboarding_phase retornou false');
        }

        await supabase.rpc('track_onboarding_event', {
          p_event_name: 'onboarding_initiated',
          p_step: 0,
          p_metadata: { source },
        });

        if (onShowTransitionModal) {
          onShowTransitionModal();
        } else {
          navigate(RAIOX_ONBOARDING_PATH);
        }
      } catch (err) {
        console.error('[useStartRaioX] Erro ao iniciar onboarding:', err);
        if (onShowTransitionModal) {
          onShowTransitionModal();
        } else {
          navigate(RAIOX_ONBOARDING_PATH);
        }
      } finally {
        setIsStartingOnboarding(false);
      }
    },
    [navigate, advancePhase, onShowTransitionModal]
  );

  return { handleStartRaioX, isStartingOnboarding, raioxPath: RAIOX_ONBOARDING_PATH };
}

/**
 * Hook unificado para o CTA "Começar meu Raio-X". Quando usado com onShowTransitionModal (ex.: no AppLayout),
 * retorna o handler que abre o modal de transição; quando usado sem options dentro do Provider, usa o valor do contexto.
 */
export function useStartRaioX(options?: UseStartRaioXOptions) {
  const context = useStartRaioXContext();
  const hasProviderOptions = options?.onShowTransitionModal != null;
  const internal = useStartRaioXInternal(hasProviderOptions ? options! : {});

  if (hasProviderOptions) return internal;
  if (context) return context;
  return internal;
}
