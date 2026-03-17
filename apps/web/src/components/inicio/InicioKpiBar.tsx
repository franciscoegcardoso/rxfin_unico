import React from 'react';
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

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub }) => (
  <div className="rounded-lg border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))] px-4 py-3 flex flex-col gap-0.5">
    <p className="text-[10px] font-medium uppercase tracking-wide text-[hsl(var(--color-text-secondary))]">
      {label}
    </p>
    <div className="text-sm font-semibold tabular-nums font-numeric leading-tight mt-0.5 tracking-tight">
      {value}
    </div>
    {sub && (
      <div className="text-[11px] font-normal text-[hsl(var(--color-text-tertiary))] leading-snug">
        {sub}
      </div>
    )}
  </div>
);

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
      <KpiCard
        label="Receitas do mês"
        value={
          <span style={{ color: 'hsl(var(--color-income))' }}>
            {formatCurrency(receitas, isHidden)}
          </span>
        }
        sub={
          deltaVsMesAnterior !== 0 ? (
            <span style={{ color: deltaPositive ? 'hsl(var(--color-income))' : 'hsl(var(--color-expense))' }}>
              {deltaPositive ? '+' : ''}{deltaVsMesAnterior.toFixed(1)}% vs mês anterior
            </span>
          ) : undefined
        }
      />
      <KpiCard
        label="Despesas (débito)"
        value={
          <span style={{ color: 'hsl(var(--color-expense))' }}>
            {formatCurrency(despesasSemCartao, isHidden)}
          </span>
        }
        sub={
          totalCartao > 0 ? (
            <>+ cartão {formatCurrency(totalCartao, isHidden)} — total {formatCurrency(totalDespesas, isHidden)}</>
          ) : undefined
        }
      />
      <KpiCard
        label="Saldo do mês"
        value={
          <span style={{ color: saldoMensal >= 0 ? 'hsl(var(--color-income))' : 'hsl(var(--color-expense))' }}>
            {formatCurrency(saldoMensal, isHidden)}
          </span>
        }
        sub={
          deltaVsMesAnterior !== 0 ? (
            <span style={{ color: saldoMensal >= 0 ? 'hsl(var(--color-income))' : 'hsl(var(--color-expense))' }}>
              {deltaPositive ? '+' : ''}{deltaVsMesAnterior.toFixed(1)}% vs mês anterior
            </span>
          ) : undefined
        }
      />
      <KpiCard
        label="Lançamentos"
        value={
          <span style={{ color: 'hsl(var(--color-text-primary))' }}>
            {totalLancamentos}
          </span>
        }
        sub={lancamentosSemCategoria > 0 ? `${lancamentosSemCategoria} sem categoria` : undefined}
      />
    </div>
  );
};
