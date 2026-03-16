import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';
import { useVisibility } from '@/contexts/VisibilityContext';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function getInitials(name: string) {
  return name
    .slice(0, 2)
    .toUpperCase();
}

export interface HomeHeaderProps {
  /** Nome do usuário (ex.: "Francisco") */
  firstName: string;
  /** URL do avatar */
  avatarUrl?: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  firstName,
  avatarUrl = '',
}) => {
  const { isHidden } = useVisibility();
  const { data, isLoading } = useRealtimeBalance();

  const periodLabel = format(new Date(), 'MMMM yyyy', { locale: ptBR }).replace(
    /^\w/,
    (c) => c.toUpperCase()
  );

  const totalChecking =
    data?.summary?.total_checking ??
    (data?.accounts ?? [])
      .filter(
        (a) =>
          a.type === 'BANK' &&
          (a.subtype === 'CHECKING_ACCOUNT' ||
            (a.subtype ?? '').toLowerCase().includes('checking'))
      )
      .reduce((s, a) => s + (a.balance ?? 0), 0);

  return (
    <header
      className={cn(
        'bg-[hsl(var(--color-surface-raised))] border-b border-[hsl(var(--color-border-default))]',
        'px-5 py-4 md:px-5 md:py-4',
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          className="h-10 w-10 shrink-0 border-2 border-[hsl(var(--color-text-success))]"
          style={{ borderRadius: '50%' }}
        >
          <AvatarImage src={avatarUrl} alt={firstName} />
          <AvatarFallback
            className="bg-primary/10 text-primary font-semibold text-sm"
            style={{ fontSize: '14px' }}
          >
            {getInitials(firstName || 'U')}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1
            className="truncate"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'hsl(var(--color-text-primary))',
            }}
          >
            Olá, {firstName || 'Usuário'}! 👋
          </h1>
          <p
            className="mt-0.5 truncate"
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: 'hsl(var(--color-text-secondary))',
            }}
          >
            {periodLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center sm:justify-end">
        {isLoading && !data ? (
          <div className="h-10 w-40 bg-[hsl(var(--color-surface-sunken))] rounded animate-pulse" />
        ) : (
          <div className="flex flex-col items-end min-w-0">
            <p
              style={{
                fontSize: '10px',
                fontWeight: 400,
                color: 'hsl(var(--color-text-secondary))',
              }}
            >
              Saldo em contas
            </p>
            <p
              className="tabular-nums mt-0.5"
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'hsl(var(--color-text-primary))',
              }}
            >
              {formatCurrency(totalChecking, isHidden)}
            </p>
          </div>
        )}
      </div>
    </header>
  );
};
