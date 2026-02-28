import React from 'react';
import { usePluggyInvestments, InvestmentCategoryData } from '@/hooks/usePluggyInvestments';
import { useVisibility } from '@/contexts/VisibilityContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2, Wifi, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const TYPE_LABELS: Record<string, string> = {
  FIXED_INCOME: 'Renda Fixa',
  MUTUAL_FUND: 'Fundo',
  EQUITY: 'Ações',
  ETF: 'ETF',
  OTHER: 'Outro',
};

const formatRate = (rate: number | null): string | null => {
  if (rate == null) return null;
  return `${(rate * 100).toFixed(2)}%`;
};

export const InvestimentosPluggy: React.FC = () => {
  const { categories, totalBalance, isLoading } = usePluggyInvestments();
  const { formatValue } = useVisibility();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando investimentos...</span>
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Header with total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">Investimentos</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 border-primary/30 text-primary">
            <Wifi className="h-2.5 w-2.5" />
            Open Finance
          </Badge>
        </div>
        <span className="text-sm font-semibold text-green-600">{formatValue(totalBalance)}</span>
      </div>

      {/* Categories */}
      <div className="ml-5 space-y-2">
        {categories.map((cat) => (
          <CategoryGroup key={cat.category} cat={cat} formatValue={formatValue} />
        ))}
      </div>

      <Separator />
    </div>
  );
};

interface CategoryGroupProps {
  cat: InvestmentCategoryData;
  formatValue: (v: number) => string;
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({ cat, formatValue }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between text-xs group cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1">
          <div className="flex items-center gap-1.5">
            <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
            <span className="font-medium">{cat.category}</span>
            <span className="text-muted-foreground">({cat.items.length})</span>
            {cat.allocationPercent > 0 && (
              <span className="text-muted-foreground">· {cat.allocationPercent.toFixed(0)}%</span>
            )}
          </div>
          <span className="font-medium">{formatValue(cat.totalBalance)}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 mt-1 space-y-1">
          {cat.items.map((inv) => (
            <div key={inv.id} className="flex items-start justify-between text-[11px] py-0.5">
              <div className="flex-1 min-w-0 mr-2">
                <p className="text-muted-foreground truncate">{inv.name}</p>
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  {inv.type && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                      {TYPE_LABELS[inv.type] || inv.type}
                    </Badge>
                  )}
                  {inv.subtype && inv.subtype !== inv.type && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                      {inv.subtype.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  {inv.index_name && (
                    <span className="text-muted-foreground text-[9px]">
                      <BarChart3 className="h-2.5 w-2.5 inline mr-0.5" />
                      {inv.index_name}{inv.rate != null ? ` ${(inv.rate * 100).toFixed(0)}%` : ''}
                    </span>
                  )}
                  {inv.due_date && (
                    <span className="text-muted-foreground text-[9px]">
                      <Calendar className="h-2.5 w-2.5 inline mr-0.5" />
                      {format(parseISO(inv.due_date), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {formatRate(inv.last_twelve_months_rate) && (
                    <span className="text-[9px] text-primary font-medium">
                      12m: {formatRate(inv.last_twelve_months_rate)}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-medium whitespace-nowrap">{formatValue(inv.balance)}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
