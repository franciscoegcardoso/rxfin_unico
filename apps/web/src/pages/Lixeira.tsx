import { useEffect, useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getTrashItems,
  restoreFromTrash,
  emptyTrash,
  permanentlyDeleteTrashItem,
  type TrashItemRow,
} from '@/core/services/trash';
import { useAuth } from '@/contexts/AuthContext';
import {
  Trash2,
  Receipt,
  Car,
  Target,
  Package,
  RotateCcw,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'lancamento', label: 'Lançamentos' },
  { value: 'veiculo', label: 'Veículos' },
  { value: 'meta', label: 'Metas' },
  { value: 'outros', label: 'Outros' },
] as const;

const ASSET_TYPE_LABELS: Record<string, string> = {
  lancamento: 'Lançamento',
  cc_transaction: 'Transação Cartão',
  conta: 'Conta',
  vehicle: 'Veículo',
  veiculo: 'Veículo',
  asset: 'Bem',
  investment: 'Investimento',
  meta: 'Meta',
  goal: 'Meta',
};

function getAssetTypeCategory(assetType: string): (typeof FILTER_OPTIONS)[number]['value'] {
  const t = (assetType || '').toLowerCase();
  if (t === 'lancamento' || t === 'cc_transaction' || t === 'conta') return 'lancamento';
  if (t === 'vehicle' || t === 'veiculo' || (t === 'asset' && t.includes('veiculo'))) return 'veiculo';
  if (t === 'meta' || t === 'goal') return 'meta';
  return 'outros';
}

function getTypeIcon(assetType: string) {
  const t = (assetType || '').toLowerCase();
  if (t === 'lancamento' || t === 'cc_transaction' || t === 'conta') return Receipt;
  if (t === 'vehicle' || t === 'veiculo') return Car;
  if (t === 'meta' || t === 'goal') return Target;
  return Package;
}

function getItemDisplayName(assetData: Record<string, unknown>): string {
  if (!assetData) return 'Item';
  const name =
    (assetData.nome as string) ??
    (assetData.name as string) ??
    (assetData.descricao as string) ??
    (assetData.title as string);
  return name && typeof name === 'string' ? name : 'Item';
}

function getDaysRemaining(expiresAt: string): number {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getExpiresBadgeVariant(days: number): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (days > 15) return 'success';
  if (days >= 7) return 'warning';
  return 'destructive';
}

export default function Lixeira() {
  const { user } = useAuth();
  const [items, setItems] = useState<TrashItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTER_OPTIONS)[number]['value']>('all');
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrashItems();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar lixeira';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => getAssetTypeCategory(item.asset_type) === filter);
  }, [items, filter]);

  const handleRestore = async (trashId: string) => {
    setActionLoading(trashId);
    try {
      await restoreFromTrash(trashId);
      toast.success('Item restaurado');
      await fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao restaurar';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (trashId: string) => {
    if (!user?.id) return;
    setActionLoading(trashId);
    setPermanentDeleteId(null);
    try {
      await permanentlyDeleteTrashItem(trashId, user.id);
      toast.success('Item excluído permanentemente');
      await fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmptyTrash = async () => {
    setEmptyDialogOpen(false);
    setActionLoading('empty');
    try {
      await emptyTrash();
      toast.success('Lixeira esvaziada');
      await fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao esvaziar lixeira';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Lixeira"
          description="Itens excluídos recentemente"
          icon={<Trash2 className="h-5 w-5 text-primary" />}
          children={
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </Badge>
              )}
              {items.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setEmptyDialogOpen(true)}
                  disabled={actionLoading === 'empty'}
                >
                  {actionLoading === 'empty' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Esvaziar lixeira
                    </>
                  )}
                </Button>
              )}
            </div>
          }
        />

        <Alert className="rounded-[14px] border-border/80 bg-muted/30">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Itens são excluídos permanentemente após 30 dias.
          </AlertDescription>
        </Alert>

        {!loading && !error && items.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={filter === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Carregando...</span>
          </div>
        )}

        {error && (
          <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const Icon = getTypeIcon(item.asset_type);
              const displayName = getItemDisplayName(item.asset_data ?? {});
              const typeLabel = ASSET_TYPE_LABELS[item.asset_type] ?? item.asset_type ?? 'Item';
              const deletedAt = item.deleted_at
                ? format(new Date(item.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                : '—';
              const daysLeft = getDaysRemaining(item.expires_at);
              const expiresVariant = getExpiresBadgeVariant(daysLeft);
              const isBusy = actionLoading === item.id;

              return (
                <Card key={item.id} className="rounded-[14px] border border-border/80 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{displayName}</p>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {typeLabel}
                          </Badge>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Excluído em {deletedAt}
                          </p>
                          <Badge
                            variant={expiresVariant}
                            className={cn(
                              'mt-2 text-xs',
                              expiresVariant === 'success' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                              expiresVariant === 'warning' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                              expiresVariant === 'destructive' && 'bg-red-500/15 text-red-700 dark:text-red-400'
                            )}
                          >
                            {daysLeft > 0
                              ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} até exclusão permanente`
                              : 'Exclusão permanente'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(item.id)}
                          disabled={isBusy}
                          className="gap-1"
                        >
                          {isBusy ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restaurar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setPermanentDeleteId(item.id)}
                          disabled={isBusy}
                        >
                          Excluir permanentemente
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <Card className="rounded-[14px] border border-border/80 p-12 text-center">
            <Trash2 className="mx-auto h-14 w-14 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">Lixeira vazia</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Itens excluídos aparecem aqui por 30 dias.
            </p>
          </Card>
        )}

        {!loading && !error && items.length > 0 && filteredItems.length === 0 && (
          <Card className="rounded-[14px] border border-border/80 p-8 text-center">
            <p className="text-muted-foreground">Nenhum item neste filtro.</p>
          </Card>
        )}
      </div>

      <AlertDialog open={emptyDialogOpen} onOpenChange={setEmptyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esvaziar lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEmptyTrash}
            >
              Esvaziar lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!permanentDeleteId} onOpenChange={(open) => !open && setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item será removido para sempre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (permanentDeleteId) handlePermanentDelete(permanentDeleteId);
              }}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
