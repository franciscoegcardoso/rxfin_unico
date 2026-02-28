import React, { useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Briefcase, 
  TrendingUp, 
  Calendar,
  Info,
  DollarSign,
  Percent,
  Users,
  ArrowRight
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFinancial } from '@/contexts/FinancialContext';
import { CorporatePensionConfig, CorporatePensionPlanType, CorporatePensionTaxationType } from '@/types/financial';
import { cn } from '@/lib/utils';
import { differenceInMonths, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CorporatePensionFormProps {
  config: Partial<CorporatePensionConfig>;
  onChange: (config: Partial<CorporatePensionConfig>) => void;
  linkedSalaryValue?: number; // Valor do salário bruto vinculado (em centavos)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

const planTypeOptions: { value: CorporatePensionPlanType; label: string; description: string }[] = [
  { 
    value: 'CD', 
    label: 'CD - Contribuição Definida', 
    description: 'O benefício depende do saldo acumulado' 
  },
  { 
    value: 'BD', 
    label: 'BD - Benefício Definido', 
    description: 'O benefício futuro é pré-definido' 
  },
];

const taxationOptions: { value: CorporatePensionTaxationType; label: string; description: string }[] = [
  { 
    value: 'PGBL', 
    label: 'PGBL', 
    description: 'Dedutível no IR até 12% da renda bruta' 
  },
  { 
    value: 'VGBL', 
    label: 'VGBL', 
    description: 'Sem dedução, IR só sobre rendimentos' 
  },
  { 
    value: 'EFPC', 
    label: 'EFPC', 
    description: 'Entidade Fechada (fundo de pensão)' 
  },
];

export const CorporatePensionForm: React.FC<CorporatePensionFormProps> = ({
  config,
  onChange,
  linkedSalaryValue = 0,
}) => {
  const { config: financialConfig } = useFinancial();
  
  // Obter salários disponíveis para vinculação
  const salaryIncomes = useMemo(() => {
    return financialConfig.incomeItems.filter(
      item => item.enabled && (item.name.toLowerCase().includes('salário') || item.name.toLowerCase().includes('salario'))
    );
  }, [financialConfig.incomeItems]);

  // Buscar valor do salário vinculado
  const linkedSalary = useMemo(() => {
    if (!config.linkedIncomeId) return null;
    return financialConfig.incomeItems.find(i => i.id === config.linkedIncomeId);
  }, [config.linkedIncomeId, financialConfig.incomeItems]);

  const salaryGrossValue = linkedSalary?.grossValue || linkedSalaryValue;

  // Calcular contribuições mensais
  const calculations = useMemo(() => {
    const employeePercent = config.employeeContributionPercent || 0;
    const matchPercent = config.employerMatchPercent || 0;
    const maxMatchPercent = config.employerMaxMatchPercent || employeePercent;
    
    const employeeContribution = Math.round((salaryGrossValue * employeePercent) / 100);
    
    // Match da empresa: limitado pelo maxMatchPercent
    const matchableAmount = Math.round((salaryGrossValue * Math.min(employeePercent, maxMatchPercent)) / 100);
    const employerContribution = Math.round((matchableAmount * matchPercent) / 100);
    
    const totalMonthly = employeeContribution + employerContribution;
    const totalAnnual = totalMonthly * 12;
    
    return {
      employeeContribution,
      employerContribution,
      totalMonthly,
      totalAnnual,
    };
  }, [salaryGrossValue, config.employeeContributionPercent, config.employerMatchPercent, config.employerMaxMatchPercent]);

  // Calcular progresso do vesting
  const vestingProgress = useMemo(() => {
    if (!config.vestingStartDate || !config.vestingPeriodMonths) {
      return { percent: 0, monthsElapsed: 0, monthsRemaining: 0 };
    }
    
    const startDate = new Date(config.vestingStartDate);
    const today = new Date();
    const monthsElapsed = differenceInMonths(today, startDate);
    const totalMonths = config.vestingPeriodMonths;
    
    const percent = Math.min(100, Math.max(0, (monthsElapsed / totalMonths) * 100));
    const monthsRemaining = Math.max(0, totalMonths - monthsElapsed);
    
    const completionDate = addMonths(startDate, totalMonths);
    
    return {
      percent,
      monthsElapsed,
      monthsRemaining,
      completionDate,
    };
  }, [config.vestingStartDate, config.vestingPeriodMonths]);

  // Valor vestido da empresa
  const vestedEmployerBalance = useMemo(() => {
    const balance = config.employerBalance || 0;
    return Math.round((balance * vestingProgress.percent) / 100);
  }, [config.employerBalance, vestingProgress.percent]);

  return (
    <div className="space-y-6">
      {/* Seção: Dados do Plano */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Briefcase className="h-4 w-4" />
          <span>Dados do Plano</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Plano <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ex: BrasilPrev Corporate, FunPrev..."
              value={config.planName || ''}
              onChange={(e) => onChange({ ...config, planName: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Empresa Patrocinadora</Label>
            <Input
              placeholder="Nome da empresa"
              value={config.companyName || ''}
              onChange={(e) => onChange({ ...config, companyName: e.target.value })}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Tipo de Plano</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>CD:</strong> O benefício final depende do saldo acumulado.</p>
                    <p><strong>BD:</strong> O benefício futuro é pré-definido (ex: % do último salário).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={config.planType || 'CD'}
              onValueChange={(v: CorporatePensionPlanType) => onChange({ ...config, planType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {planTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Regime Tributário</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>PGBL:</strong> Dedutível até 12% da renda bruta.</p>
                    <p><strong>VGBL:</strong> Sem dedução, IR só nos rendimentos.</p>
                    <p><strong>EFPC:</strong> Fundo de pensão fechado da empresa.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={config.taxationType || 'EFPC'}
              onValueChange={(v: CorporatePensionTaxationType) => onChange({ ...config, taxationType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {taxationOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Seção: Contribuições */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Contribuições</span>
        </div>
        
        {/* Vinculação ao salário */}
        <div className="space-y-2">
          <Label>Vincular ao Salário</Label>
          <Select
            value={config.linkedIncomeId || 'none'}
            onValueChange={(v) => onChange({ ...config, linkedIncomeId: v === 'none' ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um salário..." />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="none">Não vincular (informar valores manualmente)</SelectItem>
              {salaryIncomes.map(income => (
                <SelectItem key={income.id} value={income.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{income.name}</span>
                    {income.grossValue && (
                      <Badge variant="secondary" className="text-xs">
                        {formatCurrency(income.grossValue)}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {salaryGrossValue > 0 && (
            <p className="text-xs text-muted-foreground">
              Base de cálculo: {formatCurrency(salaryGrossValue)} bruto/mês
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Contribuição do Funcionário (%)</Label>
            <Input
              type="number"
              placeholder="Ex: 5"
              min={0}
              max={100}
              step={0.5}
              value={config.employeeContributionPercent || ''}
              onChange={(e) => onChange({ 
                ...config, 
                employeeContributionPercent: parseFloat(e.target.value) || 0 
              })}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Match da Empresa (%)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Percentual que a empresa contribui em relação à sua contribuição.</p>
                    <p>Ex: 100% = empresa iguala sua contribuição</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              type="number"
              placeholder="Ex: 100"
              min={0}
              max={200}
              step={10}
              value={config.employerMatchPercent || ''}
              onChange={(e) => onChange({ 
                ...config, 
                employerMatchPercent: parseFloat(e.target.value) || 0 
              })}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Limite Match (%)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Limite máximo que a empresa contribui.</p>
                    <p>Ex: empresa faz match de 100% até 6% do salário.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              type="number"
              placeholder="Ex: 6"
              min={0}
              max={100}
              step={0.5}
              value={config.employerMaxMatchPercent || ''}
              onChange={(e) => onChange({ 
                ...config, 
                employerMaxMatchPercent: parseFloat(e.target.value) || 0 
              })}
            />
          </div>
        </div>

        {/* Simulação das contribuições */}
        {salaryGrossValue > 0 && (config.employeeContributionPercent || 0) > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Simulação Mensal</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Sua contribuição</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(calculations.employeeContribution)}
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Match empresa</p>
                  <p className="text-lg font-bold text-income">
                    +{formatCurrency(calculations.employerContribution)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total mensal</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(calculations.totalMonthly)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(calculations.totalAnnual)}/ano
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Seção: Vesting */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Vesting (Direito às contribuições da empresa)</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de Início do Vesting</Label>
            <Input
              type="date"
              value={config.vestingStartDate || ''}
              onChange={(e) => onChange({ ...config, vestingStartDate: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Período Total (meses)</Label>
            <Input
              type="number"
              placeholder="Ex: 60 (5 anos)"
              min={0}
              max={240}
              value={config.vestingPeriodMonths || ''}
              onChange={(e) => onChange({ 
                ...config, 
                vestingPeriodMonths: parseInt(e.target.value) || 0 
              })}
            />
          </div>
        </div>

        {/* Barra de progresso do vesting */}
        {config.vestingStartDate && config.vestingPeriodMonths && (
          <Card className={cn(
            "border",
            vestingProgress.percent >= 100 
              ? "bg-income/5 border-income/20" 
              : "bg-amber-500/5 border-amber-500/20"
          )}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Progresso do Vesting
                </span>
                <Badge variant={vestingProgress.percent >= 100 ? "default" : "outline"}>
                  {vestingProgress.percent.toFixed(0)}% vestido
                </Badge>
              </div>
              <Progress value={vestingProgress.percent} className="h-3 mb-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{vestingProgress.monthsElapsed} meses completados</span>
                {vestingProgress.monthsRemaining > 0 ? (
                  <span>
                    {vestingProgress.monthsRemaining} meses restantes
                    {vestingProgress.completionDate && (
                      <span className="ml-1">
                        (até {format(vestingProgress.completionDate, 'MMM/yyyy', { locale: ptBR })})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-income font-medium">✓ 100% vestido!</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Seção: Saldos Acumulados */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>Saldos Acumulados</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Saldo do Funcionário</Label>
            <CurrencyInput
              value={config.employeeBalance || 0}
              onChange={(value) => onChange({ ...config, employeeBalance: value })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              100% seu, sempre disponível
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Saldo da Empresa</Label>
            <CurrencyInput
              value={config.employerBalance || 0}
              onChange={(value) => onChange({ ...config, employerBalance: value })}
              placeholder="0"
            />
            {vestingProgress.percent < 100 ? (
              <p className="text-xs text-amber-600">
                {vestingProgress.percent.toFixed(0)}% vestido = {formatCurrency(vestedEmployerBalance)} disponível
              </p>
            ) : (
              <p className="text-xs text-income">
                100% vestido = todo o valor é seu
              </p>
            )}
          </div>
        </div>

        {/* Portabilidade */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div>
            <p className="font-medium text-sm">Permite Portabilidade?</p>
            <p className="text-xs text-muted-foreground">
              Transferir para outro plano de previdência
            </p>
          </div>
          <Switch
            checked={config.isPortable || false}
            onCheckedChange={(checked) => onChange({ ...config, isPortable: checked })}
          />
        </div>
      </div>
    </div>
  );
};
