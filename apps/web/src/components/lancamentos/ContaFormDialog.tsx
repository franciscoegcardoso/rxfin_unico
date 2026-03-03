import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePickerFriendly } from '@/components/ui/date-picker-friendly';
import { Conta, ContaInput, ContaTipo, TipoCobranca } from '@/hooks/useContasPagarReceber';
import { expenseCategories, defaultIncomeItems, paymentMethods } from '@/data/defaultData';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { PaymentMethod } from '@/types/financial';

const incomeCategories = defaultIncomeItems.map(item => ({ value: item.name, label: item.name }));
const mappedExpenseCategories = [
  ...expenseCategories.map(cat => ({ value: cat.name, label: cat.name })),
  { value: 'Cartão de Crédito', label: 'Cartão de Crédito' },
];

interface ContaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingConta: Conta | null;
  defaultTipo?: ContaTipo;
  defaultTipoCobranca?: TipoCobranca;
  onSave: (data: {
    conta: Partial<Conta>;
    tipoCobranca: TipoCobranca;
    numParcelas: number;
    parcelasConfig: { parcela: number; data: string; ativo: boolean }[];
    diaRecorrencia: number;
    dataFimRecorrencia: string;
    semDataFim: boolean;
  }) => void;
}

export const ContaFormDialog: React.FC<ContaFormDialogProps> = ({
  open,
  onOpenChange,
  editingConta,
  defaultTipo = 'pagar',
  defaultTipoCobranca,
  onSave,
}) => {
  const [newConta, setNewConta] = useState<Partial<Conta>>({
    tipo: defaultTipo,
    nome: '',
    valor: 0,
    dataVencimento: format(new Date(), 'yyyy-MM-dd'),
    categoria: '',
    formaPagamento: 'boleto',
    recorrente: false,
    tipoCobranca: 'unica',
  });

  const [tipoCobranca, setTipoCobranca] = useState<TipoCobranca>('unica');
  const [numParcelas, setNumParcelas] = useState(2);
  const [parcelasConfig, setParcelasConfig] = useState<{ parcela: number; data: string; ativo: boolean }[]>([]);
  const [diaRecorrencia, setDiaRecorrencia] = useState(new Date().getDate());
  const [dataFimRecorrencia, setDataFimRecorrencia] = useState('');
  const [semDataFim, setSemDataFim] = useState(true);

  useEffect(() => {
    if (open) {
      if (editingConta) {
        setNewConta(editingConta);
        setTipoCobranca(editingConta.tipoCobranca || (editingConta.recorrente ? 'recorrente' : 'unica'));
        if (editingConta.diaRecorrencia) setDiaRecorrencia(editingConta.diaRecorrencia);
        if (editingConta.dataFimRecorrencia) setDataFimRecorrencia(editingConta.dataFimRecorrencia);
        setSemDataFim(editingConta.semDataFim ?? true);
      } else {
        const initialCobranca = defaultTipoCobranca || 'unica';
        setNewConta({
          tipo: defaultTipo,
          nome: '',
          valor: 0,
          dataVencimento: format(new Date(), 'yyyy-MM-dd'),
          categoria: '',
          formaPagamento: 'boleto',
          recorrente: initialCobranca === 'recorrente',
          tipoCobranca: initialCobranca,
        });
        setTipoCobranca(initialCobranca);
        setNumParcelas(2);
        setParcelasConfig([]);
        setDiaRecorrencia(new Date().getDate());
        setDataFimRecorrencia('');
        setSemDataFim(true);
      }
    }
  }, [open, editingConta, defaultTipo, defaultTipoCobranca]);

  // Generate installment dates
  useEffect(() => {
    if (tipoCobranca === 'parcelada' && newConta.dataVencimento) {
      const start = parseISO(newConta.dataVencimento);
      const parcelas = Array.from({ length: numParcelas }, (_, i) => ({
        parcela: i + 1,
        data: format(addMonths(start, i), 'yyyy-MM-dd'),
        ativo: true,
      }));
      setParcelasConfig(parcelas);
    }
  }, [numParcelas, newConta.dataVencimento, tipoCobranca]);

  const categories = newConta.tipo === 'pagar' ? mappedExpenseCategories : incomeCategories;

  const handleSave = () => {
    onSave({
      conta: newConta,
      tipoCobranca,
      numParcelas,
      parcelasConfig,
      diaRecorrencia,
      dataFimRecorrencia,
      semDataFim,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>
            {editingConta ? 'Editar Conta' : (
              newConta.tipo === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!editingConta && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant={newConta.tipo === 'receber' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setNewConta({ ...newConta, tipo: 'receber', categoria: '' })}
              >
                <TrendingUp className="h-4 w-4" /> A Receber
              </Button>
              <Button
                variant={newConta.tipo === 'pagar' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setNewConta({ ...newConta, tipo: 'pagar', categoria: '' })}
              >
                <TrendingDown className="h-4 w-4" /> A Pagar
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              className="w-full"
              value={newConta.nome || ''}
              onChange={(e) => setNewConta({ ...newConta, nome: e.target.value })}
              placeholder="Ex: Conta de luz, Aluguel..."
            />
          </div>

          <div className="space-y-2">
            <Label>Valor</Label>
            <CurrencyInput
              value={newConta.valor || 0}
              onChange={(value) => setNewConta({ ...newConta, valor: value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={newConta.categoria || ''}
              onValueChange={(value) => setNewConta({ ...newConta, categoria: value })}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de Vencimento</Label>
            <DatePickerFriendly
              value={newConta.dataVencimento ? parseISO(newConta.dataVencimento) : undefined}
              onChange={(date) => {
                if (date) setNewConta({ ...newConta, dataVencimento: format(date, 'yyyy-MM-dd') });
              }}
            />
          </div>

          {newConta.tipo === 'pagar' && (
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={newConta.formaPagamento || 'boleto'}
                onValueChange={(value) => setNewConta({ ...newConta, formaPagamento: value as PaymentMethod })}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de Cobrança</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant={tipoCobranca === 'unica' ? 'default' : 'outline'} size="sm" onClick={() => setTipoCobranca('unica')} disabled={!!editingConta}>Única</Button>
              <Button variant={tipoCobranca === 'parcelada' ? 'default' : 'outline'} size="sm" onClick={() => setTipoCobranca('parcelada')} disabled={!!editingConta}>Parcelada</Button>
              <Button variant={tipoCobranca === 'recorrente' ? 'default' : 'outline'} size="sm" onClick={() => setTipoCobranca('recorrente')} disabled={!!editingConta}>Recorrente</Button>
            </div>

            {tipoCobranca === 'recorrente' && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Dia da recorrência</Label>
                    <Select value={diaRecorrencia.toString()} onValueChange={(v) => setDiaRecorrencia(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Data de fim</Label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={semDataFim} onChange={(e) => setSemDataFim(e.target.checked)} className="rounded border-muted-foreground h-3 w-3" />
                        Sem fim
                      </label>
                    </div>
                    {!semDataFim && (
                      <DatePickerFriendly
                        value={dataFimRecorrencia ? parseISO(dataFimRecorrencia) : undefined}
                        onChange={(date) => { if (date) setDataFimRecorrencia(format(date, 'yyyy-MM-dd')); }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {tipoCobranca === 'parcelada' && !editingConta && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border mt-2">
                <div className="flex items-center gap-3">
                  <Label className="shrink-0">Número de parcelas:</Label>
                  <Select value={numParcelas.toString()} onValueChange={(v) => setNumParcelas(parseInt(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 24 }, (_, i) => i + 2).map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">{editingConta ? 'Salvar' : 'Adicionar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContaFormDialog;
