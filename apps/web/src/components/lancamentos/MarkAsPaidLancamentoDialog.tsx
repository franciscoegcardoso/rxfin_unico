import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LancamentoRealizado } from '@/hooks/useLancamentosRealizados';
import { paymentMethods } from '@/data/defaultData';

interface MarkAsPaidLancamentoDialogProps {
  item: LancamentoRealizado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: { valorRealizado: number; dataPagamento: string; formaPagamento: string }) => Promise<void>;
  isLoading?: boolean;
}

export const MarkAsPaidLancamentoDialog: React.FC<MarkAsPaidLancamentoDialogProps> = ({
  item,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}) => {
  const [valorRealizado, setValorRealizado] = useState(0);
  const [dataPagamento, setDataPagamento] = useState<Date>(new Date());
  const [formaPagamento, setFormaPagamento] = useState('pix');

  useEffect(() => {
    if (item && open) {
      setValorRealizado(item.valor_previsto ?? 0);
      setDataPagamento(item.data_pagamento ? new Date(item.data_pagamento + 'T12:00:00') : new Date());
      const method = item.forma_pagamento && paymentMethods.some(m => m.value === item.forma_pagamento)
        ? item.forma_pagamento
        : 'pix';
      setFormaPagamento(method);
    }
  }, [item, open]);

  const handleSubmit = async () => {
    if (!item || valorRealizado <= 0) return;
    const dataStr = format(dataPagamento, 'yyyy-MM-dd');
    await onConfirm({
      valorRealizado,
      dataPagamento: dataStr,
      formaPagamento,
    });
    onOpenChange(false);
  };

  if (!item) return null;

  const isEntrada = item.tipo === 'receita';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEntrada ? 'Marcar como recebido' : 'Marcar como pago'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {item.friendly_name || item.nome}
          </p>
          <div className="space-y-2">
            <Label>Valor {isEntrada ? 'recebido' : 'pago'}</Label>
            <CurrencyInput
              value={valorRealizado}
              onChange={setValorRealizado}
            />
          </div>
          <div className="space-y-2">
            <Label>Data {isEntrada ? 'do recebimento' : 'do pagamento'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dataPagamento, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataPagamento}
                  onSelect={(d) => d && setDataPagamento(d)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={valorRealizado <= 0 || isLoading}>
            {isLoading ? 'Salvando...' : isEntrada ? 'Marcar recebido' : 'Marcar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
