import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import type { VaultSecretStatus } from '@/types/apiCredentials';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EdgeFunctionSecretsSectionProps {
  data: VaultSecretStatus[];
  isLoading: boolean;
}

const VAULT_URL = 'https://supabase.com/dashboard/project/kneaniaifzgqibpajyji/settings/vault';

function relativeDate(date: string | null): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR });
}

export function EdgeFunctionSecretsSection({ data, isLoading }: EdgeFunctionSecretsSectionProps) {
  const missingCount = data.filter((d) => !d.exists_in_vault).length;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        <div className="px-4 py-4 border-b border-border flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Edge Function Secrets</h3>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              missingCount > 0
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            )}
          >
            {missingCount} ausentes
          </Badge>
        </div>

        {isLoading ? (
          <div className="px-4 py-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Secret</TableHead>
                  <TableHead>Edge Functions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const visible = row.edge_functions.slice(0, 3);
                  const hiddenCount = Math.max(0, row.edge_functions.length - 3);
                  return (
                    <TableRow key={row.secret_name} className="border-border">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{row.secret_name}</p>
                          <p className="text-xs text-muted-foreground">{row.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex flex-wrap items-center gap-1">
                            {visible.map((fn) => (
                              <Badge key={fn} variant="secondary" className="text-[10px] font-normal">
                                {fn}
                              </Badge>
                            ))}
                            {hiddenCount > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px]">
                                    +{hiddenCount}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {row.edge_functions.slice(3).join(', ')}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {row.exists_in_vault ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            ✓ No Vault
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30">
                            ⚠ Ausente no Vault
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {relativeDate(row.vault_updated_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="px-4 py-3 border-t border-border">
          <a
            href={VAULT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Gerenciar no Supabase Vault
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
