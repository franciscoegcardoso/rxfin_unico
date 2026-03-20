import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileSettingsProfile {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  plan_slug?: string | null;
  plan_name?: string | null;
  plan_expires_at?: string | null;
  theme_preference?: string | null;
  finance_mode?: string | null;
  marketing_opt_in?: boolean | null;
  last_login_at?: string | null;
  /** From onboarding_state (JOIN in get_user_profile_settings) */
  onboarding_completed?: boolean | null;
  onboarding_phase?: string | null;
}

export interface ProfileSettingsPlan {
  name?: string;
  price_monthly?: number;
  features?: string[] | null;
}

export interface ProfileSettingsNotificationPrefs {
  notify_due_dates?: boolean | null;
  notify_weekly_summary?: boolean | null;
  notify_news?: boolean | null;
  push_notifications_enabled?: boolean | null;
}

export interface ProfileSettingsStats {
  total_lancamentos?: number | null;
  total_vehicles?: number | null;
  total_goals?: number | null;
  total_assets?: number | null;
  member_since_days?: number | null;
}

export interface ProfileSettingsData {
  profile?: ProfileSettingsProfile | null;
  plan?: ProfileSettingsPlan | null;
  roles?: string[] | null;
  workspace?: unknown;
  connections_count?: number | null;
  notification_prefs?: ProfileSettingsNotificationPrefs | null;
  stats?: ProfileSettingsStats | null;
}

export function useProfileSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile-settings', user?.id],
    queryFn: async (): Promise<ProfileSettingsData | null> => {
      const { data, error } = await supabase.rpc('get_user_profile_settings');
      if (error) throw error;
      return (data as ProfileSettingsData) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000,
  });
}
