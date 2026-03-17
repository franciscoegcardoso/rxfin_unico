import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancial } from '@/contexts/FinancialContext';
import { Asset } from '@/types/financial';

interface DividaObrigacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAsset?: Asset | null;
}

const SUBTIPO_OPTIONS = [
  { value: 'divida_obrigacao', label: 'Dívida / Obrigação' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cheque_especial', label: 'Cheque Especial' },
  { value: 'emprestimo_pessoal', label: 'Empréstimo Pessoal' },
  { value: 'outros', label: 'Outros' },
];

export const DividaObrigacaoDialog: React.FC<DividaObrigacaoDialogProps> = ({
  open, onOpenChange, editingAsset
}) => {
  const { addAsset, updateAsset } = useFinancial();
  const [subTipo, setSubTipo] = useState('divida_obrigacao');
  const [nome, setNome] = useState('');
  const [saldoDevedor, setSaldoDevedor] = useState('');
  const [parcelaMensal, setParcelaMensal] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [credor, setCredor] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [taxaJuros, setTaxaJuros] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingAsset) {
        setNome(editingAsset.name ?? '');
        setSaldoDevedor(String(editingAsset.value ?? ''));
        setSubTipo((editingAsset as any).passivoSubtype ?? 'divida_obrigacao');
        setParcelaMensal(String((editingAsset as any).passivoParcelaMensal ?? ''));
        setCredor((editingAsset as any).passivoBanco ?? '');
        setValorTotal(String((editingAsset as any).passivoValorTotal ?? ''));
        setTaxaJuros(String((editingAsset as any).passivoTaxaJuros ?? ''));
        setDataInicio((editingAsset as any).passivoDataInicio ?? '');
        setDataVencimento((editingAsset as any).passivoDataVencimento ?? '');
      } else {
        setSubTipo('divida_obrigacao');
        setNome('');
        setSaldoDevedor('');
        setParcelaMensal('');
        setDataInicio('');
        setCredor('');
        setValorTotal('');
        setTaxaJuros('');
        setDataVencimento('');
      }
    }
  }, [open, editingAsset]);

  const handleSave = async () => {
    if (!nome.trim() || !saldoDevedor) return;
    setSaving(true);
    try {
      const data = {
        name: nome.trim(),
        type: 'obligations' as const,
        value: parseFloat(saldoDevedor) || 0,
        passivoSubtype: subTipo,
        passivoParcelaMensal: parseFloat(parcelaMensal) || 0,
        passivoBanco: credor,
        passivoValorTotal: parseFloat(valorTotal) || 0,
        passivoTaxaJuros: parseFloat(taxaJuros) || 0,
        passivoDataInicio: dataInicio || undefined,
        passivoDataVencimento: dataVencimento || undefined,
      };
      if (editingAsset) {
        await updateAsset(editingAsset.id, data);
      } else {
        await addAsset(data);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAsset ? 'Editar Dívida / Obrigação' : 'Nova Dívida / Obrigação'}
          </DialogTitle>
          <DialogDescription>Dívidas e compromissos financeiros a pagar</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Sub-tipo */}
          <div className="space-y-2">
            <Label>Sub-tipo passivo</Label>
            <Select value={subTipo} onValueChange={setSubTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBTIPO_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome / Identificação <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ex: Financiamento Imóvel, Cartão XYZ"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>

          {/* Saldo Devedor */}
          <div className="space-y-2">
            <Label>Saldo Devedor Atual (R$) <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="pl-9"
                placeholder="0"
                value={saldoDevedor}
                onChange={e => setSaldoDevedor(e.target.value)}
              />
            </div>
          </div>

          {/* Parcela + Data Início */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Parcela Mensal (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  placeholder="0"
                  value={parcelaMensal}
                  onChange={e => setParcelaMensal(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
              />
            </div>
          </div>

          {/* Credor */}
          <div className="space-y-2">
            <Label>Credor (opcional)</Label>
            <Input
              placeholder="Ex: Banco XYZ, Cartão ABC"
              value={credor}
              onChange={e => setCredor(e.target.value)}
            />
          </div>

          {/* Valor Total */}
          <div className="space-y-2">
            <Label>Valor Total da Dívida (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="pl-9"
                placeholder="0"
                value={valorTotal}
                onChange={e => setValorTotal(e.target.value)}
              />
            </div>
          </div>

          {/* Taxa de Juros */}
          <div className="space-y-2">
            <Label>Taxa de Juros (% a.m., opcional)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={taxaJuros}
              onChange={e => setTaxaJuros(e.target.value)}
            />
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label>Data de Vencimento (opcional)</Label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={e => setDataVencimento(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!nome.trim() || !saldoDevedor || saving}
          >
            {saving ? 'Salvando...' : editingAsset ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
