import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, TrendingUp, TrendingDown, CheckCircle2, CreditCard, Banknote, Wallet, QrCode, RefreshCcw } from 'lucide-react';
import { LancamentoInput } from '@/hooks/useLancamentosRealizados';
import { PaymentMethod } from '@/types/financial';
import { paymentMethods } from '@/data/defaultData';

interface ConsolidationItem {
  id: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  nome: string;
  valor_previsto: number;
  valor_realizado: number;
  data_pagamento: Date | null;
  forma_pagamento: string;
  selected: boolean;
}

interface ConsolidacaoMensalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesReferencia: string;
  receitas: Array<{ id: string; name: string; value: number }>;
  despesas: Array<{ id: string; name: string; category: string; value: number; paymentMethod?: PaymentMethod }>;
  onConsolidar: (lancamentos: LancamentoInput[]) => Promise<boolean>;
}

const formatMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[parseInt(monthNum) - 1]} de ${year}`;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'pix':
      return <QrCode className="h-3 w-3" />;
    case 'credit_card':
      return <CreditCard className="h-3 w-3" />;
    case 'debit_card':
      return <Wallet className="h-3 w-3" />;
    case 'auto_debit':
      return <RefreshCcw className="h-3 w-3" />;
    case 'boleto':
      return <Banknote className="h-3 w-3" />;
    case 'cash':
      return <Banknote className="h-3 w-3" />;
    default:
      return <CreditCard className="h-3 w-3" />;
  }
};

export function ConsolidacaoMensalDialog({
  open,
  onOpenChange,
  mesReferencia,
  receitas,
  despesas,
  onConsolidar,
}: ConsolidacaoMensalDialogProps) {
  const [items, setItems] = useState<ConsolidationItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Initialize items when dialog opens
  React.useEffect(() => {
    if (open) {
      const defaultDate = new Date();
      const receitaItems: ConsolidationItem[] = receitas
        .filter(r => r.value > 0)
        .map(r => ({
          id: r.id,
          tipo: 'receita' as const,
          categoria: 'Receitas',
          nome: r.name,
          valor_previsto: r.value,
          valor_realizado: r.value,
          data_pagamento: defaultDate,
          forma_pagamento: 'pix',
          selected: true,
        }));

      const despesaItems: ConsolidationItem[] = despesas
        .filter(d => d.value > 0)
        .map(d => ({
          id: d.id,
          tipo: 'despesa' as const,
          categoria: d.category,
          nome: d.name,
          valor_previsto: d.value,
          valor_realizado: d.value,
          data_pagamento: defaultDate,
          forma_pagamento: d.paymentMethod || 'credit_card',
          selected: true,
        }));

      setItems([...receitaItems, ...despesaItems]);
    }
  }, [open, receitas, despesas]);

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateItemValue = (id: string, valor_realizado: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, valor_realizado } : item
      )
    );
  };

  const updateItemDate = (id: string, data_pagamento: Date | null) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, data_pagamento } : item
      )
    );
  };

  const updateItemPayment = (id: string, forma_pagamento: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, forma_pagamento } : item
      )
    );
  };

  const selectAll = (tipo: 'receita' | 'despesa', selected: boolean) => {
    setItems(prev =>
      prev.map(item =>
        item.tipo === tipo ? { ...item, selected } : item
      )
    );
  };

  const receitaItems = useMemo(() => items.filter(i => i.tipo === 'receita'), [items]);
  const despesaItems = useMemo(() => items.filter(i => i.tipo === 'despesa'), [items]);

  const totals = useMemo(() => {
    const selectedItems = items.filter(i => i.selected);
    return {
      receitas: selectedItems.filter(i => i.tipo === 'receita').reduce((sum, i) => sum + i.valor_realizado, 0),
      despesas: selectedItems.filter(i => i.tipo === 'despesa').reduce((sum, i) => sum + i.valor_realizado, 0),
    };
  }, [items]);

  const handleConsolidar = async () => {
    const selectedItems = items.filter(i => i.selected && i.valor_realizado > 0);
    
    // Check if all despesas have payment method
    const despesasSemPagamento = selectedItems.filter(i => i.tipo === 'despesa' && !i.forma_pagamento);
    if (despesasSemPagamento.length > 0) {
      return;
    }

    if (selectedItems.length === 0) return;

    setSubmitting(true);
    const lancamentos: LancamentoInput[] = selectedItems.map(item => ({
      tipo: item.tipo,
      categoria: item.categoria,
      nome: item.nome,
      valor_previsto: item.valor_previsto,
      valor_realizado: item.valor_realizado,
      mes_referencia: mesReferencia,
      data_pagamento: item.data_pagamento ? format(item.data_pagamento, 'yyyy-MM-dd') : null,
      forma_pagamento: item.tipo === 'despesa' ? item.forma_pagamento : null,
    }));

    const success = await onConsolidar(lancamentos);
    setSubmitting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const renderItemRow = (item: ConsolidationItem) => (
    <div
      key={item.id}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        item.selected ? "bg-muted/50 border-primary/30" : "bg-muted/20 border-transparent opacity-60"
      )}
    >
      <Checkbox
        checked={item.selected}
        onCheckedChange={() => toggleItem(item.id)}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.nome}</p>
        <p className="text-xs text-muted-foreground">{item.categoria}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Previsto</p>
          <p className="text-sm">{formatCurrency(item.valor_previsto)}</p>
        </div>
        <div className="w-28">
          <Label className="text-xs text-muted-foreground">Realizado</Label>
          <Input
            type="number"
            value={item.valor_realizado}
            onChange={(e) => updateItemValue(item.id, Number(e.target.value))}
            disabled={!item.selected}
            className="h-8 text-sm"
          />
        </div>
        {item.tipo === 'despesa' && (
          <div className="w-36">
            <Label className="text-xs text-muted-foreground">Pagamento</Label>
            <Select
              value={item.forma_pagamento}
              onValueChange={(value) => updateItemPayment(item.id, value)}
              disabled={!item.selected}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Forma">
                  <span className="flex items-center gap-1">
                    {getPaymentIcon(item.forma_pagamento)}
                    <span className="truncate">
                      {paymentMethods.find(m => m.value === item.forma_pagamento)?.label || 'Selecione'}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    <span className="flex items-center gap-2">
                      {getPaymentIcon(method.value)}
                      {method.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!item.selected}
              className={cn(
                "w-28 justify-start text-left font-normal h-8",
                !item.data_pagamento && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {item.data_pagamento ? format(item.data_pagamento, "dd/MM/yy") : "Data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={item.data_pagamento || undefined}
              onSelect={(date) => updateItemDate(item.id, date || null)}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Consolidar Mês - {formatMonthLabel(mesReferencia)}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Receitas Section */}
            {receitaItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-income flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Receitas
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAll('receita', true)}
                      className="text-xs"
                    >
                      Selecionar todas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAll('receita', false)}
                      className="text-xs"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {receitaItems.map(renderItemRow)}
                </div>
              </div>
            )}

            {/* Despesas Section */}
            {despesaItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-expense flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Despesas
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAll('despesa', true)}
                      className="text-xs"
                    >
                      Selecionar todas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAll('despesa', false)}
                      className="text-xs"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {despesaItems.map(renderItemRow)}
                </div>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lançamento previsto para este mês.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex-1 flex items-center gap-4 text-sm">
            <span className="text-income font-medium">
              Receitas: {formatCurrency(totals.receitas)}
            </span>
            <span className="text-expense font-medium">
              Despesas: {formatCurrency(totals.despesas)}
            </span>
            <span className={cn(
              "font-bold",
              totals.receitas - totals.despesas >= 0 ? "text-income" : "text-expense"
            )}>
              Saldo: {formatCurrency(totals.receitas - totals.despesas)}
            </span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConsolidar}
            disabled={submitting || items.filter(i => i.selected).length === 0}
          >
            {submitting ? 'Consolidando...' : 'Consolidar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
