import { useDemoMode } from './useDemoMode';
import { toast } from 'sonner';

/**
 * Guards mutations when in demo mode.
 * Wraps any action and blocks it with a toast if demo is active.
 */
export function useDemoGuard() {
  const { isDemoMode } = useDemoMode();

  const guardMutation = <T extends (...args: any[]) => any>(action: T) => {
    return ((...args: Parameters<T>) => {
      if (isDemoMode) {
        toast.error('Você está no modo demonstração. Complete o Raio-X para editar seus dados reais.', {
          action: {
            label: 'Começar Raio-X',
            onClick: () => window.location.assign('/onboarding'),
          },
        });
        return undefined as ReturnType<T>;
      }
      return action(...args);
    }) as T;
  };

  return { isDemoMode, guardMutation };
}
