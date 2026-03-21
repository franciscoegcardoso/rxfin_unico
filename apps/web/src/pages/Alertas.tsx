import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { AlertTriangle, Bell, Shield, TrendingUp, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertType = 'insurance_expiring' | 'bill_due' | 'budget_exceeded' | 'goal_progress';
type Severity = 'high' | 'medium' | 'low';

interface SmartAlert {
  type?: AlertType | string;
  severity?: Severity | string;
  title?: string;
  message?: string;
  action_url?: string | null;
}

interface SmartAlertsPayload {
  alerts?: SmartAlert[];
  summary?: { total?: number; high?: number; medium?: number; low?: number };
}

const severityStyles: Record<string, string> = {
  high: 'border-destructive/50 bg-destructive/5 text-destructive',
  medium: 'border-warning/50 bg-warning/5 text-warning',
  low: 'border-primary/30 bg-primary/5 text-primary',
};

function getAlertIcon(type?: string) {
  switch (type) {
    case 'bill_due':
      return Bell;
    case 'insurance_expiring':
      return Shield;
    case 'budget_exceeded':
      return TrendingUp;
    case 'goal_progress':
      return Target;
    default:
      return AlertTriangle;
  }
}

export default function Alertas() {
  const month = format(new Date(), 'yyyy-MM');
  const { data, loading, error } = useSmartAlerts(month);
  const payload = data as SmartAlertsPayload | null;
  const alerts = payload?.alerts ?? (Array.isArray(data) ? data : []) as SmartAlert[];
  const summary = payload?.summary;
  const total = summary?.total ?? alerts.length;
  const highCount = summary?.high ?? alerts.filter((a) => a.severity === 'high').length;
  const isEmpty = total === 0;

  return (
    
      <div className="space-y-6">
        <PageHeader
          title="Alertas Inteligentes"
          description="Alertas e recomendações do mês"
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
        />

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Carregando...</span>
          </div>
        )}
        {error && (
          <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {!loading && !error && isEmpty && (
          <Card className="rounded-[14px] border border-border/80 p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Nenhum alerta encontrado.</p>
          </Card>
        )}

        {!loading && !error && !isEmpty && (
          <>
            <Card className="rounded-[14px] border border-border/80 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">
                  {total} alerta{total !== 1 ? 's' : ''}
                  {highCount > 0 && (
                    <span className="ml-2 text-destructive">({highCount} urgente{highCount !== 1 ? 's' : ''})</span>
                  )}
                </span>
              </div>
            </Card>

            <div className="space-y-3">
              {alerts.map((alert, i) => {
                const severity = (alert.severity ?? 'low') as string;
                const style = severityStyles[severity] ?? severityStyles.low;
                const Icon = getAlertIcon(alert.type);
                const content = (
                  <div className={cn('flex items-start gap-3 rounded-[14px] border p-4 transition-colors', style, alert.action_url && 'hover:opacity-90')}>
                    <div className="mt-0.5 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{alert.title ?? 'Alerta'}</p>
                      {alert.message && <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>}
                    </div>
                    {alert.action_url && <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />}
                  </div>
                );
                if (alert.action_url) {
                  return (
                    <Link key={i} to={alert.action_url.startsWith('/') ? alert.action_url : `/${alert.action_url}`}>
                      {content}
                    </Link>
                  );
                }
                return <div key={i}>{content}</div>;
              })}
            </div>
          </>
        )}
      </div>
    
  );
}
