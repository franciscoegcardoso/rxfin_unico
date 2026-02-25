import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  target_user_id: string | null;
  action_url: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  is_read?: boolean;
  is_dismissed?: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Unread count via RPC
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notification-unread-count', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unread_notification_count');
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // fallback polling every 60s
  });

  // Notifications list (latest 30)
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      // Get notifications
      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;

      // Get reads & dismissals
      const [readsRes, dismissRes] = await Promise.all([
        supabase.from('notification_reads').select('notification_id'),
        supabase.from('notification_dismissals').select('notification_id'),
      ]);

      const readIds = new Set((readsRes.data || []).map(r => r.notification_id));
      const dismissIds = new Set((dismissRes.data || []).map(d => d.notification_id));

      return (notifs || []).map(n => ({
        ...n,
        metadata: (n.metadata || {}) as Record<string, any>,
        is_read: readIds.has(n.id),
        is_dismissed: dismissIds.has(n.id),
      })) as Notification[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      // Targeted notifications for this user
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `target_user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      // Broadcast notifications (target_user_id IS NULL)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'target_user_id=is.null',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from('notification_reads').upsert({
        notification_id: notificationId,
        user_id: user!.id,
      }, { onConflict: 'notification_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read && !n.is_dismissed);
      if (unread.length === 0) return;
      const inserts = unread.map(n => ({
        notification_id: n.id,
        user_id: user!.id,
      }));
      const { error } = await supabase.from('notification_reads').upsert(inserts, {
        onConflict: 'notification_id,user_id',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Dismiss
  const dismiss = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from('notification_dismissals').upsert({
        notification_id: notificationId,
        user_id: user!.id,
      }, { onConflict: 'notification_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Visible = not dismissed
  const visibleNotifications = notifications.filter(n => !n.is_dismissed);

  return {
    unreadCount,
    notifications: visibleNotifications,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    dismiss: dismiss.mutate,
  };
}
// sync
