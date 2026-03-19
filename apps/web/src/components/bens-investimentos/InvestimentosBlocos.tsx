import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { BlocoByIndexador } from '@/hooks/useBensInvestimentos';
import { getBlocoBarColor, BLOCOS_RENDA_FIXA, BLOCOS_RENDA_VARIAVEL } from '@/utils/investimentosFiscal';

const BLOCOS_CONFIG: Array<{
  key: string;
  label: string;
  icon: string;
  bgClass: string;
}> = [
  { key: 'pre_fixado', label: 'Pré-fixado', icon: '📌', bgClass: 'bg-blue-100 dark:bg-blue-950' },
  { key: 'pos_fixado', label: 'Pós-fixado', icon: '📊', bgClass: 'bg-green-100 dark:bg-green-950' },
  { key: 'inflacao', label: 'Inflação', icon: '📈', bgClass: 'bg-orange-100 dark:bg-orange-950' },
  { key: 'renda_variavel', label: 'Renda Variável', icon: '📉', bgClass: 'bg-purple-100 dark:bg-purple-950' },
  { key: 'fii', label: 'FIIs', icon: '🏢', bgClass: 'bg-amber-100 dark:bg-amber-950' },
  { key: 'fundo', label: 'Fundos', icon: '🏦', bgClass: 'bg-indigo-100 dark:bg-indigo-950' },
  { key: 'etf', label: 'ETFs', icon: '🌐', bgClass: 'bg-cyan-100 dark:bg-cyan-950' },
  { key: 'previdencia', label: 'Previdência', icon: '🛡️', bgClass: 'bg-pink-100 dark:bg-pink-950' },
  { key: 'cripto', label: 'Cripto', icon: '₿', bgClass: 'bg-yellow-100 dark:bg-yellow-950' },
  { key: 'internacional', label: 'Internacional', icon: '🌍', bgClass: 'bg-teal-100 dark:bg-teal-950' },
  { key: 'outros', label: 'Outros', icon: '📦', bgClass: 'bg-gray-100 dark:bg-gray-800' },
];

function calcRF(byIndexador: BlocoByIndexador[]): number {
  return byIndexador
    .filter((b) => BLOCOS_RENDA_FIXA.includes(b.bloco))
    .reduce((s, b) => s + b.pct_carteira, 0);
}

function calcRV(byIndexador: BlocoByIndexador[]): number {
  return byIndexador
    .filter((b) => BLOCOS_RENDA_VARIAVEL.includes(b.bloco))
    .reduce((s, b) => s + b.pct_carteira, 0);
}

interface Props {
  byIndexador: BlocoByIndexador[];
}

export function InvestimentosBlocos({ byIndexador }: Props) {
  const [ativo, setAtivo] = useState<string | null>(null);

  if (!byIndexador?.length) return null;

  return (
    <div className="border-b border-border">
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Distribuição por indexador
        </span>
      </div>

      <div className="px-4 pb-3 flex flex-wrap gap-2">
        {byIndexador.map((bloco) => {
          const config = BLOCOS_CONFIG.find((b) => b.key === bloco.bloco) ?? {
            key: bloco.bloco,
            label: bloco.bloco,
            icon: '📦',
            bgClass: 'bg-gray-100 dark:bg-gray-800',
          };
          const isAtivo = ativo === bloco.bloco;

          return (
            <button
              key={bloco.bloco}
              type="button"
              onClick={() => setAtivo(isAtivo ? null : bloco.bloco)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all',
                'hover:border-border',
                isAtivo ? 'border-primary bg-primary/5' : 'border-border bg-background'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                  config.bgClass
                )}
              >
                {config.icon}
              </div>
              <div>
                <div className="text-xs font-medium">{config.label}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(bloco.total)} · {bloco.pct_carteira.toFixed(1)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-3">
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {byIndexador.map((bloco) => (
            <div
              key={bloco.bloco}
              style={{ width: `${Math.max(bloco.pct_carteira, 0.5)}%` }}
              className={cn('h-full rounded-sm transition-all min-w-[2px]', getBlocoBarColor(bloco.bloco))}
              title={`${bloco.bloco}: ${bloco.pct_carteira.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>Renda Fixa: {calcRF(byIndexador).toFixed(1)}%</span>
          <span>Renda Variável: {calcRV(byIndexador).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
