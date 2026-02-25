
-- 1. Add composite index for duplicate check in expiration notifications
CREATE INDEX idx_notifications_expiration_dedup 
  ON public.notifications (target_user_id, (metadata->>'trigger'), (metadata->>'workspace_id'))
  WHERE type = 'expiration';

-- 2. Add index on notification_reads for fast join lookups
CREATE INDEX idx_notification_reads_composite 
  ON public.notification_reads (user_id, notification_id);

-- 3. Add index on notification_dismissals for fast join lookups  
CREATE INDEX idx_notification_dismissals_composite 
  ON public.notification_dismissals (user_id, notification_id);
