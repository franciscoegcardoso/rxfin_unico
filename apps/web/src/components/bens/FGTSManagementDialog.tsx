import React, { useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useFinancial } from '@/contexts/FinancialContext';
import { useFGTSEntries, FGTSEntryInput } from '@/hooks/useFGTSEntries';
import { 
  Landmark, 
  CalendarDays, 
  Info, 
  AlertTriangle, 
  Gift,
  TrendingUp,
  Plus,
  History,
  ArrowUp,
  ArrowDown,
  Loader2,
  Calculator,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FGTSManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Calcula o valor do Saque Aniversário baseado na tabela oficial da Caixa (2024)
 * https://www.caixa.gov.br/beneficios-trabalhador/fgts/saque-aniversario/Paginas/default.aspx
 */
export function calcularSaqueAniversario(saldo: number): { valor: number; aliquota: number; adicional: number } {
  if (saldo <= 500) {
    return { valor: saldo * 0.50, aliquota: 50, adicional: 0 };
  }
  if (saldo <= 1000) {
    return { valor: saldo * 0.40 + 50, aliquota: 40, adicional: 50 };
  }
  if (saldo <= 5000) {
    return { valor: saldo * 0.30 + 150, aliquota: 30, adicional: 150 };
  }
  if (saldo <= 10000) {
    return { valor: saldo * 0.20 + 650, aliquota: 20, adicional: 650 };
  }
  if (saldo <= 15000) {
    return { valor: saldo * 0.15 + 1150, aliquota: 15, adicional: 1150 };
  }
  if (saldo <= 20000) {
    return { valor: saldo * 0.10 + 1900, aliquota: 10, adicional: 1900 };
  }
  return { valor: saldo * 0.05 + 2900, aliquota: 5, adicional: 2900 };
}

/**
 * Calcula a data do próximo saque aniversário
 */
export function calcularProximoSaque(birthMonth: number): { month: string; year: number; daysUntil: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  let saqueYear = currentYear;
  let saqueMonth = birthMonth;
  
  // Se já passou o mês de aniversário deste ano, o próximo é no ano que vem
  if (currentMonth > birthMonth) {
    saqueYear = currentYear + 1;
  }
  
  // Primeiro dia útil do mês de aniversário (simplificado para dia 1)
  const saqueDate = new Date(saqueYear, saqueMonth - 1, 1);
  const daysUntil = Math.ceil((saqueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    month: monthNames[saqueMonth - 1],
    year: saqueYear,
    daysUntil: Math.max(0, daysUntil)
  };
}

export const FGTSManagementDialog: React.FC<FGTSManagementDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { config, updateUserProfile, updateAsset } = useFinancial();
  const { userProfile } = config;
  
  // FGTS entries hook
  const { entries, isLoading: entriesLoading, addEntry, isAdding } = useFGTSEntries();
  
  // State for new entry form
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [newDeposit, setNewDeposit] = useState(0);
  const [newYield, setNewYield] = useState(0);
  const [entryMonth, setEntryMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  
  // Calcular depósito sugerido baseado no salário bruto (8%)
  const suggestedDeposit = useMemo(() => {
    // Buscar itens de renda que sejam salário
    const salaryIncomes = config.incomeItems.filter(
      item => item.enabled && 
        (item.name.toLowerCase().includes('salário') || 
         item.name.toLowerCase().includes('salario'))
    );
    
    // Somar todos os salários brutos encontrados
    const totalGross = salaryIncomes.reduce((sum, income) => {
      return sum + (income.grossValue || 0);
    }, 0);
    
    // 8% do salário bruto (valor já está em centavos, converter para reais)
    const depositValue = (totalGross / 100) * 0.08;
    
    return {
      value: depositValue,
      hasSalary: salaryIncomes.length > 0,
      salaryCount: salaryIncomes.length,
      totalGross: totalGross / 100
    };
  }, [config.incomeItems]);
  
  // Calcular saldo total de FGTS
  const fgtsAssets = useMemo(() => {
    return config.assets.filter(
      asset => asset.type === 'investment' && asset.investmentType === 'fgts'
    );
  }, [config.assets]);
  
  const saldoTotal = useMemo(() => {
    return fgtsAssets.reduce((sum, asset) => sum + asset.value, 0);
  }, [fgtsAssets]);
  
  // Calcular projeção anual do FGTS
  const annualProjection = useMemo(() => {
    // Buscar itens de renda que sejam salário (não 13º nem férias)
    const salaryIncomes = config.incomeItems.filter(
      item => item.enabled && 
        (item.name.toLowerCase().includes('salário') || 
         item.name.toLowerCase().includes('salario')) &&
        !item.name.toLowerCase().includes('13') &&
        !item.name.toLowerCase().includes('décimo') &&
        !item.name.toLowerCase().includes('decimo')
    );
    
    // Buscar 13º salário
    const thirteenthIncomes = config.incomeItems.filter(
      item => item.enabled && 
        (item.name.toLowerCase().includes('13') ||
         item.name.toLowerCase().includes('décimo terceiro') ||
         item.name.toLowerCase().includes('decimo terceiro'))
    );
    
    // Somar salários brutos
    const totalMonthlyGross = salaryIncomes.reduce((sum, income) => {
      return sum + (income.grossValue || 0);
    }, 0) / 100; // Converter centavos para reais
    
    // Somar 13º bruto
    const total13thGross = thirteenthIncomes.reduce((sum, income) => {
      return sum + (income.grossValue || 0);
    }, 0) / 100;
    
    // Cálculos FGTS (8%)
    const monthlyDeposit = totalMonthlyGross * 0.08;
    const annualRegularDeposits = monthlyDeposit * 12;
    
    // Férias: 1/3 adicional sobre o salário
    const vacationBonus = totalMonthlyGross / 3;
    const vacationDeposit = (totalMonthlyGross + vacationBonus) * 0.08;
    
    // 13º: geralmente pago em 2 parcelas
    const thirteenthDeposit = (total13thGross > 0 ? total13thGross : totalMonthlyGross) * 0.08;
    
    // Rendimento estimado (TR + 3% a.a. ~ 0.25% a.m. sobre saldo médio)
    const currentBalance = saldoTotal;
    const averageBalance = currentBalance + (annualRegularDeposits / 2);
    const estimatedYield = averageBalance * 0.03; // 3% ao ano aproximado
    
    // Total anual
    const totalAnnualDeposits = annualRegularDeposits + vacationDeposit + thirteenthDeposit;
    const projectedBalance = currentBalance + totalAnnualDeposits + estimatedYield;
    
    return {
      hasSalary: salaryIncomes.length > 0,
      monthlyGross: totalMonthlyGross,
      monthlyDeposit,
      annualRegularDeposits,
      vacationBonus,
      vacationDeposit,
      thirteenthGross: total13thGross > 0 ? total13thGross : totalMonthlyGross,
      thirteenthDeposit,
      estimatedYield,
      totalAnnualDeposits,
      currentBalance,
      projectedBalance
    };
  }, [config.incomeItems, saldoTotal]);
  
  // State for projection collapse
  const [projectionOpen, setProjectionOpen] = useState(false);
  
  // Calcular valor do saque
  const saqueInfo = useMemo(() => {
    return calcularSaqueAniversario(saldoTotal);
  }, [saldoTotal]);
  
  // Calcular próximo saque
  const proximoSaque = useMemo(() => {
    if (!userProfile.fgtsBirthMonth) return null;
    return calcularProximoSaque(userProfile.fgtsBirthMonth);
  }, [userProfile.fgtsBirthMonth]);
  
  const isSaqueAniversarioEnabled = userProfile.fgtsSaqueAniversarioEnabled || false;

  // Get previous balance for selected asset
  const getPreviousBalance = (assetId: string): number => {
    const asset = fgtsAssets.find(a => a.id === assetId);
    return asset?.value || 0;
  };

  // Handle adding new entry
  const handleAddEntry = async () => {
    if (!selectedAssetId) return;
    
    const previousBalance = getPreviousBalance(selectedAssetId);
    const finalBalance = previousBalance + newDeposit + newYield;
    
    const entry: FGTSEntryInput = {
      asset_id: selectedAssetId,
      month: entryMonth,
      previous_balance: previousBalance,
      deposit: newDeposit,
      yield: newYield,
      final_balance: finalBalance,
    };
    
    await addEntry(entry);
    
    // Update the asset value
    updateAsset(selectedAssetId, { value: finalBalance });
    
    // Reset form
    setNewDeposit(0);
    setNewYield(0);
    setShowAddEntry(false);
  };

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR })
      });
    }
    return options;
  }, []);

  // Group entries by asset
  const entriesByAsset = useMemo(() => {
    const grouped: Record<string, typeof entries> = {};
    for (const entry of entries) {
      if (!grouped[entry.asset_id]) {
        grouped[entry.asset_id] = [];
      }
      grouped[entry.asset_id].push(entry);
    }
    return grouped;
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-blue-700" />
            Gerenciar FGTS
          </DialogTitle>
          <DialogDescription>
            Configure a modalidade de saque e registre movimentações
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Saldo Total */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Saldo Total FGTS</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(saldoTotal)}
                    </p>
                    {fgtsAssets.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        {fgtsAssets.length} {fgtsAssets.length === 1 ? 'conta' : 'contas'} cadastrada{fgtsAssets.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-700 flex items-center justify-center">
                    <Landmark className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Toggle Saque Aniversário */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Gift className="h-4 w-4 text-green-600" />
                      Saque Aniversário
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receba parte do FGTS anualmente no mês do seu aniversário
                    </p>
                  </div>
                  <Switch
                    checked={isSaqueAniversarioEnabled}
                    onCheckedChange={(checked) => 
                      updateUserProfile({ fgtsSaqueAniversarioEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuração do mês de aniversário */}
            {isSaqueAniversarioEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Mês de Aniversário
                  </Label>
                  <Select
                    value={userProfile.fgtsBirthMonth?.toString() || ''}
                    onValueChange={(value) => 
                      updateUserProfile({ fgtsBirthMonth: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor do Saque Estimado */}
                {saldoTotal > 0 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700">Valor Estimado do Saque</p>
                          <p className="text-2xl font-bold text-green-900">
                            {formatCurrency(saqueInfo.valor)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-white">
                          Alíquota: {saqueInfo.aliquota}%
                        </Badge>
                        {saqueInfo.adicional > 0 && (
                          <Badge variant="outline" className="bg-white">
                            Adicional: {formatCurrency(saqueInfo.adicional)}
                          </Badge>
                        )}
                      </div>
                      {proximoSaque && (
                        <div className="pt-2 border-t border-green-200">
                          <p className="text-sm text-green-700">
                            Próximo saque: <span className="font-medium">{proximoSaque.month}/{proximoSaque.year}</span>
                            {proximoSaque.daysUntil > 0 && (
                              <span className="text-green-600"> (em {proximoSaque.daysUntil} dias)</span>
                            )}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Alerta sobre carência */}
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Atenção à carência de 25 meses
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Ao optar pelo Saque Aniversário, você abre mão do saque total em caso de 
                          demissão sem justa causa. Para voltar à modalidade Saque Rescisão, 
                          é necessário aguardar 25 meses.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Projeção Anual */}
            {suggestedDeposit.hasSalary && (
              <Collapsible open={projectionOpen} onOpenChange={setProjectionOpen}>
                <Card className="border-purple-200">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-2 cursor-pointer hover:bg-purple-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-purple-600" />
                          Projeção Anual do FGTS
                        </CardTitle>
                        {projectionOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      {!projectionOpen && (
                        <p className="text-xs text-muted-foreground text-left">
                          Saldo projetado: <span className="font-medium text-purple-700">{formatCurrency(annualProjection.projectedBalance)}</span>
                          {' '}(+{formatCurrency(annualProjection.totalAnnualDeposits + annualProjection.estimatedYield)})
                        </p>
                      )}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {/* Depósitos Mensais */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Depósitos Regulares (12 meses)
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground">Mensal (8%)</span>
                            <span className="font-medium">{formatCurrency(annualProjection.monthlyDeposit)}</span>
                          </div>
                          <div className="flex justify-between bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground">Anual</span>
                            <span className="font-medium">{formatCurrency(annualProjection.annualRegularDeposits)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Férias */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Férias (salário + 1/3)
                        </h4>
                        <div className="flex justify-between text-sm bg-amber-50 rounded px-2 py-1">
                          <span className="text-amber-700">8% sobre {formatCurrency(annualProjection.monthlyGross + annualProjection.vacationBonus)}</span>
                          <span className="font-medium text-amber-800">{formatCurrency(annualProjection.vacationDeposit)}</span>
                        </div>
                      </div>

                      {/* 13º Salário */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          13º Salário
                        </h4>
                        <div className="flex justify-between text-sm bg-green-50 rounded px-2 py-1">
                          <span className="text-green-700">8% sobre {formatCurrency(annualProjection.thirteenthGross)}</span>
                          <span className="font-medium text-green-800">{formatCurrency(annualProjection.thirteenthDeposit)}</span>
                        </div>
                      </div>

                      {/* Rendimento Estimado */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Rendimento Estimado (TR + 3% a.a.)
                        </h4>
                        <div className="flex justify-between text-sm bg-blue-50 rounded px-2 py-1">
                          <span className="text-blue-700">~3% sobre saldo médio</span>
                          <span className="font-medium text-blue-800">{formatCurrency(annualProjection.estimatedYield)}</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Resumo */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Saldo Atual</span>
                          <span>{formatCurrency(annualProjection.currentBalance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Depósitos</span>
                          <span className="text-income">+{formatCurrency(annualProjection.totalAnnualDeposits)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Rendimento</span>
                          <span className="text-blue-600">+{formatCurrency(annualProjection.estimatedYield)}</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold pt-2 border-t">
                          <span>Saldo Projetado (12m)</span>
                          <span className="text-purple-700">{formatCurrency(annualProjection.projectedBalance)}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2">
                        <Info className="h-3 w-3 inline mr-1" />
                        Projeção baseada no salário bruto cadastrado de {formatCurrency(annualProjection.monthlyGross)}. 
                        Valores reais podem variar conforme reajustes salariais e taxas de rendimento.
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            <Separator />

            {/* Movimentações Mensais */}
            {fgtsAssets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Movimentações Mensais
                  </h3>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setSelectedAssetId(fgtsAssets[0]?.id || '');
                      setShowAddEntry(!showAddEntry);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar
                  </Button>
                </div>

                {/* Add Entry Form */}
                {showAddEntry && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Nova Movimentação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {fgtsAssets.length > 1 && (
                        <div className="space-y-1">
                          <Label className="text-xs">Conta FGTS</Label>
                          <Select
                            value={selectedAssetId}
                            onValueChange={setSelectedAssetId}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fgtsAssets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name} - {formatCurrency(asset.value)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Mês de Referência</Label>
                        <Select
                          value={entryMonth}
                          onValueChange={setEntryMonth}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {monthOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <ArrowUp className="h-3 w-3 text-income" />
                            Depósito (8% salário)
                          </Label>
                          <div className="flex gap-1">
                            <CurrencyInput
                              value={newDeposit}
                              onChange={setNewDeposit}
                              placeholder="0,00"
                              compact
                              className="h-8 flex-1"
                            />
                            {suggestedDeposit.hasSalary && suggestedDeposit.value > 0 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs whitespace-nowrap"
                                onClick={() => setNewDeposit(suggestedDeposit.value)}
                                title={`Sugestão: 8% de ${formatCurrency(suggestedDeposit.totalGross)} (${suggestedDeposit.salaryCount} salário${suggestedDeposit.salaryCount > 1 ? 's' : ''})`}
                              >
                                Sugerir
                              </Button>
                            )}
                          </div>
                          {suggestedDeposit.hasSalary && suggestedDeposit.value > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Sugestão: {formatCurrency(suggestedDeposit.value)} (8% de {formatCurrency(suggestedDeposit.totalGross)})
                            </p>
                          )}
                          {!suggestedDeposit.hasSalary && (
                            <p className="text-[10px] text-amber-600">
                              Cadastre um salário em Parâmetros para sugestão automática
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-blue-600" />
                            Rendimento (TR+3%)
                          </Label>
                          <CurrencyInput
                            value={newYield}
                            onChange={setNewYield}
                            placeholder="0,00"
                            compact
                            className="h-8"
                          />
                        </div>
                      </div>

                      {selectedAssetId && (
                        <div className="pt-2 border-t text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Saldo anterior:</span>
                            <span>{formatCurrency(getPreviousBalance(selectedAssetId))}</span>
                          </div>
                          <div className="flex justify-between font-medium text-foreground">
                            <span>Novo saldo:</span>
                            <span className="text-income">
                              {formatCurrency(getPreviousBalance(selectedAssetId) + newDeposit + newYield)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowAddEntry(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={handleAddEntry}
                          disabled={isAdding || !selectedAssetId || (newDeposit === 0 && newYield === 0)}
                        >
                          {isAdding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Salvar'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Entries */}
                {entriesLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : entries.length > 0 ? (
                  <div className="space-y-2">
                    {entries.slice(0, 5).map(entry => {
                      const asset = fgtsAssets.find(a => a.id === entry.asset_id);
                      const monthDate = new Date(entry.month + '-01');
                      return (
                        <div 
                          key={entry.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {format(monthDate, 'MMMM yyyy', { locale: ptBR })}
                            </p>
                            {fgtsAssets.length > 1 && (
                              <p className="text-xs text-muted-foreground">{asset?.name}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-xs">
                              {entry.deposit > 0 && (
                                <span className="text-income flex items-center gap-0.5">
                                  <ArrowUp className="h-3 w-3" />
                                  {formatCurrency(entry.deposit)}
                                </span>
                              )}
                              {entry.yield > 0 && (
                                <span className="text-blue-600 flex items-center gap-0.5">
                                  <TrendingUp className="h-3 w-3" />
                                  {formatCurrency(entry.yield)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Saldo: {formatCurrency(entry.final_balance)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    description="Você ainda não registrou nenhuma movimentação"
                    actionLabel="Adicionar primeira movimentação"
                    onAction={() => setShowAddEntry(true)}
                    className="py-4"
                  />
                )}
              </div>
            )}

            {/* Info */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-800">
                      Como funciona o FGTS
                    </p>
                    <p className="text-xs text-blue-700">
                      O FGTS rende TR + 3% ao ano. O empregador deposita 8% do salário bruto mensalmente. 
                      Registre os depósitos e rendimentos para manter seu saldo atualizado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {fgtsAssets.length === 0 && (
              <EmptyState
                description="Você ainda não cadastrou nenhum saldo de FGTS"
                actionLabel="Adicionar primeiro saldo"
                onAction={() => onOpenChange(false)}
                className="py-4"
              />
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
