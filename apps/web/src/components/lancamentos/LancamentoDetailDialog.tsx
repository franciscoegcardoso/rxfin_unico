import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Calendar, Tag, CreditCard, Banknote, Copy } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { parseLocalDate } from '@/utils/dateUtils';
import { LancamentoRealizado } from '@/hooks/useLancamentosRealizados';
import { paymentMethods } from '@/data/defaultData';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';

interface LancamentoDetailDialogProps {
  item: LancamentoRealizado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: LancamentoRealizado) => void;
  onDelete: (id: string, nome: string) => void;
  onMarkPaid?: (id: string, paid: boolean) => Promise<boolean>;
  onOpenMarkAsPaid?: (item: LancamentoRealizado) => void;
  onDuplicateNextMonth?: (id: string) => Promise<unknown>;
  sourceInfo?: { institution: string; accountType: string; imageUrl?: string; primaryColor?: string } | null;
  reconciliation?: { matched: boolean; isBillPayment: boolean; cardName?: string } | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const LancamentoDetailDialog: React.FC<LancamentoDetailDialogProps> = ({
  item, open, onOpenChange, onEdit, onDelete, onMarkPaid, onOpenMarkAsPaid, onDuplicateNextMonth, sourceInfo, reconciliation,
}) => {
  const isMobile = useIsMobile();

  if (!item) return null;

  const isEntrada = item.tipo === 'receita';
  const isPaid = !!item.data_pagamento;
  const displayDate = item.data_pagamento
    ? parseLocalDate(item.data_pagamento).toLocaleDateString('pt-BR')
    : (item.data_registro ? parseLocalDate(item.data_registro).toLocaleDateString('pt-BR') : (item.data_vencimento ? parseLocalDate(item.data_vencimento).toLocaleDateString('pt-BR') : '—'));

  const paymentMethod = paymentMethods.find(m => m.value === item.forma_pagamento);

  const content = (
    <div className="space-y-4">
      {/* Header with value */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-sans)', color: 'hsl(var(--color-text-primary))' }}>{item.friendly_name || item.nome}</p>
          {item.friendly_name && item.friendly_name !== item.nome && (
            <p className="text-xs text-[hsl(var(--color-text-tertiary))] mt-0.5">Original: {item.nome}</p>
          )}
        </div>
        <p
          style={{
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-numeric)',
            color: isEntrada ? 'hsl(var(--color-income))' : 'hsl(var(--color-expense))',
          }}
        >
          {isEntrada ? '+ ' : '- '}{formatCurrency(item.valor_realizado ?? item.valor_previsto)}
        </p>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${isEntrada ? 'bg-income' : 'bg-expense'}`} />
          <span className="text-[hsl(var(--color-text-tertiary))]">{isEntrada ? 'Receita' : 'Despesa'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-[hsl(var(--color-text-tertiary))]" />
          <span>{displayDate}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Tag className="h-3.5 w-3.5 text-[hsl(var(--color-text-tertiary))]" />
          <span className="truncate">{item.categoria}</span>
        </div>
        {paymentMethod && (
          <div className="flex items-center gap-2 text-sm">
            {item.forma_pagamento?.includes('card') ? (
              <CreditCard className="h-3.5 w-3.5 text-[hsl(var(--color-text-tertiary))]" />
            ) : (
              <Banknote className="h-3.5 w-3.5 text-[hsl(var(--color-text-tertiary))]" />
            )}
            <span className="truncate">{paymentMethod.label}</span>
          </div>
        )}
      </div>

      {/* Source info */}
      {sourceInfo && (
        <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-[hsl(var(--color-surface-sunken))]">
          <ConnectorLogo imageUrl={sourceInfo.imageUrl} primaryColor={sourceInfo.primaryColor} connectorName={sourceInfo.institution} size="xs" />
          <span className="text-[hsl(var(--color-text-tertiary))]">{sourceInfo.institution}</span>
          <span className="text-[hsl(var(--color-text-tertiary))]/50">·</span>
          <span className="text-[hsl(var(--color-text-tertiary))] text-xs">{sourceInfo.accountType}</span>
        </div>
      )}

      {/* Reconciliation badge */}
      {reconciliation?.isBillPayment && (
        <div className="text-xs text-warning bg-warning/10 px-3 py-2 rounded-lg">
          {reconciliation.matched
            ? `Pagamento da fatura: ${reconciliation.cardName}`
            : 'Pagamento de fatura sem match automático'
          }
        </div>
      )}

      {/* Observations */}
      {item.observacoes && (
        <div className="text-sm text-[hsl(var(--color-text-tertiary))] bg-[hsl(var(--color-surface-sunken))] p-3 rounded-lg">
          {item.observacoes}
        </div>
      )}

      {/* Pago/Recebido */}
      {onMarkPaid && (
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {!isPaid && onOpenMarkAsPaid && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { onOpenChange(false); onOpenMarkAsPaid(item); }}>
              <Banknote className="h-4 w-4" />
              {isEntrada ? 'Marcar como recebido' : 'Marcar como pago'}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="paid"
              checked={isPaid}
              onCheckedChange={(checked) => onMarkPaid(item.id, checked === true)}
            />
            <label htmlFor="paid" className="text-sm font-medium cursor-pointer">
              {isEntrada ? 'Recebido' : 'Pago'}
            </label>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" className="flex-1 gap-2 min-w-[100px]" onClick={() => { onOpenChange(false); onEdit(item); }}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
        {onDuplicateNextMonth && (
          <Button variant="outline" className="gap-2 min-w-[100px]" onClick={() => onDuplicateNextMonth(item.id)}>
            <Copy className="h-4 w-4" /> Duplicar mês
          </Button>
        )}
        <Button variant="outline" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 min-w-[100px]"
          onClick={() => { onOpenChange(false); onDelete(item.id, item.nome); }}>
          <Trash2 className="h-4 w-4" /> Excluir
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="sr-only">Detalhes do Lançamento</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Detalhes do Lançamento</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
