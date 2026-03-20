import React from 'react';
import { Calendar, Landmark, CreditCard, Filter, Tag, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type PeriodFilterValue =
  | 'this_month'
  | 'last_month'
  | 'last_2_months'
  | 'last_3_months'
  | 'last_6_months'
  | 'all';

export type StatusFilterValue = 'all' | 'pending' | 'confirmed';

const PERIOD_OPTIONS: { value: PeriodFilterValue; label: string }[] = [
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'last_2_months', label: 'Últimos 2 meses' },
  { value: 'last_3_months', label: 'Últimos 3 meses' },
  { value: 'last_6_months', label: 'Últimos 6 meses' },
  { value: 'all', label: 'Todos' },
];

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'confirmed', label: 'Confirmados' },
];

export interface BankOption {
  value: string;
  label: string;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export interface CardOption {
  id: string;
  name: string;
}

interface CategoryAssignmentFiltersProps {
  activeTab: 'cartao' | 'conta';
  period: PeriodFilterValue;
  onPeriodChange: (v: PeriodFilterValue) => void;
  status: StatusFilterValue;
  onStatusChange: (v: StatusFilterValue) => void;
  bankOptions: BankOption[];
  bankValue: string;
  onBankChange: (v: string) => void;
  categoryOptions: CategoryOption[];
  categoryValue: string;
  onCategoryChange: (v: string) => void;
  cardOptions: CardOption[];
  cardValue: string;
  onCardChange: (v: string) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  compact?: boolean;
  /** Quando true, transferências internas ficam ocultas na listagem (padrão). */
  hideInternalTransfers?: boolean;
  onHideInternalTransfersChange?: (hide: boolean) => void;
}

export function CategoryAssignmentFilters({
  activeTab,
  period,
  onPeriodChange,
  status,
  onStatusChange,
  bankOptions,
  bankValue,
  onBankChange,
  categoryOptions,
  categoryValue,
  onCategoryChange,
  cardOptions,
  cardValue,
  onCardChange,
  onClearFilters,
  hasActiveFilters,
  compact = false,
}: CategoryAssignmentFiltersProps) {
  const btnSize = compact ? 'sm' : 'default';
  const btnClass = compact ? 'h-7 text-[10px]' : 'h-8 text-xs';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Período */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <Calendar className={cn('shrink-0 text-muted-foreground', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          {PERIOD_OPTIONS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'ghost'}
              size={btnSize}
              className={cn(btnClass, period === p.value && 'shadow-sm')}
              onClick={() => onPeriodChange(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Status */}
        <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilterValue)}>
          <SelectTrigger className={cn('w-[110px]', compact ? 'h-7 text-[10px]' : 'h-8 text-xs')}>
            <Filter className="h-3 w-3 mr-1 shrink-0" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Banco (guia Lançamentos em conta) */}
        {activeTab === 'conta' && bankOptions.length > 0 && (
          <Select value={bankValue} onValueChange={onBankChange}>
            <SelectTrigger className={cn('w-[130px]', compact ? 'h-7 text-[10px]' : 'h-8 text-xs')}>
              <Landmark className="h-3 w-3 mr-1 shrink-0" />
              <SelectValue placeholder="Banco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos os bancos
              </SelectItem>
              {bankOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Cartão (guia Cartão de crédito) */}
        {activeTab === 'cartao' && cardOptions.length > 0 && (
          <Select value={cardValue} onValueChange={onCardChange}>
            <SelectTrigger className={cn('w-[140px]', compact ? 'h-7 text-[10px]' : 'h-8 text-xs')}>
              <CreditCard className="h-3 w-3 mr-1 shrink-0" />
              <SelectValue placeholder="Cartão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos os cartões
              </SelectItem>
              {cardOptions.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Categoria */}
        <Select value={categoryValue} onValueChange={onCategoryChange}>
          <SelectTrigger className={cn('w-[140px]', compact ? 'h-7 text-[10px]' : 'h-8 text-xs')}>
            <Tag className="h-3 w-3 mr-1 shrink-0" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Todas
            </SelectItem>
            {categoryOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && onClearFilters && (
          <Button variant="ghost" size={btnSize} className={cn(btnClass, 'text-muted-foreground')} onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}

        {hideInternalTransfers != null && onHideInternalTransfersChange && (
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-2 py-1">
            <ArrowLeftRight className={cn('shrink-0 text-muted-foreground', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
            <Label
              htmlFor="hide-internal-tx"
              className={cn('text-muted-foreground cursor-pointer', compact ? 'text-[10px]' : 'text-xs')}
            >
              Ocultar transferências internas
            </Label>
            <Switch
              id="hide-internal-tx"
              checked={hideInternalTransfers}
              onCheckedChange={onHideInternalTransfersChange}
              className="scale-90"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Retorna { start, end } em YYYY-MM-DD ou null para "all" */
export function getPeriodBounds(period: PeriodFilterValue): { start: string; end: string } | null {
  if (period === 'all') return null;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const firstDay = (year: number, month: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = (year: number, month: number) => {
    const d = new Date(year, month + 1, 0);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  switch (period) {
    case 'this_month':
      return { start: firstDay(y, m), end: lastDay(y, m) };
    case 'last_month': {
      const prev = new Date(y, m - 1, 1);
      return { start: firstDay(prev.getFullYear(), prev.getMonth()), end: lastDay(prev.getFullYear(), prev.getMonth()) };
    }
    case 'last_2_months': {
      const startDate = new Date(y, m - 1, 1);
      return { start: firstDay(startDate.getFullYear(), startDate.getMonth()), end: lastDay(y, m) };
    }
    case 'last_3_months': {
      const startDate = new Date(y, m - 2, 1);
      return { start: firstDay(startDate.getFullYear(), startDate.getMonth()), end: lastDay(y, m) };
    }
    case 'last_6_months': {
      const startDate = new Date(y, m - 5, 1);
      return { start: firstDay(startDate.getFullYear(), startDate.getMonth()), end: lastDay(y, m) };
    }
    default:
      return null;
  }
}
