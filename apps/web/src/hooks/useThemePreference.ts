import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type ThemeValue = 'light' | 'dark' | 'system';

export function useThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch theme preference from Supabase (coluna theme_preference pode não existir no DB)
  const { data: savedTheme } = useQuery({
    queryKey: ['theme-preference', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', user.id)
        .single();

      if (error) {
        const isMissingColumn =
          error.code === '42703' ||
          (typeof error.message === 'string' && error.message.includes('does not exist'));
        if (!isMissingColumn) {
          console.error('Error fetching theme preference:', error);
        }
        return null;
      }

      return data?.theme_preference as ThemeValue | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Apply saved theme on mount (only if user is logged in and has a preference)
  useEffect(() => {
    if (savedTheme && savedTheme !== theme) {
      setTheme(savedTheme);
    }
  }, [savedTheme, setTheme]); // Removed theme from deps to avoid infinite loop

  // Mutation to save theme preference (ignora erro se coluna theme_preference não existir)
  const saveThemeMutation = useMutation({
    mutationFn: async (newTheme: ThemeValue) => {
      if (!user?.id) {
        return newTheme;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);

      if (error) {
        const isMissingColumn =
          error.code === '42703' ||
          (typeof error.message === 'string' && error.message.includes('does not exist'));
        if (!isMissingColumn) {
          console.error('Error saving theme preference:', error);
          throw error;
        }
      }

      return newTheme;
    },
    onSuccess: (newTheme) => {
      queryClient.setQueryData(['theme-preference', user?.id], newTheme);
    },
  });

  const updateTheme = (newTheme: ThemeValue) => {
    // Update local theme immediately
    setTheme(newTheme);
    
    // Save to Supabase if logged in
    if (user?.id) {
      saveThemeMutation.mutate(newTheme);
    }
  };

  return {
    theme: theme as ThemeValue | undefined,
    resolvedTheme: resolvedTheme as 'light' | 'dark' | undefined,
    setTheme: updateTheme,
    isSaving: saveThemeMutation.isPending,
  };
}
// sync
