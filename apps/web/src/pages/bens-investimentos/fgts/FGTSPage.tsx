import React, { useMemo, useState } from 'react';
import { Wallet, Plus, Calendar, FileText, Smartphone, Globe, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useFGTSAssets,
  useSaveFGTSMonthlyEntry,
  useCreateFGTSAsset,
  useDeleteFGTSAsset,
  getFGTSSummary,
  type FGTSAsset,
} from './useFGTS';
import { useFGTSEntries } from '@/hooks/useFGTSEntries';
import { FGTSAccountCard } from './FGTSAccountCard';
import { FGTSMonthlyModal } from './FGTSMonthlyModal';
import { FGTSNewAccountModal } from './FGTSNewAccountModal';
import { FGTSHistoryChart } from './FGTSHistoryChart';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatMonth = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!m) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  return format(d, 'MMM/yyyy', { locale: ptBR });
};

const APP_FGTS = 'https://play.google.com/store/apps/details?id=br.gov.caixa.fgts';
const CAIXA_ONLINE = 'https://www.caixa.gov.br/';
const CTPS_DIGITAL = 'https://ctpsdigital.mte.gov.br/';

export default function FGTSPage() {
  const { data: assets = [], isLoading: loadingAssets } = useFGTSAssets();
  const { entries, getLatestEntry, isLoading: loadingEntries } = useFGTSEntries();
  const saveEntry = useSaveFGTSMonthlyEntry();
  const createAsset = useCreateFGTSAsset();
  const deleteAsset = useDeleteFGTSAsset();

  const summary = useMemo(() => getFGTSSummary(assets, entries), [assets, entries]);

  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FGTSAsset | null>(null);
  const [deleteAssetConfirm, setDeleteAssetConfirm] = useState<FGTSAsset | null>(null);
  const [historyAssetId, setHistoryAssetId] = useState<string | null>(null);

  const handleUpdateBalance = (asset: FGTSAsset) => {
    setSelectedAsset(asset);
    setMonthlyModalOpen(true);
  };

  const handleSaveMonthly = async (entry: Parameters<typeof saveEntry.mutateAsync>[0]) => {
    await saveEntry.mutateAsync(entry);
    setMonthlyModalOpen(false);
    setSelectedAsset(null);
  };

  const handleViewHistory = (asset: FGTSAsset) => {
    setHistoryAssetId(prev => (prev === asset.id ? null : asset.id));
  };

  const handleDelete = (asset: FGTSAsset) => {
    setDeleteAssetConfirm(asset);
  };

  const confirmDelete = async () => {
    if (!deleteAssetConfirm) return;
    await deleteAsset.mutateAsync(deleteAssetConfirm.id);
    setDeleteAssetConfirm(null);
  };

  if (loadingAssets) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <RXFinLoadingSpinner height="h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          FGTS
        </h1>
        <Button onClick={() => setNewAccountModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-xl border border-border/80">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo total</p>
            <p className="mt-1 text-2xl font-bold text-primary tabular-nums">{formatCurrency(summary.total_balance)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border/80">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Última atualização
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
              {summary.last_update_month ? formatMonth(summary.last_update_month) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Minhas contas FGTS</h2>
        {assets.length === 0 ? (
          <Card className="rounded-xl border border-dashed border-border/80">
            <CardContent className="p-8 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">Você ainda não cadastrou nenhuma conta FGTS</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Cadastre suas contas FGTS por empregador para acompanhar saldo e depósitos mensais.
              </p>
              <Button className="mt-4 gap-2" onClick={() => setNewAccountModalOpen(true)}>
                <Plus className="h-4 w-4" />
                + Adicionar conta FGTS
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map(asset => (
              <FGTSAccountCard
                key={asset.id}
                asset={asset}
                lastEntryMonth={getLatestEntry(asset.id)?.month ?? null}
                onUpdateBalance={handleUpdateBalance}
                onViewHistory={handleViewHistory}
                onEdit={() => {}}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <Card className="rounded-xl border border-border/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Passo a passo: como atualizar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong>Atualização mensal</strong> (recomendado todo dia 7): acesse o app FGTS (Caixa) ou o site caixa.gov.br, vá em &quot;Meu FGTS&quot; → &quot;Extrato&quot;, anote o saldo atual do mês e clique em &quot;Registrar saldo do mês&quot; abaixo.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Acesse o app FGTS (Caixa) ou site caixa.gov.br</li>
            <li>Vá em &quot;Meu FGTS&quot; → &quot;Extrato&quot;</li>
            <li>Anote o saldo atual do mês</li>
            <li>Clique em &quot;Registrar saldo do mês&quot; na conta correspondente</li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={APP_FGTS} target="_blank" rel="noopener noreferrer">
                <Smartphone className="h-4 w-4" />
                App FGTS
              </a>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={CAIXA_ONLINE} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" />
                Caixa Online
              </a>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={CTPS_DIGITAL} target="_blank" rel="noopener noreferrer">
                <CreditCard className="h-4 w-4" />
                CTPS Digital
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <FGTSHistoryChart entries={entries} assetId={historyAssetId} />

      <FGTSMonthlyModal
        open={monthlyModalOpen}
        onOpenChange={setMonthlyModalOpen}
        asset={selectedAsset}
        onSave={handleSaveMonthly}
        isLoading={saveEntry.isPending}
        latestFinalBalance={selectedAsset ? (getLatestEntry(selectedAsset.id)?.final_balance ?? selectedAsset.current_value ?? selectedAsset.value ?? 0) : 0}
      />

      <FGTSNewAccountModal
        open={newAccountModalOpen}
        onOpenChange={setNewAccountModalOpen}
        onSave={input => createAsset.mutateAsync(input)}
        isLoading={createAsset.isPending}
      />

      <AlertDialog open={!!deleteAssetConfirm} onOpenChange={open => !open && setDeleteAssetConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta FGTS?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAssetConfirm && (
                <>
                  A conta &quot;{deleteAssetConfirm.name}&quot; e todo o histórico de lançamentos serão excluídos. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
