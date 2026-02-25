import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import type { Page } from './usePages';

interface UserProfile {
  full_name: string | null;
  phone: string | null;
}

interface SimulatorAccess {
  simulator: Page | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  hasAccess: boolean;
  isInactive: boolean;
  needsProfileCompletion: boolean;
  subscriptionRole: string;
  isImpersonating: boolean;
}

export function useSimulatorBySlug(slug: string): SimulatorAccess {
  const { user } = useAuth();
  const { impersonatedRole, isImpersonating } = useImpersonation();

  // Fetch simulator by slug
  const { 
    data: simulator, 
    isLoading: simulatorLoading, 
    error: simulatorError 
  } = useQuery({
    queryKey: ['simulator-by-slug', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Page | null;
    },
    enabled: !!slug,
  });

  // Fetch user profile (name + phone only)
  const { 
    data: profile, 
    isLoading: profileLoading 
  } = useQuery({
    queryKey: ['user-profile-full', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  // Derive subscription role from workspace
  const { data: planSlug } = useQuery({
    queryKey: ['user-plan-slug', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'free';
      
      const { data, error } = await supabase
        .from('workspaces')
        .select('plan_expires_at, subscription_plans:plan_id(slug)')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error || !data?.subscription_plans) return 'free';
      
      const isExpired = data.plan_expires_at 
        ? new Date(data.plan_expires_at) < new Date()
        : false;
      
      return isExpired ? 'free' : (data.subscription_plans as any)?.slug || 'free';
    },
    enabled: !!user?.id,
  });

  const isLoading = simulatorLoading || (!!user && profileLoading);
  
  // Get effective subscription role (impersonated or real)
  const subscriptionRole = isImpersonating && impersonatedRole 
    ? impersonatedRole 
    : (planSlug || 'free');
  
  const isAdmin = subscriptionRole === 'admin';
  
  const isInactive = simulator 
    ? (isAdmin ? !simulator.is_active_admin : !simulator.is_active_users)
    : false;
  
  const needsProfileCompletion = !!user && (!profile?.full_name || !profile?.phone);

  const hasAccess = (() => {
    if (!simulator) return false;
    if (isInactive) return false;
    
    const accessLevel = simulator.access_level;
    if (accessLevel === 'public') return true;
    if (!user) return false;
    if (accessLevel === 'free') return true;
    if (subscriptionRole === 'pro' || subscriptionRole === 'premium' || subscriptionRole === 'admin') {
      return true;
    }
    if (accessLevel === 'premium' || accessLevel === 'admin') {
      return false;
    }
    return true;
  })();

  return {
    simulator,
    profile,
    isLoading,
    error: simulatorError as Error | null,
    hasAccess,
    isInactive,
    needsProfileCompletion,
    subscriptionRole,
    isImpersonating,
  };
}
