import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Building2,
  Factory,
  HelpCircle,
  Calculator,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Bus,
  Heart,
  Shield,
  Baby,
  GraduationCap,
  Dumbbell,
  Gift,
  Plus,
  X,
  Wallet,
  PiggyBank,
  TrendingUp,
  Users,
  DollarSign,
  Info,
  LineChart,
  Search,
  Loader2,
  Calendar,
  BarChart3,
  AlertCircle,
  Settings2,
} from 'lucide-react';
import { 
  CLTFullCalculation, 
  TaxRegime, 
  calculateCLTFull,
  calculateBonusTax,
} from './CLTTaxEngine';
import { 
  CLTBenefitsState, 
  Benefit, 
  DEFAULT_BENEFITS,
  createCustomBenefit,
  calculateTotalBenefitsCost,
  calculateNetBenefitsValue,
} from './CLTBenefitsTypes';
import {
  StockEquityGrant,
  VestingScheduleEntry,
  VESTING_OPTIONS,
  STOCK_TYPE_OPTIONS,
  createDefaultStockGrant,
  calculateStockEquity,
  calculateStockEquityTax,
  generateDefaultVestingSchedule,
  validateVestingSchedule,
  BENEFIT_HELP_INFO,
  BenefitHelpInfo,
} from './CLTStockEquityTypes';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useIsMobile } from '@/hooks/use-mobile';

// ==================== HELPERS ====================

const formatMoney = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ==================== ICON MAP ====================

const iconMap: Record<string, React.ReactNode> = {
  Bus: <Bus className="h-4 w-4" />,
  Heart: <Heart className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
  Baby: <Baby className="h-4 w-4" />,
  GraduationCap: <GraduationCap className="h-4 w-4" />,
  Dumbbell: <Dumbbell className="h-4 w-4" />,
  Gift: <Gift className="h-4 w-4" />,
};

// ==================== COMPACT TAX BREAKDOWN ====================

interface TaxBreakdownDialogProps {
  calculation: CLTFullCalculation;
  benefits: CLTBenefitsState;
  plrAnnual: number;
  bonusCashAnnual: number;
}

const TaxBreakdownDialog: React.FC<TaxBreakdownDialogProps> = ({ 
  calculation, 
  benefits,
  plrAnnual,
  bonusCashAnnual,
}) => {
  const benefitsCost = calculateTotalBenefitsCost(benefits);
  const regime = calculation.taxRegime === 'simples' 
    ? calculation.employerCosts.simplesNacional 
    : calculation.employerCosts.lucroRealPresumido;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 h-auto p-0 gap-1">
          <Calculator className="h-3 w-3" />
          Ver detalhes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-primary" />
            Detalhamento CLT
          </DialogTitle>
          <DialogDescription>
            Regime: {calculation.taxRegime === 'simples' ? 'Simples Nacional' : 'Lucro Real/Presumido'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-sm">
          {/* Worker's Deductions */}
          <div className="space-y-2">
            <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
              Descontos do Trabalhador
            </h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span>Salário Bruto</span>
                <span className="font-semibold tabular-nums">{formatMoney(calculation.grossSalary)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-destructive/80">
                <span>− INSS ({calculation.inss.effectiveRate.toFixed(1)}%)</span>
                <span className="tabular-nums">{formatMoney(calculation.inss.value)}</span>
              </div>
              <div className="flex justify-between text-destructive/80">
                <span>− IRRF ({calculation.irrf.bracket})</span>
                <span className="tabular-nums">{formatMoney(calculation.irrf.value)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>= Salário Líquido</span>
                <span className="tabular-nums">{formatMoney(calculation.netSalary)}</span>
              </div>
            </div>
          </div>
          
          {/* Employer Costs */}
          <div className="space-y-2">
            <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
              Custo Total p/ Empresa
            </h4>
            <div className="bg-amber-500/10 rounded-lg p-3">
              <div className="flex justify-between font-semibold text-amber-600">
                <span>Custo Total</span>
                <span className="tabular-nums">{formatMoney(calculation.totalEmployerCost + benefitsCost)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== COMPACT BENEFIT ITEM ====================

interface CompactBenefitItemProps {
  benefit: Benefit;
  onChange: (benefit: Benefit) => void;
  onRemove?: () => void;
}

const CompactBenefitItem: React.FC<CompactBenefitItemProps> = ({ benefit, onChange, onRemove }) => {
  return (
    <div className="flex items-center gap-2 py-2">
      <Checkbox
        checked={benefit.enabled}
        onCheckedChange={(checked) => onChange({ ...benefit, enabled: !!checked })}
      />
      <span className={cn(
        "flex-1 text-sm",
        benefit.enabled ? "font-medium" : "text-muted-foreground"
      )}>
        {benefit.name}
      </span>
      {benefit.enabled && (
        <CurrencyInput
          value={benefit.costToCompany}
          onChange={(value) => onChange({ ...benefit, costToCompany: value })}
          compact
          className="w-24 h-7 text-xs"
        />
      )}
      {benefit.isCustom && onRemove && (
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

// ==================== COMPACT STOCK EQUITY ====================

interface CompactStockEquityProps {
  grant: StockEquityGrant;
  onChange: (grant: StockEquityGrant) => void;
  onRemove: () => void;
}

const CompactStockEquity: React.FC<CompactStockEquityProps> = ({ grant, onChange, onRemove }) => {
  const { quote, isLoading, error, fetchQuote, reset } = useStockQuote();
  const calculation = calculateStockEquity(grant);
  const taxCalc = calculateStockEquityTax(calculation.annualVestedValue);
  const vestingSchedule = grant.vestingSchedule && grant.vestingSchedule.length > 0
    ? grant.vestingSchedule
    : generateDefaultVestingSchedule(grant.vestingYears);

  const handleTickerSearch = useCallback(async () => {
    if (!grant.ticker || grant.ticker.length < 4) return;
    const result = await fetchQuote(grant.ticker);
    if (result) {
      onChange({
        ...grant,
        currentStockPrice: result.regularMarketPrice,
        companyName: result.shortName,
      });
    }
  }, [grant, fetchQuote, onChange]);

  const handleVestingYearsChange = (years: number) => {
    const newSchedule = generateDefaultVestingSchedule(years);
    onChange({ ...grant, vestingYears: years, vestingSchedule: newSchedule });
  };

  return (
    <div className="p-3 border rounded-lg bg-purple-500/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-purple-600" />
          <span className="font-medium text-sm">{grant.companyName || 'Equity Grant'}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Qtd. Ações</Label>
          <Input
            type="number"
            min={0}
            value={grant.grantQuantity || ''}
            onChange={(e) => onChange({ ...grant, grantQuantity: Number(e.target.value) })}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Preço Unitário</Label>
          <CurrencyInput
            value={grant.currentStockPrice}
            onChange={(value) => onChange({ ...grant, currentStockPrice: value })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Vesting (anos)</Label>
          <Select
            value={grant.vestingYears.toString()}
            onValueChange={(value) => handleVestingYearsChange(parseInt(value))}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VESTING_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Ticker (opcional)</Label>
          <div className="flex gap-1">
            <Input
              value={grant.ticker}
              onChange={(e) => onChange({ ...grant, ticker: e.target.value.toUpperCase() })}
              placeholder="PETR4"
              className="h-8 font-mono text-sm"
              maxLength={10}
            />
            <Button size="sm" variant="outline" onClick={handleTickerSearch} disabled={isLoading} className="h-8 w-8 p-0">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>

      {grant.grantQuantity > 0 && grant.currentStockPrice > 0 && (
        <div className="p-2 bg-purple-500/10 rounded-lg flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Valor anual (líq.)</span>
          <span className="font-semibold text-purple-700">{formatMoney(taxCalc.net)}</span>
        </div>
      )}
    </div>
  );
};

// ==================== IMPORTS FOR VARIABLE COMPENSATION ====================

import {
  VariableCompensationSection,
  NetSalaryOverrideInput,
  ManualOverrideIndicator,
  calculateDSR,
} from './CLTVariableCompensation';

// ==================== MAIN CLT INPUT FORM ====================

export interface CLTInputData {
  // Fixed salary (renamed from grossSalary)
  fixedGrossSalary: number;
  grossSalary: number; // Computed: fixedGrossSalary + variableMonthly + dsrValue
  
  // Variable compensation toggle
  hasVariableCompensation: boolean;
  variableMonthly: number;
  dsrValue: number;
  
  // Manual override for net salary
  overrideNetSalary: boolean;
  forcedNetSalary: number;
  
  taxRegime: TaxRegime;
  dependents: number;
  weeklyHours: number;
  mealVoucher: number;
  receiveThirteenth: boolean;
  plrAnnual: number;
  bonusCashAnnual: number;
  stockEquityGrants: StockEquityGrant[];
  benefits: CLTBenefitsState;
  calculation: CLTFullCalculation | null;
}

interface CLTInputFormProps {
  data: CLTInputData;
  onChange: (data: CLTInputData) => void;
}

export const CLTInputForm: React.FC<CLTInputFormProps> = ({ data, onChange }) => {
  const isMobile = useIsMobile();
  const [newBenefitName, setNewBenefitName] = useState('');
  
  // Compute total gross salary = fixed + (variable + DSR only if enabled)
  const variableComponent = data.hasVariableCompensation 
    ? (data.variableMonthly || 0) + (data.dsrValue || 0) 
    : 0;
  const totalGrossSalary = (data.fixedGrossSalary || 0) + variableComponent;
  
  // Recalculate when relevant fields change
  const calculation = totalGrossSalary > 0 
    ? calculateCLTFull(totalGrossSalary, data.taxRegime, data.dependents)
    : null;
  
  const handleChange = (updates: Partial<CLTInputData>) => {
    const newData = { ...data, ...updates };
    
    // Compute grossSalary from components (variable only if enabled)
    const fixedGross = newData.fixedGrossSalary ?? data.fixedGrossSalary ?? 0;
    const hasVariable = newData.hasVariableCompensation ?? data.hasVariableCompensation ?? false;
    const variable = hasVariable ? (newData.variableMonthly ?? data.variableMonthly ?? 0) : 0;
    const dsr = hasVariable ? (newData.dsrValue ?? data.dsrValue ?? 0) : 0;
    newData.grossSalary = fixedGross + variable + dsr;
    
    if (newData.grossSalary > 0) {
      newData.calculation = calculateCLTFull(
        newData.grossSalary, 
        newData.taxRegime, 
        newData.dependents
      );
    } else {
      newData.calculation = null;
    }
    onChange(newData);
  };
  
  // Handler for variable compensation DSR auto-calculation
  const handleVariableChange = (value: number) => {
    const dsr = value > 0 ? value / 6 : 0;
    handleChange({ variableMonthly: value, dsrValue: dsr });
  };
  
  // Handler to reset net salary override
  const handleResetNetOverride = () => {
    handleChange({ overrideNetSalary: false, forcedNetSalary: 0 });
  };
  
  const handleBenefitChange = (key: keyof Omit<CLTBenefitsState, 'customBenefits'>, benefit: Benefit) => {
    handleChange({
      benefits: { ...data.benefits, [key]: benefit }
    });
  };
  
  const handleCustomBenefitChange = (index: number, benefit: Benefit) => {
    const newCustom = [...data.benefits.customBenefits];
    newCustom[index] = benefit;
    handleChange({
      benefits: { ...data.benefits, customBenefits: newCustom }
    });
  };
  
  const handleAddCustomBenefit = () => {
    if (!newBenefitName.trim()) return;
    handleChange({
      benefits: {
        ...data.benefits,
        customBenefits: [...data.benefits.customBenefits, createCustomBenefit(newBenefitName.trim())]
      }
    });
    setNewBenefitName('');
  };
  
  const handleRemoveCustomBenefit = (index: number) => {
    const newCustom = data.benefits.customBenefits.filter((_, i) => i !== index);
    handleChange({
      benefits: { ...data.benefits, customBenefits: newCustom }
    });
  };
  
  // Stock equity handlers
  const handleAddStockGrant = () => {
    handleChange({
      stockEquityGrants: [...(data.stockEquityGrants || []), createDefaultStockGrant()]
    });
  };
  
  const handleUpdateStockGrant = (index: number, grant: StockEquityGrant) => {
    const newGrants = [...(data.stockEquityGrants || [])];
    newGrants[index] = grant;
    handleChange({ stockEquityGrants: newGrants });
  };
  
  const handleRemoveStockGrant = (index: number) => {
    const newGrants = (data.stockEquityGrants || []).filter((_, i) => i !== index);
    handleChange({ stockEquityGrants: newGrants });
  };
  
  // Calculate summary values
  const totalBenefitsCost = calculateTotalBenefitsCost(data.benefits);
  const enabledBenefitsCount = [
    data.benefits.valeTransporte,
    data.benefits.planoSaude,
    data.benefits.seguroVida,
    data.benefits.auxilioCreche,
    data.benefits.beneficioEducacao,
    data.benefits.gympass,
    ...data.benefits.customBenefits,
  ].filter(b => b.enabled).length;
  
  const plrCalc = data.plrAnnual > 0 ? calculateBonusTax(data.plrAnnual, 'plr') : null;
  const bonusCalc = data.bonusCashAnnual > 0 ? calculateBonusTax(data.bonusCashAnnual, 'bonus') : null;
  
  const totalEquityAnnual = (data.stockEquityGrants || []).reduce((sum, grant) => {
    const calc = calculateStockEquity(grant);
    return sum + calc.annualVestedValue;
  }, 0);
  
  const hasAdvancedData = enabledBenefitsCount > 0 || data.plrAnnual > 0 || 
    data.bonusCashAnnual > 0 || (data.stockEquityGrants || []).length > 0;

  // Effective net salary (considering override)
  const effectiveNetSalary = data.overrideNetSalary && data.forcedNetSalary > 0 
    ? data.forcedNetSalary 
    : (calculation?.netSalary || 0);
  const expectedNetSalary = calculation?.netSalary || 0;

  return (
    <div className="space-y-4">
      {/* ====== SEÇÃO ESSENCIAL (sempre visível) ====== */}
      
      {/* Salário Fixo Bruto (campo obrigatório) + 13º salário */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Salário Fixo Bruto Mensal *</Label>
          <CurrencyInput
            value={data.fixedGrossSalary || 0}
            onChange={(value) => handleChange({ fixedGrossSalary: value })}
            placeholder="0"
          />
        </div>
        
        {/* 13º salário junto ao campo de salário */}
        <div className="flex items-center justify-between p-2.5 bg-muted/30 border rounded-lg">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-600" />
            <Label className="text-xs cursor-pointer">Recebe 13º salário?</Label>
          </div>
          <Switch
            checked={data.receiveThirteenth}
            onCheckedChange={(checked) => handleChange({ receiveThirteenth: checked })}
          />
        </div>
      </div>
      
      {/* Remuneração Variável - Toggle similar ao 13º salário */}
      <div className="flex items-center justify-between p-2.5 bg-muted/30 border rounded-lg">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-600" />
          <Label className="text-xs cursor-pointer">Recebe remuneração variável?</Label>
        </div>
        <Switch
          checked={data.hasVariableCompensation || false}
          onCheckedChange={(checked) => handleChange({ 
            hasVariableCompensation: checked,
            // Reset values when disabling
            variableMonthly: checked ? data.variableMonthly : 0,
            dsrValue: checked ? data.dsrValue : 0,
          })}
        />
      </div>
      
      {/* Campos de Remuneração Variável (só aparecem se habilitado) */}
      {data.hasVariableCompensation && (
        <>
          <VariableCompensationSection
            variableMonthly={data.variableMonthly || 0}
            dsrValue={data.dsrValue || 0}
            onVariableChange={handleVariableChange}
            onDSRChange={(dsr) => handleChange({ dsrValue: dsr })}
          />
          
          {/* Total Bruto Mensal (sum of fixed + variable + DSR) */}
          {totalGrossSalary > 0 && (data.variableMonthly || 0) > 0 && (
            <div className="p-2.5 bg-muted/50 border rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Bruto Mensal:</span>
                <span className="font-bold tabular-nums">{formatMoney(totalGrossSalary)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Fixo + Variável + DSR
              </p>
            </div>
          )}
        </>
      )}

      {/* Resultado: Salário Líquido (feedback imediato) */}
      {calculation && (
        <div className={cn(
          "p-3 rounded-xl border space-y-3",
          data.overrideNetSalary 
            ? "bg-amber-500/10 border-amber-500/30" 
            : "bg-emerald-500/10 border-emerald-500/20"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                Salário Líquido {data.overrideNetSalary ? '(Manual)' : 'Estimado'}
              </p>
              <p className={cn(
                "text-xl font-bold tabular-nums",
                data.overrideNetSalary ? "text-amber-600" : "text-emerald-600"
              )}>
                {formatMoney(effectiveNetSalary)}
              </p>
            </div>
            <TaxBreakdownDialog 
              calculation={calculation} 
              benefits={data.benefits}
              plrAnnual={data.plrAnnual}
              bonusCashAnnual={data.bonusCashAnnual}
            />
          </div>
          
          {!data.overrideNetSalary && (
            <p className="text-[10px] text-muted-foreground">
              INSS: -{formatMoney(calculation.inss.value)} | IRRF: -{formatMoney(calculation.irrf.value)}
            </p>
          )}
          
          {/* Override indicator when active */}
          {data.overrideNetSalary && (
            <ManualOverrideIndicator
              isOverridden={data.overrideNetSalary}
              expectedValue={expectedNetSalary}
              forcedValue={data.forcedNetSalary}
              onReset={handleResetNetOverride}
              label="Líquido calculado"
            />
          )}
          
          {/* Manual override toggle */}
          <NetSalaryOverrideInput
            value={data.forcedNetSalary || 0}
            expectedValue={expectedNetSalary}
            isOverridden={data.overrideNetSalary || false}
            onValueChange={(value) => handleChange({ forcedNetSalary: value })}
            onOverrideToggle={(enabled) => handleChange({ 
              overrideNetSalary: enabled,
              forcedNetSalary: enabled ? expectedNetSalary : 0 
            })}
            onReset={handleResetNetOverride}
          />
        </div>
      )}

      {/* ====== SEÇÕES AVANÇADAS (accordion colapsável) ====== */}
      
      <Accordion type="multiple" className="w-full">
        {/* PLR, Bônus e Stock Equity */}
        <AccordionItem value="variables" className="border rounded-lg px-3">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span>PLR, Bônus & Equity</span>
              {(data.plrAnnual > 0 || data.bonusCashAnnual > 0 || totalEquityAnnual > 0) && (
                <Badge variant="secondary" className="text-[10px] ml-2">
                  {formatMoney((plrCalc?.net || 0) + (bonusCalc?.net || 0) + (totalEquityAnnual > 0 ? calculateStockEquityTax(totalEquityAnnual).net : 0))}/ano
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span>PLR Anual (bruto)</span>
                  {plrCalc && <span className="text-emerald-600 text-[10px]">Líq: {formatMoney(plrCalc.net)}</span>}
                </Label>
                <CurrencyInput
                  value={data.plrAnnual}
                  onChange={(value) => handleChange({ plrAnnual: value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span>Bônus Anual (bruto)</span>
                  {bonusCalc && <span className="text-emerald-600 text-[10px]">Líq: {formatMoney(bonusCalc.net)}</span>}
                </Label>
                <CurrencyInput
                  value={data.bonusCashAnnual}
                  onChange={(value) => handleChange({ bonusCashAnnual: value })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Stock Equity Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <LineChart className="h-3.5 w-3.5 text-purple-600" />
                  Equity / Ações
                </Label>
                <Button variant="outline" size="sm" onClick={handleAddStockGrant} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              
              {(data.stockEquityGrants || []).length === 0 ? (
                <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-lg text-center">
                  Adicione grants de ações (RSU, Stock Options)
                </p>
              ) : (
                <div className="space-y-2">
                  {(data.stockEquityGrants || []).map((grant, index) => (
                    <CompactStockEquity
                      key={grant.id}
                      grant={grant}
                      onChange={(g) => handleUpdateStockGrant(index, g)}
                      onRemove={() => handleRemoveStockGrant(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Benefícios */}
        <AccordionItem value="benefits" className="border rounded-lg px-3 mt-2">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-rose-500" />
              <span>Benefícios</span>
              {(enabledBenefitsCount > 0 || data.mealVoucher > 0) && (
                <Badge variant="secondary" className="text-[10px] ml-2">
                  {enabledBenefitsCount + (data.mealVoucher > 0 ? 1 : 0)} • {formatMoney(totalBenefitsCost + data.mealVoucher)}/mês
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Marque os benefícios que você recebe e informe o custo para a empresa.
            </p>
            
            <div className="divide-y">
              {/* VR/VA agora está aqui dentro de Benefícios */}
              <div className="flex items-center gap-2 py-2">
                <Checkbox
                  checked={data.mealVoucher > 0}
                  onCheckedChange={(checked) => handleChange({ mealVoucher: checked ? 500 : 0 })}
                />
                <span className={cn(
                  "flex-1 text-sm",
                  data.mealVoucher > 0 ? "font-medium" : "text-muted-foreground"
                )}>
                  VR/VA (Vale Refeição/Alimentação)
                </span>
                {data.mealVoucher > 0 && (
                  <CurrencyInput
                    value={data.mealVoucher}
                    onChange={(value) => handleChange({ mealVoucher: value })}
                    compact
                    className="w-24 h-7 text-xs"
                  />
                )}
              </div>
              <CompactBenefitItem 
                benefit={data.benefits.valeTransporte}
                onChange={(b) => handleBenefitChange('valeTransporte', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.planoSaude}
                onChange={(b) => handleBenefitChange('planoSaude', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.seguroVida}
                onChange={(b) => handleBenefitChange('seguroVida', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.auxilioCreche}
                onChange={(b) => handleBenefitChange('auxilioCreche', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.beneficioEducacao}
                onChange={(b) => handleBenefitChange('beneficioEducacao', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.gympass}
                onChange={(b) => handleBenefitChange('gympass', b)}
              />
              {data.benefits.customBenefits.map((benefit, idx) => (
                <CompactBenefitItem
                  key={benefit.id}
                  benefit={benefit}
                  onChange={(b) => handleCustomBenefitChange(idx, b)}
                  onRemove={() => handleRemoveCustomBenefit(idx)}
                />
              ))}
            </div>

            {/* Add custom benefit */}
            <div className="flex items-center gap-2 mt-3">
              <Input
                value={newBenefitName}
                onChange={(e) => setNewBenefitName(e.target.value)}
                placeholder="Outro benefício..."
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomBenefit()}
              />
              <Button size="sm" onClick={handleAddCustomBenefit} disabled={!newBenefitName.trim()} className="h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CLTInputForm;
