import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PageAvailability {
  path: string;
  is_active_users: boolean;
}

/**
 * Fetches page availability (is_active_users) for a set of routes.
 * Used to determine which features/modules are available based on admin settings.
 */
export function usePageAvailability(routes: string[]) {
  const { data: pageAvailability, isLoading } = useQuery({
    queryKey: ['page-availability', routes],
    queryFn: async () => {
      if (routes.length === 0) return [];

      const { data, error } = await supabase
        .from('pages')
        .select('path, is_active_users')
        .in('path', routes);

      if (error) {
        console.error('Error fetching page availability:', error);
        return [];
      }

      return (data || []) as PageAvailability[];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const isRouteAvailable = (route: string): boolean => {
    const page = pageAvailability?.find(p => p.path === route);
    // If no page record found, consider it available (not admin-managed)
    if (!page) return true;
    return page.is_active_users;
  };

  return {
    pageAvailability: pageAvailability || [],
    isLoading,
    isRouteAvailable,
  };
}
// sync
