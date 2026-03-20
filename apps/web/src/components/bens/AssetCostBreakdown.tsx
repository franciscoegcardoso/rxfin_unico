import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useFinancial } from '@/contexts/FinancialContext';
import { Asset, AssetLinkedExpense } from '@/types/financial';
import { 
  Building2, 
  Car, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp,
  Home,
  Fuel,
  Shield,
  Wrench,
  FileText,
  Droplets,
  Zap,
  Link2,
  Info,
  Settings2,
  ParkingCircle,
  Receipt,
  List,
  LayoutList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  calculateMonthlyIPVA,
  calculateMonthlyFuel,
  calculateMonthlyInsurance,
  calculateMonthlyMaintenance,
  calculateMonthlyLicensing,
  ipvaRates,
  fuelPrices,
  vehicleBenchmarks,
} from '@/data/vehicleBenchmarks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VehicleCostConfigDialog, VehicleCostConfig } from './VehicleCostConfigDialog';
import { VehicleExpenseDetailCard } from './VehicleExpenseDetailCard';

// Custos padrão por tipo de bem
const propertyExpenses = [
  { id: 'iptu', name: 'IPTU', icon: FileText, category: 'Contas da Casa', categoryId: 'home', isRecurring: true, description: 'Imposto Predial e Territorial Urbano' },
  { id: 'condominio', name: 'Condomínio', icon: Building2, category: 'Contas da Casa', categoryId: 'home', isRecurring: true, description: 'Taxa de condomínio mensal' },
  { id: 'manutencao_imovel', name: 'Manutenção Imóvel', icon: Wrench, category: 'Casa e Moradia', categoryId: 'housing', isRecurring: false, description: 'Reparos e manutenções' },
  { id: 'agua', name: 'Água', icon: Droplets, category: 'Contas da Casa', categoryId: 'home', isRecurring: true, description: 'Conta de água' },
  { id: 'luz', name: 'Luz', icon: Zap, category: 'Contas da Casa', categoryId: 'home', isRecurring: true, description: 'Conta de energia elétrica' },
  { id: 'seguro_residencial', name: 'Seguro Residencial', icon: Shield, category: 'Seguros e Assistências', categoryId: 'insurance', isRecurring: true, description: 'Seguro do imóvel' },
];

const propertyIncome = [
  { id: 'aluguel', name: 'Aluguel', icon: Home, description: 'Receita de aluguel mensal' },
];

const vehicleExpenses = [
  { id: 'ipva', name: 'IPVA', icon: FileText, category: 'Transporte e Veículo', categoryId: 'transport', isRecurring: true, frequency: 'annual' as const, description: 'Imposto sobre veículos - calculado pela alíquota do estado', hasBenchmark: true },
  { id: 'seguro_auto', name: 'Seguro Auto', icon: Shield, category: 'Seguros e Assistências', categoryId: 'insurance', isRecurring: true, frequency: 'annual' as const, description: 'Seguro do veículo - ~4% ao ano do valor FIPE', hasBenchmark: true },
  { id: 'licenciamento', name: 'Licenciamento/DPVAT', icon: FileText, category: 'Transporte e Veículo', categoryId: 'transport', isRecurring: true, frequency: 'annual' as const, description: 'Taxas anuais obrigatórias', hasBenchmark: true },
  { id: 'combustivel', name: 'Combustível', icon: Fuel, category: 'Transporte e Veículo', categoryId: 'transport', isRecurring: false, frequency: 'monthly' as const, description: 'Baseado em km/mês e consumo do veículo', hasBenchmark: true },
  { id: 'manutencao_veiculo', name: 'Manutenção', icon: Wrench, category: 'Transporte e Veículo', categoryId: 'transport', isRecurring: false, frequency: 'monthly' as const, description: 'Revisões, pneus, peças - ~2.5% ao ano do valor', hasBenchmark: true },
  { id: 'estacionamento', name: 'Estacionamento', icon: ParkingCircle, category: 'Transporte e Veículo', categoryId: 'transport', isRecurring: false, frequency: 'monthly' as const, description: 'Gastos com estacionamento', hasBenchmark: false },
  { id: 'sem_parar', name: 'Sem Parar / Pedágio', icon: Receipt, category: 'Transporte e Veículo', categoryId: 'transport', isRecurring: false, frequency: 'monthly' as const, description: 'Tag de pedágio e estacionamentos', hasBenchmark: false },
];

interface AssetCostBreakdownProps {
  assets: Asset[];
}

export const AssetCostBreakdown: React.FC<AssetCostBreakdownProps> = ({ assets }) => {
  const { config, addExpenseItemWithAssetLink, addIncomeItem } = useFinancial();
  const navigate = useNavigate();
  
  // Tipo genérico para despesas
  type ExpenseType = typeof vehicleExpenses[0] | typeof propertyExpenses[0];

  const propertiesAndVehicles = useMemo(() => {
    const filtered = assets.filter(a => a.type === 'property' || a.type === 'vehicle');
    
    // Separar ativos e vendidos
    const activeAssets = filtered.filter(a => !a.isSold);
    const soldAssets = filtered.filter(a => a.isSold);
    
    // Ordenar ativos por valor (decrescente)
    activeAssets.sort((a, b) => b.value - a.value);
    
    // Ordenar vendidos por data de venda (mais recente primeiro)
    soldAssets.sort((a, b) => {
      if (!a.saleDate && !b.saleDate) return 0;
      if (!a.saleDate) return 1;
      if (!b.saleDate) return -1;
      return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
    });
    
    // Retornar ativos primeiro, depois vendidos
    return [...activeAssets, ...soldAssets];
  }, [assets]);

  // Inicializa estado de expansão com todos os assets recolhidos (collapsed) por padrão
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    assets.filter(a => a.type === 'property' || a.type === 'vehicle').forEach(asset => {
      initial[asset.id] = false; // Default to collapsed
    });
    return initial;
  });
  
  const [costValues, setCostValues] = useState<Record<string, number>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  
  // Estado para o dialog de configuração de custo de veículo
  const [configDialog, setConfigDialog] = useState<{
    open: boolean;
    asset: Asset | null;
    expense: ExpenseType | null;
    benchmarkValue: number;
    existingConfig?: AssetLinkedExpense;
  }>({ open: false, asset: null, expense: null, benchmarkValue: 0 });

  // Calcula benchmarks para veículos
  const calculateVehicleBenchmarks = (asset: Asset): Record<string, number> => {
    if (asset.type !== 'vehicle') return {};
    
    const benchmarks: Record<string, number> = {};
    const vehicleValue = asset.value;
    const state = asset.vehicleState || 'SP';
    const monthlyKm = asset.monthlyKm || 1000;
    const consumption = asset.fuelConsumption || 10;
    const fuelType = asset.fuelType || 'flex';
    const customFuelPrice = asset.fuelPrice;

    benchmarks.ipva = calculateMonthlyIPVA(vehicleValue, state);
    benchmarks.seguro_auto = calculateMonthlyInsurance(vehicleValue);
    
    // Usa preço customizado do combustível se disponível
    if (customFuelPrice && customFuelPrice > 0) {
      const litersNeeded = monthlyKm / consumption;
      benchmarks.combustivel = litersNeeded * customFuelPrice;
    } else {
      benchmarks.combustivel = calculateMonthlyFuel(monthlyKm, consumption, fuelType);
    }
    
    benchmarks.manutencao_veiculo = calculateMonthlyMaintenance(vehicleValue);
    benchmarks.licenciamento = calculateMonthlyLicensing();

    return benchmarks;
  };

  // Inicializa benchmarks na montagem do componente
  useEffect(() => {
    if (isInitialized) return;
    
    const initialCostValues: Record<string, number> = {};
    propertiesAndVehicles.forEach(asset => {
      if (asset.type === 'vehicle') {
        const benchmarks = calculateVehicleBenchmarks(asset);
        Object.entries(benchmarks).forEach(([costId, value]) => {
          initialCostValues[`${asset.id}-${costId}`] = Math.round(value);
        });
      }
    });
    
    if (Object.keys(initialCostValues).length > 0) {
      setCostValues(prev => ({ ...initialCostValues, ...prev }));
    }
    setIsInitialized(true);
  }, [propertiesAndVehicles, isInitialized]);

  // Atualiza benchmarks quando assets são adicionados ou expandidos
  useEffect(() => {
    if (!isInitialized) return;
    
    propertiesAndVehicles.forEach(asset => {
      if (asset.type === 'vehicle' && expandedAssets[asset.id]) {
        const benchmarks = calculateVehicleBenchmarks(asset);
        Object.entries(benchmarks).forEach(([costId, value]) => {
          const key = `${asset.id}-${costId}`;
          if (costValues[key] === undefined || costValues[key] === 0) {
            setCostValues(prev => ({ ...prev, [key]: Math.round(value) }));
          }
        });
      }
    });
  }, [expandedAssets, propertiesAndVehicles, isInitialized]);

  const toggleAsset = (assetId: string) => {
    setExpandedAssets(prev => ({ ...prev, [assetId]: !prev[assetId] }));
  };

  // Verifica se um item já existe no planejamento
  const findPlanningItem = (assetName: string, costName: string, type: 'expense' | 'income') => {
    const searchName = `${costName} - ${assetName}`.toLowerCase();
    
    if (type === 'income') {
      return config.incomeItems.find(item => 
        item.name.toLowerCase().includes(assetName.toLowerCase()) && 
        item.name.toLowerCase().includes(costName.toLowerCase())
      );
    } else {
      return config.expenseItems.find(item => 
        item.name.toLowerCase().includes(assetName.toLowerCase()) && 
        item.name.toLowerCase().includes(costName.toLowerCase())
      );
    }
  };

  const handleLinkToPlanning = (asset: Asset, cost: typeof propertyExpenses[0] | typeof vehicleExpenses[0], type: 'expense') => {
    const itemName = `${cost.name} - ${asset.name}`;
    const key = `${asset.id}-${cost.id}`;
    const monthlyValue = costValues[key] || 0;
    
    addExpenseItemWithAssetLink(
      {
        name: itemName,
        categoryId: cost.categoryId,
        category: cost.category,
        expenseType: 'variable_essential',
        enabled: true,
        isRecurring: cost.isRecurring,
        paymentMethod: 'boleto',
      },
      asset.id,
      {
        expenseType: cost.id as any,
        monthlyValue: monthlyValue,
        isAutoCalculated: true,
        frequency: 'monthly',
      }
    );
    
    toast.success(`"${itemName}" adicionado ao planejamento com projeção de ${formatCurrency(monthlyValue)}/mês!`, {
      action: {
        label: 'Ver Planejamento',
        onClick: () => navigate('/planejamento-mensal'),
      },
    });
  };

  // Abre o dialog de configuração para despesas de veículo
  const openVehicleCostConfig = (asset: Asset, expense: ExpenseType, benchmarkValue: number, existingConfig?: AssetLinkedExpense) => {
    setConfigDialog({
      open: true,
      asset,
      expense,
      benchmarkValue,
      existingConfig,
    });
  };

  // Salva a configuração de custo de veículo
  const handleVehicleCostSave = (costConfig: VehicleCostConfig) => {
    if (!configDialog.asset || !configDialog.expense) return;

    const { asset, expense } = configDialog;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const key = `${asset.id}-${expense.id}`;
    const monthlyValue = costValues[key] || configDialog.benchmarkValue;

    if (costConfig.frequency === 'monthly') {
      const itemName = `${expense.name} - ${asset.name}`;
      addExpenseItemWithAssetLink(
        {
          name: itemName,
          categoryId: expense.categoryId,
          category: expense.category,
          expenseType: 'variable_essential',
          enabled: true,
          isRecurring: true,
          paymentMethod: costConfig.paymentMethod,
        },
        asset.id,
        {
          expenseType: expense.id as any,
          monthlyValue: monthlyValue,
          isAutoCalculated: true,
          frequency: 'monthly',
        }
      );
      
      toast.success(`"${itemName}" adicionado com projeção de ${formatCurrency(monthlyValue)}/mês!`, {
        action: { label: 'Ver Planejamento', onClick: () => navigate('/planejamento-mensal') },
      });
    } else {
      const selectedMonthsLabels = costConfig.selectedMonths.map(m => months[m - 1]).join(', ');
      const valuePerMonth = costConfig.annualValue / (costConfig.selectedMonths.length || 1);
      
      const itemName = `${expense.name} - ${asset.name} (${selectedMonthsLabels})`;
      addExpenseItemWithAssetLink(
        {
          name: itemName,
          categoryId: expense.categoryId,
          category: expense.category,
          expenseType: 'variable_essential',
          enabled: true,
          isRecurring: false,
          paymentMethod: costConfig.paymentMethod,
        },
        asset.id,
        {
          expenseType: expense.id as any,
          monthlyValue: valuePerMonth,
          isAutoCalculated: true,
          frequency: 'annual',
          annualMonths: costConfig.selectedMonths,
        }
      );

      toast.success(
        `"${expense.name}" configurado para ${costConfig.selectedMonths.length} mês(es)!`,
        {
          description: `Valor: ${formatCurrency(valuePerMonth)} por parcela - Projeção automática ativada`,
          action: { label: 'Ver Planejamento', onClick: () => navigate('/planejamento-mensal') },
        }
      );
    }

    setConfigDialog({ open: false, asset: null, expense: null, benchmarkValue: 0 });
  };

  const handleLinkIncomeToPlanning = (asset: Asset, income: typeof propertyIncome[0]) => {
    const itemName = `${income.name} - ${asset.name}`;
    
    addIncomeItem({
      name: itemName,
      enabled: true,
      method: 'net',
    });
    
    toast.success(`"${itemName}" adicionado ao planejamento!`, {
      action: {
        label: 'Ver Parâmetros',
        onClick: () => navigate('/parametros'),
      },
    });
  };

  // Link vehicle expense using the saved configuration
  const handleLinkVehicleExpense = (
    asset: Asset, 
    expense: typeof vehicleExpenses[0], 
    linkedExpense?: AssetLinkedExpense
  ) => {
    if (!linkedExpense) {
      toast.error('Configure a despesa antes de vincular ao planejamento.');
      return;
    }

    const itemName = linkedExpense.frequency === 'annual' && linkedExpense.annualMonths?.length
      ? `${expense.name} - ${asset.name} (${linkedExpense.annualMonths.map(m => ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m - 1]).join(', ')})`
      : `${expense.name} - ${asset.name}`;

    addExpenseItemWithAssetLink(
      {
        name: itemName,
        categoryId: expense.categoryId,
        category: expense.category,
        expenseType: 'variable_essential',
        enabled: true,
        isRecurring: expense.isRecurring,
        paymentMethod: linkedExpense.paymentMethod || 'boleto',
      },
      asset.id,
      {
        expenseType: linkedExpense.expenseType,
        monthlyValue: linkedExpense.monthlyValue,
        isAutoCalculated: false,
        frequency: linkedExpense.frequency,
        annualMonths: linkedExpense.annualMonths,
        paymentMethod: linkedExpense.paymentMethod,
      }
    );

    const monthlyAvg = linkedExpense.frequency === 'annual' && linkedExpense.annualMonths?.length
      ? (linkedExpense.monthlyValue * linkedExpense.annualMonths.length) / 12
      : linkedExpense.monthlyValue;

    toast.success(`"${expense.name}" vinculado ao planejamento!`, {
      description: `Média mensal: ${formatCurrency(monthlyAvg)}`,
      action: { label: 'Ver Planejamento', onClick: () => navigate('/planejamento-mensal') },
    });
  };

  const updateCostValue = (assetId: string, costId: string, value: number) => {
    setCostValues(prev => ({ ...prev, [`${assetId}-${costId}`]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getBenchmarkTooltip = (asset: Asset, costId: string): string | null => {
    if (asset.type !== 'vehicle') return null;
    
    const state = asset.vehicleState || 'SP';
    const stateInfo = ipvaRates[state];
    const fuelType = asset.fuelType || 'flex';
    const fuelPrice = asset.fuelPrice && asset.fuelPrice > 0 ? asset.fuelPrice : fuelPrices[fuelType];

    switch (costId) {
      case 'ipva':
        return `Cálculo: ${stateInfo?.rate || 4}% de ${formatCurrency(asset.value)} ÷ 12 meses. Alíquota de ${stateInfo?.name || state}.`;
      case 'seguro_auto':
        return `Estimativa: ~4% do valor FIPE ao ano (${formatCurrency(asset.value * 0.04)}) ÷ 12 meses.`;
      case 'combustivel':
        return `Cálculo: ${asset.monthlyKm || 1000} km/mês ÷ ${asset.fuelConsumption || 10} km/l × R$ ${fuelPrice?.toFixed(2) || '5,79'}/l`;
      case 'manutencao_veiculo':
        return `Estimativa: ~2,5% do valor FIPE ao ano para manutenção preventiva e corretiva.`;
      case 'licenciamento':
        return `Taxas anuais de licenciamento (média nacional ~R$ 150/ano).`;
      default:
        return null;
    }
  };

  if (propertiesAndVehicles.length === 0) return null;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Custos e Receitas por Bem
          </CardTitle>
          <CardDescription>
            Vincule despesas e receitas relacionadas a cada bem ao planejamento mensal.
            <span className="text-primary font-medium ml-1">Valores pré-calculados com base em benchmarks de mercado.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {propertiesAndVehicles.map(asset => {
            const isExpanded = expandedAssets[asset.id] === true;
            const isProperty = asset.type === 'property';
            const expenses = isProperty ? propertyExpenses : vehicleExpenses;
            const incomes = isProperty && asset.isRentalProperty ? propertyIncome : [];
            const vehicleBenchmarks = asset.type === 'vehicle' ? calculateVehicleBenchmarks(asset) : {};
            
            // Calcula totais - para veículos usa linkedExpenses, para imóveis usa costValues
            const totalExpenses = asset.type === 'vehicle'
              ? (asset.linkedExpenses || []).reduce((sum, le) => {
                  if (le.frequency === 'annual' && le.annualMonths?.length) {
                    return sum + (le.monthlyValue * le.annualMonths.length) / 12;
                  }
                  return sum + le.monthlyValue;
                }, 0)
              : expenses.reduce((sum, cost) => sum + (costValues[`${asset.id}-${cost.id}`] || 0), 0);
            
            const totalIncome = incomes.reduce((sum, inc) => {
              return sum + (costValues[`${asset.id}-${inc.id}`] || 0);
            }, 0);

            const isSold = asset.type === 'vehicle' && asset.isSold;

            return (
              <div key={asset.id} className={cn(
                "border border-border rounded-lg overflow-hidden",
                isSold && "opacity-60"
              )}>
                {/* Asset Header */}
                <button
                  onClick={() => toggleAsset(asset.id)}
                  className={cn(
                    "w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 transition-colors",
                    isSold ? "bg-muted/30 hover:bg-muted/40" : "bg-muted/50 hover:bg-muted/70"
                  )}
                >
                  {/* Top row on mobile / Left side on desktop */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      isSold 
                        ? "bg-muted-foreground/10" 
                        : isProperty ? "bg-primary/10" : "bg-warning/10"
                    )}>
                      {isProperty 
                        ? <Building2 className={cn("h-4 w-4 sm:h-5 sm:w-5", isSold ? "text-muted-foreground" : "text-primary")} /> 
                        : <Car className={cn("h-4 w-4 sm:h-5 sm:w-5", isSold ? "text-muted-foreground" : "text-warning")} />}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn("font-semibold text-sm", isSold && "text-muted-foreground")}>{asset.name}</h4>
                        {isSold && (
                          <span className="text-[10px] bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full">
                            Vendido
                          </span>
                        )}
                        {isProperty && asset.linkExpensesToPlanning && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                <Link2 className="h-3 w-3" />
                                Vinculado
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Receitas e despesas sincronizadas com o planejamento mensal</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isProperty ? 'Imóvel' : 'Veículo'} • Valor: {formatCurrency(asset.value)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Bottom row on mobile / Right side on desktop */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                    <div className="flex items-center gap-3 text-xs sm:text-sm">
                      {totalExpenses > 0 && (
                        <span className="text-expense font-medium whitespace-nowrap">
                          -{formatCurrency(totalExpenses)}/mês
                        </span>
                      )}
                      {totalIncome > 0 && (
                        <span className="text-income font-medium whitespace-nowrap">
                          +{formatCurrency(totalIncome)}/mês
                        </span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Vehicle Parameters Info */}
                    {asset.type === 'vehicle' && (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg text-xs">
                        <span><strong>km/mês:</strong> {asset.monthlyKm || 1000}</span>
                        <span><strong>Consumo:</strong> {asset.fuelConsumption || 10} km/l</span>
                        <span><strong>Combustível:</strong> {asset.fuelType === 'gasoline' ? 'Gasolina' : asset.fuelType === 'ethanol' ? 'Etanol' : asset.fuelType === 'diesel' ? 'Diesel' : 'Flex'}</span>
                        <span><strong>Preço/L:</strong> R$ {(asset.fuelPrice || fuelPrices[asset.fuelType || 'flex'])?.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Income Section (only for rental properties) */}
                    {incomes.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-income flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4" />
                          Receitas Potenciais
                        </h5>
                        <div className="space-y-2">
                          {incomes.map(income => {
                            const existingItem = findPlanningItem(asset.name, income.name, 'income');
                            const isLinked = !!existingItem;
                            
                            return (
                              <div key={income.id} className="flex items-center justify-between p-3 bg-income/5 rounded-lg border border-income/10">
                                <div className="flex items-center gap-3">
                                  <income.icon className="h-4 w-4 text-income" />
                                  <div>
                                    <p className="font-medium text-sm">{income.name}</p>
                                    <p className="text-xs text-muted-foreground">{income.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <CurrencyInput
                                    compact
                                    className="w-28 h-8 text-xs"
                                    value={costValues[`${asset.id}-${income.id}`] || 0}
                                    onChange={(value) => updateCostValue(asset.id, income.id, value)}
                                    placeholder="Valor/mês"
                                  />
                                  {isLinked ? (
                                    <span className="text-xs text-income bg-income/10 px-2 py-1 rounded flex items-center gap-1">
                                      <Link2 className="h-3 w-3" />
                                      Vinculado
                                    </span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-8 border-income/30 text-income hover:bg-income/10"
                                      onClick={() => handleLinkIncomeToPlanning(asset, income)}
                                    >
                                      <Link2 className="h-3 w-3 mr-1" />
                                      Vincular
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Expense Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-expense flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          Despesas Relacionadas
                        </h5>
                        {asset.type === 'vehicle' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() => setCompactMode(!compactMode)}
                          >
                            {compactMode ? (
                              <>
                                <LayoutList className="h-3.5 w-3.5 mr-1" />
                                Detalhado
                              </>
                            ) : (
                              <>
                                <List className="h-3.5 w-3.5 mr-1" />
                                Compacto
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <div className={cn("space-y-2", compactMode && "space-y-1")}>
                        {asset.type === 'vehicle' ? (
                          // Vehicle expenses with detail cards
                          vehicleExpenses.map(expense => {
                            const existingItem = findPlanningItem(asset.name, expense.name, 'expense');
                            const isLinked = !!existingItem;
                            const benchmarkValue = vehicleBenchmarks[expense.id] || 0;
                            const tooltipText = getBenchmarkTooltip(asset, expense.id);
                            const linkedExpense = asset.linkedExpenses?.find(
                              le => le.expenseType === expense.id
                            );
                            
                            return (
                              <VehicleExpenseDetailCard
                                key={expense.id}
                                asset={asset}
                                expense={{
                                  id: expense.id,
                                  name: expense.name,
                                  icon: expense.icon,
                                  description: expense.description,
                                  frequency: expense.frequency,
                                  hasBenchmark: expense.hasBenchmark,
                                }}
                                linkedExpense={linkedExpense}
                                benchmarkValue={benchmarkValue}
                                isLinked={isLinked}
                                tooltipText={tooltipText}
                                onLink={() => handleLinkVehicleExpense(asset, expense, linkedExpense)}
                                onConfigure={() => openVehicleCostConfig(asset, expense, benchmarkValue)}
                                onEdit={() => openVehicleCostConfig(asset, expense, linkedExpense?.monthlyValue || benchmarkValue, linkedExpense)}
                                compact={compactMode}
                              />
                            );
                          })
                        ) : (
                          // Property expenses with editable input
                          expenses.map(expense => {
                            const existingItem = findPlanningItem(asset.name, expense.name, 'expense');
                            const isLinked = !!existingItem;
                            
                            return (
                              <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-expense/5 rounded-lg border border-expense/10 gap-2">
                                <div className="flex items-center gap-3">
                                  <expense.icon className="h-4 w-4 text-expense" />
                                  <div>
                                    <p className="font-medium text-sm">{expense.name}</p>
                                    <p className="text-xs text-muted-foreground">{expense.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 justify-end">
                                  <CurrencyInput
                                    compact
                                    className="w-28 h-8 text-xs"
                                    value={costValues[`${asset.id}-${expense.id}`] || 0}
                                    onChange={(value) => updateCostValue(asset.id, expense.id, value)}
                                    placeholder="Valor/mês"
                                  />
                                  {isLinked ? (
                                    <span className="text-xs text-income bg-income/10 px-2 py-1 rounded flex items-center gap-1">
                                      <Link2 className="h-3 w-3" />
                                      Vinculado
                                    </span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-8 border-expense/30 text-expense hover:bg-expense/10"
                                      onClick={() => handleLinkToPlanning(asset, expense, 'expense')}
                                    >
                                      <Link2 className="h-3 w-3 mr-1" />
                                      Vincular
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 justify-end text-sm">
                      {totalIncome > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Receita mensal:</span>
                          <span className="font-bold text-income">
                            {formatCurrency(totalIncome)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Custo mensal:</span>
                        <span className="font-bold text-expense">
                          {formatCurrency(totalExpenses)}
                        </span>
                      </div>
                      {totalIncome > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Resultado:</span>
                          <span className={cn(
                            "font-bold",
                            totalIncome - totalExpenses >= 0 ? "text-income" : "text-expense"
                          )}>
                            {formatCurrency(totalIncome - totalExpenses)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Valores pré-calculados com benchmarks de mercado. Clique em "Configurar" para definir meses e forma de pagamento.
          </p>
        </CardContent>
      </Card>

      {/* Dialog de configuração de custo de veículo */}
      {configDialog.asset && configDialog.expense && (
        <VehicleCostConfigDialog
          open={configDialog.open}
          onOpenChange={(open) => setConfigDialog(prev => ({ ...prev, open }))}
          costId={configDialog.expense.id}
          costName={configDialog.expense.name}
          benchmarkValue={configDialog.benchmarkValue}
          assetName={configDialog.asset.name}
          onSave={handleVehicleCostSave}
          defaultConfig={configDialog.existingConfig ? {
            frequency: configDialog.existingConfig.frequency === 'annual' ? 'annual' : 'monthly',
            paymentMethod: configDialog.existingConfig.paymentMethod,
            annualValue: configDialog.existingConfig.frequency === 'annual' && configDialog.existingConfig.annualMonths?.length
              ? configDialog.existingConfig.monthlyValue * configDialog.existingConfig.annualMonths.length
              : configDialog.existingConfig.monthlyValue * 12,
            monthlyValue: configDialog.existingConfig.monthlyValue,
            selectedMonths: configDialog.existingConfig.annualMonths || [],
          } : undefined}
        />
      )}
    </TooltipProvider>
  );
};

export default AssetCostBreakdown;