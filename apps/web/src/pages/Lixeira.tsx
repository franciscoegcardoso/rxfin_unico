import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Trash2, Receipt, CreditCard, Package, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TrashItem {
  id?: string;
  type?: string;
  display_name?: string;
  reason?: string;
  deleted_at?: string;
  expires_at?: string;
  days_until_expiry?: number;
  linked_count?: number;
  original_id?: string;
  data?: { name?: string; type?: string; value?: number };
}

interface TrashPayload {
  count?: number;
  expiring_soon?: number;
  items?: TrashItem[];
}

const TYPE_LABELS: Record<string, string> = {
  investment: 'Investimento',
  lancamento: 'Lançamento',
  cc_transaction: 'Transação Cartão',
  asset: 'Bem',
  conta: 'Conta',
};

function getTypeIcon(type?: string) {
  switch (type) {
    case 'lancamento':
      return Receipt;
    case 'cc_transaction':
      return CreditCard;
    case 'asset':
    case 'investment':
      return Package;
    default:
      return Trash2;
  }
}

export default function Lixeira() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.rpc('get_trash_items', {}).then(({ data: result, error: rpcError }) => {
      if (rpcError) setError(rpcError.message);
      else setData(result);
      setLoading(false);
    });
  }, []);

  const payload = data as TrashPayload | null;
  const items = payload?.items ?? (Array.isArray(data) ? data : []) as TrashItem[];
  const count = payload?.count ?? items.length;
  const expiringSoon = payload?.expiring_soon ?? 0;
  const isEmpty = items.length === 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Lixeira"
          description="Itens excluídos recentemente"
          icon={<Trash2 className="h-5 w-5 text-primary" />}
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

        {!loading && !error && !isEmpty && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Lixeira ({count} itens)</h2>
              {expiringSoon > 0 && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  {expiringSoon} expirando em breve
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {items.map((item, i) => {
                const Icon = getTypeIcon(item.type);
                const displayName = item.display_name ?? item.data?.name ?? 'Item';
                const deletedAt = item.deleted_at ? format(new Date(item.deleted_at), 'dd/MM/yyyy', { locale: ptBR }) : '—';
                const days = item.days_until_expiry ?? 0;
                const daysColor = days < 7 ? 'text-red-600' : days < 14 ? 'text-amber-600' : 'text-muted-foreground';
                return (
                  <Card key={item.id ?? i} className="rounded-[14px] border border-border/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{displayName}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {TYPE_LABELS[item.type ?? ''] ?? item.type ?? 'Item'}
                        </Badge>
                        <p className="mt-2 text-sm text-muted-foreground">Excluído em {deletedAt}</p>
                        <p className={cn('text-sm mt-0.5', daysColor)}>
                          Expira em {days} dia{days !== 1 ? 's' : ''}
                        </p>
                        <p className={cn('text-sm mt-0.5', daysColor)}>
                          Expira em {days} dia{days !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" disabled className="shrink-0 gap-1">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restaurar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {!loading && !error && isEmpty && (
          <Card className="rounded-[14px] border border-border/80 p-12 text-center">
            <Trash2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-lg font-medium">Lixeira vazia 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">Itens excluídos aparecem aqui por 30 dias</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
