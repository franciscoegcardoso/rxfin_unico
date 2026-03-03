import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SyncJob {
  id: string;
  status: string;
  action: string;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

interface SyncStatusBadgeProps {
  itemId: string;
  onSyncComplete?: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ itemId, onSyncComplete }) => {
  const [job, setJob] = useState<SyncJob | null>(null);
  const [polling, setPolling] = useState(true);

  const fetchLatestJob = useCallback(async () => {
    const { data } = await supabase
      .from('pluggy_sync_jobs_v')
      .select('id, status, action, attempts, max_attempts, error_message, created_at, finished_at')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setJob(data as SyncJob);
      const isDone = data.status === 'done' || data.status === 'error';
      if (isDone) {
        setPolling(false);
        if (data.status === 'done' && onSyncComplete) {
          onSyncComplete();
        }
      }
    } else {
      setPolling(false);
    }
  }, [itemId, onSyncComplete]);

  useEffect(() => {
    fetchLatestJob();
  }, [fetchLatestJob]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchLatestJob, 5000);
    return () => clearInterval(interval);
  }, [polling, fetchLatestJob]);

  if (!job) return null;

  const statusConfig = {
    pending: {
      icon: <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />,
      label: 'Aguardando sincronização…',
    },
    running: {
      icon: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
      label: 'Sincronizando dados…',
    },
    done: {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      label: 'Sincronização concluída',
    },
    error: {
      icon: <XCircle className="h-4 w-4 text-destructive" />,
      label: job.error_message ? `Erro: ${job.error_message}` : 'Erro na sincronização',
    },
  };

  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center">{config.icon}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
};
