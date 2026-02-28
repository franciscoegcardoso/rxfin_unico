import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalculationBase } from '@/hooks/useMonthlyGoals';
import { History, Sparkles } from 'lucide-react';

interface HistoryBaseSelectorProps {
  value: CalculationBase;
  onChange: (value: CalculationBase) => void;
  disabled?: boolean;
  variant?: 'default' | 'inline';
}

const baseOptions: { value: CalculationBase; label: string; shortLabel: string; description: string }[] = [
  { value: 'auto_by_nature', label: 'Automático por Natureza', shortLabel: 'Auto', description: 'Fixa: M1 • Semi: M3 • Variável: M6' },
  { value: 'avg_1_month', label: 'Último mês', shortLabel: '1M', description: 'Usa apenas o mês anterior' },
  { value: 'avg_3_months', label: 'Média 3 meses', shortLabel: '3M', description: 'Recomendado para gastos recentes' },
  { value: 'avg_6_months', label: 'Média 6 meses', shortLabel: '6M', description: 'Equilibra sazonalidade' },
  { value: 'avg_12_months', label: 'Média 12 meses', shortLabel: '12M', description: 'Visão anual completa' },
];

export const calculationBaseLabels: Record<CalculationBase, string> = {
  'auto_by_nature': 'Automático por Natureza',
  'avg_1_month': 'Último mês',
  'avg_3_months': 'Média 3 meses',
  'avg_6_months': 'Média 6 meses',
  'avg_12_months': 'Média 12 meses',
};

export const calculationBaseShortLabels: Record<CalculationBase, string> = {
  'auto_by_nature': 'Auto',
  'avg_1_month': '1M',
  'avg_3_months': '3M',
  'avg_6_months': '6M',
  'avg_12_months': '12M',
};

export function HistoryBaseSelector({ value, onChange, disabled, variant = 'default' }: HistoryBaseSelectorProps) {
  const isAutoMode = value === 'auto_by_nature';
  
  if (variant === 'inline') {
    return (
      <Select value={value} onValueChange={(v) => onChange(v as CalculationBase)} disabled={disabled}>
        <SelectTrigger className="h-7 text-xs w-14 px-1.5 font-medium">
          <SelectValue>
            {isAutoMode ? (
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
              </span>
            ) : (
              calculationBaseShortLabels[value]
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {baseOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                {opt.value === 'auto_by_nature' && <Sparkles className="h-3 w-3 text-primary" />}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        {isAutoMode ? (
          <Sparkles className="h-4 w-4 text-primary" />
        ) : (
          <History className="h-4 w-4 text-muted-foreground" />
        )}
        Período Base
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as CalculationBase)} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {baseOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  {opt.value === 'auto_by_nature' && <Sparkles className="h-3 w-3 text-primary" />}
                  {opt.label}
                </span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
