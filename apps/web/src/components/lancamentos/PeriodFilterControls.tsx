import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'last3Months' | 'custom';

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  thisMonth: 'Este mês',
  lastMonth: 'Mês passado',
  last3Months: 'Últimos 3 meses',
  custom: 'Período personalizado',
};

type PeriodFilterControlsProps = {
  value: PeriodPreset;
  onChange: (v: PeriodPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  className?: string;
};

/**
 * Filtro de período reutilizável (extrato / cartão — todos os lançamentos).
 */
export function PeriodFilterControls({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  className,
}: PeriodFilterControlsProps) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1.5 min-w-[140px] sm:min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Período</Label>
        <Select value={value} onValueChange={(v) => onChange(v as PeriodPreset)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['thisMonth', 'lastMonth', 'last3Months', 'custom'] as const).map((k) => (
              <SelectItem key={k} value={k}>
                {PERIOD_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {value === 'custom' && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)} className="h-9 w-[150px]" />
          </div>
        </div>
      )}
    </div>
  );
}

export { PERIOD_LABELS };
