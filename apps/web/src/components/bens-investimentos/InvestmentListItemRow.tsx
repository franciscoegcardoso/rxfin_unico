import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { getInvestmentLabel } from '@/utils/investmentDisplay';
import type { InvestmentListItem } from '@/hooks/useInvestmentsList';
import { InvestmentAvatar } from './InvestmentAvatar';
import { cn } from '@/lib/utils';

interface Props {
  item: InvestmentListItem;
  onClick?: () => void;
}

export function InvestmentListItemRow({ item, onClick }: Props) {
  const { primaryName, badge } = getInvestmentLabel(item);
  const longName = primaryName.length > 28;

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-border/50',
        'hover:bg-muted/40 transition-colors cursor-pointer',
        'min-h-[52px] px-3 md:px-4 lg:px-6'
      )}
      onClick={onClick}
    >
      <InvestmentAvatar
        logoUrl={item.logo_url ?? null}
        ticker={item.ticker}
        type={item.investment_type}
        displayName={item.display_name}
        companyDomain={item.company_domain ?? null}
      />

      <div className="flex-1 min-w-0 flex flex-row max-[360px]:flex-col max-[360px]:items-start items-center gap-2">
        <span className="text-sm font-medium truncate text-foreground">{primaryName}</span>
        {badge && (
          <span
            className={cn(
              'shrink-0 text-xs font-medium rounded-full py-1.5 px-2.5',
              'bg-muted text-muted-foreground border border-border/60'
            )}
          >
            {badge}
          </span>
        )}
      </div>

      <span
        className={cn(
          'font-medium text-foreground tabular-nums shrink-0',
          longName ? 'text-xs lg:text-sm' : 'text-sm'
        )}
      >
        {formatCurrency(item.balance)}
      </span>
    </div>
  );
}
