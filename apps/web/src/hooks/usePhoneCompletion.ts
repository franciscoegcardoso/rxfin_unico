import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that checks if the current user needs to complete their phone number.
 * Returns whether the phone completion dialog should be shown.
 */
export function usePhoneCompletion() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['phone-completion-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('phone, full_name, email')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking phone completion:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const needsPhone = !!user && !isLoading && profile && (!profile.phone || profile.phone.trim() === '');

  return {
    needsPhone,
    isLoading,
    currentName: profile?.full_name,
    currentEmail: profile?.email,
  };
}
// sync
