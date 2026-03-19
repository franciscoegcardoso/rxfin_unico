import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WebhookEventSummary } from '@/types/apiCredentials';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface WebhooksSectionProps {
  data: WebhookEventSummary[];
  isLoading: boolean;
}

function relativeDate(date: string | null): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR });
}

export function WebhooksSection({ data, isLoading }: WebhooksSectionProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        <div className="px-4 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Webhooks Recebidos</h3>
        </div>

        {isLoading ? (
          <div className="px-4 py-4 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum webhook recebido ainda
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Serviço</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Total eventos</TableHead>
                  <TableHead>Último evento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Processados</TableHead>
                  <TableHead>Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={`${row.source}:${row.endpoint_path}`} className="border-border">
                    <TableCell className="font-medium">{row.source}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.endpoint_path}</TableCell>
                    <TableCell>{row.total_events}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {relativeDate(row.last_event_at)}
                    </TableCell>
                    <TableCell>{row.last_event_type ?? '—'}</TableCell>
                    <TableCell>{row.processed_count}</TableCell>
                    <TableCell>
                      {row.error_count > 0 ? (
                        <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30">
                          {row.error_count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
