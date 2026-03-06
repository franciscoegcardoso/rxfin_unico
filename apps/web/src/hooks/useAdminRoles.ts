import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AdminRole = 'owner' | 'super_admin' | 'admin' | 'user';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_change: {
    old_role: string;
    new_role: string;
    reason: string | null;
    changed_at: string;
  } | null;
}

export interface RoleChangeEntry {
  id: string;
  target_email: string;
  old_role: string;
  new_role: string;
  reason: string | null;
  changed_at: string;
}

export interface SetRolePayload {
  targetUserId: string;
  newRole: 'user' | 'admin' | 'super_admin' | 'owner';
  reason: string;
}

export interface UseAdminRoles {
  admins: AdminUser[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  setRole: (payload: SetRolePayload) => Promise<boolean>;
  fetchHistory: () => Promise<RoleChangeEntry[]>;
  isOwner: boolean;
}

export function useAdminRoles(): UseAdminRoles {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const loadRole = useCallback(async () => {
    if (!user?.id) {
      setIsOwner(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!err && data?.role === 'owner') {
      setIsOwner(true);
    } else {
      setIsOwner(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('get_admin_users_with_roles');
    if (err) {
      setError(err.message);
      setAdmins([]);
    } else {
      setAdmins((data as AdminUser[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setRole = useCallback(async (payload: SetRolePayload): Promise<boolean> => {
    const { data, error: err } = await supabase.rpc('owner_set_admin_role', {
      p_target_user_id: payload.targetUserId,
      p_new_role: payload.newRole,
      p_reason: payload.reason.trim(),
    });
    if (err) {
      const msg = err.message ?? '';
      if (msg.includes('SELF_DEMOTION') || msg.includes('self')) {
        toast.error('Você não pode alterar seu próprio role.');
      } else if (msg.includes('FORBIDDEN') || msg.includes('owner')) {
        toast.error('Apenas o owner pode realizar esta ação.');
      } else if (msg.includes('INVALID_ROLE')) {
        toast.error('Role inválido.');
      } else if (msg.includes('USER_NOT_FOUND')) {
        toast.error('Usuário não encontrado.');
      } else {
        toast.error(msg || 'Erro ao alterar role.');
      }
      return false;
    }
    if (data && typeof data === 'object' && 'success' in data && (data as { success: boolean }).success) {
      await load();
      return true;
    }
    return false;
  }, [load]);

  const fetchHistory = useCallback(async (): Promise<RoleChangeEntry[]> => {
    const { data, error: err } = await supabase.rpc('get_role_change_history', { p_limit: 50 });
    if (err || !data) return [];
    return (data as RoleChangeEntry[]) ?? [];
  }, []);

  return {
    admins,
    loading,
    error,
    reload: load,
    setRole,
    fetchHistory,
    isOwner,
  };
}
