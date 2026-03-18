import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { calcFGTSYield, type FGTSAsset } from './useFGTS';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FGTSMonthlyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: FGTSAsset | null;
  onSave: (entry: {
    asset_id: string;
    month: string;
    previous_balance: number;
    deposit: number;
    yield: number;
    final_balance: number;
    notes?: string | null;
  }) => Promise<unknown>;
  isLoading?: boolean;
  latestFinalBalance?: number;
}

const monthToStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export function FGTSMonthlyModal({
  open,
  onOpenChange,
  asset,
  onSave,
  isLoading,
  latestFinalBalance = 0,
}: FGTSMonthlyModalProps) {
  const now = new Date();
  const [month, setMonth] = useState(monthToStr(now));
  const [finalBalance, setFinalBalance] = useState('');
  const [deposit, setDeposit] = useState('');
  const [yieldVal, setYieldVal] = useState('');
  const [notes, setNotes] = useState('');

  const salary = asset?.type_data?.salary ?? 0;
  const defaultDeposit = salary * 0.08;

  useEffect(() => {
    if (!open) return;
    setMonth(monthToStr(now));
    setFinalBalance('');
    setDeposit(String(defaultDeposit.toFixed(2)));
    const prev = latestFinalBalance;
    const calcYield = calcFGTSYield(prev);
    setYieldVal(calcYield.toFixed(2));
    setNotes('');
  }, [open, asset, latestFinalBalance, defaultDeposit]);

  const previousBalance = latestFinalBalance;
  const depositNum = parseFloat(deposit) || 0;
  const yieldNum = parseFloat(yieldVal) || 0;
  const finalNum = parseFloat(finalBalance) || 0;
  const calculatedFinal = previousBalance + depositNum + yieldNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
    const finalToUse = finalBalance.trim() ? finalNum : calculatedFinal;
    await onSave({
      asset_id: asset.id,
      month,
      previous_balance: previousBalance,
      deposit: depositNum,
      yield: yieldNum,
      final_balance: finalToUse,
      notes: notes.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar saldo do mês</DialogTitle>
          <DialogDescription>
            {asset ? `Conta: ${asset.name}` : ''} Informe o saldo atual e o depósito do mês.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fgts-month">Mês de referência</Label>
            <Input
              id="fgts-month"
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-prev">Saldo anterior</Label>
            <Input
              id="fgts-prev"
              type="text"
              readOnly
              value={latestFinalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-deposit">Depósito do mês (8% do salário)</Label>
            <Input
              id="fgts-deposit"
              type="number"
              step="0.01"
              min="0"
              value={deposit}
              onChange={e => setDeposit(e.target.value)}
            />
            {salary > 0 && (
              <p className="text-xs text-muted-foreground">
                Salário base: R$ {salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → 8% = R$ {(salary * 0.08).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-yield">Rendimento (TR + 3% a.a.)</Label>
            <Input
              id="fgts-yield"
              type="number"
              step="0.01"
              value={yieldVal}
              onChange={e => setYieldVal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-final">Saldo atual do mês</Label>
            <Input
              id="fgts-final"
              type="number"
              step="0.01"
              min="0"
              placeholder={calculatedFinal.toFixed(2)}
              value={finalBalance}
              onChange={e => setFinalBalance(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-notes">Observações (opcional)</Label>
            <Textarea id="fgts-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
