import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, Calendar, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePickerFriendly } from '@/components/ui/date-picker-friendly';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCardBill, useCreditCardBills } from '@/hooks/useCreditCardBills';
import { useLancamentosRealizados, LancamentoInput } from '@/hooks/useLancamentosRealizados';
import { paymentMethods } from '@/data/defaultData';
import { toast } from 'sonner';

interface BillPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: CreditCardBill | null;
  onPaymentComplete?: () => void;
}

export const BillPaymentDialog: React.FC<BillPaymentDialogProps> = ({
  open,
  onOpenChange,
  bill,
  onPaymentComplete,
}) => {
  const { updateBill } = useCreditCardBills();
  const { addLancamento } = useLancamentosRealizados();
  
  const [paymentValue, setPaymentValue] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize values when bill changes
  useEffect(() => {
    if (bill) {
      setPaymentValue(bill.total_value);
      setPaymentDate(bill.due_date ? parseISO(bill.due_date) : new Date());
      setPaymentMethod('pix');
    }
  }, [bill]);

  const handlePayment = async () => {
    if (!bill) return;
    
    if (paymentValue <= 0) {
      toast.error('Informe o valor do pagamento');
      return;
    }

    setIsSubmitting(true);

    try {
      const mesReferencia = format(paymentDate, 'yyyy-MM');
      
      // Create lancamento for the bill payment
      const lancamentoInput: LancamentoInput = {
        tipo: 'despesa',
        categoria: 'Cartão de Crédito',
        nome: `Fatura ${bill.card_name || 'Cartão'} - ${format(parseISO(bill.closing_date), 'MMM/yyyy', { locale: ptBR })}`,
        valor_previsto: bill.total_value,
        valor_realizado: paymentValue,
        mes_referencia: mesReferencia,
        data_vencimento: bill.due_date,
        data_pagamento: format(paymentDate, 'yyyy-MM-dd'),
        forma_pagamento: paymentMethod,
        observacoes: `Pagamento de fatura de cartão de crédito`,
      };

      const lancamento = await addLancamento(lancamentoInput);
      
      if (!lancamento) {
        throw new Error('Erro ao criar lançamento');
      }

      // Update bill status and link to lancamento
      const updated = await updateBill(bill.id, {
        status: 'paid',
        lancamento_id: lancamento.id,
      });

      if (!updated) {
        throw new Error('Erro ao atualizar fatura');
      }

      toast.success('Fatura paga com sucesso!');
      onOpenChange(false);
      onPaymentComplete?.();
    } catch (err) {
      console.error('Error paying bill:', err);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pagar Fatura
          </DialogTitle>
          <DialogDescription>
            Confirme o pagamento da fatura do cartão
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Bill Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cartão</span>
              <span className="font-medium">{bill.card_name || 'Cartão de Crédito'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fechamento</span>
              <span className="font-medium">
                {format(parseISO(bill.closing_date), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vencimento</span>
              <span className="font-medium">
                {format(parseISO(bill.due_date), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Valor da Fatura</span>
              <span className="text-lg font-bold text-expense">
                {formatCurrency(bill.total_value)}
              </span>
            </div>
          </div>

          {/* Payment Value */}
          <div className="space-y-2">
            <Label htmlFor="paymentValue">Valor do Pagamento</Label>
            <CurrencyInput
              id="paymentValue"
              value={paymentValue}
              onChange={setPaymentValue}
            />
            {paymentValue !== bill.total_value && paymentValue > 0 && (
              <p className="text-xs text-amber-600">
                {paymentValue < bill.total_value 
                  ? `Pagamento parcial: faltam ${formatCurrency(bill.total_value - paymentValue)}`
                  : `Pagamento acima do valor da fatura`
                }
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Data do Pagamento</Label>
            <DatePickerFriendly
              value={paymentDate}
              onChange={(date) => date && setPaymentDate(date)}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods
                  .filter(m => m.value !== 'credit_card')
                  .map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isSubmitting || paymentValue <= 0}
            className="bg-income hover:bg-income/90"
          >
            <Wallet className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
