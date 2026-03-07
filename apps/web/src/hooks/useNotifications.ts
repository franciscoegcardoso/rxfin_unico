import { useState, useEffect, useCallback } from 'react';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    const pageRes = await supabase.rpc('get_notifications_page', {
      p_limit: BELL_LIMIT,
      p_page: 1,
    });
    if (pageRes.error) throw pageRes.error;
    const raw =
      Array.isArray(pageRes.data)
        ? pageRes.data
        : (pageRes.data as { rows?: unknown[] })?.rows ??
          (pageRes.data as { data?: unknown[] })?.data ??
          [];
    const list = (raw as (Notification & { read_at?: string | null })[]).map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      priority: r.priority,
      category: r.category ?? null,
      action_url: r.action_url ?? null,
      read_at: r.read_at ?? null,
      created_at: r.created_at,
    }));
    setNotifications(list);
    // Contagem de não lidas sempre derivada da lista, para sino e dropdown ficarem alinhados
    const unread = list.filter((n) => n.read_at == null).length;
    setUnreadCount(unread);
  }, []);

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
      setUnreadCount(0);
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
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const { error } = await supabase.rpc('mark_all_notifications_read');
    if (error) throw error;
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
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
