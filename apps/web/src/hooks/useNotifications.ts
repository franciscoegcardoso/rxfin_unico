import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  category: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

const BELL_LIMIT = 10;
const POLL_INTERVAL_MS = 60_000;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_bell_notifications', {
      p_limit: BELL_LIMIT,
    });
    if (error) throw error;
    const list = Array.isArray(data) ? data : (data as { items?: Notification[] })?.items ?? [];
    setNotifications(list as Notification[]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.read_at == null).length,
    [notifications]
  );

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await fetchList();
    } catch (err) {
      console.error('useNotifications refetch:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchList]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    refetch();
  }, [user?.id, refetch]);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(fetchList, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.id, fetchList]);

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: id,
    });
    if (error) throw error;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  }, []);

  const markAllRead = useCallback(async () => {
    const { error } = await supabase.rpc('mark_all_notifications_read');
    if (error) throw error;
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    await fetchList();
  }, [fetchList]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch,
  };
}
