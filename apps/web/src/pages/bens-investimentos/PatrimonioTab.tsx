import React, { useState, useMemo } from 'react';
import { Building2, Car, TrendingUp, Package, Plus, Trash2, Home, DollarSign, CalendarIcon, TrendingDown, Percent, Pencil, Landmark, LayoutGrid, List, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFinancial } from '@/contexts/FinancialContext';
import { useBensInvestimentos } from '@/contexts/BensInvestimentosContext';
import { assetTypes, patrimonioAssetTypes } from '@/data/defaultData';
import { AssetType, type Asset } from '@/types/financial';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { VehicleInsightsDialog } from '@/components/bens/VehicleInsightsDialog';
import { PropertyInsightsDialog } from '@/components/bens/PropertyInsightsDialog';
import { AssetCostBreakdown } from '@/components/bens/AssetCostBreakdown';
import { AssetInsuranceBadge } from '@/components/bens/AssetInsuranceBadge';
import { AssetInsuranceReport } from '@/components/bens/AssetInsuranceReport';
import { EquityEvolutionSection } from '@/components/bens/EquityEvolutionSection';
import { assetIcons, propertyAdjustmentOptions, monthOptions } from './constants';
import { useIsMobile } from '@/hooks/use-mobile';

const PatrimonioTab: React.FC = () => {
  const { config } = useFinancial();
  const { handleOpenAddDialog, handleEditAsset, handleDeleteAsset, handleAddSeguro, hasActiveInsurance, formatCurrency } = useBensInvestimentos();
  const isMobile = useIsMobile();
  const [patrimonioViewMode, setPatrimonioViewMode] = useState<'list' | 'cards'>('list');
  const [imovelCollapsed, setImovelCollapsed] = useState(false);
  const [veiculoCollapsed, setVeiculoCollapsed] = useState(false);
  const [outrosCollapsed, setOutrosCollapsed] = useState(false);

  const patrimonioAssets = useMemo(() => {
    const assets = config.assets.filter(asset => asset.type !== 'investment');
    const activeAssets = assets.filter(a => !a.isSold);
    const soldAssets = assets.filter(a => a.isSold);
    activeAssets.sort((a, b) => b.value - a.value);
    soldAssets.sort((a, b) => {
      if (!a.saleDate && !b.saleDate) return 0;
      if (!a.saleDate) return 1;
      if (!b.saleDate) return -1;
      return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
    });
    return [...activeAssets, ...soldAssets];
  }, [config.assets]);

  const totalPatrimonio = patrimonioAssets
    .filter(asset => !asset.isSold)
    .reduce((sum, asset) => {
      if (asset.type === 'obligations') return sum - asset.value;
      return sum + asset.value;
    }, 0);

  const totalByType = patrimonioAssets.reduce((acc, asset) => {
    acc[asset.type] = (acc[asset.type] || 0) + asset.value;
    return acc;
  }, {} as Record<AssetType, number>);

  const imoveis = useMemo(() => patrimonioAssets.filter(a => a.type === 'property'), [patrimonioAssets]);
  const veiculos = useMemo(() => patrimonioAssets.filter(a => a.type === 'vehicle'), [patrimonioAssets]);
  const outrosBens = useMemo(() => patrimonioAssets.filter(a => a.type !== 'property' && a.type !== 'vehicle'), [patrimonioAssets]);
  const imovelCount = imoveis.length;
  const veiculoCount = veiculos.length;

  const renderAssetCard = (asset: Asset) => {
    const isSold = asset.isSold;
    const cardContent = (
      <Card
        key={asset.id}
        className={cn(
          "group hover:shadow-md transition-shadow relative overflow-hidden min-w-0",
          isMobile && "cursor-pointer",
          isSold && "bg-gradient-to-br from-muted/30 to-muted/10 border-muted-foreground/10 opacity-75"
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
              <div className={cn("p-2 rounded-lg shrink-0", isSold ? "bg-muted-foreground/10" : "bg-accent")}>
                {assetIcons[asset.type]}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={cn("text-base font-semibold text-foreground truncate", isSold && "text-muted-foreground")}>{asset.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {assetTypes.find(t => t.value === asset.type)?.label}
                </p>
                {asset.description && (
                  <p className="text-xs text-muted-foreground mt-1">{asset.description}</p>
                )}
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
            <div
              className={cn("flex flex-wrap items-center gap-1", isSold && "mt-6")}
              onClick={(e) => e.stopPropagation()}
              role="group"
              aria-label="Ações do item"
            >
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => handleEditAsset(asset)}
                >
                  Ver detalhes
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {asset.type === 'property' && <PropertyInsightsDialog property={asset} />}
              {asset.type === 'vehicle' && <VehicleInsightsDialog vehicle={asset} />}
              {(asset.type === 'property' || asset.type === 'vehicle') && !isSold && !hasActiveInsurance(asset.id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:text-amber-300", !isMobile && "opacity-0 group-hover:opacity-100 transition-opacity")}
                  onClick={() => handleAddSeguro(asset.id)}
                  title="Adicionar Seguro"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={cn(!isMobile && "opacity-0 group-hover:opacity-100 transition-opacity")}
                onClick={() => handleEditAsset(asset)}
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("text-destructive hover:text-destructive", !isMobile && "opacity-0 group-hover:opacity-100 transition-opacity")}
                onClick={() => handleDeleteAsset(asset.id)}
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t min-w-0">
            <p className={cn("mt-3 text-2xl font-bold text-primary tabular-nums truncate", isSold && "text-muted-foreground")}>
              {formatCurrency(isSold && asset.saleValue != null ? asset.saleValue : asset.value)}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <AssetInsuranceBadge assetId={asset.id} assetName={asset.name} showLabel size="md" showUninsured={['property', 'vehicle', 'valuable_objects'].includes(asset.type) && !isSold} />
              {asset.isRentalProperty && !isSold && (
                <>
                  <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Home className="h-3 w-3" />
                    Gera aluguel
                  </span>
                  {asset.rentAdjustmentMonth && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground mt-1 px-2 py-1 rounded bg-muted">
                      <CalendarIcon className="h-3 w-3" />
                      Reajuste: {monthOptions.find(m => m.value === asset.rentAdjustmentMonth)?.label}
                    </span>
                  )}
                  {asset.rentAdjustmentReminder && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                      🔔 Lembrete ativo
                    </span>
                  )}
                </>
              )}
              {asset.isZeroKm && !isSold && (
                <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                  <Car className="h-3 w-3" />
                  Zero KM
                </span>
              )}
              {asset.propertyAdjustment && asset.propertyAdjustment !== 'none' && !isSold && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground mt-1 px-2 py-1 rounded bg-muted">
                  <TrendingUp className="h-3 w-3" />
                  {propertyAdjustmentOptions.find(o => o.value === asset.propertyAdjustment)?.label}
                </span>
              )}
              {asset.vehicleAdjustment === 'fipe' && asset.fipePercentage != null && !isSold && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground mt-1 px-2 py-1 rounded bg-muted">
                  <Percent className="h-3 w-3" />
                  {asset.fipePercentage}% FIPE
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );

    if (isMobile) {
      return (
        <div
          key={asset.id}
          role="button"
          tabIndex={0}
          onClick={() => handleEditAsset(asset)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleEditAsset(asset);
            }
          }}
          className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        >
          {cardContent}
        </div>
      );
    }
    return cardContent;
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenAddDialog()} className="gap-2 w-full sm:w-auto min-h-[44px] touch-manipulation">
          <Plus className="h-4 w-4" />
          Adicionar Patrimônio
        </Button>
      </div>

      {/* Resumo Compacto */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 py-2 px-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Total:</span>
          <span className="text-sm font-bold text-primary">{formatCurrency(totalPatrimonio)}</span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-border" />
        {patrimonioAssetTypes.filter(t => totalByType[t.value as AssetType] > 0).map(({ value, label }) => (
          <div key={value} className="flex items-center gap-1.5">
            <div className="p-1 rounded bg-accent/50">
              {React.cloneElement(assetIcons[value as AssetType] as React.ReactElement, { className: "h-3 w-3" })}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">{label}:</span>
            <span className="text-sm font-medium tabular-nums">{formatCurrency(totalByType[value as AssetType] || 0)}</span>
          </div>
        ))}
      </div>

      {/* Lista de Bens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">Meu Patrimônio</h2>
            <AssetInsuranceReport />
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={patrimonioViewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setPatrimonioViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={patrimonioViewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setPatrimonioViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {patrimonioAssets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-0">
              <EmptyState
                icon={<Package className="h-6 w-6 text-muted-foreground" />}
                description="Você ainda não cadastrou nenhum bem"
                actionLabel="Adicionar primeiro item"
                onAction={() => handleOpenAddDialog()}
              />
            </CardContent>
          </Card>
        ) : patrimonioViewMode === 'list' ? (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground text-sm">Nome</th>
                    <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground text-sm hidden sm:table-cell">Tipo</th>
                    <th className="text-right p-3 sm:p-4 font-medium text-muted-foreground text-sm">Valor</th>
                    <th className="text-right p-3 sm:p-4 font-medium text-muted-foreground w-16 sm:w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {patrimonioAssets.map((asset) => {
                    const isSold = asset.isSold;
                    return (
                      <tr
                        key={asset.id}
                        className={cn(
                          "border-b last:border-0 hover:bg-muted/30 transition-colors group",
                          isSold && "opacity-60"
                        )}
                      >
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className={cn(
                              "p-1.5 sm:p-2 rounded-lg shrink-0",
                              isSold ? "bg-muted-foreground/10" : "bg-accent"
                            )}>
                              {React.cloneElement(assetIcons[asset.type] as React.ReactElement, { className: "h-4 w-4 sm:h-5 sm:w-5" })}
                            </div>
                            <div className="min-w-0">
                              <p className={cn("font-medium text-sm sm:text-base truncate", isSold && "text-muted-foreground")}>
                                {asset.name}
                              </p>
                              {isSold && (
                                <span className="text-[10px] sm:text-xs font-normal text-expense bg-expense/10 px-1 sm:px-1.5 py-0.5 rounded inline-block mt-0.5">
                                  Vendido
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 sm:hidden">
                                <span className="text-xs text-muted-foreground">
                                  {assetTypes.find(t => t.value === asset.type)?.label}
                                </span>
                                <AssetInsuranceBadge assetId={asset.id} assetName={asset.name} showUninsured={['property', 'vehicle', 'valuable_objects'].includes(asset.type) && !isSold} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {assetTypes.find(t => t.value === asset.type)?.label}
                            </span>
                            <AssetInsuranceBadge assetId={asset.id} assetName={asset.name} showUninsured={['property', 'vehicle', 'valuable_objects'].includes(asset.type) && !isSold} />
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 text-right">
                          <span className={cn(
                            "font-semibold text-sm sm:text-base whitespace-nowrap",
                            isSold ? "text-muted-foreground" : "text-primary"
                          )}>
                            {formatCurrency(isSold && asset.saleValue ? asset.saleValue : asset.value)}
                          </span>
                        </td>
                        <td className="p-2 sm:p-4">
                          <div className="flex justify-end gap-0.5 sm:gap-1">
                            {asset.type === 'property' && <PropertyInsightsDialog property={asset} />}
                            {asset.type === 'vehicle' && <VehicleInsightsDialog vehicle={asset} />}
                            {(asset.type === 'property' || asset.type === 'vehicle') && !isSold && !hasActiveInsurance(asset.id) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:text-amber-300"
                                onClick={() => handleAddSeguro(asset.id)}
                                title="Adicionar Seguro"
                              >
                                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={() => handleEditAsset(asset)}>
                              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={() => handleDeleteAsset(asset.id)}>
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
          /* Cards View — seções recolhíveis: Imóveis, Veículos, Outros */
          <div className="space-y-8">
            {/* Seção Meus Imóveis */}
            <div className="space-y-4">
              <div
                className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => setImovelCollapsed(v => !v)}
                role="button"
                aria-expanded={!imovelCollapsed}
              >
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  Meus Imóveis
                  {imovelCollapsed && imovelCount > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      ({imovelCount} {imovelCount === 1 ? 'item' : 'itens'})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="gap-1.5" onClick={e => { e.stopPropagation(); handleOpenAddDialog(undefined, undefined, 'property'); }}>
                    <Plus className="h-4 w-4" />
                    Adicionar imóvel
                  </Button>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", imovelCollapsed && "rotate-180")} />
                </div>
              </div>
              {!imovelCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {imoveis.map((asset) => renderAssetCard(asset))}
                </div>
              )}
            </div>

            {/* Seção Meus Veículos */}
            <div className="space-y-4">
              <div
                className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => setVeiculoCollapsed(v => !v)}
                role="button"
                aria-expanded={!veiculoCollapsed}
              >
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Meus Veículos
                  {veiculoCollapsed && veiculos.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      ({veiculos.length} {veiculos.length === 1 ? 'item' : 'itens'})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="gap-1.5" onClick={e => { e.stopPropagation(); handleOpenAddDialog(undefined, undefined, 'vehicle'); }}>
                    <Plus className="h-4 w-4" />
                    Adicionar veículo
                  </Button>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", veiculoCollapsed && "rotate-180")} />
                </div>
              </div>
              {!veiculoCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {veiculos.map((asset) => renderAssetCard(asset))}
                </div>
              )}
            </div>

            {/* Seção Outros bens */}
            {outrosBens.length > 0 && (
              <div className="space-y-4">
                <div
                  className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setOutrosCollapsed(v => !v)}
                  role="button"
                  aria-expanded={!outrosCollapsed}
                >
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Outros bens
                    {outrosCollapsed && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        ({outrosBens.length} {outrosBens.length === 1 ? 'item' : 'itens'})
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="gap-1.5" onClick={e => { e.stopPropagation(); handleOpenAddDialog(); }}>
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", outrosCollapsed && "rotate-180")} />
                  </div>
                </div>
                {!outrosCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {outrosBens.map((asset) => renderAssetCard(asset))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custos e Receitas por Bem */}
      <AssetCostBreakdown assets={config.assets} />

      {/* Evolução Patrimonial */}
      <EquityEvolutionSection />
    </>
  );
};

export default PatrimonioTab;
