import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Calendar, Tag, CreditCard, Banknote, Building2 } from 'lucide-react';
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
  sourceInfo?: { institution: string; accountType: string; imageUrl?: string; primaryColor?: string } | null;
  reconciliation?: { matched: boolean; isBillPayment: boolean; cardName?: string } | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const LancamentoDetailDialog: React.FC<LancamentoDetailDialogProps> = ({
  item, open, onOpenChange, onEdit, onDelete, sourceInfo, reconciliation,
}) => {
  const isMobile = useIsMobile();

  if (!item) return null;

  const isEntrada = item.tipo === 'receita';
  const displayDate = item.data_pagamento
    ? parseLocalDate(item.data_pagamento).toLocaleDateString('pt-BR')
    : parseLocalDate(item.data_registro).toLocaleDateString('pt-BR');

  const paymentMethod = paymentMethods.find(m => m.value === item.forma_pagamento);

  const content = (
    <div className="space-y-4">
      {/* Header with value */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-base">{item.friendly_name || item.nome}</p>
          {item.friendly_name && item.friendly_name !== item.nome && (
            <p className="text-xs text-muted-foreground mt-0.5">Original: {item.nome}</p>
          )}
        </div>
        <p className={`font-bold text-lg ${isEntrada ? 'text-income' : 'text-expense'}`}>
          {isEntrada ? '+ ' : '- '}{formatCurrency(item.valor_realizado)}
        </p>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${isEntrada ? 'bg-income' : 'bg-expense'}`} />
          <span className="text-muted-foreground">{isEntrada ? 'Receita' : 'Despesa'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{displayDate}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{item.categoria}</span>
        </div>
        {paymentMethod && (
          <div className="flex items-center gap-2 text-sm">
            {item.forma_pagamento?.includes('card') ? (
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="truncate">{paymentMethod.label}</span>
          </div>
        )}
      </div>

      {/* Source info */}
      {sourceInfo && (
        <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
          <ConnectorLogo imageUrl={sourceInfo.imageUrl} primaryColor={sourceInfo.primaryColor} connectorName={sourceInfo.institution} size="xs" />
          <span className="text-muted-foreground">{sourceInfo.institution}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-muted-foreground text-xs">{sourceInfo.accountType}</span>
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
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          {item.observacoes}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => { onOpenChange(false); onEdit(item); }}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
        <Button variant="outline" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
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
