import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface MonthSelectorProps {
  label?: string;
  description?: string;
  selectedMonths: number[];
  onChange: (months: number[]) => void;
  disabled?: boolean;
  maxSelection?: number; // Limit the number of months that can be selected
}

const monthLabels = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' },
];

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  label,
  description,
  selectedMonths,
  onChange,
  disabled = false,
  maxSelection,
}) => {
  const toggleMonth = (month: number) => {
    if (disabled) return;
    if (selectedMonths.includes(month)) {
      onChange(selectedMonths.filter(m => m !== month));
    } else {
      // If maxSelection is set and we're at the limit, replace the selection
      if (maxSelection && selectedMonths.length >= maxSelection) {
        onChange([month]);
      } else {
        onChange([...selectedMonths, month].sort((a, b) => a - b));
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="grid grid-cols-6 gap-1.5">
        {monthLabels.map(month => (
          <button
            key={month.value}
            type="button"
            onClick={() => toggleMonth(month.value)}
            disabled={disabled}
            className={cn(
              "px-2 py-1.5 text-xs font-medium rounded-md border transition-colors",
              selectedMonths.includes(month.value)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-accent hover:text-accent-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {month.label}
          </button>
        ))}
      </div>
    </div>
  );
};
