import React, { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ManualInvestment, ManualInvestmentInsert, ManualInvestmentType } from '@/types/investments';

const TYPE_OPTIONS: { value: ManualInvestmentType; label: string }[] = [
  { value: 'PENSION_VGBL', label: 'Previdência VGBL' },
  { value: 'PENSION_PGBL', label: 'Previdência PGBL' },
  { value: 'FIXED_INCOME', label: 'Renda Fixa (outro banco)' },
  { value: 'TREASURE_DIRECT', label: 'Tesouro Direto' },
  { value: 'MUTUAL_FUND', label: 'Fundo de Investimento' },
  { value: 'STOCK', label: 'Ação' },
  { value: 'REAL_ESTATE_FUND', label: 'FII' },
  { value: 'ETF', label: 'ETF' },
  { value: 'BDR', label: 'BDR' },
  { value: 'CRYPTO', label: 'Criptomoeda' },
  { value: 'INCOME', label: 'Proventos / Dividendos' },
  { value: 'STOCK_OPTION', label: 'Stock Option' },
  { value: 'OTHER', label: 'Outro' },
];

export interface ManualInvestmentModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editItem?: ManualInvestment | null;
  add: (p: ManualInvestmentInsert) => Promise<boolean>;
  update: (id: string, p: Partial<ManualInvestmentInsert>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export function ManualInvestmentModal({
  open,
  onClose,
  onSaved,
  editItem,
  add,
  update,
  remove,
}: ManualInvestmentModalProps) {
  const [form, setForm] = useState({
    name: '',
    type: 'OTHER' as ManualInvestmentType,
    institution: '',
    gross_balance: '',
    net_balance: '',
    balance_date: new Date().toISOString().slice(0, 10),
    maturity_date: '',
    ticker: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErr, setFieldErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFieldErr(null);
    if (editItem) {
      setForm({
        name: editItem.name,
        type: editItem.type,
        institution: editItem.institution,
        gross_balance: String(editItem.gross_balance),
        net_balance: editItem.net_balance != null ? String(editItem.net_balance) : '',
        balance_date: editItem.balance_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        maturity_date: editItem.maturity_date?.slice(0, 10) ?? '',
        ticker: editItem.ticker ?? '',
        notes: editItem.notes ?? '',
      });
    } else {
      setForm({
        name: '',
        type: 'OTHER',
        institution: '',
        gross_balance: '',
        net_balance: '',
        balance_date: new Date().toISOString().slice(0, 10),
        maturity_date: '',
        ticker: '',
        notes: '',
      });
    }
  }, [open, editItem]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.institution.trim() || !form.gross_balance) {
      setFieldErr('Preencha nome, instituição e valor bruto.');
      return;
    }
    const gross = Number(form.gross_balance);
    if (Number.isNaN(gross) || gross < 0) {
      setFieldErr('Valor bruto inválido.');
      return;
    }
    setFieldErr(null);
    setSubmitting(true);
    const payload: ManualInvestmentInsert = {
      name: form.name.trim(),
      type: form.type,
      institution: form.institution.trim(),
      ticker: form.ticker.trim() ? form.ticker.trim().toUpperCase() : undefined,
      gross_balance: gross,
      net_balance: form.net_balance ? Number(form.net_balance) : undefined,
      balance_date: form.balance_date || new Date().toISOString().slice(0, 10),
      maturity_date: form.maturity_date || undefined,
      notes: form.notes.trim() || undefined,
    };
    let ok: boolean;
    if (editItem) {
      ok = await update(editItem.id, payload);
    } else {
      ok = await add(payload);
    }
    setSubmitting(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  const handleRemove = async () => {
    if (!editItem || !confirm('Remover este investimento manual?')) return;
    setSubmitting(true);
    const ok = await remove(editItem.id);
    setSubmitting(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Editar investimento' : 'Adicionar investimento manual'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {fieldErr && (
            <p className="text-sm text-destructive border border-destructive/30 rounded-md px-2 py-1.5">{fieldErr}</p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo *</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as ManualInvestmentType }))}>
              <SelectTrigger className={cn(!form.type && 'border-destructive')}>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do produto *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={cn(!form.name.trim() && fieldErr && 'border-destructive')}
              placeholder="Ex: Previdência VGBL XP"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Instituição *</Label>
            <Input
              value={form.institution}
              onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
              placeholder="Ex: XP Investimentos"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor bruto atual (R$) *</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.gross_balance}
              onChange={(e) => setForm((f) => ({ ...f, gross_balance: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data de referência *</Label>
            <Input
              type="date"
              value={form.balance_date}
              onChange={(e) => setForm((f) => ({ ...f, balance_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor líquido estimado (opcional)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.net_balance}
              onChange={(e) => setForm((f) => ({ ...f, net_balance: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ticker / Código (opcional)</Label>
            <Input
              value={form.ticker}
              onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data de vencimento (opcional)</Label>
            <Input
              type="date"
              value={form.maturity_date}
              onChange={(e) => setForm((f) => ({ ...f, maturity_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {editItem && (
            <Button type="button" variant="destructive" className="mr-auto" onClick={handleRemove} disabled={submitting}>
              Remover
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
