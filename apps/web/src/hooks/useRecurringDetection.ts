import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DetectionResult {
  very_high: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export function useRecurringDetection() {
  const { user } = useAuth();
  const [detecting, setDetecting] = useState(false);
  const [lastResult, setLastResult] = useState<DetectionResult | null>(null);

  const detectRecurring = useCallback(async (): Promise<DetectionResult | null> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    setDetecting(true);
    try {
      const { data, error } = await supabase.rpc('detect_recurring_transactions', {
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data as unknown as DetectionResult;
      setLastResult(result);

      if (result.total > 0) {
        toast.success(`${result.total} grupo(s) de recorrência detectado(s)`);
      } else {
        toast.info('Nenhuma nova recorrência detectada');
      }

      return result;
    } catch (err) {
      console.error('Error detecting recurring transactions:', err);
      toast.error('Erro ao detectar recorrências');
      return null;
    } finally {
      setDetecting(false);
    }
  }, [user]);

  return { detectRecurring, detecting, lastResult };
}
// sync
