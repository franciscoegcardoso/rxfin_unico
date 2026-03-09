import React, { useMemo } from 'react';
import { ArrowRight, Wallet, TrendingUp, TrendingDown, Copy } from 'lucide-react';
import { RXSplitAvatar } from './RXSplitAvatar';
import { Button } from '@/components/ui/button';
import { useRXSplitContacts, useRXSplitExpenses } from '@/hooks/useRXSplit';
import { toast } from 'sonner';
import type { RXSplitPayment } from '@/core/types/rxsplit';

export const BalanceTab: React.FC = () => {
  const { data: contacts = [] } = useRXSplitContacts();
  const { data: expenses = [] } = useRXSplitExpenses();

  const { balances, payments, stats } = useMemo(() => {
    if (contacts.length === 0) return { balances: {} as Record<string, number>, payments: [] as RXSplitPayment[], stats: { totalSpent: 0 } };

    const balanceMap: Record<string, number> = {};
    let totalSpent = 0;

    contacts.forEach(c => (balanceMap[c.id] = 0));

    expenses.forEach(exp => {
      totalSpent += exp.amount;
      if (balanceMap[exp.payer_contact_id] !== undefined) {
        balanceMap[exp.payer_contact_id] += exp.amount;
      }
      // For simplicity, equal split among all contacts
      const perPerson = exp.amount / contacts.length;
      contacts.forEach(c => {
        balanceMap[c.id] = (balanceMap[c.id] || 0) - perPerson;
      });
    });

    // Calculate suggested payments
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    Object.entries(balanceMap).forEach(([id, val]) => {
      if (val < -0.01) debtors.push({ id, amount: val });
      if (val > 0.01) creditors.push({ id, amount: val });
    });

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const suggestedPayments: RXSplitPayment[] = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

      suggestedPayments.push({
        from: debtor.id,
        to: creditor.id,
        amount,
        toPix: contacts.find(c => c.id === creditor.id)?.pix_key || undefined,
      });

      debtor.amount += amount;
      creditor.amount -= amount;
      if (Math.abs(debtor.amount) < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return { balances: balanceMap, payments: suggestedPayments, stats: { totalSpent } };
  }, [contacts, expenses]);

  const getContactName = (id: string) => contacts.find(c => c.id === id)?.name || 'Desconhecido';
  const getContactColor = (id: string) => contacts.find(c => c.id === id)?.avatar_color || 'bg-muted';

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const copyPix = (pix: string) => {
    navigator.clipboard.writeText(pix);
    toast.success('Chave Pix copiada!');
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-4 rounded-2xl">
          <p className="text-xs text-white mb-1">Total Gasto</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalSpent)}</p>
        </div>
        <div className="bg-muted p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground mb-1">Contatos</p>
          <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
        </div>
      </div>

      {/* Balances */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
          Saldos Individuais
        </h3>
        {contacts.map(c => {
          const bal = balances[c.id] || 0;
          return (
            <div key={c.id} className="bg-card p-4 rounded-xl border border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <RXSplitAvatar name={c.name} color={c.avatar_color} size="lg" />
                <span className="font-semibold text-foreground">{c.name}</span>
              </div>
              <div className={`text-lg font-bold ${bal > 0 ? 'text-income' : bal < 0 ? 'text-expense' : 'text-muted-foreground'}`}>
                {bal > 0 ? `+${formatCurrency(bal)}` : bal < 0 ? `-${formatCurrency(Math.abs(bal))}` : formatCurrency(0)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Payments */}
      {payments.length > 0 && (
        <div className="bg-accent/30 p-4 rounded-2xl border border-primary/20 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Acertos Sugeridos</h3>
          </div>
          {payments.map((p, i) => (
            <div key={i} className="bg-card p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-secondary-foreground">{getContactName(p.from)}</span>
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <span className="font-medium text-secondary-foreground">{getContactName(p.to)}</span>
                </div>
                <span className="font-bold text-primary text-lg">{formatCurrency(p.amount)}</span>
              </div>
              {p.toPix && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => copyPix(p.toPix!)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Pix
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {payments.length === 0 && expenses.length > 0 && (
        <div className="text-center py-8 bg-income/5 rounded-2xl border border-income/20">
          <Wallet className="w-8 h-8 mx-auto text-income mb-2" />
          <p className="text-income font-semibold">Tudo certo!</p>
          <p className="text-sm text-muted-foreground">Não há acertos pendentes.</p>
        </div>
      )}
    </div>
  );
};
