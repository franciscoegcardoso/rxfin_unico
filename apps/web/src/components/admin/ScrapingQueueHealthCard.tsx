import { useScrapingQueueHealth } from '@/hooks/useScrapingQueueHealth';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export function ScrapingQueueHealthCard() {
  const { data, isLoading } = useScrapingQueueHealth();

  if (isLoading) return <div className="animate-pulse h-24 bg-muted rounded-lg" />;

  const needsAttention = data?.needs_attention;

  return (
    <div
      className={`rounded-lg border p-4 ${needsAttention ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {needsAttention ? (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
        <span className="text-sm font-semibold">Scraping de Tickers</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          Na fila:{' '}
          <span className="font-medium text-foreground">{data?.total_in_queue}</span>
        </div>
        <div>
          Nunca processados:{' '}
          <span
            className={`font-medium ${(data?.never_scraped ?? 0) > 0 ? 'text-amber-500' : 'text-foreground'}`}
          >
            {data?.never_scraped}
          </span>
        </div>
        <div>
          Atrasados:{' '}
          <span
            className={`font-medium ${(data?.overdue ?? 0) > 0 ? 'text-red-500' : 'text-foreground'}`}
          >
            {data?.overdue}
          </span>
        </div>
        <div>
          Pausados:{' '}
          <span className="font-medium text-foreground">{data?.paused}</span>
        </div>
      </div>

      {needsAttention && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          Edge Function <code>enrich-ticker-logos</code> pode não estar rodando.
        </p>
      )}

      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>
          Atualizado{' '}
          {data?.checked_at
            ? new Date(data.checked_at).toLocaleTimeString('pt-BR')
            : '—'}
        </span>
      </div>
    </div>
  );
}
