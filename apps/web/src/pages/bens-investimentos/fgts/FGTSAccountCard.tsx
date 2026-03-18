import React from 'react';
import { Building2, Calendar, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type FGTSAsset } from './useFGTS';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatMonth = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!m) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  return format(d, 'MMM/yyyy', { locale: ptBR });
};

interface FGTSAccountCardProps {
  asset: FGTSAsset;
  lastEntryMonth: string | null;
  onUpdateBalance: (asset: FGTSAsset) => void;
  onViewHistory: (asset: FGTSAsset) => void;
  onEdit: (asset: FGTSAsset) => void;
  onDelete: (asset: FGTSAsset) => void;
}

export function FGTSAccountCard({
  asset,
  lastEntryMonth,
  onUpdateBalance,
  onViewHistory,
  onEdit,
  onDelete,
}: FGTSAccountCardProps) {
  const balance = asset.current_value ?? asset.value ?? 0;
  const td = asset.type_data;
  const cnpj = td?.employer_cnpj ? `CNPJ: ${td.employer_cnpj}` : null;

  return (
    <Card className="rounded-xl border border-border/80 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{asset.name}</h3>
              {cnpj && <p className="text-xs text-muted-foreground truncate">{cnpj}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(asset)} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(asset)} title="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(balance)}</span>
          {lastEntryMonth && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Último depósito: {formatMonth(lastEntryMonth)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="default" className="gap-1.5" onClick={() => onUpdateBalance(asset)}>
            Registrar saldo do mês
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onViewHistory(asset)}>
            Ver histórico
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
