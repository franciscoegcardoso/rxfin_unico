import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NotificationPreferences {
  notify_due_dates: boolean;
  notify_weekly_summary: boolean;
  notify_news: boolean;
}

const DEFAULTS: NotificationPreferences = {
  notify_due_dates: false,
  notify_weekly_summary: false,
  notify_news: false,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULTS;
      const { data, error } = await supabase
        .from('profiles')
        .select('notify_due_dates, notify_weekly_summary, notify_news')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching notification preferences:', error);
        return DEFAULTS;
      }
      return {
        notify_due_dates: (data as any)?.notify_due_dates ?? false,
        notify_weekly_summary: (data as any)?.notify_weekly_summary ?? false,
        notify_news: (data as any)?.notify_news ?? false,
      } as NotificationPreferences;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreference = useMutation({
    mutationFn: async ({ key, value }: { key: keyof NotificationPreferences; value: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value } as any)
        .eq('id', user.id);
      if (error) throw error;
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences', user?.id] });
      const previous = queryClient.getQueryData<NotificationPreferences>(['notification-preferences', user?.id]);
      queryClient.setQueryData(['notification-preferences', user?.id], (old: NotificationPreferences | undefined) => ({
        ...(old || DEFAULTS),
        [key]: value,
      }));
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notification-preferences', user?.id], context.previous);
      }
      console.error('Error updating notification preference:', error);
      toast.error('Erro ao salvar preferência');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
    },
  });

  return {
    preferences: preferences || DEFAULTS,
    isLoading,
    updatePreference: updatePreference.mutate,
    isSaving: updatePreference.isPending,
  };
}
// sync
