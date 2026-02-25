import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSeguros } from '@/hooks/useSeguros';
import { useFinancial } from '@/contexts/FinancialContext';
import { Insurance, insuranceTypeLabels } from '@/types/seguro';
import { cn } from '@/lib/utils';
import {
  FileText,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Building2,
  Car,
  Package,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const assetTypeIcons: Record<string, React.ReactNode> = {
  property: <Building2 className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  investment: <TrendingUp className="h-4 w-4" />,
  other: <Package className="h-4 w-4" />,
};

interface AssetInsuranceGroup {
  asset: {
    id: string;
    name: string;
    type: string;
    value: number;
  };
  insurances: Insurance[];
  totalPremioAnual: number;
  totalCobertura: number;
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
  warrantyCount: number;
}

interface ReportSummary {
  totalAssets: number;
  assetsWithInsurance: number;
  assetsWithoutInsurance: number;
  totalPremioAnual: number;
  totalCobertura: number;
  totalActive: number;
  totalExpiring: number;
  totalExpired: number;
  totalWarranties: number;
}

export const AssetInsuranceReport: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const { seguros } = useSeguros();
  const { config } = useFinancial();

  const { groups, summary } = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Get assets that can have insurance (property, vehicle, etc.)
    const eligibleAssets = config.assets.filter(a => 
      !a.isSold && ['property', 'vehicle', 'valuable_objects', 'other'].includes(a.type)
    );

    const assetGroups: AssetInsuranceGroup[] = [];
    let totalActive = 0;
    let totalExpiring = 0;
    let totalExpired = 0;
    let totalWarranties = 0;
    let overallPremio = 0;
    let overallCobertura = 0;
    let assetsWithInsurance = 0;

    eligibleAssets.forEach(asset => {
      const linkedSeguros = seguros.filter(s => s.asset_id === asset.id);
      
      if (linkedSeguros.length === 0) return;
      
      assetsWithInsurance++;

      let activeCount = 0;
      let expiringCount = 0;
      let expiredCount = 0;
      let warrantyCount = 0;
      let assetPremio = 0;
      let assetCobertura = 0;

      linkedSeguros.forEach(seguro => {
        const endDate = new Date(seguro.data_fim);
        const startDate = new Date(seguro.data_inicio);

        assetPremio += seguro.premio_anual || 0;
        assetCobertura += seguro.valor_cobertura || 0;

        if (seguro.is_warranty) {
          warrantyCount++;
          totalWarranties++;
        }

        if (endDate < today) {
          expiredCount++;
          totalExpired++;
        } else if (endDate <= thirtyDaysFromNow) {
          expiringCount++;
          totalExpiring++;
        } else if (startDate <= today) {
          activeCount++;
          totalActive++;
        }
      });

      overallPremio += assetPremio;
      overallCobertura += assetCobertura;

      assetGroups.push({
        asset: {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          value: asset.value,
        },
        insurances: linkedSeguros,
        totalPremioAnual: assetPremio,
        totalCobertura: assetCobertura,
        activeCount,
        expiringCount,
        expiredCount,
        warrantyCount,
      });
    });

    // Sort by total premium (highest first)
    assetGroups.sort((a, b) => b.totalPremioAnual - a.totalPremioAnual);

    const reportSummary: ReportSummary = {
      totalAssets: eligibleAssets.length,
      assetsWithInsurance,
      assetsWithoutInsurance: eligibleAssets.length - assetsWithInsurance,
      totalPremioAnual: overallPremio,
      totalCobertura: overallCobertura,
      totalActive,
      totalExpiring,
      totalExpired,
      totalWarranties,
    };

    return { groups: assetGroups, summary: reportSummary };
  }, [seguros, config.assets]);

  const toggleAssetExpanded = (assetId: string) => {
    setExpandedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const getInsuranceStatus = (seguro: Insurance) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const endDate = new Date(seguro.data_fim);
    const startDate = new Date(seguro.data_inicio);

    if (endDate < today) {
      return { label: 'Vencido', color: 'bg-expense/10 text-expense border-expense/30' };
    }
    if (endDate <= thirtyDaysFromNow) {
      return { label: 'Vencendo', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
    }
    if (startDate <= today) {
      return { label: 'Ativo', color: 'bg-income/10 text-income border-income/30' };
    }
    return { label: 'Futuro', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Relatório de Seguros
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Relatório de Seguros e Garantias por Bem
          </DialogTitle>
          <DialogDescription>
            Visão consolidada de todas as coberturas vinculadas ao patrimônio
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            <TabsTrigger value="details">Por Bem</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-income" />
                    Ativos
                  </div>
                  <p className="text-2xl font-bold text-income">{summary.totalActive}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                    Vencendo
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{summary.totalExpiring}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <ShieldX className="h-3.5 w-3.5 text-expense" />
                    Vencidos
                  </div>
                  <p className="text-2xl font-bold text-expense">{summary.totalExpired}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    Garantias
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{summary.totalWarranties}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Custo Anual Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(summary.totalPremioAnual)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Média mensal: {formatCurrency(summary.totalPremioAnual / 12)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Cobertura Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-income">
                    {formatCurrency(summary.totalCobertura)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.assetsWithInsurance} de {summary.totalAssets} bens protegidos
                  </p>
                </CardContent>
              </Card>
            </div>

            {summary.assetsWithoutInsurance > 0 && (
              <Card className="mt-4 border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-700">
                        {summary.assetsWithoutInsurance} bem(ns) sem seguro
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Considere adicionar proteção aos seus bens
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-3 pr-4">
                {groups.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        Nenhum seguro vinculado a bens
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  groups.map(group => {
                    const isExpanded = expandedAssets.has(group.asset.id);

                    return (
                      <Card key={group.asset.id}>
                        <CardContent className="p-0">
                          <button
                            onClick={() => toggleAssetExpanded(group.asset.id)}
                            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-accent">
                                {assetTypeIcons[group.asset.type] || assetTypeIcons.other}
                              </div>
                              <div className="text-left">
                                <p className="font-semibold">{group.asset.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {group.activeCount > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-income/50 bg-income/10 text-income">
                                      <ShieldCheck className="h-3 w-3 mr-1" />
                                      {group.activeCount}
                                    </Badge>
                                  )}
                                  {group.expiringCount > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 bg-amber-500/10 text-amber-600">
                                      <ShieldAlert className="h-3 w-3 mr-1" />
                                      {group.expiringCount}
                                    </Badge>
                                  )}
                                  {group.expiredCount > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-expense/50 bg-expense/10 text-expense">
                                      <ShieldX className="h-3 w-3 mr-1" />
                                      {group.expiredCount}
                                    </Badge>
                                  )}
                                  {group.warrantyCount > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 bg-blue-500/10 text-blue-600">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {group.warrantyCount}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold text-sm">
                                  {formatCurrency(group.totalPremioAnual)}/ano
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Cobertura: {formatCurrency(group.totalCobertura)}
                                </p>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t px-4 pb-4">
                              <div className="space-y-2 mt-3">
                                {group.insurances.map(seguro => {
                                  const status = getInsuranceStatus(seguro);

                                  return (
                                    <div
                                      key={seguro.id}
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm">{seguro.nome}</span>
                                          <Badge variant="outline" className={cn("text-[10px]", status.color)}>
                                            {status.label}
                                          </Badge>
                                          {seguro.is_warranty && (
                                            <Badge variant="outline" className="text-[10px] border-blue-500/50 bg-blue-500/10 text-blue-600">
                                              Garantia
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                          <span>{insuranceTypeLabels[seguro.tipo]}</span>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(seguro.data_inicio), 'dd/MM/yy')} - {format(new Date(seguro.data_fim), 'dd/MM/yy')}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right text-sm">
                                        <p className="font-medium">{formatCurrency(seguro.premio_anual)}/ano</p>
                                        <p className="text-xs text-muted-foreground">
                                          Cob: {formatCurrency(seguro.valor_cobertura)}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
