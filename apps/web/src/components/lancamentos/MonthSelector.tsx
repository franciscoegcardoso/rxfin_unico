import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthSelectorProps {
  selectedMonth: string; // format: YYYY-MM
  onMonthChange: (month: string) => void;
  activeMonth?: string; // format: YYYY-MM – highlighted with a dot indicator
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatLabel(yearMonth: string) {
  const [y, m] = yearMonth.split('-');
  return `${MONTH_LABELS[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedMonth, onMonthChange, activeMonth }) => {
  const months = useMemo(() => {
    const result: string[] = [];
    for (let i = -12; i <= 12; i++) {
      result.push(addMonths(selectedMonth, i));
    }
    return result;
  }, [selectedMonth]);

  return (
    <div className="flex items-center justify-between bg-card border-2 border-border rounded-xl px-2 py-2 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onMonthChange(addMonths(selectedMonth, -1))}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 flex-1 mx-1">
        {months.map((m) => {
          const isSelected = m === selectedMonth;
          return (
            <button
              key={m}
              onClick={() => onMonthChange(m)}
              className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {formatLabel(m)}
              {activeMonth && m === activeMonth && m !== selectedMonth && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
