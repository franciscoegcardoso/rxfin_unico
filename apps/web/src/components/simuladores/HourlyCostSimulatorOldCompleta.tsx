import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUserKV } from '@/hooks/useUserKV';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Calculator, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Wrench,
  TrendingUp,
  Sparkles,
  Target,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Calendar,
  HelpCircle,
  ChevronDown,
  DollarSign,
  Timer,
  Zap,
  Edit2,
  Gift,
  Wallet,
  Briefcase,
  X,
  Car,
  BookOpen,
  Clock3,
  TrendingDown,
  Building2,
  User,
  Users,
  ChevronRight,
  Factory,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// ==================== IMPORTS FROM NEW CLT MODULE ====================

import { 
  CLTInputForm, 
  CLTInputData 
} from './clt/CLTInputForm';
import {
  CLTFullCalculation,
  TaxRegime,
  calculateCLTFull,
  calculateBonusTax,
} from './clt/CLTTaxEngine';
import {
  CLTBenefitsState,
  DEFAULT_BENEFITS,
  calculateTotalBenefitsCost,
  calculateNetBenefitsValue,
} from './clt/CLTBenefitsTypes';
import {
  calculateStockEquity,
  calculateStockEquityTax,
} from './clt/CLTStockEquityTypes';

// ==================== IMPORTS FROM NEW PJ MODULE ====================

import {
  PJInputForm,
  PJInputData,
  PJFullCalculation,
  getDefaultPJData,
} from './pj/PJInputForm';
import {
  calculatePJBenefitsCost,
} from './pj/PJTaxTypes';

// ==================== IMPORTS FROM NEW SOCIO MODULE ====================

import {
  SocioInputForm,
  SocioInputData,
  SocioFullCalculation,
  getDefaultSocioData,
} from './socio/SocioInputForm';
import {
  calculateSocioBenefitsCost,
} from './socio/SocioTaxTypes';

// ==================== TYPES ====================

type ContractType = 'clt' | 'pj_simples' | 'socio';

interface VariableIncome {
  id: string;
  name: string;
  type: 'bonus' | 'plr' | 'commission' | 'freelance';
  annualValue: number;
  isNet: boolean;
}

interface RealJourney {
  commuteMinutesDaily: number;
  overtimeHoursWeekly: number;
  studyHoursWeekly: number;
}

interface CompensationData {
  // CLT
  grossSalary: number;
  netSalary: number;
  thirteenthSalary: boolean;
  mealVoucher: number;
  weeklyHours: number;
  contractType: ContractType;
  
  // CLT Enhanced
  cltData: CLTInputData;
  
  // PJ Enhanced
  pjData: PJInputData;
  
  // PJ Legacy (kept for backwards compat)
  pjRevenue: number;
  pjAliquota: number;
  pjFixedCosts: number;
  
  // Sócio Enhanced
  socioData: SocioInputData;
  
  // Sócio Legacy (kept for backwards compat)
  proLabore: number;
  lucroDistribuido: number;
  
  // Common
  variableIncomes: VariableIncome[];
  realJourney: RealJourney;
}

type TaskFrequency = 
  | 'weekly_1' | 'weekly_2' | 'weekly_3' | 'weekly_4' | 'weekly_5' | 'weekly_6' | 'weekly_7'
  | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'annually';

const FREQUENCY_OPTIONS: { value: TaskFrequency; label: string; annualMultiplier: number }[] = [
  { value: 'weekly_1', label: '1x por semana', annualMultiplier: 52 },
  { value: 'weekly_2', label: '2x por semana', annualMultiplier: 104 },
  { value: 'weekly_3', label: '3x por semana', annualMultiplier: 156 },
  { value: 'weekly_4', label: '4x por semana', annualMultiplier: 208 },
  { value: 'weekly_5', label: '5x por semana', annualMultiplier: 260 },
  { value: 'weekly_6', label: '6x por semana', annualMultiplier: 312 },
  { value: 'weekly_7', label: 'Todos os dias', annualMultiplier: 365 },
  { value: 'biweekly', label: 'Quinzenalmente', annualMultiplier: 26 },
  { value: 'monthly', label: 'Mensalmente', annualMultiplier: 12 },
  { value: 'bimonthly', label: 'Bimestralmente', annualMultiplier: 6 },
  { value: 'quarterly', label: 'Trimestralmente', annualMultiplier: 4 },
  { value: 'semiannually', label: 'Semestralmente', annualMultiplier: 2 },
  { value: 'annually', label: 'Anualmente', annualMultiplier: 1 },
];

const getFrequencyMultiplier = (frequency: TaskFrequency): number => {
  return FREQUENCY_OPTIONS.find(f => f.value === frequency)?.annualMultiplier || 1;
};

const getFrequencyLabel = (frequency: TaskFrequency): string => {
  return FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label || 'Anualmente';
};

interface DIYTask {
  id: string;
  name: string;
  marketCost: number;
  estimatedHours: number;
  frequency: TaskFrequency;
}

interface RecurringSaving {
  id: string;
  name: string;
  monthlySaving: number;
  timeInvestedMinutes: number;
}

interface PurchaseDesire {
  name: string;
  value: number;
}

// ==================== HELPERS ====================

const formatMoney = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatMoneyCompact = (value: number): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// ==================== TAX CALCULATIONS (PJ/Socio - kept for backwards compat) ====================

interface TaxBreakdown {
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  items: { label: string; value: number; percentage?: number }[];
  regime: string;
}

const calculateINSS = (grossSalary: number): number => {
  // Tabela INSS 2026 (estimativa baseada em 2024 + ajuste)
  const inssRanges = [
    { min: 0, max: 1518.00, rate: 0.075 },
    { min: 1518.00, max: 2793.88, rate: 0.09 },
    { min: 2793.88, max: 4190.83, rate: 0.12 },
    { min: 4190.83, max: 8157.41, rate: 0.14 },
  ];
  
  let inss = 0;
  for (const range of inssRanges) {
    if (grossSalary > range.min) {
      const taxableAmount = Math.min(grossSalary, range.max) - range.min;
      inss += taxableAmount * range.rate;
    }
  }
  return Math.min(inss, 951.63); // Teto INSS 2026 estimado
};

const calculateIRPF = (baseCalculo: number): { ir: number; aliquota: number } => {
  // Tabela IRPF 2026 (estimativa)
  if (baseCalculo <= 2428.80) return { ir: 0, aliquota: 0 };
  if (baseCalculo <= 3036.72) return { ir: baseCalculo * 0.075 - 182.16, aliquota: 7.5 };
  if (baseCalculo <= 4029.12) return { ir: baseCalculo * 0.15 - 409.56, aliquota: 15 };
  if (baseCalculo <= 5010.24) return { ir: baseCalculo * 0.225 - 711.56, aliquota: 22.5 };
  return { ir: baseCalculo * 0.275 - 962.12, aliquota: 27.5 };
};

const calculateNetSalaryCLT = (grossSalary: number): TaxBreakdown => {
  const inss = calculateINSS(grossSalary);
  const irBase = grossSalary - inss;
  const { ir, aliquota } = calculateIRPF(irBase);
  const irFinal = Math.max(0, ir);
  
  return {
    grossSalary,
    netSalary: grossSalary - inss - irFinal,
    totalDeductions: inss + irFinal,
    regime: 'CLT',
    items: [
      { label: 'INSS', value: inss, percentage: (inss / grossSalary) * 100 },
      { label: `IRPF (${aliquota}%)`, value: irFinal, percentage: (irFinal / grossSalary) * 100 },
    ]
  };
};

const calculateNetSalaryPJSimples = (revenue: number, aliquota: number, fixedCosts: number): TaxBreakdown => {
  const impostoSimples = revenue * (aliquota / 100);
  const netSalary = revenue - impostoSimples - fixedCosts;
  
  return {
    grossSalary: revenue,
    netSalary: Math.max(0, netSalary),
    totalDeductions: impostoSimples + fixedCosts,
    regime: `Simples Nacional (${aliquota}%)`,
    items: [
      { label: `Simples (${aliquota}%)`, value: impostoSimples, percentage: aliquota },
      { label: 'Custos Fixos (Contador/SW)', value: fixedCosts, percentage: (fixedCosts / revenue) * 100 },
    ]
  };
};

const calculateNetSalarySocio = (proLabore: number, lucroDistribuido: number): TaxBreakdown => {
  // Pró-labore: INSS + IR
  const inssProLabore = Math.min(proLabore * 0.11, 951.63);
  const irBase = proLabore - inssProLabore;
  const { ir, aliquota } = calculateIRPF(irBase);
  const irFinal = Math.max(0, ir);
  
  const proLaboreLiquido = proLabore - inssProLabore - irFinal;
  // Lucro distribuído é isento de IR para o sócio
  const total = proLaboreLiquido + lucroDistribuido;
  
  return {
    grossSalary: proLabore + lucroDistribuido,
    netSalary: total,
    totalDeductions: inssProLabore + irFinal,
    regime: 'Sócio (Pró-labore + Lucros)',
    items: [
      { label: 'INSS Pró-labore (11%)', value: inssProLabore, percentage: proLabore > 0 ? (inssProLabore / proLabore) * 100 : 0 },
      { label: `IRPF Pró-labore (${aliquota}%)`, value: irFinal, percentage: proLabore > 0 ? (irFinal / proLabore) * 100 : 0 },
      { label: 'Lucros (isento)', value: 0, percentage: 0 },
    ]
  };
};

// ==================== STEP INDICATOR ====================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
  onStepClick?: (step: number) => void;
  interactive?: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  currentStep, 
  totalSteps, 
  labels, 
  onStepClick,
  interactive = false,
}) => {
  return (
    <div className="flex items-center justify-between w-full mb-6">
      {labels.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const isClickable = interactive && (isCompleted || isActive);
        
        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(stepNumber)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  isCompleted && "bg-emerald-500 text-white",
                  isActive && "bg-emerald-500 text-white ring-4 ring-emerald-500/20",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:ring-4 hover:ring-emerald-500/30",
                  !isClickable && !isActive && "cursor-default"
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stepNumber}
              </button>
              <span className={cn(
                "text-[10px] text-center max-w-16",
                isActive ? "text-emerald-600 font-medium" : "text-muted-foreground",
                isClickable && "cursor-pointer hover:text-emerald-600"
              )}
                onClick={() => isClickable && onStepClick?.(stepNumber)}
              >
                {label}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 transition-colors",
                isCompleted ? "bg-emerald-500" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ==================== COMPARISON CARD ====================

interface HourlyComparisonCardProps {
  nominalHourly: number;
  realHourly: number;
  differencePercent: number;
  grossHourlyEmployerCost?: number;
  showEmployerCost?: boolean;
}

const HourlyComparisonCard: React.FC<HourlyComparisonCardProps> = ({ 
  nominalHourly, 
  realHourly, 
  differencePercent,
  grossHourlyEmployerCost = 0,
  showEmployerCost = false,
}) => {
  const showAlert = differencePercent > 30;
  
  return (
    <div className="space-y-4">
      {/* Main comparison: Employer Cost vs Net Received */}
      {showEmployerCost && grossHourlyEmployerCost > 0 && (
        <div className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 rounded-xl border border-amber-500/20">
            <p className="text-xs font-medium text-center text-muted-foreground mb-3">
              Custo/Hora vs. Recebido/Hora
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Employer Gross Cost */}
              <div className="p-3 bg-background rounded-lg border text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Factory className="h-4 w-4 text-amber-600" />
                  <span className="text-[10px] font-medium text-amber-600">Custo Empresa</span>
                </div>
                <p className="text-lg font-bold text-amber-600 tabular-nums">{formatMoney(grossHourlyEmployerCost)}</p>
                <p className="text-[10px] text-muted-foreground">Bruto Total/h</p>
              </div>
              
              {/* Net Employee */}
              <div className="p-3 bg-background rounded-lg border text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  <span className="text-[10px] font-medium text-emerald-600">Você Recebe</span>
                </div>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatMoney(realHourly)}</p>
                <p className="text-[10px] text-muted-foreground">Líquido Real/h</p>
              </div>
            </div>
            
            {grossHourlyEmployerCost > 0 && realHourly > 0 && (
              <div className="mt-3 p-2 bg-background/60 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">
                  De cada <strong>R$ 1,00</strong> que a empresa gasta, você recebe{' '}
                  <strong className="text-emerald-600">
                    R$ {(realHourly / grossHourlyEmployerCost).toFixed(2)}
                  </strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Original comparison: Nominal vs Real */}
      <div className="grid grid-cols-2 gap-3">
        {/* Nominal */}
        <div className="p-4 bg-muted/50 rounded-xl border">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-muted rounded-full">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Hora Nominal</span>
          </div>
          <p className="text-xl font-bold tabular-nums">{formatMoney(nominalHourly)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Bruto ÷ Horas contratuais</p>
        </div>
        
        {/* Real */}
        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-500/20 rounded-full">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs text-emerald-600 font-medium">Hora Real</span>
          </div>
          <p className="text-xl font-bold text-emerald-600 tabular-nums">{formatMoney(realHourly)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Líquido ÷ Horas totais</p>
        </div>
      </div>
      
      {/* Difference Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Diferença entre Nominal e Real</span>
          <span className={cn(
            "font-semibold",
            showAlert ? "text-destructive" : "text-amber-600"
          )}>
            -{differencePercent.toFixed(1)}%
          </span>
        </div>
        <Progress 
          value={Math.min(100, differencePercent)} 
          className={cn("h-2", showAlert ? "bg-destructive/20" : "bg-amber-100")} 
        />
      </div>
      
      {/* Alert */}
      {showAlert && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Atenção!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Seus custos invisíveis de tempo e impostos estão consumindo <strong>{differencePercent.toFixed(0)}%</strong> do seu ganho real. 
                Considere renegociar ou otimizar sua jornada.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== TAX BREAKDOWN DIALOG ====================

const TaxBreakdownDialog: React.FC<{ breakdown: TaxBreakdown }> = ({ breakdown }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700 h-auto p-0">
          <HelpCircle className="h-3 w-3 mr-1" />
          Ver detalhes do cálculo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-emerald-500" />
            Detalhamento de Impostos
          </DialogTitle>
          <DialogDescription>Regime: {breakdown.regime}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Receita Bruta</span>
            <span className="font-semibold tabular-nums">{formatMoney(breakdown.grossSalary)}</span>
          </div>
          <Separator />
          {breakdown.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-destructive/80">− {item.label}</span>
              <span className="text-destructive tabular-nums">
                {formatMoney(item.value)}
                {item.percentage !== undefined && item.percentage > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-emerald-600">= Líquido Estimado</span>
            <span className="text-emerald-600 tabular-nums">{formatMoney(breakdown.netSalary)}</span>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg mt-4">
            <p className="text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3 inline mr-1" />
              Este é o valor que efetivamente cai na sua conta após todos os descontos legais.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== SUB-COMPONENTS ====================

const VHLStickyHeader: React.FC<{ hourlyRate: number; onEdit: () => void; nominalHourly: number }> = ({ hourlyRate, onEdit, nominalHourly }) => {
  const isMobile = useIsMobile();
  const difference = nominalHourly > 0 ? ((nominalHourly - hourlyRate) / nominalHourly) * 100 : 0;
  
  return (
    <div className={cn(
      "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-4",
      isMobile && "sticky top-0 z-10 backdrop-blur-sm"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-full">
            <Wallet className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Sua Hora Real (Líquida)
            </p>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(hourlyRate)}<span className="text-sm font-normal">/h</span></p>
            {difference > 0 && (
              <p className="text-[10px] text-muted-foreground">
                <TrendingDown className="h-3 w-3 inline mr-0.5 text-amber-500" />
                {difference.toFixed(0)}% menos que a nominal
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1">
          <Edit2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Editar</span>
        </Button>
      </div>
    </div>
  );
};

interface DIYTaskCardProps {
  task: {
    id: string;
    name: string;
    marketCost: number;
    estimatedHours: number;
    frequency: TaskFrequency;
    savingsRate: number;
    isWorthDoing: boolean;
    percentageGain: number;
    annualCost: number;
    annualHours: number;
    annualSavings: number;
    frequencyLabel: string;
    annualMultiplier: number;
  };
  userHourlyRate: number;
  onRemove: (id: string) => void;
}

const DIYTaskCard: React.FC<DIYTaskCardProps> = ({ task, userHourlyRate, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn(
        "border rounded-xl overflow-hidden transition-all",
        task.isWorthDoing 
          ? "bg-emerald-500/5 border-emerald-500/20" 
          : "bg-amber-500/5 border-amber-500/20"
      )}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {task.isWorthDoing ? (
                    <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />
                      Faça você!
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0">
                      <AlertTriangle className="h-3 w-3 mr-0.5" />
                      Considere pagar
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">
                    {task.frequencyLabel}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm truncate">{task.name}</h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-bold tabular-nums",
                    task.isWorthDoing ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {formatMoneyCompact(task.savingsRate)}<span className="text-xs font-normal">/h</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">"Salário isento"</p>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </div>
            </div>

            {/* Annual Impact Summary */}
            <div className="mt-3 p-2 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Impacto Anual</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Custo:</span>
                  <p className="font-medium tabular-nums">{formatMoney(task.annualCost)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tempo:</span>
                  <p className="font-medium tabular-nums">{task.annualHours.toFixed(0)}h</p>
                </div>
                <div>
                  <span className={cn("", task.isWorthDoing ? "text-emerald-600" : "text-amber-600")}>
                    {task.isWorthDoing ? 'Economia:' : 'Perda:'}
                  </span>
                  <p className={cn("font-bold tabular-nums", task.isWorthDoing ? "text-emerald-600" : "text-amber-600")}>
                    {task.isWorthDoing ? '+' : '-'}{formatMoney(Math.abs(task.annualSavings))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            <Separator />
            
            <div className={cn(
              "p-3 rounded-lg text-xs",
              task.isWorthDoing ? "bg-emerald-500/10" : "bg-amber-500/10"
            )}>
              {task.isWorthDoing ? (
                <p>
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1 text-emerald-500" />
                  Ao fazer "{task.name}" ({task.frequencyLabel}), você economiza <strong>{formatMoney(task.annualCost)}/ano</strong> em {task.annualHours.toFixed(0)}h. 
                  Isso é como ganhar <strong>{formatMoney(task.savingsRate)}/h isento de impostos</strong>, 
                  {task.savingsRate > userHourlyRate && ` ${((task.savingsRate / userHourlyRate - 1) * 100).toFixed(0)}% a mais que seu trabalho!`}
                </p>
              ) : (
                <p>
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
                  Essa tarefa rende {formatMoney(task.savingsRate)}/h, menos que seu trabalho ({formatMoney(userHourlyRate)}/h). 
                  Ao longo do ano, você "perde" {formatMoney(Math.abs(task.annualSavings))} em tempo que poderia usar melhor.
                </p>
              )}
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(task.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface RecurringSavingCardProps {
  saving: {
    id: string;
    name: string;
    monthlySaving: number;
    timeInvestedMinutes: number;
    annualGain: number;
    hoursInvested: number;
    returnPerHour: number;
    multiplier: number;
    isHighROI: boolean;
    percentageMore: number;
  };
  userHourlyRate: number;
  onRemove: (id: string) => void;
}

const RecurringSavingCard: React.FC<RecurringSavingCardProps> = ({ saving, userHourlyRate, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn(
        "border rounded-xl overflow-hidden transition-all",
        saving.isHighROI 
          ? "bg-purple-500/5 border-purple-500/20" 
          : "bg-muted/30 border-border"
      )}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {saving.isHighROI && (
                    <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0">
                      <Sparkles className="h-3 w-3 mr-0.5" />
                      Alto ROI
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium text-sm truncate">{saving.name}</h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-bold tabular-nums",
                    saving.isHighROI ? "text-purple-600" : "text-foreground"
                  )}>
                    {formatMoneyCompact(saving.returnPerHour)}<span className="text-xs font-normal">/h</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">Retorno</p>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>{formatMoney(saving.monthlySaving)}/mês</span>
              </div>
              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                <span>{saving.timeInvestedMinutes} min</span>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            <Separator />
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground">Esta Ação</p>
                <p className="text-lg font-bold text-purple-600">{formatMoney(saving.returnPerHour)}/h</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground">Seu Trabalho</p>
                <p className="text-lg font-bold">{formatMoney(userHourlyRate)}/h</p>
              </div>
            </div>
            
            <div className={cn(
              "p-3 rounded-lg text-xs",
              saving.isHighROI ? "bg-purple-500/10" : "bg-muted/30"
            )}>
              {saving.isHighROI ? (
                <p>
                  <Sparkles className="h-3.5 w-3.5 inline mr-1 text-purple-500" />
                  Economizar isso te rende <strong>{saving.percentageMore.toFixed(0)}% mais</strong> por hora do que seu emprego atual!
                </p>
              ) : (
                <p>
                  <Lightbulb className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
                  Ainda vale a pena! Você ganha {formatMoney(saving.annualGain)}/ano.
                </p>
              )}
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(saving.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const HelpDialog: React.FC<{ type: 'dreams' | 'diy' | 'savings' }> = ({ type }) => {
  const content = {
    dreams: {
      title: "Como interpretar o peso da compra?",
      description: "Entenda a lógica por trás do cálculo",
      body: (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Esta ferramenta converte o preço de um item em <strong>tempo de vida real</strong> que você precisa 
            trabalhar para pagá-lo.
          </p>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Fórmula:</p>
            <code className="text-xs bg-background px-2 py-1 rounded block mb-1">
              Horas = Preço ÷ Sua Hora Real
            </code>
            <code className="text-xs bg-background px-2 py-1 rounded block">
              Dias = Horas ÷ Jornada Diária
            </code>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="font-medium mb-1">🎯 Como usar:</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside text-xs">
              <li>"Vale trocar X dias da minha vida por isso?"</li>
              <li>"Do dia 1 ao dia X, trabalho só pra isso"</li>
            </ul>
          </div>
        </div>
      )
    },
    diy: {
      title: "Faça Você Mesmo vs. Pagar",
      description: "Entenda quando DIY vale a pena",
      body: (
        <div className="space-y-4 text-sm">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-2 font-semibold text-emerald-600 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Vale a pena fazer!
            </div>
            <p className="text-muted-foreground text-xs">
              O "Salário Isento" da tarefa é <strong>maior</strong> que sua Hora Real. Fazer te economiza mais do que você ganharia trabalhando.
            </p>
          </div>
          
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 font-semibold text-amber-600 mb-1">
              <AlertTriangle className="h-4 w-4" />
              Considere Pagar
            </div>
            <p className="text-muted-foreground text-xs">
              Seu tempo de trabalho vale mais que essa economia. Considere terceirizar.
            </p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <code className="text-xs bg-background px-2 py-1 rounded">
              Salário Isento = Custo ÷ Tempo
            </code>
          </div>
        </div>
      )
    },
    savings: {
      title: "Calculadora de Aumento Invisível",
      description: "O poder das micro-economias",
      body: (
        <div className="space-y-4 text-sm">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2 font-semibold text-purple-600 mb-1">
              <Sparkles className="h-4 w-4" />
              Alto ROI = Mina de ouro!
            </div>
            <p className="text-muted-foreground text-xs">
              Quando o retorno por hora investida supera seu salário por hora.
            </p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1 text-xs">💡 Fórmulas:</p>
            <code className="text-[10px] bg-background px-2 py-0.5 rounded block mb-1">
              Ganho Anual = Economia × 12
            </code>
            <code className="text-[10px] bg-background px-2 py-0.5 rounded block mb-1">
              Retorno/h = Ganho Anual ÷ Horas
            </code>
            <code className="text-[10px] bg-background px-2 py-0.5 rounded block">
              % a mais = (Retorno/h ÷ Sua Hora - 1) × 100
            </code>
          </div>
        </div>
      )
    }
  };

  const c = content[type];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {c.title}
          </DialogTitle>
          <DialogDescription>{c.description}</DialogDescription>
        </DialogHeader>
        {c.body}
      </DialogContent>
    </Dialog>
  );
};

// ==================== DEFAULT DATA ====================

const defaultDIYTasks: DIYTask[] = [
  { id: '1', name: 'Lavar o carro', marketCost: 50, estimatedHours: 1, frequency: 'monthly' },
  { id: '2', name: 'Cozinhar jantar', marketCost: 40, estimatedHours: 1.5, frequency: 'weekly_5' },
  { id: '3', name: 'Limpeza da casa', marketCost: 150, estimatedHours: 3, frequency: 'monthly' },
];

const defaultRecurringSavings: RecurringSaving[] = [
  { id: '1', name: 'Negociar conta de celular', monthlySaving: 30, timeInvestedMinutes: 30 },
  { id: '2', name: 'Trocar plano de internet', monthlySaving: 50, timeInvestedMinutes: 45 },
];

// ==================== STORAGE VIA useUserKV ====================

const STORAGE_KEY = 'vhl-simulator-config-v3';

interface StoredConfig {
  compensation: CompensationData;
  diyTasks: DIYTask[];
  recurringSavings: RecurringSaving[];
}

// ==================== MAIN COMPONENT ====================

export const HourlyCostSimulator: React.FC = () => {
  const isMobile = useIsMobile();
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  
  // Persist via useUserKV
  const { value: storedConfig, setValue: setStoredConfig } = useUserKV<Partial<StoredConfig>>(STORAGE_KEY, {});

  // Initialize state from persisted data or defaults
  const [compensation, setCompensation] = useState<CompensationData>(() => {
    const stored = storedConfig;
    if (stored?.compensation) {
      return {
        ...stored.compensation,
        cltData: stored.compensation.cltData ? {
          ...stored.compensation.cltData,
          stockEquityGrants: stored.compensation.cltData.stockEquityGrants || [],
          fixedGrossSalary: stored.compensation.cltData.fixedGrossSalary ?? stored.compensation.cltData.grossSalary ?? 0,
          hasVariableCompensation: stored.compensation.cltData.hasVariableCompensation ?? false,
          variableMonthly: stored.compensation.cltData.variableMonthly ?? 0,
          dsrValue: stored.compensation.cltData.dsrValue ?? 0,
          overrideNetSalary: stored.compensation.cltData.overrideNetSalary ?? false,
          forcedNetSalary: stored.compensation.cltData.forcedNetSalary ?? 0,
        } : {
          fixedGrossSalary: stored.compensation.grossSalary || 0,
          grossSalary: stored.compensation.grossSalary || 0,
          hasVariableCompensation: false,
          variableMonthly: 0,
          dsrValue: 0,
          overrideNetSalary: false,
          forcedNetSalary: 0,
          taxRegime: 'simples' as TaxRegime,
          dependents: 0,
          weeklyHours: stored.compensation.weeklyHours || 40,
          mealVoucher: stored.compensation.mealVoucher || 0,
          receiveThirteenth: stored.compensation.thirteenthSalary ?? true,
          plrAnnual: 0,
          bonusCashAnnual: 0,
          stockEquityGrants: [],
          benefits: DEFAULT_BENEFITS,
          calculation: null,
        },
        pjData: stored.compensation.pjData || {
          ...getDefaultPJData(),
          faturamentoMensal: stored.compensation.pjRevenue || 0,
          custosFixos: stored.compensation.pjFixedCosts || 300,
          weeklyHours: stored.compensation.weeklyHours || 40,
        },
        socioData: stored.compensation.socioData || {
          ...getDefaultSocioData(),
          proLabore: stored.compensation.proLabore || 0,
          distribuicaoLucros: stored.compensation.lucroDistribuido || 0,
          weeklyHours: stored.compensation.weeklyHours || 40,
        },
      };
    }
    return {
      grossSalary: 0,
      netSalary: 0,
      thirteenthSalary: true,
      mealVoucher: 0,
      weeklyHours: 40,
      contractType: 'clt',
      cltData: {
        fixedGrossSalary: 0,
        grossSalary: 0,
        hasVariableCompensation: false,
        variableMonthly: 0,
        dsrValue: 0,
        overrideNetSalary: false,
        forcedNetSalary: 0,
        taxRegime: 'simples' as TaxRegime,
        dependents: 0,
        weeklyHours: 40,
        mealVoucher: 0,
        receiveThirteenth: true,
        plrAnnual: 0,
        bonusCashAnnual: 0,
        stockEquityGrants: [],
        benefits: DEFAULT_BENEFITS,
        calculation: null,
      },
      pjData: getDefaultPJData(),
      socioData: getDefaultSocioData(),
      pjRevenue: 0,
      pjAliquota: 6,
      pjFixedCosts: 200,
      proLabore: 0,
      lucroDistribuido: 0,
      variableIncomes: [],
      realJourney: {
        commuteMinutesDaily: 0,
        overtimeHoursWeekly: 0,
        studyHoursWeekly: 0,
      },
    };
  });
  
  const [diyTasks, setDiyTasks] = useState<DIYTask[]>(() => {
    return storedConfig?.diyTasks || defaultDIYTasks;
  });
  const [newDiyTask, setNewDiyTask] = useState<{ name: string; marketCost: number; estimatedHours: number; frequency: TaskFrequency }>({ name: '', marketCost: 0, estimatedHours: 1, frequency: 'monthly' });
  
  const [recurringSavings, setRecurringSavings] = useState<RecurringSaving[]>(() => {
    return storedConfig?.recurringSavings || defaultRecurringSavings;
  });
  const [newRecurringSaving, setNewRecurringSaving] = useState({ name: '', monthlySaving: 0, timeInvestedMinutes: 0 });
  
  const [purchaseDesire, setPurchaseDesire] = useState<PurchaseDesire>({ name: '', value: 0 });
  
  const [showAddDIY, setShowAddDIY] = useState(false);
  const [showAddSaving, setShowAddSaving] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [newVariableIncome, setNewVariableIncome] = useState({ 
    name: '', 
    type: 'bonus' as 'bonus' | 'plr' | 'commission' | 'freelance', 
    annualValue: 0, 
    isNet: true 
  });

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Save via useUserKV whenever relevant state changes
  useEffect(() => {
    if (!isInitialized) return;
    
    setStoredConfig({
      compensation,
      diyTasks,
      recurringSavings,
    });
  }, [isInitialized, compensation, diyTasks, recurringSavings, setStoredConfig]);

  // Tax Breakdown based on contract type
  const taxBreakdown = useMemo((): TaxBreakdown => {
    switch (compensation.contractType) {
      case 'pj_simples':
        return calculateNetSalaryPJSimples(
          compensation.pjRevenue, 
          compensation.pjAliquota, 
          compensation.pjFixedCosts
        );
      case 'socio':
        return calculateNetSalarySocio(
          compensation.proLabore,
          compensation.lucroDistribuido
        );
      default:
        return calculateNetSalaryCLT(compensation.grossSalary);
    }
  }, [compensation]);

  // Main Calculations
  const calculations = useMemo(() => {
    // For CLT, use the new enhanced calculations
    const isCLT = compensation.contractType === 'clt';
    const isPJ = compensation.contractType === 'pj_simples';
    const isSocio = compensation.contractType === 'socio';
    const cltCalc = compensation.cltData.calculation;
    const pjCalc = compensation.pjData.calculation;
    const socioCalc = compensation.socioData.calculation;
    
    // Net salary calculation
    let netSalaryMonthly: number;
    let grossMonthly: number;
    let totalEmployerCostMonthly: number;
    let benefitsNetMonthly: number = 0;
    
    if (isCLT && cltCalc) {
      // Use forced net salary if override is active
      netSalaryMonthly = compensation.cltData.overrideNetSalary && compensation.cltData.forcedNetSalary > 0
        ? compensation.cltData.forcedNetSalary
        : cltCalc.netSalary;
      grossMonthly = cltCalc.grossSalary;
      const benefitsCost = calculateTotalBenefitsCost(compensation.cltData.benefits);
      totalEmployerCostMonthly = cltCalc.totalEmployerCost + benefitsCost;
      benefitsNetMonthly = calculateNetBenefitsValue(compensation.cltData.benefits);
    } else if (isPJ && pjCalc) {
      netSalaryMonthly = pjCalc.lucroLiquido;
      grossMonthly = pjCalc.faturamentoMensal;
      totalEmployerCostMonthly = grossMonthly; // For PJ, employer cost = gross revenue
      benefitsNetMonthly = calculatePJBenefitsCost(compensation.pjData.benefits);
    } else if (isSocio && socioCalc) {
      netSalaryMonthly = socioCalc.totalLiquidoMensal;
      grossMonthly = socioCalc.totalBrutoMensal;
      totalEmployerCostMonthly = grossMonthly; // For Sócio, employer cost = gross
      benefitsNetMonthly = socioCalc.benefitsCompanyPaid;
    } else {
      netSalaryMonthly = taxBreakdown.netSalary;
      grossMonthly = compensation.contractType === 'pj_simples' 
        ? compensation.pjRevenue 
        : compensation.proLabore + compensation.lucroDistribuido;
      totalEmployerCostMonthly = grossMonthly; // For non-CLT, employer cost ≈ gross
    }
    
    // Variable incomes (already annual, sum all)
    const totalVariableAnnual = compensation.variableIncomes.reduce((sum, v) => sum + v.annualValue, 0);
    
    // CLT-specific variable incomes (PLR, Bonus, Stock Equity)
    let cltVariablesNetAnnual = 0;
    if (isCLT) {
      const plrNet = compensation.cltData.plrAnnual > 0 
        ? calculateBonusTax(compensation.cltData.plrAnnual, 'plr').net 
        : 0;
      const bonusNet = compensation.cltData.bonusCashAnnual > 0 
        ? calculateBonusTax(compensation.cltData.bonusCashAnnual, 'bonus').net 
        : 0;
      
      // Stock equity vesting value (net)
      const stockEquityGrants = compensation.cltData.stockEquityGrants || [];
      const totalEquityAnnual = stockEquityGrants.reduce((sum, grant) => {
        const calc = calculateStockEquity(grant);
        return sum + calc.annualVestedValue;
      }, 0);
      const equityNet = totalEquityAnnual > 0 
        ? calculateStockEquityTax(totalEquityAnnual).net 
        : 0;
      
      cltVariablesNetAnnual = plrNet + bonusNet + equityNet;
    }
    
    // Total annual net = (monthly net * months) + VR * 12 + variables + benefits
    const monthsWithThirteenth = compensation.thirteenthSalary && isCLT ? 13 : 12;
    const annualNetSalary = netSalaryMonthly * monthsWithThirteenth;
    const annualMealVoucher = compensation.mealVoucher * 12;
    const annualBenefitsNet = benefitsNetMonthly * 12;
    const totalAnnualNet = annualNetSalary + annualMealVoucher + totalVariableAnnual + cltVariablesNetAnnual + annualBenefitsNet;
    
    // Hours calculation - use centralized weeklyHours from Step 2 (Jornada)
    const weeklyHoursForCalc = compensation.weeklyHours;
    const baseMonthlyHours = weeklyHoursForCalc * 4.28;
    
    // Real journey additions (invisible time costs)
    const { commuteMinutesDaily, overtimeHoursWeekly, studyHoursWeekly } = compensation.realJourney;
    const workingDaysPerMonth = 21;
    const commuteHoursMonthly = (commuteMinutesDaily / 60) * workingDaysPerMonth;
    const overtimeHoursMonthly = overtimeHoursWeekly * 4.28;
    const studyHoursMonthly = studyHoursWeekly * 4.28;
    
    const totalMonthlyHoursReal = baseMonthlyHours + commuteHoursMonthly + overtimeHoursMonthly + studyHoursMonthly;
    const totalAnnualHoursReal = totalMonthlyHoursReal * 12;
    
    // Nominal Hourly (Gross / Contractual hours)
    const nominalHourly = baseMonthlyHours > 0 ? grossMonthly / baseMonthlyHours : 0;
    
    // Real Hourly (Net / Total real hours) - What the worker actually receives per hour
    const monthlyNetWithExtras = netSalaryMonthly + compensation.mealVoucher + benefitsNetMonthly + (totalVariableAnnual / 12) + (cltVariablesNetAnnual / 12);
    const realHourly = totalMonthlyHoursReal > 0 ? monthlyNetWithExtras / totalMonthlyHoursReal : 0;
    
    // Gross Hourly Employer Cost (Total employer cost / Base hours)
    const grossHourlyEmployerCost = baseMonthlyHours > 0 ? totalEmployerCostMonthly / baseMonthlyHours : 0;
    
    // Difference percentage
    const differencePercent = nominalHourly > 0 ? ((nominalHourly - realHourly) / nominalHourly) * 100 : 0;
    
    // Employer vs Employee difference
    const employerVsEmployeePercent = grossHourlyEmployerCost > 0 
      ? ((grossHourlyEmployerCost - realHourly) / grossHourlyEmployerCost) * 100 
      : 0;
    
    const dailyHours = totalMonthlyHoursReal / workingDaysPerMonth;
    
    return {
      totalAnnualNet,
      monthlyNet: monthlyNetWithExtras,
      annualWorkingHours: totalAnnualHoursReal,
      monthlyWorkingHours: totalMonthlyHoursReal,
      baseMonthlyHours,
      commuteHoursMonthly,
      overtimeHoursMonthly,
      studyHoursMonthly,
      realHourly,
      nominalHourly,
      differencePercent,
      dailyHours,
      workingDaysPerMonth,
      totalVariableAnnual,
      // New dual outputs
      grossHourlyEmployerCost,
      totalEmployerCostMonthly,
      employerVsEmployeePercent,
      cltVariablesNetAnnual,
      benefitsNetMonthly,
    };
  }, [compensation, taxBreakdown]);

  // Purchase Analysis
  const purchaseAnalysis = useMemo(() => {
    if (!purchaseDesire.value || !calculations.realHourly) return null;
    const hoursNeeded = purchaseDesire.value / calculations.realHourly;
    const daysNeeded = hoursNeeded / calculations.dailyHours;
    const percentOfMonthlyIncome = (purchaseDesire.value / calculations.monthlyNet) * 100;
    const displayInDays = hoursNeeded >= calculations.dailyHours;
    return { hoursNeeded, daysNeeded: Math.ceil(daysNeeded), percentOfMonthlyIncome, displayInDays };
  }, [purchaseDesire, calculations]);

  // DIY Task Analysis with Annual Calculations
  const diyTaskAnalysis = useMemo(() => {
    return diyTasks.map(task => {
      const annualMultiplier = getFrequencyMultiplier(task.frequency);
      const frequencyLabel = getFrequencyLabel(task.frequency);
      
      // Per-occurrence values
      const savingsRate = task.estimatedHours > 0 ? task.marketCost / task.estimatedHours : 0;
      const isWorthDoing = savingsRate > calculations.realHourly;
      const percentageGain = calculations.realHourly > 0 ? ((savingsRate / calculations.realHourly) - 1) * 100 : 0;
      
      // Annual values
      const annualCost = task.marketCost * annualMultiplier;
      const annualHours = task.estimatedHours * annualMultiplier;
      
      // Annual savings = money saved by DIY minus opportunity cost of time
      const opportunityCost = annualHours * calculations.realHourly;
      const annualSavings = annualCost - opportunityCost;
      
      return {
        ...task,
        savingsRate,
        isWorthDoing,
        percentageGain: Math.max(0, percentageGain),
        annualCost,
        annualHours,
        annualSavings,
        frequencyLabel,
        annualMultiplier,
      };
    });
  }, [diyTasks, calculations.realHourly]);

  // Recurring Savings Analysis
  const recurringSavingsAnalysis = useMemo(() => {
    return recurringSavings.map(saving => {
      const annualGain = saving.monthlySaving * 12;
      const hoursInvested = saving.timeInvestedMinutes / 60;
      const returnPerHour = hoursInvested > 0 ? annualGain / hoursInvested : 0;
      const isHighROI = returnPerHour > calculations.realHourly;
      const percentageMore = calculations.realHourly > 0 ? ((returnPerHour / calculations.realHourly) - 1) * 100 : 0;
      return {
        ...saving,
        annualGain,
        hoursInvested,
        returnPerHour,
        multiplier: calculations.realHourly > 0 ? returnPerHour / calculations.realHourly : 0,
        isHighROI,
        percentageMore: Math.max(0, percentageMore),
      };
    });
  }, [recurringSavings, calculations.realHourly]);

  const totalPatrimonioPreservado = useMemo(() => {
    const diyTotal = diyTaskAnalysis.filter(t => t.isWorthDoing).reduce((sum, t) => sum + (t.marketCost * 12), 0);
    const recurringSavingsTotal = recurringSavingsAnalysis.reduce((sum, s) => sum + s.annualGain, 0);
    return { diy: diyTotal, recurring: recurringSavingsTotal, total: diyTotal + recurringSavingsTotal };
  }, [diyTaskAnalysis, recurringSavingsAnalysis]);

  // Handlers
  const handleAddVariableIncome = () => {
    if (newVariableIncome.name && newVariableIncome.annualValue > 0) {
      setCompensation(prev => ({
        ...prev,
        variableIncomes: [...prev.variableIncomes, { ...newVariableIncome, id: Date.now().toString() }]
      }));
      setNewVariableIncome({ name: '', type: 'bonus', annualValue: 0, isNet: true });
      setShowAddVariable(false);
    }
  };

  const handleRemoveVariableIncome = (id: string) => {
    setCompensation(prev => ({
      ...prev,
      variableIncomes: prev.variableIncomes.filter(v => v.id !== id)
    }));
  };

  const handleAddDiyTask = () => {
    if (newDiyTask.name && newDiyTask.marketCost > 0) {
      const taskWithDefaults: DIYTask = {
        id: Date.now().toString(),
        name: newDiyTask.name,
        marketCost: newDiyTask.marketCost,
        estimatedHours: newDiyTask.estimatedHours || 1,
        frequency: newDiyTask.frequency || 'monthly',
      };
      setDiyTasks([...diyTasks, taskWithDefaults]);
      setNewDiyTask({ name: '', marketCost: 0, estimatedHours: 1, frequency: 'monthly' });
      setShowAddDIY(false);
    }
  };

  const handleRemoveDiyTask = (id: string) => {
    setDiyTasks(diyTasks.filter(t => t.id !== id));
  };

  const handleAddRecurringSaving = () => {
    if (newRecurringSaving.name && newRecurringSaving.monthlySaving > 0) {
      setRecurringSavings([...recurringSavings, { ...newRecurringSaving, id: Date.now().toString() }]);
      setNewRecurringSaving({ name: '', monthlySaving: 0, timeInvestedMinutes: 0 });
      setShowAddSaving(false);
    }
  };

  const handleRemoveRecurringSaving = (id: string) => {
    setRecurringSavings(recurringSavings.filter(s => s.id !== id));
  };

  const canProceedStep1 = useMemo(() => {
    switch (compensation.contractType) {
      case 'clt':
        return compensation.cltData.grossSalary > 0;
      case 'pj_simples':
        return compensation.pjData.faturamentoMensal > 0;
      case 'socio':
        return compensation.socioData.proLabore > 0 || compensation.socioData.distribuicaoLucros > 0;
      default:
        return false;
    }
  }, [compensation]);
  
  // Validação do Step 2 - precisa informar horas trabalhadas
  const canProceedStep2 = useMemo(() => {
    return compensation.weeklyHours > 0;
  }, [compensation.weeklyHours]);

  const stepLabels = ['Renda', 'Jornada', 'Resultado'];

  // Mobile collapsible state for each section
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contractType: true,
    companyConfig: false,
    incomeDetails: true,
    journeyBase: true,
    journeyInvisible: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ==================== STEP 1: INCOME INPUT ====================
  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Contract Type Selector - Always visible */}
      <Collapsible open={!isMobile || expandedSections.contractType} onOpenChange={() => isMobile && toggleSection('contractType')}>
        <div className="space-y-2">
          {isMobile && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Regime de trabalho</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {compensation.contractType === 'clt' ? 'CLT' : compensation.contractType === 'pj_simples' ? 'PJ' : 'Sócio'}
                  </Badge>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.contractType && "rotate-180")} />
                </div>
              </Button>
            </CollapsibleTrigger>
          )}
          
          <CollapsibleContent forceMount={!isMobile ? true : undefined} className={cn(!isMobile && "!block")}>
            <div className="space-y-2">
              {!isMobile && <Label className="text-xs font-medium">Qual é o seu regime de trabalho?</Label>}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'clt', label: 'CLT', icon: Building2, desc: 'Carteira assinada' },
                  { value: 'pj_simples', label: 'PJ', icon: Briefcase, desc: 'Simples Nacional' },
                  { value: 'socio', label: 'Sócio', icon: Users, desc: 'Pró-labore + Lucros' },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCompensation(prev => ({ ...prev, contractType: option.value as ContractType }))}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        compensation.contractType === option.value
                          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 mb-2",
                        compensation.contractType === option.value ? "text-emerald-600" : "text-muted-foreground"
                      )} />
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-[10px] text-muted-foreground">{option.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* CLT Company Config - Right after regime selection */}
      {compensation.contractType === 'clt' && (
        <Collapsible open={!isMobile || expandedSections.companyConfig} onOpenChange={() => isMobile && toggleSection('companyConfig')}>
          {isMobile && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">Configurações da Empresa</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {compensation.cltData.taxRegime === 'simples' ? 'Simples' : 'Lucro Real'}
                  </Badge>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.companyConfig && "rotate-180")} />
                </div>
              </Button>
            </CollapsibleTrigger>
          )}
          
          <CollapsibleContent forceMount={!isMobile ? true : undefined} className={cn(!isMobile && "!block")}>
            <div className="p-4 bg-muted/30 border rounded-xl space-y-3 mt-2">
              {!isMobile && (
                <div className="flex items-center gap-2 mb-2">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Configurações da Empresa</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCompensation(prev => ({ 
                    ...prev, 
                    cltData: { ...prev.cltData, taxRegime: 'simples' } 
                  }))}
                  className={cn(
                    "p-2 rounded-lg border text-left transition-all text-xs",
                    compensation.cltData.taxRegime === 'simples'
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <Building2 className={cn("h-4 w-4 mb-1", compensation.cltData.taxRegime === 'simples' ? "text-primary" : "text-muted-foreground")} />
                  <p className="font-medium">Simples Nacional</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCompensation(prev => ({ 
                    ...prev, 
                    cltData: { ...prev.cltData, taxRegime: 'lucro_real' } 
                  }))}
                  className={cn(
                    "p-2 rounded-lg border text-left transition-all text-xs",
                    compensation.cltData.taxRegime === 'lucro_real'
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <Factory className={cn("h-4 w-4 mb-1", compensation.cltData.taxRegime === 'lucro_real' ? "text-amber-600" : "text-muted-foreground")} />
                  <p className="font-medium">Lucro Real/Presumido</p>
                </button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Separator />

      {/* Income Details - Collapsible on mobile */}
      <Collapsible open={!isMobile || expandedSections.incomeDetails} onOpenChange={() => isMobile && toggleSection('incomeDetails')}>
        {isMobile && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Detalhes da Renda</span>
              </div>
              <div className="flex items-center gap-2">
                {compensation.contractType === 'clt' && compensation.cltData.grossSalary > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-700 text-[10px]">
                    {formatMoney(compensation.cltData.grossSalary)}
                  </Badge>
                )}
                {compensation.contractType === 'pj_simples' && compensation.pjData.faturamentoMensal > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-700 text-[10px]">
                    {formatMoney(compensation.pjData.faturamentoMensal)}
                  </Badge>
                )}
                {compensation.contractType === 'socio' && (compensation.socioData.proLabore > 0 || compensation.socioData.distribuicaoLucros > 0) && (
                  <Badge className="bg-emerald-500/20 text-emerald-700 text-[10px]">
                    {formatMoney(compensation.socioData.proLabore + compensation.socioData.distribuicaoLucros)}
                  </Badge>
                )}
                <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.incomeDetails && "rotate-180")} />
              </div>
            </Button>
          </CollapsibleTrigger>
        )}
        
        <CollapsibleContent forceMount={!isMobile ? true : undefined} className={cn(!isMobile && "!block", isMobile && "mt-2")}>
          {/* CLT Inputs - Using enhanced module */}
          {compensation.contractType === 'clt' && (
            <CLTInputForm
              data={compensation.cltData}
              onChange={(cltData) => {
                setCompensation(prev => ({
                  ...prev,
                  cltData,
                  grossSalary: cltData.grossSalary,
                  mealVoucher: cltData.mealVoucher,
                  weeklyHours: cltData.weeklyHours,
                  thirteenthSalary: cltData.receiveThirteenth,
                }));
              }}
            />
          )}

          {/* PJ Enhanced Inputs */}
          {compensation.contractType === 'pj_simples' && (
            <PJInputForm
              data={compensation.pjData}
              onChange={(pjData) => {
                setCompensation(prev => ({
                  ...prev,
                  pjData,
                  pjRevenue: pjData.faturamentoMensal,
                  pjFixedCosts: pjData.custosFixos,
                  weeklyHours: pjData.weeklyHours,
                }));
              }}
            />
          )}

          {/* Sócio Enhanced Inputs */}
          {compensation.contractType === 'socio' && (
            <SocioInputForm
              data={compensation.socioData}
              onChange={(socioData) => {
                setCompensation(prev => ({
                  ...prev,
                  socioData,
                  proLabore: socioData.proLabore,
                  lucroDistribuido: socioData.distribuicaoLucros,
                  weeklyHours: socioData.weeklyHours,
                }));
              }}
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Variable Incomes Section */}
      <Collapsible open={showAddVariable} onOpenChange={setShowAddVariable}>
        <div className="space-y-3">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span>Rendas Variáveis</span>
                {compensation.variableIncomes.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {compensation.variableIncomes.length} • {formatMoney(calculations.totalVariableAnnual)}/ano
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAddVariable && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Adicione bônus, PLR, comissões ou freelances esporádicos (valores anuais).
              </p>
              
              {/* List existing variable incomes */}
              {compensation.variableIncomes.map(income => (
                <div key={income.id} className="flex items-center justify-between p-2 bg-background rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{income.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(income.annualValue)}/ano • {income.isNet ? 'Líquido' : 'Bruto'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveVariableIncome(income.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {/* Add new variable income form */}
              <div className="space-y-2">
                <Input
                  placeholder="Nome (ex: Bônus anual, PLR)"
                  value={newVariableIncome.name}
                  onChange={(e) => setNewVariableIncome(prev => ({ ...prev, name: e.target.value }))}
                  className="text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <CurrencyInput
                    value={newVariableIncome.annualValue}
                    onChange={(value) => setNewVariableIncome(prev => ({ ...prev, annualValue: value }))}
                    placeholder="Valor anual"
                  />
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Label className="text-xs cursor-pointer flex-1">Valor líquido?</Label>
                    <Switch
                      checked={newVariableIncome.isNet}
                      onCheckedChange={(checked) => setNewVariableIncome(prev => ({ ...prev, isNet: checked }))}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleAddVariableIncome} disabled={!newVariableIncome.name || newVariableIncome.annualValue <= 0} size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Renda Variável
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );

  // ==================== STEP 2: REAL JOURNEY ====================
  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Horas Trabalhadas - Campo Principal - Always visible */}
      <Collapsible open={!isMobile || expandedSections.journeyBase} onOpenChange={() => isMobile && toggleSection('journeyBase')}>
        {isMobile && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Horas trabalhadas</span>
              </div>
              <div className="flex items-center gap-2">
                {compensation.weeklyHours > 0 && (
                  <Badge className="bg-primary/20 text-primary text-[10px]">
                    {compensation.weeklyHours}h/sem
                  </Badge>
                )}
                <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.journeyBase && "rotate-180")} />
              </div>
            </Button>
          </CollapsibleTrigger>
        )}
        
        <CollapsibleContent forceMount={!isMobile ? true : undefined} className={cn(!isMobile && "!block", isMobile && "mt-2")}>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Horas trabalhadas por semana *</Label>
            </div>
            <Input
              type="number"
              min={1}
              max={80}
              value={compensation.weeklyHours || ''}
              onChange={(e) => setCompensation(prev => ({ 
                ...prev, 
                weeklyHours: Math.min(80, Math.max(0, Number(e.target.value))) 
              }))}
              placeholder="40"
              className="text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Informe as horas que você <strong>realmente trabalha</strong>, não a carga horária contratual teórica.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <Separator />
      
      {/* Invisible Time Section - Collapsible on mobile */}
      <Collapsible open={!isMobile || expandedSections.journeyInvisible} onOpenChange={() => isMobile && toggleSection('journeyInvisible')}>
        {isMobile && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg bg-amber-500/10 border-amber-500/20">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Tempo invisível</span>
              </div>
              <div className="flex items-center gap-2">
                {(calculations.commuteHoursMonthly > 0 || calculations.overtimeHoursMonthly > 0 || calculations.studyHoursMonthly > 0) && (
                  <Badge className="bg-amber-500/20 text-amber-700 text-[10px]">
                    +{(calculations.commuteHoursMonthly + calculations.overtimeHoursMonthly + calculations.studyHoursMonthly).toFixed(0)}h/mês
                  </Badge>
                )}
                <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.journeyInvisible && "rotate-180")} />
              </div>
            </Button>
          </CollapsibleTrigger>
        )}
        
        <CollapsibleContent forceMount={!isMobile ? true : undefined} className={cn(!isMobile && "!block", isMobile && "mt-2")}>
          <div className="space-y-4">
            {/* Invisible Time Header */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <Clock3 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">Tempo invisível</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estes são os custos de tempo que não aparecem no seu holerite, mas consomem sua vida.
                  </p>
                </div>
              </div>
              
              {/* Clear reference to base hours */}
              <div className="flex items-center gap-2 p-2 bg-background/60 rounded-lg border border-dashed border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  <strong>Importante:</strong> Informe apenas horas <span className="underline">além</span> das{' '}
                  <strong>{compensation.weeklyHours}h/semana</strong> já declaradas acima.
                </p>
              </div>
            </div>
            
            <div className="space-y-4 pl-1">
              {/* Commute */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-amber-600" />
                  <Label className="text-xs font-medium">Deslocamento diário (ida + volta)</Label>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1 ml-6">
                  Tempo gasto no trânsito, <strong>não incluído</strong> nas {compensation.weeklyHours}h/semana
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={240}
                    value={compensation.realJourney.commuteMinutesDaily || ''}
                    onChange={(e) => setCompensation(prev => ({ 
                      ...prev, 
                      realJourney: { ...prev.realJourney, commuteMinutesDaily: Number(e.target.value) }
                    }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-16">minutos</span>
                </div>
                {compensation.realJourney.commuteMinutesDaily > 0 && (
                  <p className="text-xs text-amber-600 ml-6 flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    {((compensation.realJourney.commuteMinutesDaily / 60) * 21).toFixed(1)} horas/mês adicionais no trânsito
                  </p>
                )}
              </div>
              
              {/* Overtime */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <Label className="text-xs font-medium">Horas extras ou "sobreaviso" por semana</Label>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1 ml-6">
                  Trabalho <strong>adicional</strong> não contabilizado nas {compensation.weeklyHours}h/semana
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    step={0.5}
                    value={compensation.realJourney.overtimeHoursWeekly || ''}
                    onChange={(e) => setCompensation(prev => ({ 
                      ...prev, 
                      realJourney: { ...prev.realJourney, overtimeHoursWeekly: Number(e.target.value) }
                    }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-16">horas</span>
                </div>
                {compensation.realJourney.overtimeHoursWeekly > 0 && (
                  <p className="text-xs text-amber-600 ml-6 flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    {(compensation.realJourney.overtimeHoursWeekly * 4.28).toFixed(1)} horas/mês adicionais não remuneradas
                  </p>
                )}
              </div>
              
              {/* Study */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                  <Label className="text-xs font-medium">Estudo obrigatório para a função por semana</Label>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1 ml-6">
                  Tempo de estudo <strong>fora</strong> das {compensation.weeklyHours}h/semana de trabalho
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    step={0.5}
                    value={compensation.realJourney.studyHoursWeekly || ''}
                    onChange={(e) => setCompensation(prev => ({ 
                      ...prev, 
                      realJourney: { ...prev.realJourney, studyHoursWeekly: Number(e.target.value) }
                    }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-16">horas</span>
                </div>
                {compensation.realJourney.studyHoursWeekly > 0 && (
                  <p className="text-xs text-amber-600 ml-6 flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    {(compensation.realJourney.studyHoursWeekly * 4.28).toFixed(1)} horas/mês adicionais de estudo
                  </p>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      {/* Summary - Visual formula for clarity - Always visible */}
      <div className="p-4 bg-gradient-to-b from-muted/40 to-muted/20 rounded-xl space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">Cálculo da Jornada Real</p>
        
        {/* Base hours - weekly to monthly */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Horas trabalhadas ({compensation.weeklyHours}h × 4.28)
          </span>
          <span className="font-medium tabular-nums">{calculations.baseMonthlyHours.toFixed(0)}h</span>
        </div>
        
        {/* Additional hours with + prefix */}
        {calculations.commuteHoursMonthly > 0 && (
          <div className="flex items-center justify-between text-sm text-amber-600">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3 w-3" />
              <Car className="h-3.5 w-3.5" />
              Deslocamento
            </span>
            <span className="tabular-nums">+{calculations.commuteHoursMonthly.toFixed(1)}h</span>
          </div>
        )}
        {calculations.overtimeHoursMonthly > 0 && (
          <div className="flex items-center justify-between text-sm text-amber-600">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3 w-3" />
              <Clock className="h-3.5 w-3.5" />
              Horas extras
            </span>
            <span className="tabular-nums">+{calculations.overtimeHoursMonthly.toFixed(1)}h</span>
          </div>
        )}
        {calculations.studyHoursMonthly > 0 && (
          <div className="flex items-center justify-between text-sm text-amber-600">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3 w-3" />
              <BookOpen className="h-3.5 w-3.5" />
              Estudo
            </span>
            <span className="tabular-nums">+{calculations.studyHoursMonthly.toFixed(1)}h</span>
          </div>
        )}
        
        {/* Total with visual separator */}
        <div className="border-t border-dashed border-border pt-2 mt-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-emerald-600" />
              Jornada Real Total
            </span>
            <span className="text-emerald-600 text-base tabular-nums">{calculations.monthlyWorkingHours.toFixed(0)}h/mês</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== INPUT STEPS RENDER ====================
  if (!showResults) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-full">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Parametrização do seu salário</CardTitle>
              <CardDescription>
                Descubra o valor verdadeiro de cada hora sua
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <StepIndicator currentStep={currentStep} totalSteps={3} labels={stepLabels} />
          
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          
          <div className="flex gap-3 pt-2">
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                Voltar
              </Button>
            )}
            
            {currentStep < 2 ? (
              <Button 
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedStep1}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={() => setShowResults(true)}
                disabled={!canProceedStep2}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Ver Resultado
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handler to navigate to a specific step from results
  const handleStepNavigation = (step: number) => {
    setShowResults(false);
    setCurrentStep(step);
  };

  // ==================== RESULT VIEW ====================
  return (
    <div className="space-y-4">
      {/* Step Navigator - interactive breadcrumb for adjustments */}
      <Card className="bg-gradient-to-r from-muted/30 to-muted/10 border-muted">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">Ajustar parâmetros:</p>
          </div>
          <StepIndicator 
            currentStep={3} 
            totalSteps={3} 
            labels={stepLabels}
            onStepClick={handleStepNavigation}
            interactive={true}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleStepNavigation(1)}
              className="text-xs gap-2"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Ajustar Renda ({compensation.contractType.toUpperCase()})
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleStepNavigation(2)}
              className="text-xs gap-2"
            >
              <Clock3 className="h-3.5 w-3.5" />
              Ajustar Jornada ({compensation.weeklyHours}h/sem)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* VHL Sticky Header */}
      <VHLStickyHeader 
        hourlyRate={calculations.realHourly} 
        nominalHourly={calculations.nominalHourly}
        onEdit={() => handleStepNavigation(1)} 
      />

      {/* Comparison Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" />
            {compensation.contractType === 'clt' ? 'Custo Bruto vs. Líquido por Hora' : 'Comparativo: Nominal vs Real'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HourlyComparisonCard
            nominalHourly={calculations.nominalHourly}
            realHourly={calculations.realHourly}
            differencePercent={calculations.differencePercent}
            grossHourlyEmployerCost={calculations.grossHourlyEmployerCost}
            showEmployerCost={compensation.contractType === 'clt'}
          />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 p-3 rounded-lg text-center">
          <p className="text-[10px] text-muted-foreground">Líquido Mensal</p>
          <p className="text-sm font-semibold tabular-nums">{formatMoneyCompact(calculations.monthlyNet)}</p>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center">
          <p className="text-[10px] text-muted-foreground">Líquido Anual</p>
          <p className="text-sm font-semibold tabular-nums">{formatMoneyCompact(calculations.totalAnnualNet)}</p>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center">
          <p className="text-[10px] text-muted-foreground">Horas Reais/Mês</p>
          <p className="text-sm font-semibold tabular-nums">{calculations.monthlyWorkingHours.toFixed(0)}h</p>
        </div>
      </div>

      {/* Simulators Section Header */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Calculator className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">3 Simuladores de Decisão</h3>
            <p className="text-[10px] text-muted-foreground">Use sua hora real para tomar decisões mais inteligentes</p>
          </div>
        </div>
      </div>

      {/* Tabs with Enhanced Visual Selection */}
      <Tabs defaultValue="converter" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1.5 gap-1.5 bg-muted/30 rounded-xl">
          <TabsTrigger 
            value="converter" 
            className="group relative flex flex-col items-start gap-1 p-3 h-auto text-left rounded-lg border border-transparent data-[state=active]:bg-background data-[state=active]:border-primary/20 data-[state=active]:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="p-1.5 bg-amber-500/10 rounded-md group-data-[state=active]:bg-amber-500/20 transition-colors">
                <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="text-xs font-medium">O Peso</span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight hidden sm:block">
              Quanto custa em horas de vida?
            </p>
          </TabsTrigger>
          
          <TabsTrigger 
            value="diy" 
            className="group relative flex flex-col items-start gap-1 p-3 h-auto text-left rounded-lg border border-transparent data-[state=active]:bg-background data-[state=active]:border-primary/20 data-[state=active]:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="p-1.5 bg-blue-500/10 rounded-md group-data-[state=active]:bg-blue-500/20 transition-colors">
                <Wrench className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-medium">DIY vs Pagar</span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight hidden sm:block">
              Fazer ou terceirizar?
            </p>
          </TabsTrigger>
          
          <TabsTrigger 
            value="savings" 
            className="group relative flex flex-col items-start gap-1 p-3 h-auto text-left rounded-lg border border-transparent data-[state=active]:bg-background data-[state=active]:border-primary/20 data-[state=active]:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="p-1.5 bg-emerald-500/10 rounded-md group-data-[state=active]:bg-emerald-500/20 transition-colors">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium">Aumento</span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight hidden sm:block">
              Impacto de um aumento
            </p>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: O Peso da Compra */}
        <TabsContent value="converter" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-emerald-600" />
                    O Peso da Compra
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Quanto tempo de vida custa esse desejo?
                  </CardDescription>
                </div>
                <HelpDialog type="dreams" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">O que você quer comprar?</Label>
                  <Input
                    placeholder="Ex: iPhone, Tênis, Viagem..."
                    value={purchaseDesire.name}
                    onChange={(e) => setPurchaseDesire(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Qual o valor?</Label>
                  <CurrencyInput
                    value={purchaseDesire.value}
                    onChange={(value) => setPurchaseDesire(prev => ({ ...prev, value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              {purchaseAnalysis && purchaseDesire.name && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-full shrink-0">
                      <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {purchaseDesire.name} = {' '}
                        <span className="text-amber-600">
                          {purchaseAnalysis.displayInDays 
                            ? `${purchaseAnalysis.daysNeeded} dias` 
                            : `${purchaseAnalysis.hoursNeeded.toFixed(1)} horas`}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {purchaseAnalysis.hoursNeeded.toFixed(1)} horas de trabalho
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">% da sua renda mensal</span>
                      <span className="font-medium text-amber-600">{Math.min(100, purchaseAnalysis.percentOfMonthlyIncome).toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(100, purchaseAnalysis.percentOfMonthlyIncome)} className="h-2 bg-amber-100" />
                  </div>
                  
                  <div className="bg-background/60 p-3 rounded-lg">
                    <p className="text-xs">
                      <Lightbulb className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
                      Você precisará trabalhar do dia <strong>01</strong> ao dia <strong>{String(purchaseAnalysis.daysNeeded).padStart(2, '0')}</strong> do mês 
                      apenas para pagar isso. <span className="text-amber-600 font-medium">Vale a pena?</span>
                    </p>
                  </div>
                </div>
              )}

              {!purchaseDesire.name && (
                <div className="text-center py-6 text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Digite um desejo para calcular</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: DIY vs Pagar */}
        <TabsContent value="diy" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-emerald-600" />
                    Faça Você Mesmo vs. Pagar
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Descubra quando DIY vale mais que terceirizar
                  </CardDescription>
                </div>
                <HelpDialog type="diy" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {diyTaskAnalysis.map((task) => (
                  <DIYTaskCard 
                    key={task.id} 
                    task={task} 
                    userHourlyRate={calculations.realHourly}
                    onRemove={handleRemoveDiyTask} 
                  />
                ))}
              </div>

              <Collapsible open={showAddDIY} onOpenChange={setShowAddDIY}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Tarefa
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome da tarefa</Label>
                      <Input
                        placeholder="Ex: Lavar o carro, Cozinhar..."
                        value={newDiyTask.name}
                        onChange={(e) => setNewDiyTask(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    {/* Frequency Selector - Visual */}
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Frequência
                      </Label>
                      <Select
                        value={newDiyTask.frequency}
                        onValueChange={(value: TaskFrequency) => setNewDiyTask(prev => ({ ...prev, frequency: value }))}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50 max-h-60">
                          <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium">Semanal</div>
                          {FREQUENCY_OPTIONS.filter(f => f.value.startsWith('weekly')).map(freq => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label} <span className="text-muted-foreground ml-1">({freq.annualMultiplier}x/ano)</span>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium border-t mt-1 pt-1.5">Periódico</div>
                          {FREQUENCY_OPTIONS.filter(f => !f.value.startsWith('weekly')).map(freq => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label} <span className="text-muted-foreground ml-1">({freq.annualMultiplier}x/ano)</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Cost and Time - Per Occurrence */}
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                        Valores por ocorrência ({getFrequencyLabel(newDiyTask.frequency)})
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Custo para pagar
                          </Label>
                          <CurrencyInput
                            value={newDiyTask.marketCost}
                            onChange={(value) => setNewDiyTask(prev => ({ ...prev, marketCost: value }))}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            Tempo para fazer
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.5"
                              min={0.5}
                              value={newDiyTask.estimatedHours || ''}
                              onChange={(e) => setNewDiyTask(prev => ({ ...prev, estimatedHours: Number(e.target.value) || 0 }))}
                              placeholder="1"
                              className="pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Annual Preview */}
                    {newDiyTask.marketCost > 0 && newDiyTask.estimatedHours > 0 && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-[10px] text-primary/80 uppercase tracking-wide mb-2">Projeção Anual</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Custo total:</span>
                            <p className="font-semibold tabular-nums">{formatMoney(newDiyTask.marketCost * getFrequencyMultiplier(newDiyTask.frequency))}/ano</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tempo total:</span>
                            <p className="font-semibold tabular-nums">{(newDiyTask.estimatedHours * getFrequencyMultiplier(newDiyTask.frequency)).toFixed(0)}h/ano</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleAddDiyTask} 
                      disabled={!newDiyTask.name || newDiyTask.marketCost <= 0 || newDiyTask.estimatedHours <= 0}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Tarefa
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Aumento Invisível */}
        <TabsContent value="savings" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Calculadora de Aumento Invisível
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Descubra o ROI de economizar dinheiro
                  </CardDescription>
                </div>
                <HelpDialog type="savings" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {recurringSavingsAnalysis.map((saving) => (
                  <RecurringSavingCard 
                    key={saving.id} 
                    saving={saving}
                    userHourlyRate={calculations.realHourly}
                    onRemove={handleRemoveRecurringSaving} 
                  />
                ))}
              </div>

              <Collapsible open={showAddSaving} onOpenChange={setShowAddSaving}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Economia
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="space-y-1.5">
                      <Label className="text-xs">O que você economizou?</Label>
                      <Input
                        placeholder="Ex: Negociar conta de luz"
                        value={newRecurringSaving.name}
                        onChange={(e) => setNewRecurringSaving(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Economia mensal</Label>
                        <CurrencyInput
                          value={newRecurringSaving.monthlySaving}
                          onChange={(value) => setNewRecurringSaving(prev => ({ ...prev, monthlySaving: value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tempo investido (min)</Label>
                        <Input
                          type="number"
                          value={newRecurringSaving.timeInvestedMinutes || ''}
                          onChange={(e) => setNewRecurringSaving(prev => ({ ...prev, timeInvestedMinutes: Number(e.target.value) }))}
                          placeholder="30"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleAddRecurringSaving} 
                      disabled={!newRecurringSaving.name || newRecurringSaving.monthlySaving <= 0}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Patrimônio Preservado Summary */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-emerald-600" />
            Patrimônio Preservado
          </CardTitle>
          <CardDescription className="text-xs">
            Quanto você pode economizar por ano usando seu tempo de forma inteligente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background p-3 rounded-xl border text-center">
              <Wrench className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">DIY Inteligente</p>
              <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatMoneyCompact(totalPatrimonioPreservado.diy)}</p>
            </div>
            <div className="bg-background p-3 rounded-xl border text-center">
              <TrendingUp className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">Economias</p>
              <p className="text-sm font-bold text-purple-600 tabular-nums">{formatMoneyCompact(totalPatrimonioPreservado.recurring)}</p>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
              <Sparkles className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">Total/Ano</p>
              <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatMoneyCompact(totalPatrimonioPreservado.total)}</p>
            </div>
          </div>
          
          {totalPatrimonioPreservado.total > 0 && (
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <p className="text-xs text-center">
                <Sparkles className="h-3.5 w-3.5 inline mr-1 text-emerald-500" />
                Isso equivale a <strong>{(totalPatrimonioPreservado.total / calculations.realHourly).toFixed(0)} horas</strong> de trabalho 
                que você pode usar para lazer!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
