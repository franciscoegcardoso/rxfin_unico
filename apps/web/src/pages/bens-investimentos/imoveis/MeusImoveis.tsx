import React, { useState, useMemo } from 'react';
import { Home, Plus, Trash2, Pencil, Shield, ChevronRight, RefreshCw, List, LayoutGrid, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFinancial } from '@/contexts/FinancialContext';
import { useBensInvestimentos } from '@/contexts/BensInvestimentosContext';
import { assetTypes } from '@/data/defaultData';
import type { Asset, EstadoImovelType } from '@/types/financial';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PropertyInsightsDialog } from '@/components/bens/PropertyInsightsDialog';
import { AssetCostBreakdown } from '@/components/bens/AssetCostBreakdown';
import { AssetInsuranceBadge } from '@/components/bens/AssetInsuranceBadge';
import { assetIcons, propertyAdjustmentOptions, monthOptions } from '../constants';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type AssetFlowRow = { nome: string; tipo: string; valor: number; flow_origem: string; flow_direction: string; ativo: boolean };

function useAssetFlows(assetId: string) {
  return useQuery({
    queryKey: ['asset_flows', assetId],
    queryFn: async (): Promise<AssetFlowRow[]> => {
      const { data, error } = await supabase.rpc('get_asset_flows', { p_asset_id: assetId });
      if (error) return [];
      return (data ?? []) as AssetFlowRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function AssetFlowBadges({ assetId }: { assetId: string }) {
  const { data: flows = [] } = useAssetFlows(assetId);
  const inCount = flows.filter(f => f.flow_direction === 'in' && f.ativo).length;
  const outCount = flows.filter(f => f.flow_direction === 'out' && f.ativo).length;
  if (inCount === 0 && outCount === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {inCount > 0 && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
          {inCount} receita(s) vinculada(s)
        </span>
      )}
      {outCount > 0 && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40">
          {outCount} custo(s) vinculado(s)
        </span>
      )}
    </div>
  );
}

const ESTADO_IMOVEL_OPTIONS: { value: EstadoImovelType; label: string }[] = [
  { value: 'alugado', label: 'Alugado' },
  { value: 'vago', label: 'Vago' },
  { value: 'proprio', label: 'Uso próprio' },
];

const MeusImoveis: React.FC = () => {
  const { config, updateAsset } = useFinancial();
  const { handleOpenAddDialog, handleEditAsset, handleDeleteAsset, handleAddSeguro, hasActiveInsurance, formatCurrency } = useBensInvestimentos();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  const imoveis = useMemo(() => {
    const assets = config.assets.filter((a): a is Asset => a.type === 'property');
    const active = assets.filter(a => !a.isSold);
    const sold = assets.filter(a => a.isSold);
    active.sort((a, b) => b.value - a.value);
    sold.sort((a, b) => {
      if (!a.saleDate && !b.saleDate) return 0;
      if (!a.saleDate) return 1;
      if (!b.saleDate) return -1;
      return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
    });
    return [...active, ...sold];
  }, [config.assets]);

  const total = useMemo(() => imoveis.filter(a => !a.isSold).reduce((sum, a) => sum + a.value, 0), [imoveis]);

  const renderAssetCard = (asset: Asset) => {
    const isSold = asset.isSold;
    const cardContent = (
      <Card
        key={asset.id}
        className={cn(
          'group hover:shadow-md transition-shadow relative overflow-hidden min-w-0',
          isMobile && 'cursor-pointer',
          isSold && 'bg-gradient-to-br from-muted/30 to-muted/10 border-muted-foreground/10 opacity-75'
        )}
      >
        {isSold && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-expense bg-expense/10 border border-expense/30 px-2 py-1 rounded">
              Vendido
            </span>
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={cn('p-2 rounded-lg shrink-0', isSold ? 'bg-muted-foreground/10' : 'bg-accent')}>
                {assetIcons[asset.type]}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={cn('text-base font-semibold text-foreground truncate', isSold && 'text-muted-foreground')}>{asset.name}</h3>
                <p className="text-sm text-muted-foreground">{assetTypes.find(t => t.value === asset.type)?.label}</p>
                {asset.description && <p className="text-xs text-muted-foreground mt-1">{asset.description}</p>}
                {asset.purchaseDate && (
                  <p className="text-sm text-muted-foreground tabular-nums mt-1">
                    Compra: {format(new Date(asset.purchaseDate), 'dd/MM/yyyy')}
                    {asset.purchaseValue != null && ` - ${formatCurrency(asset.purchaseValue)}`}
                  </p>
                )}
                {isSold && asset.saleDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Venda: {format(new Date(asset.saleDate), 'dd/MM/yyyy')}
                    {asset.saleValue != null && ` - ${formatCurrency(asset.saleValue)}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1" onClick={e => e.stopPropagation()} role="group" aria-label="Ações do item">
              {!isMobile && (
                <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleEditAsset(asset)}>
                  Ver detalhes
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('text-muted-foreground hover:text-foreground', !isMobile && 'opacity-0 group-hover:opacity-100 transition-opacity')}
                    title="Mudar estado"
                    onClick={e => e.stopPropagation()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start" onClick={e => e.stopPropagation()}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Estado do imóvel</p>
                  <Select
                    value={((asset as { metadata?: { estado_imovel?: string } }).metadata?.estado_imovel) ?? (asset.isRentalProperty ? 'alugado' : 'proprio')}
                    onValueChange={value => updateAsset(asset.id, { estado_imovel: value } as Partial<Asset>)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADO_IMOVEL_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </PopoverContent>
              </Popover>
              <PropertyInsightsDialog property={asset} />
              {!isSold && !hasActiveInsurance(asset.id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:text-amber-300', !isMobile && 'opacity-0 group-hover:opacity-100 transition-opacity')}
                  onClick={() => handleAddSeguro(asset.id)}
                  title="Adicionar Seguro"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className={cn(!isMobile && 'opacity-0 group-hover:opacity-100 transition-opacity')} onClick={() => handleEditAsset(asset)} title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className={cn('text-destructive hover:text-destructive', !isMobile && 'opacity-0 group-hover:opacity-100 transition-opacity')} onClick={() => handleDeleteAsset(asset.id)} title="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t min-w-0">
            <p className={cn('mt-3 text-2xl font-bold text-primary tabular-nums truncate', isSold && 'text-muted-foreground')}>
              {formatCurrency(isSold && asset.saleValue != null ? asset.saleValue : asset.value)}
            </p>
            {!isSold && <AssetFlowBadges assetId={asset.id} />}
            <div className="flex flex-wrap gap-2 mt-2">
              <AssetInsuranceBadge assetId={asset.id} assetName={asset.name} showLabel size="md" showUninsured />
              {asset.isRentalProperty && !isSold && asset.rentalValue != null && (
                <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <Home className="h-3 w-3" />
                  Gera aluguel
                </span>
              )}
              {asset.propertyAdjustment && asset.propertyAdjustment !== 'none' && !isSold && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground mt-1 px-2 py-1 rounded bg-muted">
                  {propertyAdjustmentOptions.find(o => o.value === asset.propertyAdjustment)?.label}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
    if (isMobile) {
      return (
        <div key={asset.id} role="button" tabIndex={0} onClick={() => handleEditAsset(asset)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditAsset(asset); } }} className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
          {cardContent}
        </div>
      );
    }
    return cardContent;
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenAddDialog(undefined, undefined, 'property')} className="gap-2 w-full sm:w-auto min-h-[44px] touch-manipulation">
          <Plus className="h-4 w-4" />
          Adicionar imóvel
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 py-2 px-3 bg-muted/30 rounded-lg">
        <span className="text-xs text-muted-foreground">Total:</span>
        <span className="text-sm font-bold text-primary">{formatCurrency(total)}</span>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-foreground">Meus Imóveis</h2>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3" onClick={() => setViewMode('cards')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {imoveis.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={<Package className="h-6 w-6 text-muted-foreground" />}
              description="Você ainda não cadastrou nenhum imóvel"
              actionLabel="Adicionar primeiro imóvel"
              onAction={() => handleOpenAddDialog(undefined, undefined, 'property')}
            />
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground text-sm">Nome</th>
                  <th className="text-right p-3 sm:p-4 font-medium text-muted-foreground text-sm">Valor</th>
                  <th className="text-right p-3 sm:p-4 font-medium text-muted-foreground w-16 sm:w-24" />
                </tr>
              </thead>
              <tbody>
                {imoveis.map(asset => {
                  const isSold = asset.isSold;
                  return (
                    <tr key={asset.id} className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors group', isSold && 'opacity-60')}>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={cn('p-1.5 sm:p-2 rounded-lg shrink-0', isSold ? 'bg-muted-foreground/10' : 'bg-accent')}>
                            {React.cloneElement(assetIcons[asset.type] as React.ReactElement, { className: 'h-4 w-4 sm:h-5 sm:w-5' })}
                          </div>
                          <div className="min-w-0">
                            <p className={cn('text-base font-semibold text-foreground truncate', isSold && 'text-muted-foreground')}>{asset.name}</p>
                            {isSold && (
                              <span className="text-[10px] sm:text-xs font-normal text-expense bg-expense/10 px-1 sm:px-1.5 py-0.5 rounded inline-block mt-0.5">Vendido</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <span className={cn('font-semibold text-sm sm:text-base whitespace-nowrap', isSold ? 'text-muted-foreground' : 'text-primary')}>
                          {formatCurrency(isSold && asset.saleValue ? asset.saleValue : asset.value)}
                        </span>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="flex justify-end gap-0.5 sm:gap-1">
                          <PropertyInsightsDialog property={asset} />
                          {!isSold && !hasActiveInsurance(asset.id) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600 hover:bg-amber-500/10" onClick={() => handleAddSeguro(asset.id)} title="Adicionar Seguro">
                              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => handleEditAsset(asset)}>
                            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 text-destructive" onClick={() => handleDeleteAsset(asset.id)}>
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {imoveis.map(asset => renderAssetCard(asset))}
        </div>
      )}
      <AssetCostBreakdown assets={config.assets} />
    </>
  );
};

export default MeusImoveis;
