import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Financiamento, FinanciamentoInsert } from '@/types/credito';
import { Landmark, Loader2 } from 'lucide-react';

interface FinanciamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  financiamento?: Financiamento | null;
  onSave: (data: Omit<FinanciamentoInsert, 'user_id'>) => Promise<{ error?: any }>;
}

export const FinanciamentoDialog: React.FC<FinanciamentoDialogProps> = ({
  open,
  onOpenChange,
  financiamento,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    valor_bem: 0,
    valor_entrada: 0,
    valor_financiado: 0,
    prazo_total: 48,
    parcelas_pagas: 0,
    valor_parcela_atual: 0,
    taxa_juros_mensal: 1.49,
    sistema_amortizacao: 'PRICE' as 'PRICE' | 'SAC',
    taxas_extras: 0,
    seguro_mensal: 0,
    saldo_devedor: 0,
    instituicao_financeira: '',
    contrato: '',
    data_inicio: new Date().toISOString().split('T')[0],
    observacoes: ''
  });

  useEffect(() => {
    if (financiamento) {
      setForm({
        nome: financiamento.nome,
        valor_bem: financiamento.valor_bem,
        valor_entrada: financiamento.valor_entrada,
        valor_financiado: financiamento.valor_financiado,
        prazo_total: financiamento.prazo_total,
        parcelas_pagas: financiamento.parcelas_pagas,
        valor_parcela_atual: financiamento.valor_parcela_atual,
        taxa_juros_mensal: financiamento.taxa_juros_mensal,
        sistema_amortizacao: financiamento.sistema_amortizacao,
        taxas_extras: financiamento.taxas_extras,
        seguro_mensal: financiamento.seguro_mensal,
        saldo_devedor: financiamento.saldo_devedor,
        instituicao_financeira: financiamento.instituicao_financeira || '',
        contrato: financiamento.contrato || '',
        data_inicio: financiamento.data_inicio,
        observacoes: financiamento.observacoes || ''
      });
    } else {
      setForm({
        nome: '',
        valor_bem: 0,
        valor_entrada: 0,
        valor_financiado: 0,
        prazo_total: 48,
        parcelas_pagas: 0,
        valor_parcela_atual: 0,
        taxa_juros_mensal: 1.49,
        sistema_amortizacao: 'PRICE',
        taxas_extras: 0,
        seguro_mensal: 0,
        saldo_devedor: 0,
        instituicao_financeira: '',
        contrato: '',
        data_inicio: new Date().toISOString().split('T')[0],
        observacoes: ''
      });
    }
  }, [financiamento, open]);

  // Auto calculate valor_financiado
  useEffect(() => {
    const financiado = form.valor_bem - form.valor_entrada + form.taxas_extras;
    if (financiado !== form.valor_financiado) {
      setForm(prev => ({ ...prev, valor_financiado: financiado > 0 ? financiado : 0 }));
    }
  }, [form.valor_bem, form.valor_entrada, form.taxas_extras]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const data: Omit<FinanciamentoInsert, 'user_id'> = {
      ...form,
      instituicao_financeira: form.instituicao_financeira || undefined,
      contrato: form.contrato || undefined,
      observacoes: form.observacoes || undefined
    };

    const result = await onSave(data);
    setLoading(false);
    
    if (!result.error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-emerald-600" />
            {financiamento ? 'Editar Financiamento' : 'Novo Financiamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome / Descrição</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Financiamento Carro Honda Civic"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Valor do Bem (R$)</Label>
              <Input
                type="number"
                value={form.valor_bem}
                onChange={(e) => setForm({ ...form, valor_bem: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Entrada (R$)</Label>
              <Input
                type="number"
                value={form.valor_entrada}
                onChange={(e) => setForm({ ...form, valor_entrada: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Taxas Financiadas (IOF, TAC) R$</Label>
              <Input
                type="number"
                value={form.taxas_extras}
                onChange={(e) => setForm({ ...form, taxas_extras: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Financiado (R$)</Label>
              <Input
                type="number"
                value={form.valor_financiado}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Parcela Atual (R$)</Label>
              <Input
                type="number"
                value={form.valor_parcela_atual}
                onChange={(e) => setForm({ ...form, valor_parcela_atual: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Saldo Devedor (R$)</Label>
              <Input
                type="number"
                value={form.saldo_devedor}
                onChange={(e) => setForm({ ...form, saldo_devedor: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Prazo Total (meses)</Label>
              <Input
                type="number"
                value={form.prazo_total}
                onChange={(e) => setForm({ ...form, prazo_total: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Parcelas Pagas</Label>
              <Input
                type="number"
                value={form.parcelas_pagas}
                onChange={(e) => setForm({ ...form, parcelas_pagas: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Taxa Juros (% a.m.)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.taxa_juros_mensal}
                onChange={(e) => setForm({ ...form, taxa_juros_mensal: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Sistema de Amortização</Label>
              <Select 
                value={form.sistema_amortizacao} 
                onValueChange={(v) => setForm({ ...form, sistema_amortizacao: v as 'PRICE' | 'SAC' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRICE">Tabela PRICE</SelectItem>
                  <SelectItem value="SAC">Tabela SAC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Seguro Mensal (R$)</Label>
              <Input
                type="number"
                value={form.seguro_mensal}
                onChange={(e) => setForm({ ...form, seguro_mensal: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Instituição Financeira</Label>
              <Input
                value={form.instituicao_financeira}
                onChange={(e) => setForm({ ...form, instituicao_financeira: e.target.value })}
                placeholder="Ex: Banco do Brasil"
              />
            </div>

            <div className="space-y-2">
              <Label>Nº Contrato</Label>
              <Input
                value={form.contrato}
                onChange={(e) => setForm({ ...form, contrato: e.target.value })}
                placeholder="Ex: 123456789"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas adicionais..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {financiamento ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
