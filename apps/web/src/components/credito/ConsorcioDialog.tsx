import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Consorcio, ConsorcioInsert } from '@/types/credito';
import { TrendingUp, Loader2 } from 'lucide-react';

interface ConsorcioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consorcio?: Consorcio | null;
  onSave: (data: Omit<ConsorcioInsert, 'user_id'>) => Promise<{ error?: any }>;
}

export const ConsorcioDialog: React.FC<ConsorcioDialogProps> = ({
  open,
  onOpenChange,
  consorcio,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    valor_carta: 0,
    prazo_total: 60,
    parcelas_pagas: 0,
    valor_parcela_atual: 0,
    taxa_adm_total: 15,
    fundo_reserva: 2,
    seguro_mensal: 0.05,
    reajuste_anual: 4.5,
    contemplado: false,
    data_contemplacao: '',
    administradora: '',
    grupo: '',
    cota: '',
    data_inicio: new Date().toISOString().split('T')[0],
    observacoes: ''
  });

  useEffect(() => {
    if (consorcio) {
      setForm({
        nome: consorcio.nome,
        valor_carta: consorcio.valor_carta,
        prazo_total: consorcio.prazo_total,
        parcelas_pagas: consorcio.parcelas_pagas,
        valor_parcela_atual: consorcio.valor_parcela_atual,
        taxa_adm_total: consorcio.taxa_adm_total,
        fundo_reserva: consorcio.fundo_reserva,
        seguro_mensal: consorcio.seguro_mensal,
        reajuste_anual: consorcio.reajuste_anual,
        contemplado: consorcio.contemplado,
        data_contemplacao: consorcio.data_contemplacao || '',
        administradora: consorcio.administradora || '',
        grupo: consorcio.grupo || '',
        cota: consorcio.cota || '',
        data_inicio: consorcio.data_inicio,
        observacoes: consorcio.observacoes || ''
      });
    } else {
      setForm({
        nome: '',
        valor_carta: 0,
        prazo_total: 60,
        parcelas_pagas: 0,
        valor_parcela_atual: 0,
        taxa_adm_total: 15,
        fundo_reserva: 2,
        seguro_mensal: 0.05,
        reajuste_anual: 4.5,
        contemplado: false,
        data_contemplacao: '',
        administradora: '',
        grupo: '',
        cota: '',
        data_inicio: new Date().toISOString().split('T')[0],
        observacoes: ''
      });
    }
  }, [consorcio, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const data: Omit<ConsorcioInsert, 'user_id'> = {
      ...form,
      data_contemplacao: form.data_contemplacao || undefined,
      administradora: form.administradora || undefined,
      grupo: form.grupo || undefined,
      cota: form.cota || undefined,
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
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {consorcio ? 'Editar Consórcio' : 'Novo Consórcio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome / Descrição</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Consórcio Veículo Honda"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Valor da Carta (R$)</Label>
              <Input
                type="number"
                value={form.valor_carta}
                onChange={(e) => setForm({ ...form, valor_carta: Number(e.target.value) })}
                required
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
              <Label>Taxa Adm Total (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.taxa_adm_total}
                onChange={(e) => setForm({ ...form, taxa_adm_total: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Fundo Reserva (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.fundo_reserva}
                onChange={(e) => setForm({ ...form, fundo_reserva: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Seguro Mensal (% a.m.)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.seguro_mensal}
                onChange={(e) => setForm({ ...form, seguro_mensal: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Reajuste Anual (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.reajuste_anual}
                onChange={(e) => setForm({ ...form, reajuste_anual: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Administradora</Label>
              <Input
                value={form.administradora}
                onChange={(e) => setForm({ ...form, administradora: e.target.value })}
                placeholder="Ex: Porto Seguro"
              />
            </div>

            <div className="space-y-2">
              <Label>Grupo / Cota</Label>
              <div className="flex gap-2">
                <Input
                  value={form.grupo}
                  onChange={(e) => setForm({ ...form, grupo: e.target.value })}
                  placeholder="Grupo"
                />
                <Input
                  value={form.cota}
                  onChange={(e) => setForm({ ...form, cota: e.target.value })}
                  placeholder="Cota"
                />
              </div>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contemplado?</Label>
                <Switch
                  checked={form.contemplado}
                  onCheckedChange={(checked) => setForm({ ...form, contemplado: checked })}
                />
              </div>
              {form.contemplado && (
                <Input
                  type="date"
                  value={form.data_contemplacao}
                  onChange={(e) => setForm({ ...form, data_contemplacao: e.target.value })}
                  placeholder="Data da contemplação"
                />
              )}
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
              {consorcio ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
