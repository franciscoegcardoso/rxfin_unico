import React from 'react';
import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InicioKpiBarProps {
  receitas: number;
  despesasSemCartao: number;
  totalCartao: number;
  totalDespesas: number;
  saldoMensal: number;
  totalLancamentos: number;
  lancamentosSemCategoria: number;
  deltaVsMesAnterior: number;
  isHidden: boolean;
}

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const InicioKpiBar: React.FC<InicioKpiBarProps> = ({
  receitas,
  despesasSemCartao,
  totalCartao,
  totalDespesas,
  saldoMensal,
  totalLancamentos,
  lancamentosSemCategoria,
  deltaVsMesAnterior,
  isHidden,
}) => {
  const deltaPositive = deltaVsMesAnterior >= 0;

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 border-b border-[hsl(var(--color-border-default))] pb-3"
      role="region"
      aria-label="Indicadores do mês"
    >
      {/* 1. Receitas do mês */}
      <div className="rounded-lg border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))] p-3">
        <p
          className="uppercase tracking-[0.5px]"
          style={{
            fontSize: '10px',
            fontWeight: 400,
            color: 'hsl(var(--color-text-secondary))',
          }}
        >
          Receitas do mês
        </p>
        <p
          className="tabular-nums mt-0.5"
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: 'hsl(var(--color-text-success))',
          }}
        >
          {formatCurrency(receitas, isHidden)}
        </p>
        {deltaVsMesAnterior !== 0 && (
          <span
            className="inline-block mt-1 text-[10px] font-medium tabular-nums"
            style={{
              color: deltaPositive
                ? 'hsl(var(--color-text-success))'
                : 'hsl(var(--color-text-danger))',
            }}
          >
            {deltaPositive ? '+' : ''}
            {deltaVsMesAnterior.toFixed(1)}% vs mês anterior
          </span>
        )}
      </div>

      {/* 2. Despesas (débito) */}
      <div className="rounded-lg border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))] p-3">
        <p
          className="uppercase tracking-[0.5px]"
          style={{
            fontSize: '10px',
            fontWeight: 400,
            color: 'hsl(var(--color-text-secondary))',
          }}
        >
          Despesas (débito)
        </p>
        <p
          className="tabular-nums mt-0.5"
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: 'hsl(var(--color-text-danger))',
          }}
        >
          {formatCurrency(despesasSemCartao, isHidden)}
        </p>
        {totalCartao > 0 && (
          <p
            className="mt-1"
            style={{
              fontSize: '10px',
              fontWeight: 400,
              color: 'hsl(var(--color-text-secondary))',
            }}
          >
            + cartão {formatCurrency(totalCartao, isHidden)} → total{' '}
            {formatCurrency(totalDespesas, isHidden)}
          </p>
        )}
      </div>

      {/* 3. Saldo do mês */}
      <div className="rounded-lg border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))] p-3">
        <p
          className="uppercase tracking-[0.5px]"
          style={{
            fontSize: '10px',
            fontWeight: 400,
            color: 'hsl(var(--color-text-secondary))',
          }}
        >
          Saldo do mês
        </p>
        <p
          className={cn('tabular-nums mt-0.5')}
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color:
              saldoMensal >= 0
                ? 'hsl(var(--color-text-success))'
                : 'hsl(var(--color-text-danger))',
          }}
        >
          {formatCurrency(saldoMensal, isHidden)}
        </p>
        {deltaVsMesAnterior !== 0 && (
          <span
            className="inline-block mt-1 text-[10px] font-medium tabular-nums"
            style={{
              color:
                saldoMensal >= 0
                  ? 'hsl(var(--color-text-success))'
                  : 'hsl(var(--color-text-danger))',
            }}
          >
            {deltaPositive ? '+' : ''}
            {deltaVsMesAnterior.toFixed(1)}% vs mês anterior
          </span>
        )}
      </div>

      {/* 4. Lançamentos */}
      <div className="rounded-lg border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))] p-3">
        <p
          className="uppercase tracking-[0.5px]"
          style={{
            fontSize: '10px',
            fontWeight: 400,
            color: 'hsl(var(--color-text-secondary))',
          }}
        >
          Lançamentos
        </p>
        <p
          className="tabular-nums mt-0.5"
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: 'hsl(var(--color-text-primary))',
          }}
        >
          {totalLancamentos}
        </p>
        {lancamentosSemCategoria > 0 && (
          <p
            className="mt-1"
            style={{
              fontSize: '10px',
              fontWeight: 400,
              color: 'hsl(var(--color-text-secondary))',
            }}
          >
            {lancamentosSemCategoria} sem categoria
          </p>
        )}
      </div>
    </div>
  );
};
