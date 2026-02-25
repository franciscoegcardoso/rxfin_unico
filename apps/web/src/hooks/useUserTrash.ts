import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface TrashItem {
  id: string;
  user_id: string;
  original_id: string;
  asset_type: string;
  asset_data: Record<string, any>;
  linked_data: Record<string, any>[];
  deleted_at: string;
  expires_at: string;
  deleted_reason?: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  details: Record<string, any>;
  linked_records_deleted: number;
  created_at: string;
}

export function useUserTrash() {
  const { user } = useAuth();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrashItems = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase
        .from('user_trash' as any)
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('deleted_at', { ascending: false }) as any);

      if (error) throw error;
      setTrashItems((data || []) as TrashItem[]);
    } catch (err: any) {
      console.error('Error fetching trash items:', err);
    }
  }, [user]);

  const fetchAuditLogs = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deletion_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs((data || []) as AuditLogEntry[]);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchTrashItems(), fetchAuditLogs()]).finally(() => setLoading(false));
    }
  }, [user, fetchTrashItems, fetchAuditLogs]);

  const moveToTrash = useCallback(async (
    originalId: string,
    assetType: string,
    assetData: Record<string, any>,
    linkedData: Record<string, any>[] = [],
    reason?: string
  ) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('move_to_trash', {
        _asset_type: assetType,
        _original_id: originalId,
        _asset_data: assetData as Json,
        _linked_data: linkedData as unknown as Json,
        _reason: reason ?? null,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Erro ao mover para lixeira');
      }

      await fetchTrashItems();
      return true;
    } catch (err: any) {
      console.error('Error moving to trash:', err);
      return false;
    }
  }, [user, fetchTrashItems]);

  const logDeletion = useCallback(async (
    action: string,
    entityType: string,
    entityId: string,
    entityName?: string,
    details: Record<string, any> = {},
    linkedRecordsDeleted: number = 0
  ) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('deletion_audit_log')
        .insert({
          user_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          details,
          linked_records_deleted: linkedRecordsDeleted,
        });

      if (error) throw error;
      await fetchAuditLogs();
      return true;
    } catch (err: any) {
      console.error('Error logging deletion:', err);
      return false;
    }
  }, [user, fetchAuditLogs]);

  const restoreFromTrash = useCallback(async (trashId: string): Promise<TrashItem | null> => {
    if (!user) return null;

    try {
      const item = trashItems.find(t => t.id === trashId);
      if (!item) {
        toast.error('Item não encontrado na lixeira');
        return null;
      }

      const { data, error } = await supabase.rpc('restore_from_trash', {
        _trash_id: trashId,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Erro ao restaurar item');
      }

      await fetchTrashItems();
      return item;
    } catch (err: any) {
      console.error('Error restoring from trash:', err);
      toast.error('Erro ao restaurar item');
      return null;
    }
  }, [user, trashItems, fetchTrashItems]);

  const permanentlyDelete = useCallback(async (trashId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_trash' as any)
        .delete()
        .eq('id', trashId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrashItems(prev => prev.filter(item => item.id !== trashId));
      toast.success('Item excluído permanentemente');
      return true;
    } catch (err: any) {
      toast.error('Erro ao excluir permanentemente');
      console.error('Error permanently deleting:', err);
      return false;
    }
  }, [user]);

  const emptyTrash = useCallback(async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_trash' as any)
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setTrashItems([]);
      toast.success('Lixeira esvaziada');
      return true;
    } catch (err: any) {
      toast.error('Erro ao esvaziar lixeira');
      console.error('Error emptying trash:', err);
      return false;
    }
  }, [user]);

  const getDaysUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return {
    trashItems,
    auditLogs,
    loading,
    moveToTrash,
    logDeletion,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    getDaysUntilExpiration,
    refetch: () => Promise.all([fetchTrashItems(), fetchAuditLogs()]),
  };
}

/** @deprecated Use useUserTrash instead */
export const useAssetTrash = useUserTrash;
