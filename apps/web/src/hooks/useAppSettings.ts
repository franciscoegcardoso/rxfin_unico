import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AppSettings {
  coming_soon_fallback_route: string;
  onboarding_enabled: boolean;
  onboarding_type: 'simple' | 'complete';
  first_login_route: string;
  returning_user_route: string;
  onboarding_skip_route: string;
  shared_account_enabled: boolean;
  notifications_enabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  coming_soon_fallback_route: '/inicio',
  onboarding_enabled: true,
  onboarding_type: 'simple',
  first_login_route: '/onboarding2',
  returning_user_route: '/simuladores',
  onboarding_skip_route: '/simuladores',
  shared_account_enabled: false,
  notifications_enabled: false,
};

export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', Object.keys(DEFAULT_SETTINGS));

      if (error) {
        console.error('Error fetching app settings:', error);
        return DEFAULT_SETTINGS;
      }

      const settingsMap: Record<string, string | boolean> = { 
        ...DEFAULT_SETTINGS 
      };
      
      data?.forEach((row) => {
        const key = row.setting_key;
        if (key in DEFAULT_SETTINGS && row.setting_value !== null) {
          try {
            const parsed = JSON.parse(row.setting_value as string);
            const defaultVal = DEFAULT_SETTINGS[key as keyof AppSettings];
            if (typeof defaultVal === 'boolean') {
              settingsMap[key] = parsed === true || parsed === 'true';
            } else {
              settingsMap[key] = parsed;
            }
          } catch {
            settingsMap[key] = row.setting_value as string;
          }
        }
      });

      return settingsMap as unknown as AppSettings;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: keyof AppSettings; value: string | boolean }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: key,
          setting_value: JSON.stringify(value),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
    onError: (error) => {
      console.error('Error updating app setting:', error);
      toast.error('Erro ao salvar configuração');
    },
  });

  const updateMultipleSettings = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      const upserts = Object.entries(updates).map(([key, value]) => ({
        setting_key: key,
        setting_value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('app_settings')
        .upsert(upserts, { onConflict: 'setting_key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Configurações salvas!');
    },
    onError: (error) => {
      console.error('Error updating app settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    updateSetting: updateSetting.mutate,
    updateMultipleSettings: updateMultipleSettings.mutate,
    isUpdating: updateSetting.isPending || updateMultipleSettings.isPending,
  };
}
// sync
