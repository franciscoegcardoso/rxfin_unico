import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Conta } from '@/hooks/useContasPagarReceber';
import { paymentMethods } from '@/data/defaultData';
import { Calendar, CheckCircle2, Upload, FileText, X, ShoppingBag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/types/financial';

interface ConfirmPaymentDialogProps {
  conta: Conta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    value: number;
    date: Date;
    method: PaymentMethod;
    file: File | null;
    purchaseItemId: string;
  }) => void;
  isUploading?: boolean;
  pendingPurchases?: Array<{ id: string; name: string; estimated_value: number }>;
}

export const ConfirmPaymentDialog: React.FC<ConfirmPaymentDialogProps> = ({
  conta,
  open,
  onOpenChange,
  onConfirm,
  isUploading = false,
  pendingPurchases = [],
}) => {
  const [value, setValue] = useState(0);
  const [date, setDate] = useState(new Date());
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [file, setFile] = useState<File | null>(null);
  const [purchaseItemId, setPurchaseItemId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when conta changes
  React.useEffect(() => {
    if (conta) {
      setValue(conta.valor);
      setDate(new Date());
      setMethod(conta.formaPagamento || 'pix');
      setFile(null);
      setPurchaseItemId('');
    }
  }, [conta]);

  if (!conta) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return;
    setFile(f);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Confirmar {conta.tipo === 'pagar' ? 'Pagamento' : 'Recebimento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="font-medium">{conta.nome}</span>
              <Badge variant="outline">
                Vencimento: {format(parseISO(conta.dataVencimento), 'dd/MM/yyyy')}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor {conta.tipo === 'pagar' ? 'Pago' : 'Recebido'}</Label>
            <CurrencyInput
              value={value}
              onChange={setValue}
              className={cn(
                'text-lg font-semibold',
                conta.tipo === 'pagar' ? 'text-expense' : 'text-income'
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Data de {conta.tipo === 'pagar' ? 'Pagamento' : 'Recebimento'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(date, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentMethods.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {conta.tipo === 'pagar' && pendingPurchases.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                Vincular à Lista de Compras
              </Label>
              <Select value={purchaseItemId || 'none'} onValueChange={(v) => setPurchaseItemId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {pendingPurchases.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - R$ {item.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Anexar Comprovante (opcional)</Label>
            <p className="text-xs text-muted-foreground">Máximo 5MB</p>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={handleFileSelect} className="hidden" />
            {!file ? (
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Selecionar arquivo
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => onConfirm({ value, date, method, file, purchaseItemId })}
            disabled={isUploading}
            className={cn(
              conta.tipo === 'pagar' ? 'bg-expense hover:bg-expense/90' : 'bg-income hover:bg-income/90'
            )}
          >
            {isUploading ? 'Enviando...' : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmPaymentDialog;
