import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { paymentMethods } from '@/data/defaultData';
import { useFinancial } from '@/contexts/FinancialContext';
import { TransactionInput } from '@/hooks/useBudgetPackages';

interface PackageTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: TransactionInput) => Promise<any>;
  packageId: string;
}

export const PackageTransactionDialog: React.FC<PackageTransactionDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  packageId,
}) => {
  const { config } = useFinancial();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [responsiblePersonId, setResponsiblePersonId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  const sharedPeople = (config as any).sharedPeople || [];
  const ownerName = (config.userProfile as any)?.name || 'Titular';
  const allPeople = [
    { id: 'owner', name: ownerName },
    ...sharedPeople.map((p: any) => ({ id: p.id, name: p.name })),
  ];
  const [loading, setLoading] = useState(false);


  const handleSave = async () => {
    if (!description.trim() || amount <= 0) return;

    const person = allPeople.find(p => p.id === responsiblePersonId);

    setLoading(true);
    const result = await onSave({
      package_id: packageId,
      transaction_type: type,
      description: description.trim(),
      amount,
      payment_method: type === 'expense' ? paymentMethod || null : null,
      responsible_person_id: responsiblePersonId || null,
      responsible_person_name: person?.name || null,
      transaction_date: transactionDate,
    });
    setLoading(false);

    if (result) {
      setDescription('');
      setAmount(0);
      setPaymentMethod('');
      setResponsiblePersonId('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lançamento no Pacote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                type === 'expense'
                  ? 'border-expense bg-expense/10 text-expense'
                  : 'border-border hover:border-expense/50'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              <span className="font-medium">Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                type === 'income'
                  ? 'border-income bg-income/10 text-income'
                  : 'border-border hover:border-income/50'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Receita</span>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Jantar, Passagem aérea..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor *</Label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {type === 'expense' && (
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {allPeople.length > 1 && (
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={responsiblePersonId} onValueChange={setResponsiblePersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {allPeople.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !description.trim() || amount <= 0}
              className="flex-1"
            >
              {loading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
