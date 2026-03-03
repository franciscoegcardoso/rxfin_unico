import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Zap,
  Wallet,
  Briefcase,
  Timer,
  LayoutDashboard,
  Car,
  Utensils,
  Shirt,
  Wrench,
  Coffee,
  Moon,
  TrendingUp,
  TrendingDown,
  Building2,
  ShoppingBag,
  Settings2,
  Tv,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PurchaseConsciousnessModule } from './PurchaseConsciousnessModule';
import { MakeOrPayModule } from './MakeOrPayModule';
import { OpportunityRadarModule } from './OpportunityRadarModule';
import { StreamingOptimizerModule } from './StreamingOptimizerModule';

// ==================== TYPES ====================

type WizardStep = 'intro' | 'income' | 'costs' | 'time' | 'dashboard' | 'gains';

type EmploymentType = 'clt' | 'pj';

interface WizardData {
  // Income
  netMonthly: number;
  includeThirteenth: boolean;
  annualBonus: number;
  otherIncome: number;
  
  // Work Costs
  transport: number;
  foodOut: number;
  clothes: number;
  tools: number;
  
  // Time
  weeklyContractHours: number;
  daysPerWeek: number;
  remoteDays: number;
  commuteMinutes: number;
  prepMinutes: number;
  decompressMinutes: number;
  
  // Employment type for cost multiplier
  employmentType: EmploymentType;
  costMultiplier: number;
}

// ==================== CONSTANTS ====================

const WEEKS_PER_MONTH = 52.1429 / 12;

const STEP_CONFIG: { key: WizardStep; icon: React.ElementType; label: string }[] = [
  { key: 'intro', icon: Zap, label: 'Introdução' },
  { key: 'income', icon: Wallet, label: 'Renda' },
  { key: 'costs', icon: Briefcase, label: 'Custos' },
  { key: 'time', icon: Timer, label: 'Tempo' },
  { key: 'dashboard', icon: LayoutDashboard, label: 'Resultado' },
  { key: 'gains', icon: TrendingUp, label: 'Ganhos' },
];

const CLT_MULTIPLIERS = [
  { value: 1.6, label: '1.6x - Básico (sem benefícios)' },
  { value: 1.8, label: '1.8x - Médio (plano saúde)' },
  { value: 2.0, label: '2.0x - Alto (benefícios completos)' },
  { value: 2.2, label: '2.2x - Premium (multinacional)' },
];

const PJ_MULTIPLIERS = [
  { value: 1.1, label: '1.1x - MEI / Simples' },
  { value: 1.2, label: '1.2x - Simples Nacional' },
  { value: 1.3, label: '1.3x - Lucro Presumido' },
  { value: 1.4, label: '1.4x - Lucro Real' },
];

// ==================== HELPERS ====================

const formatMoney = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

// ==================== STEP INDICATOR ====================

interface StepIndicatorProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
  canNavigate: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick, canNavigate }) => {
  const currentIndex = STEP_CONFIG.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_CONFIG.map((step, index) => {
        const isActive = step.key === currentStep;
        const isPast = index < currentIndex;
        const Icon = step.icon;
        
        return (
          <React.Fragment key={step.key}>
            <button
              onClick={() => canNavigate && isPast && onStepClick(step.key)}
              disabled={!canNavigate || (!isPast && !isActive)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300",
                isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                isPast && canNavigate && "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                !isActive && !isPast && "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
            </button>
            {index < STEP_CONFIG.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 rounded-full transition-colors duration-300",
                index < currentIndex ? "bg-primary" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ==================== INTRO STEP ====================

const IntroStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="text-center py-8 px-4 max-w-2xl mx-auto"
  >
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-emerald-500/20 blur-3xl rounded-full" />
      <div className="relative bg-gradient-to-br from-emerald-500 to-primary w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
        <Zap className="h-12 w-12 text-white" />
      </div>
    </div>
    
    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
      Sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-primary">Energia de Vida</span>
    </h1>
    
    <div className="space-y-4 text-lg text-muted-foreground leading-relaxed mb-8">
      <p>
        Cada hora que você trabalha não é apenas tempo — é <strong className="text-foreground">energia de vida</strong> que você troca por dinheiro.
      </p>
      <p>
        Mas quanto realmente vale essa hora? Não a hora que a empresa paga, mas a <strong className="text-foreground">Hora Real</strong>: 
        considerando custos para trabalhar e o tempo invisível que você não contabiliza.
      </p>
    </div>
    
    <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
      <div className="bg-muted/50 rounded-2xl p-4 border border-border">
        <Wallet className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Renda Real</p>
      </div>
      <div className="bg-muted/50 rounded-2xl p-4 border border-border">
        <Briefcase className="h-6 w-6 text-amber-500 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Custos Ocultos</p>
      </div>
      <div className="bg-muted/50 rounded-2xl p-4 border border-border">
        <Timer className="h-6 w-6 text-primary mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Tempo Invisível</p>
      </div>
    </div>
    
    <Button onClick={onNext} size="lg" className="gap-3 bg-gradient-to-r from-emerald-500 to-primary hover:from-emerald-600 hover:to-primary/90 shadow-lg shadow-primary/25 px-8">
      Descobrir Minha Hora Real <ArrowRight className="h-5 w-5" />
    </Button>
  </motion.div>
);

// ==================== INCOME STEP ====================

interface IncomeStepProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const IncomeStep: React.FC<IncomeStepProps> = ({ data, onChange, onNext, onPrev }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -50 }}
    className="max-w-xl mx-auto"
  >
    <div className="text-center mb-8">
      <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Wallet className="h-8 w-8 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Sua Renda Líquida</h2>
      <p className="text-muted-foreground">O que realmente cai na sua conta.</p>
    </div>
    
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-500" />
            Salário Líquido Mensal
          </Label>
          <MoneyInput 
            value={data.netMonthly}
            onChange={(v) => onChange({ netMonthly: v })}
            placeholder="Ex: 5.000"
          />
          <p className="text-xs text-muted-foreground">
            Média dos últimos 12 meses, já descontado INSS e IR.
          </p>
        </div>
        
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
          <div>
            <Label className="text-sm font-medium">Recebe 13º salário?</Label>
            <p className="text-xs text-muted-foreground">Incluir na média anual</p>
          </div>
          <Switch
            checked={data.includeThirteenth}
            onCheckedChange={(v) => onChange({ includeThirteenth: v })}
          />
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              PLR / Bônus Anual
            </Label>
            <MoneyInput 
              value={data.annualBonus}
              onChange={(v) => onChange({ annualBonus: v })}
              placeholder="Ex: 10.000"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              Outras Rendas Mensais
            </Label>
            <MoneyInput 
              value={data.otherIncome}
              onChange={(v) => onChange({ otherIncome: v })}
              placeholder="Ex: 500"
            />
            <p className="text-xs text-muted-foreground">Freelance, dividendos, etc.</p>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <div className="flex justify-between mt-8">
      <Button variant="ghost" onClick={onPrev} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      <Button onClick={onNext} className="gap-2 bg-gradient-to-r from-emerald-500 to-primary">
        Continuar <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  </motion.div>
);

// ==================== COSTS STEP ====================

interface CostsStepProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const CostsStep: React.FC<CostsStepProps> = ({ data, onChange, onNext, onPrev }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -50 }}
    className="max-w-xl mx-auto"
  >
    <div className="text-center mb-8">
      <div className="bg-amber-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Briefcase className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Custos de Trabalhar</h2>
      <p className="text-muted-foreground">Quanto você gasta para poder trabalhar.</p>
    </div>
    
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Car className="h-4 w-4 text-amber-500" />
              Transporte Mensal
            </Label>
            <MoneyInput 
              value={data.transport}
              onChange={(v) => onChange({ transport: v })}
              placeholder="Combustível, Uber, VT..."
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Utensils className="h-4 w-4 text-orange-500" />
              Alimentação Fora
            </Label>
            <MoneyInput 
              value={data.foodOut}
              onChange={(v) => onChange({ foodOut: v })}
              placeholder="Almoço, café, lanches..."
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Shirt className="h-4 w-4 text-blue-500" />
              Vestuário / Equipamento
            </Label>
            <MoneyInput 
              value={data.clothes}
              onChange={(v) => onChange({ clothes: v })}
              placeholder="Roupas, uniforme..."
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-500" />
              Creche / Ferramentas
            </Label>
            <MoneyInput 
              value={data.tools}
              onChange={(v) => onChange({ tools: v })}
              placeholder="Software, creche..."
            />
          </div>
        </div>
        
        <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total de custos mensais:</span>
            <span className="text-lg font-bold text-amber-500">
              {formatMoney(data.transport + data.foodOut + data.clothes + data.tools)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <div className="flex justify-between mt-8">
      <Button variant="ghost" onClick={onPrev} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      <Button onClick={onNext} className="gap-2 bg-gradient-to-r from-emerald-500 to-primary">
        Continuar <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  </motion.div>
);

// ==================== TIME STEP ====================

interface TimeStepProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const TimeStep: React.FC<TimeStepProps> = ({ data, onChange, onNext, onPrev }) => {
  const presentialDays = data.daysPerWeek - data.remoteDays;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Timer className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Tempo Detalhado</h2>
        <p className="text-muted-foreground">O tempo que você realmente dedica ao trabalho.</p>
      </div>
      
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 space-y-6">
          {/* Contract Time */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Jornada Contratual
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Horas semanais</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={data.weeklyContractHours}
                  onChange={(e) => onChange({ weeklyContractHours: Math.min(168, Math.max(1, Number(e.target.value) || 44)) })}
                  className="text-center font-bold"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dias por semana</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={data.daysPerWeek}
                  onChange={(e) => onChange({ daysPerWeek: Math.min(7, Math.max(1, Number(e.target.value) || 5)) })}
                  className="text-center font-bold"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dias remotos</Label>
                <Input
                  type="number"
                  min={0}
                  max={data.daysPerWeek}
                  value={data.remoteDays}
                  onChange={(e) => onChange({ remoteDays: Math.min(data.daysPerWeek, Math.max(0, Number(e.target.value) || 0)) })}
                  className="text-center font-bold"
                />
              </div>
            </div>
          </div>
          
          {/* Invisible Time */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Tempo Invisível (por dia)
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Car className="h-3 w-3" /> Deslocamento (min)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={480}
                  value={data.commuteMinutes}
                  onChange={(e) => onChange({ commuteMinutes: Math.min(480, Math.max(0, Number(e.target.value) || 0)) })}
                  className="text-center font-bold"
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  Apenas {presentialDays} dias presenciais
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coffee className="h-3 w-3" /> Preparação (min)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={480}
                  value={data.prepMinutes}
                  onChange={(e) => onChange({ prepMinutes: Math.min(480, Math.max(0, Number(e.target.value) || 0)) })}
                  className="text-center font-bold"
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  Banho, roupa, café
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Moon className="h-3 w-3" /> Descompressão (min)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={480}
                  value={data.decompressMinutes}
                  onChange={(e) => onChange({ decompressMinutes: Math.min(480, Math.max(0, Number(e.target.value) || 0)) })}
                  className="text-center font-bold"
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  Relaxar após o trabalho
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onNext} className="gap-2 bg-gradient-to-r from-emerald-500 to-primary">
          Ver Resultado <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// ==================== DASHBOARD STEP (Details Only) ====================

interface DashboardStepProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
  calculations: {
    monthlyIncome: number;
    workCosts: number;
    disposableIncome: number;
    contractHoursMonthly: number;
    invisibleHoursMonthly: number;
    totalLifeHours: number;
    nominalRate: number;
    realRate: number;
    employerCost: number;
    differencePercent: number;
  };
}

const DashboardStep: React.FC<DashboardStepProps> = ({ data, onChange, onNext, onPrev, calculations }) => {
  const multipliers = data.employmentType === 'clt' ? CLT_MULTIPLIERS : PJ_MULTIPLIERS;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-foreground mb-2">Sua Hora Real</h2>
        <p className="text-muted-foreground">A verdade sobre o valor do seu tempo.</p>
      </div>
      
      {/* Main Rate Card */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-emerald-500/20 blur-3xl rounded-3xl" />
        <Card className="relative border-2 border-emerald-500/30 bg-gradient-to-br from-background via-emerald-500/5 to-primary/5 overflow-hidden">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Hora Real Líquida</p>
              <div className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-primary mb-2">
                {formatMoney(calculations.realRate)}
              </div>
              <p className="text-sm text-muted-foreground">
                por hora de vida dedicada ao trabalho
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Details Section */}
      <div className="space-y-6 mb-8">
        {/* Comparison Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-slate-500/10 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-slate-500" />
                </div>
                <span className="text-sm text-muted-foreground">Hora Nominal</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatMoney(calculations.nominalRate)}</p>
              <p className="text-xs text-muted-foreground mt-1">Sem custos e tempo invisível</p>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-emerald-500/10 p-2 rounded-lg">
                  <Zap className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Hora Real</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">{formatMoney(calculations.realRate)}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="h-3 w-3 text-amber-500" />
                <p className="text-xs text-amber-500">-{calculations.differencePercent.toFixed(1)}% vs nominal</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-muted/30 relative">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/10 p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Custo Empresa</span>
                </div>
                
                {/* Config button for employment type dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 shrink-0"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Configurar Tipo de Contratação</DialogTitle>
                      <DialogDescription>
                        Defina o tipo de contratação e o multiplicador de custo da empresa.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Tipo de Contratação</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={data.employmentType === 'clt' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onChange({ employmentType: 'clt', costMultiplier: 1.8 })}
                            className="flex-1"
                          >
                            CLT
                          </Button>
                          <Button
                            variant={data.employmentType === 'pj' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onChange({ employmentType: 'pj', costMultiplier: 1.2 })}
                            className="flex-1"
                          >
                            PJ
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Multiplicador de Custo</Label>
                        <Select
                          value={String(data.costMultiplier)}
                          onValueChange={(v) => onChange({ costMultiplier: Number(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {multipliers.map((m) => (
                              <SelectItem key={m.value} value={String(m.value)}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          O multiplicador representa os custos adicionais que a empresa tem além do salário bruto (encargos, benefícios, etc.)
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatMoney(calculations.employerCost)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.costMultiplier.toFixed(1)}x do nominal (contrato {data.employmentType.toUpperCase()})
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Breakdown */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-foreground mb-4">Detalhamento do Cálculo</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Renda</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Renda Mensal Total</span>
                    <span className="font-medium">{formatMoney(calculations.monthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(-) Custos de Trabalhar</span>
                    <span className="font-medium text-amber-500">-{formatMoney(calculations.workCosts)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-medium">Renda Disponível</span>
                    <span className="font-bold text-emerald-500">{formatMoney(calculations.disposableIncome)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Tempo</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horas Contratuais/mês</span>
                    <span className="font-medium">{formatHours(calculations.contractHoursMonthly)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(+) Tempo Invisível/mês</span>
                    <span className="font-medium text-amber-500">+{formatHours(calculations.invisibleHoursMonthly)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-medium">Horas de Vida/mês</span>
                    <span className="font-bold text-primary">{formatHours(calculations.totalLifeHours)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onNext} className="gap-2 bg-gradient-to-r from-emerald-500 to-primary">
          Ganhos Invisíveis <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// ==================== GAINS STEP (Simulators) ====================

interface GainsStepProps {
  realHourlyRate: number;
  onRestart: () => void;
  onPrev: () => void;
}

const GainsStep: React.FC<GainsStepProps> = ({ realHourlyRate, onRestart, onPrev }) => {
  const [activeTab, setActiveTab] = useState<'purchase' | 'makeorpay' | 'streaming' | 'radar'>('purchase');
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-6">
        <div className="bg-gradient-to-br from-emerald-500/10 to-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Ganhos Invisíveis</h2>
        <p className="text-muted-foreground">Use sua Hora Real para tomar decisões financeiras conscientes.</p>
      </div>
      
      {/* Tabs for the 4 simulators */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="purchase" className="gap-1 text-xs sm:text-sm">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Comprar</span>
          </TabsTrigger>
          <TabsTrigger value="makeorpay" className="gap-1 text-xs sm:text-sm">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Terceirizar</span>
          </TabsTrigger>
          <TabsTrigger value="streaming" className="gap-1 text-xs sm:text-sm">
            <Tv className="h-4 w-4" />
            <span className="hidden sm:inline">Streamings</span>
          </TabsTrigger>
          <TabsTrigger value="radar" className="gap-1 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Economia</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="purchase" className="mt-6">
          <PurchaseConsciousnessModule realHourlyRate={realHourlyRate} />
        </TabsContent>
        
        <TabsContent value="makeorpay" className="mt-6">
          <MakeOrPayModule realHourlyRate={realHourlyRate} />
        </TabsContent>
        
        <TabsContent value="streaming" className="mt-6">
          <StreamingOptimizerModule realHourlyRate={realHourlyRate} />
        </TabsContent>
        
        <TabsContent value="radar" className="mt-6">
          <OpportunityRadarModule realHourlyRate={realHourlyRate} />
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button variant="outline" onClick={onRestart} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Refazer Cálculo
        </Button>
      </div>
    </motion.div>
  );
};

// ==================== MAIN COMPONENT ====================

export const HourlyCostSimulator: React.FC = () => {
  const [step, setStep] = useState<WizardStep>('intro');
  
  const [data, setData] = useState<WizardData>({
    // Income
    netMonthly: 0,
    includeThirteenth: true,
    annualBonus: 0,
    otherIncome: 0,
    
    // Work Costs
    transport: 0,
    foodOut: 0,
    clothes: 0,
    tools: 0,
    
    // Time
    weeklyContractHours: 44,
    daysPerWeek: 5,
    remoteDays: 0,
    commuteMinutes: 60,
    prepMinutes: 30,
    decompressMinutes: 30,
    
    // Employment
    employmentType: 'clt',
    costMultiplier: 1.8,
  });
  
  const updateData = (patch: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...patch }));
  };
  
  // Calculations based on reference logic
  const calculations = useMemo(() => {
    // Monthly Income
    const thirteenthMonthly = data.includeThirteenth ? data.netMonthly / 12 : 0;
    const bonusMonthly = data.annualBonus / 12;
    const monthlyIncome = data.netMonthly + thirteenthMonthly + bonusMonthly + data.otherIncome;
    
    // Work Costs
    const workCosts = data.transport + data.foodOut + data.clothes + data.tools;
    
    // Disposable Income
    const disposableIncome = monthlyIncome - workCosts;
    
    // Contract Hours Monthly
    const contractHoursMonthly = data.weeklyContractHours * WEEKS_PER_MONTH;
    
    // Invisible Time (daily calculation)
    const presentialDays = data.daysPerWeek - data.remoteDays;
    const commuteHoursDaily = (data.commuteMinutes / 60) * (presentialDays / data.daysPerWeek);
    const prepHoursDaily = data.prepMinutes / 60;
    const decompressHoursDaily = data.decompressMinutes / 60;
    const invisibleHoursDaily = commuteHoursDaily + prepHoursDaily + decompressHoursDaily;
    
    // Invisible Hours Monthly (daily * days per week * weeks per month)
    const invisibleHoursMonthly = invisibleHoursDaily * data.daysPerWeek * WEEKS_PER_MONTH;
    
    // Total Life Hours
    const totalLifeHours = contractHoursMonthly + invisibleHoursMonthly;
    
    // Rates
    const nominalRate = monthlyIncome > 0 && contractHoursMonthly > 0 
      ? monthlyIncome / contractHoursMonthly 
      : 0;
    
    const realRate = disposableIncome > 0 && totalLifeHours > 0 
      ? disposableIncome / totalLifeHours 
      : 0;
    
    // Employer Cost
    const employerCost = nominalRate * data.costMultiplier;
    
    // Difference
    const differencePercent = nominalRate > 0 
      ? ((nominalRate - realRate) / nominalRate) * 100 
      : 0;
    
    return {
      monthlyIncome,
      workCosts,
      disposableIncome,
      contractHoursMonthly,
      invisibleHoursMonthly,
      totalLifeHours,
      nominalRate,
      realRate,
      employerCost,
      differencePercent,
    };
  }, [data]);
  
  const goToStep = (newStep: WizardStep) => setStep(newStep);
  const nextStep = () => {
    const steps: WizardStep[] = ['intro', 'income', 'costs', 'time', 'dashboard', 'gains'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };
  const prevStep = () => {
    const steps: WizardStep[] = ['intro', 'income', 'costs', 'time', 'dashboard', 'gains'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };
  const restart = () => setStep('intro');
  
  return (
    <div className="min-h-[calc(100vh-12rem)]">
      {step !== 'intro' && (
        <StepIndicator 
          currentStep={step} 
          onStepClick={goToStep}
          canNavigate={true}
        />
      )}
      
      <AnimatePresence mode="wait">
        {step === 'intro' && <IntroStep key="intro" onNext={nextStep} />}
        {step === 'income' && (
          <IncomeStep 
            key="income" 
            data={data} 
            onChange={updateData} 
            onNext={nextStep} 
            onPrev={prevStep} 
          />
        )}
        {step === 'costs' && (
          <CostsStep 
            key="costs" 
            data={data} 
            onChange={updateData} 
            onNext={nextStep} 
            onPrev={prevStep} 
          />
        )}
        {step === 'time' && (
          <TimeStep 
            key="time" 
            data={data} 
            onChange={updateData} 
            onNext={nextStep} 
            onPrev={prevStep} 
          />
        )}
        {step === 'dashboard' && (
          <DashboardStep 
            key="dashboard" 
            data={data} 
            onChange={updateData}
            onNext={nextStep}
            onPrev={prevStep}
            calculations={calculations}
          />
        )}
        {step === 'gains' && (
          <GainsStep
            key="gains"
            realHourlyRate={calculations.realRate}
            onRestart={restart}
            onPrev={prevStep}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HourlyCostSimulator;
