import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FGTSNewAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    name: string;
    employer_name: string;
    employer_cnpj?: string;
    admission_date: string;
    salary: number;
    modalidade: 'clt' | 'doméstico' | 'rural';
    initial_balance: number;
    initial_balance_month: string;
  }) => Promise<unknown>;
  isLoading?: boolean;
}

const modalidades = [
  { value: 'clt' as const, label: 'CLT' },
  { value: 'doméstico' as const, label: 'Doméstico' },
  { value: 'rural' as const, label: 'Rural' },
];

export function FGTSNewAccountModal({
  open,
  onOpenChange,
  onSave,
  isLoading,
}: FGTSNewAccountModalProps) {
  const [name, setName] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [employerCnpj, setEmployerCnpj] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [salary, setSalary] = useState('');
  const [modalidade, setModalidade] = useState<'clt' | 'doméstico' | 'rural'>('clt');
  const [initialBalance, setInitialBalance] = useState('');
  const [initialMonth, setInitialMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const reset = () => {
    setName('');
    setEmployerName('');
    setEmployerCnpj('');
    setAdmissionDate('');
    setSalary('');
    setModalidade('clt');
    setInitialBalance('');
    const d = new Date();
    setInitialMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim() || employerName.trim() || 'FGTS',
      employer_name: employerName.trim(),
      employer_cnpj: employerCnpj.trim() || undefined,
      admission_date: admissionDate,
      salary: parseFloat(salary) || 0,
      modalidade,
      initial_balance: parseFloat(initialBalance) || 0,
      initial_balance_month: initialMonth,
    });
    reset();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conta FGTS</DialogTitle>
          <DialogDescription>
            Cadastre uma conta FGTS vinculada a um empregador. O depósito mensal (8% do salário) pode ser preenchido automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fgts-name">Nome/apelido da conta</Label>
            <Input
              id="fgts-name"
              placeholder="Ex: FGTS - Empresa XYZ"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-employer">Nome do empregador</Label>
            <Input
              id="fgts-employer"
              value={employerName}
              onChange={e => setEmployerName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-cnpj">CNPJ do empregador (opcional)</Label>
            <Input
              id="fgts-cnpj"
              placeholder="00.000.000/0001-00"
              value={employerCnpj}
              onChange={e => setEmployerCnpj(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-admission">Data de admissão</Label>
            <Input
              id="fgts-admission"
              type="date"
              value={admissionDate}
              onChange={e => setAdmissionDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-salary">Salário bruto (R$)</Label>
            <Input
              id="fgts-salary"
              type="number"
              step="0.01"
              min="0"
              value={salary}
              onChange={e => setSalary(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Para cálculo do depósito mensal (8%).</p>
          </div>
          <div className="space-y-2">
            <Label>Modalidade</Label>
            <Select value={modalidade} onValueChange={v => setModalidade(v as 'clt' | 'doméstico' | 'rural')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modalidades.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-initial">Saldo inicial (R$)</Label>
            <Input
              id="fgts-initial"
              type="number"
              step="0.01"
              min="0"
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fgts-initial-month">Mês de referência do saldo inicial</Label>
            <Input
              id="fgts-initial-month"
              type="month"
              value={initialMonth}
              onChange={e => setInitialMonth(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando…' : 'Criar conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
