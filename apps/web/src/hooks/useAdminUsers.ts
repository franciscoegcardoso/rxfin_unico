import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminAudit } from './useAdminAudit';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  plan_slug: string; // derived from workspace → subscription_plans
  plan_name: string;
  is_active: boolean;
  last_login_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  is_admin?: boolean;
  user_type: 'principal' | 'convidado';
  principal_user_id: string | null;
  invitation_status: 'pending' | 'active';
  // For display purposes - loaded separately
  principal_user_name?: string | null;
  guests?: UserProfile[];
  guest_count?: number;
  onboarding_phase?: string;
}

export type UserProfileUpdate = Partial<Pick<UserProfile, 
  'full_name' | 'email' | 'phone' | 'is_active' | 'admin_notes' | 'user_type' | 'principal_user_id'
>>;

export interface UserFilters {
  search?: string;
  subscriptionRole?: string;
  isActive?: 'all' | 'active' | 'inactive';
  isAdmin?: 'all' | 'admin' | 'user';
  lastAccessPeriod?: 'all' | 'today' | 'week' | 'month' | 'never';
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

function getDateFromPeriod(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export function useAdminUsers(
  filters: UserFilters = {},
  pagination: PaginationState = { page: 1, pageSize: 20 }
) {
  const queryClient = useQueryClient();
  const { logAction } = useAdminAudit();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users', filters, pagination],
    staleTime: 0, // Always fetch fresh data from database
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // First, get the list of admin user IDs
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Search filter
      if (filters.search?.trim()) {
        const search = `%${filters.search.trim()}%`;
        query = query.or(`full_name.ilike.${search},email.ilike.${search}`);
      }

      // Subscription role filter is applied post-fetch using v_user_plan

      // Active status filter
      if (filters.isActive === 'active') {
        query = query.eq('is_active', true);
      } else if (filters.isActive === 'inactive') {
        query = query.eq('is_active', false);
      }

      // Last access period filter
      if (filters.lastAccessPeriod === 'never') {
        query = query.is('last_login_at', null);
      } else if (filters.lastAccessPeriod && filters.lastAccessPeriod !== 'all') {
        const fromDate = getDateFromPeriod(filters.lastAccessPeriod);
        if (fromDate) {
          query = query.gte('last_login_at', fromDate.toISOString());
        }
      }

      // Pagination
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw error;

      // Get all principal user IDs to fetch their names
      const principalIds = (data || [])
        .filter(u => u.principal_user_id)
        .map(u => u.principal_user_id);
      
      let principalNames: Record<string, string> = {};
      if (principalIds.length > 0) {
        const { data: principals } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', principalIds);
        
        principalNames = (principals || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Sem nome';
          return acc;
        }, {} as Record<string, string>);
      }

      // Get guest counts for principal users
      const principalUserIds = (data || [])
        .filter(u => u.user_type === 'principal')
        .map(u => u.id);
      
      let guestCounts: Record<string, number> = {};
      if (principalUserIds.length > 0) {
        const { data: guests } = await supabase
          .from('profiles')
          .select('principal_user_id')
          .in('principal_user_id', principalUserIds);
        
        guestCounts = (guests || []).reduce((acc, g) => {
          if (g.principal_user_id) {
            acc[g.principal_user_id] = (acc[g.principal_user_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }
      
      // Fetch plan slugs from v_user_plan (SECURITY INVOKER). Query filtra por IDs explícitos
      // (.in) — adequado para painel admin; requer policies que permitam ao admin ler planos dos usuários listados.
      const userIds = (data || []).map(u => u.id);
      let planMap: Record<string, { slug: string; name: string }> = {};
      if (userIds.length > 0) {
        const { data: planData } = await supabase
          .from('v_user_plan' as any)
          .select('user_id, plan_slug, plan_name')
          .in('user_id', userIds);
        
        planMap = (planData || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = { slug: p.plan_slug || 'free', name: p.plan_name || 'Free' };
          return acc;
        }, {} as Record<string, { slug: string; name: string }>);
      }

      // Add is_admin flag, plan info, and principal user name to each user
      let usersWithFlags = (data || []).map(user => ({
        ...user,
        is_admin: adminUserIds.has(user.id),
        plan_slug: planMap[user.id]?.slug || 'free',
        plan_name: planMap[user.id]?.name || 'Free',
        principal_user_name: user.principal_user_id ? principalNames[user.principal_user_id] : null,
        guest_count: guestCounts[user.id] || 0,
      })) as (UserProfile & { guest_count?: number })[];
      
      // Filter by plan if specified
      if (filters.subscriptionRole && filters.subscriptionRole !== 'all') {
        usersWithFlags = usersWithFlags.filter(u => u.plan_slug === filters.subscriptionRole);
      }

      // Filter by admin status if specified
      if (filters.isAdmin === 'admin') {
        usersWithFlags = usersWithFlags.filter(u => u.is_admin);
      } else if (filters.isAdmin === 'user') {
        usersWithFlags = usersWithFlags.filter(u => !u.is_admin);
      }
      
      return {
        users: usersWithFlags,
        totalCount: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pagination.pageSize),
      };
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UserProfileUpdate) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário atualizado!');
      const { id, ...updates } = variables;
      logAction('UPDATE_USER', 'profiles', id, updates);
    },
    onError: (error: Error) => {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    },
  });

  const updateSubscriptionRole = useMutation({
    mutationFn: async ({ id, planSlug }: { id: string; planSlug: string }) => {
      // Find the subscription_plan by slug
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, duration_days')
        .eq('slug', planSlug)
        .single();
      
      if (planError || !plan) throw new Error(`Plan not found for slug: ${planSlug}`);

      // Update the user's workspace plan
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', id)
        .eq('is_active', true)
        .single();

      if (wsError || !workspace) throw new Error('Workspace not found for user');

      const { error: updateError } = await supabase
        .from('workspaces')
        .update({
          plan_id: plan.id,
          plan_expires_at: new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', workspace.id);

      if (updateError) throw updateError;
      return { planSlug };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`Plano alterado para "${data.planSlug}"!`);
      logAction('UPDATE_PLAN', 'workspaces', variables.id, { planSlug: variables.planSlug });
    },
    onError: (error: Error) => {
      console.error('Error updating subscription:', error);
      toast.error('Erro ao alterar plano');
    },
  });

  const toggleUserActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: !is_active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`Usuário ${data.is_active ? 'ativado' : 'desativado'}!`);
      logAction('TOGGLE_USER_ACTIVE', 'profiles', variables.id, { is_active: data.is_active });
    },
    onError: (error: Error) => {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao alterar status');
    },
  });

  // Protected admin user IDs that cannot have admin removed
  const PROTECTED_ADMIN_IDS = [
    '0ec2a4d2-1da5-4e66-b7ff-220a302ae239',
    '4246daa9-a70e-4210-af27-f17d630e11c1',
    'fc53ca35-d897-4cb3-a32f-df3b76c8cb49', // contato@rxfin.com.br
  ];

  const grantAdminRole = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('admin_manage_role', {
        target_user_id: userId,
        target_role: 'admin',
        action: 'grant',
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Erro ao promover administrador');
      }
      
      return result;
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['is-admin'] });
      toast.success('Usuário promovido a administrador!');
      logAction('GRANT_ADMIN', 'user_roles', userId, {}, 'critical');
    },
    onError: (error: Error) => {
      console.error('Error granting admin:', error);
      // If user already has role, still refresh the data to show correct state
      if (error.message?.includes('already has this role')) {
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        toast.info('Usuário já é administrador');
      } else {
        toast.error(error.message || 'Erro ao promover administrador');
      }
    },
  });

  const revokeAdminRole = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('admin_manage_role', {
        target_user_id: userId,
        target_role: 'admin',
        action: 'revoke',
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Erro ao remover administrador');
      }
      
      return result;
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['is-admin'] });
      toast.success('Privilégios de admin removidos');
      logAction('REVOKE_ADMIN', 'user_roles', userId, {}, 'critical');
    },
    onError: (error: Error) => {
      console.error('Error revoking admin:', error);
      toast.error(error.message || 'Erro ao remover administrador');
    },
  });

  const isProtectedAdmin = (userId: string) => PROTECTED_ADMIN_IDS.includes(userId);

  return {
    users: data?.users ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    error,
    refetch,
    updateUser,
    updateSubscriptionRole,
    toggleUserActive,
    grantAdminRole,
    revokeAdminRole,
    isProtectedAdmin,
  };
}
