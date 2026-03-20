import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/shared/EmptyState';
import { PluggyInvestmentsSection } from './PluggyInvestmentsSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFinancial } from '@/contexts/FinancialContext';
import { financialInstitutions, investmentTypes } from '@/data/defaultData';
import { Asset, InvestmentType } from '@/types/financial';
import { InteractiveTreemap, type TreemapItem } from '@/components/charts/InteractiveTreemap';
import { AssetLogo } from '@/components/ui/AssetLogo';
import {
  TrendingUp,
  Plus,
  Building2,
  Pencil,
  ChevronDown,
  ChevronUp,
  PiggyBank,
  Landmark,
  Bitcoin,
  Globe,
  Shield,
  BarChart3,
  Wallet,
  AlertTriangle,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useManualInvestments } from '@/hooks/useManualInvestments';
import { ManualInvestmentModal } from '@/components/investimentos/ManualInvestmentModal';
import { ManualInvestmentsList } from '@/components/investimentos/ManualInvestmentsList';
import type { ManualInvestment } from '@/types/investments';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/** Map InvestmentType to AssetLogo assetType (ManualInvestmentType-like) for logo fallback. */
function assetTypeForLogo(investmentType?: InvestmentType): string {
  if (!investmentType) return 'OTHER';
  const map: Partial<Record<InvestmentType, string>> = {
    renda_variavel: 'STOCK',
    ofertas_publicas: 'STOCK',
    fii: 'REAL_ESTATE_FUND',
    etf: 'ETF',
    criptoativos: 'CRYPTO',
  };
  return map[investmentType] ?? 'OTHER';
}

// Ícones por tipo de investimento
const investmentIcons: Record<InvestmentType, React.ReactNode> = {
  fgts: <Landmark className="h-4 w-4" />,
  reserva_emergencia: <Shield className="h-4 w-4" />,
  dinheiro_especie: <Wallet className="h-4 w-4" />,
  metais_preciosos: <Wallet className="h-4 w-4" />,
  aplicacao_financeira: <PiggyBank className="h-4 w-4" />,
  renda_fixa: <PiggyBank className="h-4 w-4" />,
  fundos_investimento: <BarChart3 className="h-4 w-4" />,
  coe: <Wallet className="h-4 w-4" />,
  renda_variavel: <TrendingUp className="h-4 w-4" />,
  fii: <Building2 className="h-4 w-4" />,
  etf: <BarChart3 className="h-4 w-4" />,
  ofertas_publicas: <TrendingUp className="h-4 w-4" />,
  clubes_investimento: <Wallet className="h-4 w-4" />,
  investimento_global: <Globe className="h-4 w-4" />,
  previdencia_privada: <Shield className="h-4 w-4" />,
  previdencia_corporativa: <Building2 className="h-4 w-4" />,
  seguro: <Shield className="h-4 w-4" />,
  criptoativos: <Bitcoin className="h-4 w-4" />,
  debentures: <Landmark className="h-4 w-4" />,
  cri_cra: <Landmark className="h-4 w-4" />,
  outros: <Wallet className="h-4 w-4" />,
};

// Cores por tipo de investimento
const investmentColors: Record<InvestmentType, string> = {
  fgts: 'bg-blue-700',
  reserva_emergencia: 'bg-emerald-600',
  dinheiro_especie: 'bg-green-500',
  metais_preciosos: 'bg-yellow-600',
  aplicacao_financeira: 'bg-blue-400',
  renda_fixa: 'bg-blue-500',
  fundos_investimento: 'bg-purple-500',
  coe: 'bg-indigo-500',
  renda_variavel: 'bg-green-500',
  fii: 'bg-orange-500',
  etf: 'bg-teal-500',
  ofertas_publicas: 'bg-cyan-500',
  clubes_investimento: 'bg-pink-500',
  investimento_global: 'bg-sky-500',
  previdencia_privada: 'bg-amber-500',
  previdencia_corporativa: 'bg-violet-600',
  seguro: 'bg-emerald-500',
  criptoativos: 'bg-yellow-500',
  debentures: 'bg-rose-500',
  cri_cra: 'bg-lime-500',
  outros: 'bg-gray-500',
};

interface InvestmentsSectionProps {
  onAddInvestment: (institutionId?: string, investmentType?: InvestmentType) => void;
  onEditInvestment: (asset: Asset) => void;
  onDeleteInvestment?: (assetId: string) => void;
}

export const InvestmentsSection: React.FC<InvestmentsSectionProps> = ({
  onAddInvestment,
  onEditInvestment,
  onDeleteInvestment,
}) => {
  const { config, updateAsset } = useFinancial();
  const navigate = useNavigate();
  const [expandedTypes, setExpandedTypes] = useState<Set<InvestmentType>>(new Set());
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [groupBy, setGroupBy] = useState<'type' | 'institution'>('type');
  const manualInv = useManualInvestments();
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualEdit, setManualEdit] = useState<ManualInvestment | null>(null);
  const [pluggyRefreshTrigger, setPluggyRefreshTrigger] = useState(0);
  const [showManualList, setShowManualList] = useState(false);

  const openManualModal = useCallback(() => {
    setManualEdit(null);
    setManualModalOpen(true);
    setShowManualList(true);
  }, []);

  const onManualSaved = useCallback(() => {
    setPluggyRefreshTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    if (manualInv.items.length > 0) setShowManualList(true);
  }, [manualInv.items.length]);

  // Função para verificar se uma instituição existe
  const isValidInstitution = (institutionId: string | undefined): boolean => {
    if (!institutionId) return false;
    const userInst = config.financialInstitutions.find(fi => fi.id === institutionId);
    if (userInst) return true;
    return false; // Só aceita instituições cadastradas pelo usuário
  };

  // Função para inferir instituição pelo nome do ativo
  const inferInstitutionFromName = (assetName: string): string | null => {
    const lowerName = assetName.toLowerCase();
    
    for (const fi of config.financialInstitutions) {
      const inst = financialInstitutions.find(i => i.id === fi.institutionId);
      const instName = (fi.customName || inst?.name || '').toLowerCase();
      if (instName && instName.length > 2 && lowerName.includes(instName)) {
        return fi.id;
      }
    }
    
    for (const fi of config.financialInstitutions) {
      const inst = financialInstitutions.find(i => i.id === fi.institutionId);
      if (inst) {
        const instName = inst.name.toLowerCase();
        if (instName.length > 2 && lowerName.includes(instName)) {
          return fi.id;
        }
      }
    }
    
    return null;
  };

  // Filtrar apenas investimentos que têm instituição válida ou podem ser inferidos
  const investments = useMemo(() => {
    return config.assets.filter(asset => {
      if (asset.type !== 'investment') return false;
      
      // Tem instituição válida cadastrada
      if (isValidInstitution(asset.investmentInstitutionId)) return true;
      
      // Pode ser inferido para uma instituição cadastrada
      const inferredId = inferInstitutionFromName(asset.name);
      if (inferredId) return true;
      
      return false;
    });
  }, [config.assets, config.financialInstitutions]);

  // Agrupar por tipo de investimento
  const investmentsByType = useMemo(() => {
    const grouped: Record<InvestmentType, Asset[]> = {} as Record<InvestmentType, Asset[]>;
    
    investments.forEach(inv => {
      const type = inv.investmentType || 'outros';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(inv);
    });

    return grouped;
  }, [investments]);

  // Total de investimentos
  const totalInvestments = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.value, 0);
  }, [investments]);

  // Totais por tipo
  const totalsByType = useMemo(() => {
    const totals: Record<InvestmentType, number> = {} as Record<InvestmentType, number>;
    
    Object.entries(investmentsByType).forEach(([type, assets]) => {
      totals[type as InvestmentType] = assets.reduce((sum, a) => sum + a.value, 0);
    });

    return totals;
  }, [investmentsByType]);

  // Obter instituição financeira pelo ID
  const getInstitutionName = (institutionId?: string) => {
    if (!institutionId) return null;
    
    // Primeiro buscar nas instituições do usuário
    const userInst = config.financialInstitutions.find(fi => fi.id === institutionId);
    if (userInst) {
      if (userInst.customName) return userInst.customName;
      const defaultInst = financialInstitutions.find(i => i.id === userInst.institutionId);
      return defaultInst?.name || 'Instituição';
    }
    
    // Depois buscar nas instituições padrão
    const defaultInst = financialInstitutions.find(i => i.id === institutionId);
    return defaultInst?.name || null;
  };

  const toggleExpanded = (type: InvestmentType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const getInvestmentTypeLabel = (type: InvestmentType) => {
    return investmentTypes.find(t => t.value === type)?.label || 'Outros';
  };

  const treemapData = useMemo((): TreemapItem[] => {
    return Object.entries(totalsByType)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([type, total]) => {
        const invType = type as InvestmentType;
        const assetsOfType = investmentsByType[invType] || [];
        return {
          id: type,
          name: getInvestmentTypeLabel(invType),
          value: total,
          count: assetsOfType.length,
          children: assetsOfType.map(a => ({
            id: a.id,
            name: a.name || a.investmentTicker || type,
            value: a.value,
            count: 1,
          })),
        };
      });
  }, [totalsByType, investmentsByType]);

  const treemapDataByInstitution = useMemo((): TreemapItem[] => {
    const byInstitution: Record<string, Asset[]> = {};
    investments.forEach(inv => {
      let key: string;
      const rawKey = inv.investmentInstitutionId;
      if (rawKey && isValidInstitution(rawKey)) {
        key = rawKey;
      } else {
        const inferredId = inferInstitutionFromName(inv.name);
        key = inferredId || '__sem_instituicao__';
      }
      if (!byInstitution[key]) byInstitution[key] = [];
      byInstitution[key].push(inv);
    });
    const filteredEntries = Object.entries(byInstitution).filter(
      ([key]) => key !== '__sem_instituicao__' || byInstitution[key].length > 0
    );
    const sortedEntries = filteredEntries.sort(([, assetsA], [, assetsB]) => {
      const totalA = assetsA.reduce((sum, a) => sum + a.value, 0);
      const totalB = assetsB.reduce((sum, a) => sum + a.value, 0);
      return totalB - totalA;
    });
    return sortedEntries
      .filter(([key]) => key !== '__sem_instituicao__')
      .map(([institutionId, assets]) => {
        const total = assets.reduce((sum, a) => sum + a.value, 0);
        const name = getInstitutionName(institutionId) || 'Instituição';
        return {
          id: institutionId,
          name,
          value: total,
          count: assets.length,
          children: assets.map(a => ({
            id: a.id,
            name: a.name || a.investmentTicker || institutionId,
            value: a.value,
            count: 1,
          })),
        };
      });
  }, [investments]);

  // Detectar investimentos órfãos que podem ser auto-vinculados
  const orphanedInvestmentsWithSuggestion = useMemo(() => {
    return investments
      .filter(inv => !inv.investmentInstitutionId || !isValidInstitution(inv.investmentInstitutionId))
      .map(inv => {
        const suggestedInstitutionId = inferInstitutionFromName(inv.name);
        return {
          asset: inv,
          suggestedInstitutionId,
          suggestedInstitutionName: suggestedInstitutionId ? getInstitutionName(suggestedInstitutionId) : null,
        };
      })
      .filter(item => item.suggestedInstitutionId !== null);
  }, [investments, config.financialInstitutions]);

  // Função para aplicar correção automática
  const handleAutoFix = () => {
    orphanedInvestmentsWithSuggestion.forEach(({ asset, suggestedInstitutionId }) => {
      if (suggestedInstitutionId) {
        updateAsset(asset.id, { investmentInstitutionId: suggestedInstitutionId });
      }
    });
    setAlertDismissed(true);
  };

  if (investments.length === 0) {
    return (
      <div className="space-y-6">
        <SectionErrorBoundary fallbackTitle="Status Open Finance / Pluggy">
          <PluggyInvestmentsSection
            refreshTrigger={pluggyRefreshTrigger}
            onAddManual={openManualModal}
          />
        </SectionErrorBoundary>
        <ManualInvestmentsList
          items={manualInv.items}
          onEdit={(item) => {
            setManualEdit(item);
            setManualModalOpen(true);
            setShowManualList(true);
          }}
          onRemove={async (id) => {
            await manualInv.remove(id);
            onManualSaved();
          }}
          onAdd={openManualModal}
          showSection={showManualList || manualInv.items.length > 0}
        />
        <ManualInvestmentModal
          open={manualModalOpen}
          onClose={() => {
            setManualModalOpen(false);
            setManualEdit(null);
          }}
          onSaved={onManualSaved}
          editItem={manualEdit ?? undefined}
          add={manualInv.add}
          update={manualInv.update}
          remove={manualInv.remove}
        />
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
              description="Você ainda não cadastrou nenhum bem ou direito"
              actionLabel="Adicionar primeiro bem/direito"
              onAction={() => onAddInvestment()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Investimentos via Open Finance (Pluggy) */}
      <SectionErrorBoundary fallbackTitle="Status Open Finance / Pluggy">
        <PluggyInvestmentsSection
          refreshTrigger={pluggyRefreshTrigger}
          onAddManual={openManualModal}
        />
      </SectionErrorBoundary>

      <ManualInvestmentsList
        items={manualInv.items}
        onEdit={(item) => {
          setManualEdit(item);
          setManualModalOpen(true);
          setShowManualList(true);
        }}
        onRemove={async (id) => {
          await manualInv.remove(id);
          onManualSaved();
        }}
        onAdd={openManualModal}
        showSection={showManualList || manualInv.items.length > 0}
      />
      <ManualInvestmentModal
        open={manualModalOpen}
        onClose={() => {
          setManualModalOpen(false);
          setManualEdit(null);
        }}
        onSaved={onManualSaved}
        editItem={manualEdit ?? undefined}
        add={manualInv.add}
        update={manualInv.update}
        remove={manualInv.remove}
      />

      {/* Investimentos manuais (config) */}
      <div id="investimentos-manuais" className="scroll-mt-4 space-y-4">
      {/* Alerta de investimentos órfãos com sugestão de correção */}
      {!alertDismissed && orphanedInvestmentsWithSuggestion.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="font-medium text-amber-800 dark:text-amber-200">
                {orphanedInvestmentsWithSuggestion.length} investimento{orphanedInvestmentsWithSuggestion.length > 1 ? 's' : ''} sem instituição vinculada
              </span>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {orphanedInvestmentsWithSuggestion.map(i => `"${i.asset.name}" → ${i.suggestedInstitutionName}`).join('; ')}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setAlertDismissed(true)}
                className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-700 dark:hover:bg-amber-900"
              >
                Ignorar
              </Button>
              <Button 
                size="sm" 
                onClick={handleAutoFix}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Corrigir automaticamente
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header com total */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total em Investimentos</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalInvestments)}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/instituicoes-financeiras')}
                className="gap-2"
              >
                <Landmark className="h-4 w-4" />
                Gerenciar Bancos
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Composição da Carteira (treemap) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      >
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Composição da Carteira</CardTitle>
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <Button
                size="sm"
                variant={groupBy === 'type' ? 'secondary' : 'ghost'}
                className="h-6 text-xs px-2"
                onClick={() => setGroupBy('type')}
              >
                Por tipo
              </Button>
              <Button
                size="sm"
                variant={groupBy === 'institution' ? 'secondary' : 'ghost'}
                className="h-6 text-xs px-2"
                onClick={() => setGroupBy('institution')}
              >
                Por banco
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const data = groupBy === 'type' ? treemapData : treemapDataByInstitution;
              return data.length > 0 ? (
                <InteractiveTreemap
                  data={data}
                  formatValue={formatCurrency}
                  isHidden={false}
                  height={220}
                  showLegend={true}
                  groupSmallItems={true}
                  smallItemThreshold={4}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum investimento para exibir
                </p>
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerta de concentração */}
      {Object.entries(totalsByType).some(
        ([, v]) => totalInvestments > 0 && v / totalInvestments > 0.6
      ) && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Alta concentração detectada — uma classe representa mais de 60% da carteira.
            Considere diversificar.
          </span>
        </div>
      )}

      {/* Detalhe por tipo (accordion com edit/delete) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhe por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(totalsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, total]) => {
                const investmentType = type as InvestmentType;
                const percentage = totalInvestments > 0 ? (total / totalInvestments) * 100 : 0;
                const assetsOfType = investmentsByType[investmentType] || [];
                const isExpanded = expandedTypes.has(investmentType);

                return (
                  <div key={type} className="space-y-2">
                    <button
                      onClick={() => toggleExpanded(investmentType)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-white",
                          investmentColors[investmentType]
                        )}>
                          {investmentIcons[investmentType]}
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{getInvestmentTypeLabel(investmentType)}</p>
                          <p className="text-xs text-muted-foreground">
                            {assetsOfType.length} {assetsOfType.length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(total)}</p>
                          <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    <Progress 
                      value={percentage} 
                      className={cn("h-2", `[&>div]:${investmentColors[investmentType]}`)}
                    />

                    {isExpanded && (
                      <div className="ml-11 space-y-2 pt-2">
                        {assetsOfType.map(asset => {
                          const institutionName = getInstitutionName(asset.investmentInstitutionId);
                          const assetPercentage = totalInvestments > 0 
                            ? (asset.value / totalInvestments) * 100 
                            : 0;
                          if (asset.investmentType?.toUpperCase() === 'FIXED_INCOME') {
                            console.log('RENDA FIXA logo_url:', asset.logo_url, asset.investmentTicker);
                          }

                          return (
                            <div
                              key={asset.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <AssetLogo
                                  ticker={asset.investmentTicker}
                                  assetType={assetTypeForLogo(asset.investmentType)}
                                  logoUrl={asset.logo_url}
                                  companyDomain={asset.company_domain}
                                  name={asset.name}
                                  size="md"
                                  showTooltip
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium">{asset.name}</p>
                                  {asset.investmentTicker && (
                                    <p className="text-xs text-muted-foreground">{asset.investmentTicker}</p>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {institutionName && (
                                      <span className="flex items-center gap-1">
                                        <Landmark className="h-3 w-3" />
                                        {institutionName}
                                      </span>
                                    )}
                                    {asset.investmentQuantity && (
                                      <span>• {asset.investmentQuantity} cotas</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="font-semibold">{formatCurrency(asset.value)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {assetPercentage.toFixed(1)}% do total
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEditInvestment(asset)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {onDeleteInvestment && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDeleteInvestment(asset.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Lista completa por instituição */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Investimentos por Instituição</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            // Agrupar por instituição, normalizando IDs inválidos e inferindo pelo nome
            const byInstitution: Record<string, Asset[]> = {};
            investments.forEach(inv => {
              let key: string;
              
              const rawKey = inv.investmentInstitutionId;
              if (rawKey && isValidInstitution(rawKey)) {
                key = rawKey;
              } else {
                // Tentar inferir pelo nome
                const inferredId = inferInstitutionFromName(inv.name);
                key = inferredId || '__sem_instituicao__';
              }
              
              if (!byInstitution[key]) byInstitution[key] = [];
              byInstitution[key].push(inv);
            });

            // Filtrar a seção "sem instituição" se estiver vazia
            const filteredEntries = Object.entries(byInstitution).filter(
              ([key]) => key !== '__sem_instituicao__' || byInstitution[key].length > 0
            );

            // Ordenar: instituições válidas primeiro (por valor total decrescente), sem instituição por último
            const sortedEntries = filteredEntries.sort(([keyA, assetsA], [keyB, assetsB]) => {
              // "Sem instituição" sempre por último
              if (keyA === '__sem_instituicao__') return 1;
              if (keyB === '__sem_instituicao__') return -1;
              
              // Ordenar por valor total decrescente
              const totalA = assetsA.reduce((sum, a) => sum + a.value, 0);
              const totalB = assetsB.reduce((sum, a) => sum + a.value, 0);
              return totalB - totalA;
            });

            // Não exibir a seção "Sem instituição" se tiver apenas ativos que foram inferidos
            const displayEntries = sortedEntries.filter(
              ([key]) => key !== '__sem_instituicao__'
            );

            // Se não houver nenhum investimento para exibir
            if (displayEntries.length === 0) {
              return (
                <EmptyState
                  icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
                  description="Nenhum bem ou direito cadastrado com instituição vinculada"
                  actionLabel="Adicionar primeiro bem/direito"
                  onAction={() => onAddInvestment()}
                  className="py-6"
                />
              );
            }

            return (
              <div className="space-y-4">
                {displayEntries.map(([institutionId, assets]) => {
                  const institutionName = getInstitutionName(institutionId) || 'Instituição';
                  const institutionTotal = assets.reduce((sum, a) => sum + a.value, 0);

                  return (
                    <div key={institutionId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{institutionName}</span>
                          <Badge variant="secondary">{assets.length}</Badge>
                        </div>
                        <span className="font-semibold">{formatCurrency(institutionTotal)}</span>
                      </div>
                      <div className="space-y-2">
                        {assets.map(asset => (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between py-2 px-3 rounded bg-muted/30"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <AssetLogo
                                ticker={asset.investmentTicker}
                                assetType={assetTypeForLogo(asset.investmentType)}
                                logoUrl={asset.logo_url}
                                companyDomain={asset.company_domain}
                                name={asset.name}
                                size="md"
                                showTooltip
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{asset.name}</p>
                                {asset.investmentTicker && (
                                  <p className="text-xs text-muted-foreground">{asset.investmentTicker}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatCurrency(asset.value)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onEditInvestment(asset)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {onDeleteInvestment && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => onDeleteInvestment(asset.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
