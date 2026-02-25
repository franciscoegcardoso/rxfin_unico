import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Save, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BillOption {
  id: string;
  billing_month: string;
  due_date: string;
  closing_date: string;
  card_id: string;
}

interface InstallmentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: CreditCardTransaction | null;
  onSuccess?: () => void;
  formatCurrency?: (value: number) => string;
}

export function InstallmentEditDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
  formatCurrency,
}: InstallmentEditDialogProps) {
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCurrent, setInstallmentCurrent] = useState('1');
  const [installmentTotal, setInstallmentTotal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bill reassignment state
  const [bills, setBills] = useState<BillOption[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [billsLoading, setBillsLoading] = useState(false);
  const [billChanged, setBillChanged] = useState(false);

  useEffect(() => {
    if (transaction) {
      const hasInstallment = !!transaction.installment_total && transaction.installment_total > 1;
      setIsInstallment(hasInstallment);
      setInstallmentCurrent(hasInstallment ? String(transaction.installment_current || 1) : '1');
      setInstallmentTotal(hasInstallment ? String(transaction.installment_total) : '');
      setError(null);
      setSelectedBillId(transaction.credit_card_bill_id || '');
      setBillChanged(false);
    }
  }, [transaction]);

  // Fetch available bills for this card
  useEffect(() => {
    if (!open || !transaction?.card_id) {
      setBills([]);
      return;
    }

    const fetchBills = async () => {
      setBillsLoading(true);
      const { data } = await supabase
        .from('credit_card_bills')
        .select('id, billing_month, due_date, closing_date, card_id')
        .eq('card_id', transaction.card_id!)
        .order('billing_month', { ascending: false })
        .limit(24);

      setBills((data as BillOption[]) || []);
      setBillsLoading(false);
    };

    fetchBills();
  }, [open, transaction?.card_id]);

  const defaultFormat = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmt = formatCurrency || defaultFormat;

  const formatBillingMonth = (bm: string): string => {
    try {
      const date = parse(bm, 'yyyy-MM', new Date());
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return bm;
    }
  };

  const currentBillLabel = useMemo(() => {
    if (!transaction?.credit_card_bill_id) return 'Sem fatura vinculada';
    const bill = bills.find(b => b.id === transaction.credit_card_bill_id);
    if (bill) return formatBillingMonth(bill.billing_month);
    return 'Fatura vinculada';
  }, [transaction?.credit_card_bill_id, bills]);

  const validate = (): boolean => {
    if (!isInstallment) return true;
    const current = parseInt(installmentCurrent);
    const total = parseInt(installmentTotal);
    if (!total || total < 2) {
      setError('Total de parcelas deve ser pelo menos 2');
      return false;
    }
    if (total > 48) {
      setError('Máximo de 48 parcelas');
      return false;
    }
    if (!current || current < 1) {
      setError('Parcela atual deve ser pelo menos 1');
      return false;
    }
    if (current > total) {
      setError('Parcela atual não pode ser maior que o total');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!transaction) return;
    if (!validate()) return;

    setSaving(true);

    // Handle bill reassignment
    if (billChanged && selectedBillId !== (transaction.credit_card_bill_id || '')) {
      const newBillId = selectedBillId || null;
      const { error: billErr } = await supabase
        .from('credit_card_transactions')
        .update({
          credit_card_bill_id: newBillId,
          bill_from_pluggy: false, // Manual override
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (billErr) {
        setSaving(false);
        toast.error('Erro ao alterar fatura');
        return;
      }
    }

    // If turning OFF installment or already split, just update fields directly
    if (!isInstallment) {
      const { error: updateErr } = await supabase
        .from('credit_card_transactions')
        .update({
          installment_current: null,
          installment_total: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);
      setSaving(false);
      if (updateErr) {
        toast.error('Erro ao atualizar transação');
        return;
      }
      if (billChanged) {
        toast.success('Transação atualizada');
      } else {
        toast.success('Parcelamento removido');
      }
      onSuccess?.();
      onOpenChange(false);
      return;
    }

    // Already split — don't allow re-split (but bill change is OK)
    if (transaction.installment_total && transaction.installment_total > 1) {
      if (billChanged) {
        setSaving(false);
        toast.success('Fatura atualizada');
        onSuccess?.();
        onOpenChange(false);
        return;
      }
      setSaving(false);
      setError('Esta transação já está parcelada. Para alterar, remova o parcelamento primeiro.');
      return;
    }

    // Call the backend RPC to split atomically
    const { data, error: rpcError } = await supabase.rpc('split_transaction', {
      p_transaction_id: transaction.id,
      p_total_installments: parseInt(installmentTotal),
      p_installment_current: parseInt(installmentCurrent),
    });
    setSaving(false);

    if (rpcError) {
      console.error('split_transaction error:', rpcError);
      const msg = rpcError.message || 'Erro ao parcelar transação';
      setError(msg);
      toast.error(msg);
      return;
    }

    const result = data as any;
    toast.success(
      `Transação dividida em ${result.total_installments}x de ${fmt(result.installment_value)}`
    );
    onSuccess?.();
    onOpenChange(false);
  };

  if (!transaction) return null;

  const currentNum = parseInt(installmentCurrent) || 0;
  const totalNum = parseInt(installmentTotal) || 0;
  const alreadySplit = !!transaction.installment_total && transaction.installment_total > 1;
  const remainingInstallments = isInstallment && totalNum > 1 && currentNum >= 1 && currentNum <= totalNum
    ? totalNum - 1
    : 0;

  // Preview per-installment value
  const previewValue = totalNum >= 2 ? transaction.value / totalNum : transaction.value;

  const hasAnyChange = billChanged || (isInstallment && !alreadySplit && totalNum >= 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Detalhes da Transação
          </DialogTitle>
          <DialogDescription className="text-left">
            {transaction.friendly_name || transaction.store_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction summary */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-lg font-bold">{fmt(transaction.value)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="text-sm font-medium">
                {transaction.transaction_date.split('-').reverse().join('/')}
              </p>
            </div>
          </div>

          {/* Bill reassignment */}
          {transaction.card_id && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Fatura de cobrança
              </Label>
              {billsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando faturas...
                </div>
              ) : (
                <Select
                  value={selectedBillId || '_none'}
                  onValueChange={(val) => {
                    const newVal = val === '_none' ? '' : val;
                    setSelectedBillId(newVal);
                    setBillChanged(newVal !== (transaction.credit_card_bill_id || ''));
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a fatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">
                      <span className="text-muted-foreground">Sem fatura vinculada</span>
                    </SelectItem>
                    {bills.map(bill => (
                      <SelectItem key={bill.id} value={bill.id}>
                        <span className="capitalize">{formatBillingMonth(bill.billing_month)}</span>
                        <span className="text-muted-foreground ml-1 text-xs">
                          (venc. {bill.due_date.split('-').reverse().join('/')})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {billChanged && (
                <p className="text-xs text-amber-600">
                  Fatura será alterada de "{currentBillLabel}" para "
                  {selectedBillId
                    ? formatBillingMonth(bills.find(b => b.id === selectedBillId)?.billing_month || '')
                    : 'nenhuma'
                  }"
                </p>
              )}
            </div>
          )}

          {/* Installment toggle */}
          <div className="flex items-center justify-between py-3 px-3 rounded-lg border">
            <Label htmlFor="installment-toggle" className="text-sm font-medium cursor-pointer">
              Esta compra foi parcelada?
            </Label>
            <Switch
              id="installment-toggle"
              checked={isInstallment}
              disabled={alreadySplit}
              onCheckedChange={(checked) => {
                setIsInstallment(checked);
                setError(null);
                if (!checked) {
                  setInstallmentCurrent('1');
                  setInstallmentTotal('');
                }
              }}
            />
          </div>

          {alreadySplit && (
            <p className="text-xs text-muted-foreground px-1">
              Já parcelada em {transaction.installment_current}/{transaction.installment_total}.
              Para alterar, remova o parcelamento primeiro.
            </p>
          )}

          {/* Installment inputs */}
          {isInstallment && !alreadySplit && (
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="installment-total" className="text-xs text-muted-foreground">
                    Total de parcelas
                  </Label>
                  <Input
                    id="installment-total"
                    type="number"
                    min={2}
                    max={48}
                    placeholder="Ex: 10"
                    value={installmentTotal}
                    onChange={(e) => {
                      setInstallmentTotal(e.target.value);
                      setError(null);
                    }}
                    className="h-10 text-center text-lg font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="installment-current" className="text-xs text-muted-foreground">
                    Parcela atual
                  </Label>
                  <Input
                    id="installment-current"
                    type="number"
                    min={1}
                    max={totalNum || 48}
                    placeholder="Ex: 1"
                    value={installmentCurrent}
                    onChange={(e) => {
                      setInstallmentCurrent(e.target.value);
                      setError(null);
                    }}
                    className="h-10 text-center text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Preview */}
              {totalNum >= 2 && currentNum >= 1 && currentNum <= totalNum && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Parcelamento</span>
                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                      <Package className="h-3 w-3 mr-1" />
                      {currentNum}/{totalNum}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valor por parcela</span>
                    <span className="text-sm font-semibold">{fmt(previewValue)}</span>
                  </div>
                  {remainingInstallments > 0 && (
                    <p className="text-xs text-muted-foreground">
                      → {remainingInstallments} parcela{remainingInstallments > 1 ? 's' : ''} será{remainingInstallments > 1 ? 'ão' : ''} criada{remainingInstallments > 1 ? 's' : ''} no banco automaticamente
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {!isInstallment && error && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || (!hasAnyChange && alreadySplit && !billChanged)}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
