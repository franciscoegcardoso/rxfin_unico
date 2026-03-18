import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AssetLogo } from '@/components/ui/AssetLogo';
import { Pencil, Trash2, FileEdit } from 'lucide-react';
import type { ManualInvestment, ManualInvestmentType } from '@/types/investments';

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(n);

export interface ManualInvestmentsListProps {
  items: ManualInvestment[];
  onEdit: (item: ManualInvestment) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  showSection: boolean;
}

export function ManualInvestmentsList({ items, onEdit, onRemove, onAdd, showSection }: ManualInvestmentsListProps) {
  if (!showSection && items.length === 0) return null;

  const totalManual = items.reduce((s, i) => s + Number(i.gross_balance || 0), 0);

  return (
    <Card className="rounded-[14px] border border-border/80 overflow-hidden">
      <CardContent className="p-4 pt-5">
        <div className="flex items-center justify-between gap-2 mb-4 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Investimentos cadastrados manualmente</h3>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={onAdd}>
            + Adicionar
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum investimento manual ainda.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start gap-2 sm:gap-3 py-2 border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <AssetLogo
                      ticker={row.ticker ?? undefined}
                      assetType={row.type}
                      logoUrl={row.logo_url}
                      companyDomain={row.company_domain}
                      name={row.name}
                      size="md"
                      showTooltip
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{row.name}</span>
                        <Badge variant="secondary" className="text-[10px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                          Manual
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{row.institution}</p>
                      {row.ticker && (
                        <p className="text-xs text-muted-foreground">{row.ticker}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {row.balance_date ? format(new Date(row.balance_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <span className="font-semibold tabular-nums text-right">{fmt(Number(row.gross_balance))}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row)} aria-label="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Remover este investimento manual?')) onRemove(row.id);
                      }}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-border/60">
            <span className="text-sm text-muted-foreground">Total manual</span>
            <span className="text-sm font-semibold tabular-nums">{fmt(totalManual)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
