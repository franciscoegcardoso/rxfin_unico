import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { BlocoByCurrency, FxRates } from '@/hooks/useBensInvestimentos';

const MOEDA_CONFIG: Record<
  string,
  { label: string; flag: string; bgClass: string; textClass: string }
> = {
  BRL: { label: 'Real', flag: 'R$', bgClass: 'bg-green-100 dark:bg-green-950', textClass: 'text-green-800 dark:text-green-200' },
  USD: { label: 'Dólar', flag: 'US$', bgClass: 'bg-blue-100 dark:bg-blue-950', textClass: 'text-blue-800 dark:text-blue-200' },
  EUR: { label: 'Euro', flag: '€', bgClass: 'bg-indigo-100 dark:bg-indigo-950', textClass: 'text-indigo-800 dark:text-indigo-200' },
  BTC: { label: 'Bitcoin', flag: '₿', bgClass: 'bg-amber-100 dark:bg-amber-950', textClass: 'text-amber-800 dark:text-amber-200' },
  ETH: { label: 'Ether', flag: 'Ξ', bgClass: 'bg-purple-100 dark:bg-purple-950', textClass: 'text-purple-800 dark:text-purple-200' },
};

interface Props {
  byCurrency: BlocoByCurrency[];
  fxRates?: FxRates | null;
}

export function InvestimentosMoedas({ byCurrency, fxRates }: Props) {
  if (!byCurrency?.length || byCurrency.length <= 1) return null;

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Distribuição por moeda
      </div>
      <div className="flex flex-wrap gap-2">
        {byCurrency.map((item) => {
          const config = MOEDA_CONFIG[item.currency] ?? {
            label: item.currency,
            flag: item.currency,
            bgClass: 'bg-gray-100 dark:bg-gray-800',
            textClass: 'text-muted-foreground',
          };
          const rateKey = `${item.currency}_BRL` as keyof FxRates;
          const rate = fxRates && item.currency !== 'BRL' ? (fxRates[rateKey] as number | undefined) : undefined;

          return (
            <div
              key={item.currency}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background"
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  config.bgClass,
                  config.textClass
                )}
              >
                {config.flag}
              </div>
              <div>
                <div className="text-xs font-medium">{config.label}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(item.total_brl)} · {item.pct_carteira.toFixed(1)}%
                </div>
                {item.currency !== 'BRL' && rate != null && (
                  <div className="text-xs text-muted-foreground">
                    1 {item.currency} = {formatCurrency(rate)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
