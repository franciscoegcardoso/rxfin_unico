import React, { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Conta, ContaTipo } from '@/hooks/useContasPagarReceber';
import { paymentMethods } from '@/data/defaultData';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  CreditCard,
  Banknote,
  RefreshCw,
  Receipt,
} from 'lucide-react';
import { format, parseISO, isBefore, addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

type ContaStatus = 'pendente' | 'pago' | 'vencido' | 'a_vencer';

interface ContasListSectionProps {
  contas: Conta[];
  tipo: ContaTipo;
  onConfirmPayment: (contaId: string) => void;
  onEdit: (conta: Conta) => void;
  onDelete: (contaId: string) => void;
  /** Show only first N items (for summary view) */
  limit?: number;
  /** Show "Ver todas" button text */
  onShowAll?: () => void;
  totalCount?: number;
}

const getContaStatus = (conta: Conta): ContaStatus => {
  if (conta.dataPagamento) return 'pago';
  const today = startOfDay(new Date());
  const vencimento = parseISO(conta.dataVencimento);
  if (isBefore(vencimento, today)) return 'vencido';
  if (isBefore(vencimento, addDays(today, 7))) return 'a_vencer';
  return 'pendente';
};

const getStatusBadge = (status: ContaStatus, tipo: ContaTipo) => {
  switch (status) {
    case 'pago':
      return <Badge className="bg-income/10 text-income border-income/30">
        {tipo === 'receber' ? 'Recebido' : 'Pago'}
      </Badge>;
    case 'vencido':
      if (tipo === 'receber') {
        return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
      }
      return <Badge className="bg-expense/10 text-expense border-expense/30">Vencido</Badge>;
    case 'a_vencer':
      return <Badge className="bg-warning/10 text-warning border-warning/30">A vencer</Badge>;
    default:
      return <Badge variant="outline">Pendente</Badge>;
  }
};

const getStatusIcon = (status: ContaStatus, tipo?: ContaTipo) => {
  switch (status) {
    case 'pago':
      return <CheckCircle2 className="h-4 w-4 text-income" />;
    case 'vencido':
      if (tipo === 'receber') return <Clock className="h-4 w-4 text-muted-foreground" />;
      return <AlertCircle className="h-4 w-4 text-expense" />;
    case 'a_vencer':
      return <Clock className="h-4 w-4 text-warning" />;
    default:
      return <Calendar className="h-4 w-4 text-muted-foreground" />;
  }
};

const getPaymentMethodLabel = (method: string) => {
  return paymentMethods.find(m => m.value === method)?.label || method;
};

const getPaymentMethodIcon = (method: string) => {
  if (method === 'credit_card' || method === 'debit_card') {
    return <CreditCard className="h-3 w-3" />;
  }
  return <Banknote className="h-3 w-3" />;
};

export const ContasListSection: React.FC<ContasListSectionProps> = ({
  contas,
  tipo,
  onConfirmPayment,
  onEdit,
  onDelete,
  limit,
  onShowAll,
  totalCount,
}) => {
  const { isHidden } = useVisibility();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Sort: vencidos first, then a_vencer, pendente, pago
  const sortedContas = useMemo(() => {
    const statusOrder = { vencido: 0, a_vencer: 1, pendente: 2, pago: 3 };
    return [...contas].sort((a, b) => {
      const sA = getContaStatus(a);
      const sB = getContaStatus(b);
      if (statusOrder[sA] !== statusOrder[sB]) return statusOrder[sA] - statusOrder[sB];
      return parseISO(a.dataVencimento).getTime() - parseISO(b.dataVencimento).getTime();
    });
  }, [contas]);

  const displayedContas = limit ? sortedContas.slice(0, limit) : sortedContas;

  if (contas.length === 0) {
    return (
      <EmptyState
        icon={tipo === 'pagar' ? <Receipt className="h-6 w-6 text-muted-foreground" /> : <TrendingUp className="h-6 w-6 text-muted-foreground" />}
        description={tipo === 'pagar' ? 'Nenhuma conta a pagar pendente.' : 'Nenhuma conta a receber pendente.'}
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-2">
      {displayedContas.map((conta) => {
        const status = getContaStatus(conta);
        const isPago = status === 'pago';

        return (
          <div
            key={conta.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors',
              isPago && 'opacity-60 bg-muted/20',
              status === 'vencido' && conta.tipo === 'pagar' && 'border-expense/30 bg-expense/5',
              !isPago && status !== 'vencido' && 'bg-background border-border'
            )}
          >
            {/* Icon */}
            <div className={cn(
              'h-8 w-8 shrink-0 rounded-full flex items-center justify-center',
              conta.tipo === 'pagar' ? 'bg-expense/10' : 'bg-income/10'
            )}>
              {getStatusIcon(status, conta.tipo)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className={cn(
                    'font-medium text-sm truncate',
                    isPago && 'line-through text-muted-foreground'
                  )}>{conta.nome}</p>
                  {conta.recorrente && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 shrink-0">
                      <RefreshCw className="h-2.5 w-2.5" />
                      Dia {conta.diaRecorrencia || parseISO(conta.dataVencimento).getDate()}
                    </Badge>
                  )}
                </div>
                <p className={cn(
                  'font-bold text-sm whitespace-nowrap shrink-0',
                  conta.tipo === 'pagar' ? 'text-expense' : 'text-income',
                  isPago && 'text-muted-foreground'
                )}>
                  {formatCurrency(conta.valor)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-muted-foreground truncate">{conta.categoria}</span>
                  {conta.formaPagamento && (
                    <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground whitespace-nowrap">
                      {getPaymentMethodIcon(conta.formaPagamento)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {getStatusBadge(status, conta.tipo)}
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(conta.dataVencimento), 'dd/MM')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {isPago ? (
                <Badge className="bg-income/10 text-income border-income/30 h-7 px-2 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {conta.tipo === 'pagar' ? 'Pago' : 'Recebido'}
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => onConfirmPayment(conta.id)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {conta.tipo === 'pagar' ? 'Pagar' : 'Receber'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => onEdit(conta)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-expense"
                onClick={() => setDeleteConfirm({ id: conta.id, nome: conta.nome })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}

      {limit && onShowAll && (totalCount || contas.length) > limit && (
        <Button variant="ghost" className="w-full mt-2 text-xs" onClick={onShowAll}>
          Ver todas ({totalCount || contas.length})
        </Button>
      )}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteConfirm?.nome}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirm) { onDelete(deleteConfirm.id); setDeleteConfirm(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContasListSection;
