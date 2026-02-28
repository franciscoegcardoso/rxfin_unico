import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/currency-input';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HelpCircle,
  AlertCircle,
  Edit2,
  TrendingUp,
  Calculator,
  RotateCcw,
} from 'lucide-react';

// ==================== TYPES ====================

export interface VariableCompensationData {
  // Base salary (fixed)
  fixedGrossSalary: number;
  
  // Variable compensation
  variableMonthly: number; // Commissions, bonuses, etc.
  
  // DSR - Descanso Semanal Remunerado (auto-calculated from variable)
  dsrValue: number;
  
  // Override controls
  overrideNetSalary: boolean;
  forcedNetSalary: number;
  expectedNetSalary: number; // System calculated value for comparison
}

export interface ManualOverrideState {
  isOverridden: boolean;
  forcedValue: number;
  expectedValue: number;
}

// ==================== DSR CALCULATION ====================

/**
 * DSR (Descanso Semanal Remunerado) calculation
 * Formula: (Variable Monthly / Days Worked in Month) * Sundays & Holidays in Month
 * Simplified: Variable * (1/6) for a typical month with ~26 work days and ~4.33 Sundays
 */
export const calculateDSR = (variableMonthly: number): number => {
  if (variableMonthly <= 0) return 0;
  // Standard DSR = Variable / 26 days * 4.33 Sundays ≈ Variable * 0.1667 ≈ Variable / 6
  return variableMonthly / 6;
};

// ==================== HELPERS ====================

const formatMoney = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ==================== DSR HELP DIALOG ====================

const DSRHelpDialog: React.FC = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="icon" className="h-5 w-5">
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          DSR - Descanso Semanal Remunerado
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          O DSR é um adicional obrigatório calculado sobre a remuneração variável (comissões, 
          horas extras, etc.) para compensar os dias de descanso.
        </p>
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <p className="font-medium">Fórmula simplificada:</p>
          <p className="font-mono text-xs bg-background p-2 rounded">
            DSR = Variável ÷ 6
          </p>
          <p className="text-xs text-muted-foreground">
            Baseado em ~26 dias úteis / ~4.33 domingos por mês
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          O sistema calcula automaticamente o DSR sobre sua remuneração variável mensal.
        </p>
      </div>
    </DialogContent>
  </Dialog>
);

// ==================== MANUAL OVERRIDE INDICATOR ====================

interface ManualOverrideIndicatorProps {
  isOverridden: boolean;
  expectedValue: number;
  forcedValue: number;
  onReset: () => void;
  label?: string;
}

export const ManualOverrideIndicator: React.FC<ManualOverrideIndicatorProps> = ({
  isOverridden,
  expectedValue,
  forcedValue,
  onReset,
  label = 'Valor esperado',
}) => {
  if (!isOverridden) return null;
  
  const difference = forcedValue - expectedValue;
  const percentDiff = expectedValue > 0 ? ((difference / expectedValue) * 100) : 0;
  
  return (
    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Valor manual ativo</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReset}
                className="h-6 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-500/20"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Resetar
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Voltar ao cálculo automático</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-background/50 rounded">
          <span className="text-muted-foreground">{label}:</span>
          <p className="font-semibold tabular-nums">{formatMoney(expectedValue)}</p>
        </div>
        <div className="p-2 bg-amber-500/10 rounded">
          <span className="text-amber-700">Valor forçado:</span>
          <p className="font-semibold text-amber-700 tabular-nums">{formatMoney(forcedValue)}</p>
        </div>
      </div>
      {Math.abs(percentDiff) > 1 && (
        <p className="text-[10px] text-muted-foreground text-center">
          Diferença: {difference > 0 ? '+' : ''}{formatMoney(difference)} ({percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%)
        </p>
      )}
    </div>
  );
};

// ==================== VARIABLE COMPENSATION SECTION ====================

interface VariableCompensationSectionProps {
  variableMonthly: number;
  dsrValue: number;
  onVariableChange: (value: number) => void;
  onDSRChange: (value: number) => void;
  className?: string;
}

export const VariableCompensationSection: React.FC<VariableCompensationSectionProps> = ({
  variableMonthly,
  dsrValue,
  onVariableChange,
  onDSRChange,
  className,
}) => {
  const calculatedDSR = calculateDSR(variableMonthly);
  const totalVariableWithDSR = variableMonthly + dsrValue;
  
  // Auto-update DSR when variable changes
  React.useEffect(() => {
    if (variableMonthly > 0) {
      onDSRChange(calculatedDSR);
    } else {
      onDSRChange(0);
    }
  }, [variableMonthly, calculatedDSR, onDSRChange]);
  
  return (
    <div className={cn("space-y-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg", className)}>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-purple-600" />
        <Label className="text-sm font-medium text-purple-700">Remuneração Variável</Label>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Variable Monthly */}
        <div className="space-y-1.5">
          <Label className="text-xs">Variável Mensal</Label>
          <CurrencyInput
            value={variableMonthly}
            onChange={onVariableChange}
            placeholder="0"
          />
          <p className="text-[10px] text-muted-foreground">
            Comissões, gratificações, etc.
          </p>
        </div>
        
        {/* DSR (auto-calculated) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label className="text-xs">DSR</Label>
            <DSRHelpDialog />
          </div>
          <div className="h-9 px-3 flex items-center justify-between bg-muted/50 border rounded-md">
            <span className="text-sm font-medium tabular-nums">{formatMoney(dsrValue)}</span>
            <Badge variant="secondary" className="text-[10px]">Auto</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Calculado: Variável ÷ 6
          </p>
        </div>
      </div>
      
      {/* Total with DSR */}
      {variableMonthly > 0 && (
        <div className="p-2 bg-purple-500/10 rounded-lg flex items-center justify-between text-sm">
          <span className="text-purple-700">Total Variável + DSR:</span>
          <span className="font-bold text-purple-700 tabular-nums">{formatMoney(totalVariableWithDSR)}</span>
        </div>
      )}
    </div>
  );
};

// ==================== NET SALARY OVERRIDE INPUT ====================

interface NetSalaryOverrideInputProps {
  value: number;
  expectedValue: number;
  isOverridden: boolean;
  onValueChange: (value: number) => void;
  onOverrideToggle: (enabled: boolean) => void;
  onReset: () => void;
  className?: string;
}

export const NetSalaryOverrideInput: React.FC<NetSalaryOverrideInputProps> = ({
  value,
  expectedValue,
  isOverridden,
  onValueChange,
  onOverrideToggle,
  onReset,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Edit2 className="h-3 w-3" />
          Forçar valor líquido manualmente
        </Label>
        <Switch
          checked={isOverridden}
          onCheckedChange={onOverrideToggle}
          className="scale-75"
        />
      </div>
      
      {isOverridden && (
        <>
          <CurrencyInput
            value={value}
            onChange={onValueChange}
            placeholder="Valor líquido"
          />
          <ManualOverrideIndicator
            isOverridden={isOverridden}
            expectedValue={expectedValue}
            forcedValue={value}
            onReset={onReset}
            label="Líquido calculado"
          />
        </>
      )}
    </div>
  );
};

export default VariableCompensationSection;
