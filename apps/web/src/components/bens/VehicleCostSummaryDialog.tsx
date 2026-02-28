import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssetLinkedExpense, PaymentMethod } from '@/types/financial';
import { 
  Car, 
  Shield, 
  Fuel, 
  Wrench, 
  ParkingCircle, 
  CreditCard, 
  Receipt, 
  FileText,
  CircleDollarSign,
  Wallet,
  Banknote,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const months = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' },
];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  auto_debit: 'Débito Automático',
  cash: 'Dinheiro em Espécie',
};

const paymentMethodIcons: Record<PaymentMethod, React.ReactNode> = {
  pix: <Wallet className="h-4 w-4" />,
  boleto: <Receipt className="h-4 w-4" />,
  credit_card: <CreditCard className="h-4 w-4" />,
  debit_card: <CreditCard className="h-4 w-4" />,
  auto_debit: <CreditCard className="h-4 w-4" />,
  cash: <Banknote className="h-4 w-4" />,
};

const expenseLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  ipva: { label: 'IPVA', icon: <Car className="h-4 w-4" /> },
  seguro_auto: { label: 'Seguro Auto', icon: <Shield className="h-4 w-4" /> },
  licenciamento: { label: 'Licenciamento/DPVAT', icon: <FileText className="h-4 w-4" /> },
  combustivel: { label: 'Combustível', icon: <Fuel className="h-4 w-4" /> },
  manutencao_veiculo: { label: 'Manutenção', icon: <Wrench className="h-4 w-4" /> },
  estacionamento: { label: 'Estacionamento', icon: <ParkingCircle className="h-4 w-4" /> },
  sem_parar: { label: 'Sem Parar / Pedágio', icon: <Receipt className="h-4 w-4" /> },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface VehicleCostSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleName: string;
  linkedExpenses: AssetLinkedExpense[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const VehicleCostSummaryDialog: React.FC<VehicleCostSummaryDialogProps> = ({
  open,
  onOpenChange,
  vehicleName,
  linkedExpenses,
  onConfirm,
  onCancel,
}) => {
  // Group by annual vs monthly
  const annualExpenses = linkedExpenses.filter(e => e.frequency === 'annual');
  const monthlyExpenses = linkedExpenses.filter(e => e.frequency === 'monthly');

  // Calculate totals
  const totalMonthly = linkedExpenses.reduce((sum, e) => {
    if (e.frequency === 'monthly') {
      return sum + e.monthlyValue;
    } else {
      // Annual distributed monthly
      return sum + (e.monthlyValue / 12);
    }
  }, 0);

  const totalAnnual = totalMonthly * 12;

  // Count of contas a pagar that will be generated
  const contasCount = linkedExpenses.reduce((count, e) => {
    if (e.frequency === 'monthly') {
      return count + 12; // Monthly = 12 entries/year
    } else {
      return count + (e.annualMonths?.length || 1);
    }
  }, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-income" />
            Confirmar Configurações
          </AlertDialogTitle>
          <AlertDialogDescription>
            Revise o resumo dos custos configurados para <strong>{vehicleName}</strong> antes de salvar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[50vh] pr-2">
          <div className="space-y-4">
            {/* Annual Costs Summary */}
            {annualExpenses.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Custos Anuais/Parcelados
                </h4>
                <div className="space-y-2">
                  {annualExpenses.map((expense, idx) => {
                    const info = expenseLabels[expense.expenseType];
                    const monthLabels = expense.annualMonths
                      ?.map(m => months.find(mo => mo.value === m)?.label)
                      .join(', ') || '';
                    const totalValue = expense.monthlyValue * (expense.annualMonths?.length || 1);
                    const isInstallments = (expense.annualMonths?.length || 1) > 1;

                    return (
                      <div key={idx} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded bg-primary/10 text-primary">
                              {info?.icon}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{info?.label}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {paymentMethodIcons[expense.paymentMethod || 'boleto']}
                                <span>{paymentMethodLabels[expense.paymentMethod || 'boleto']}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-expense">
                              {formatCurrency(totalValue)}
                            </p>
                            {isInstallments ? (
                              <p className="text-xs text-muted-foreground">
                                {expense.annualMonths?.length}x de {formatCurrency(expense.monthlyValue)}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">à vista</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {expense.annualMonths?.map(m => (
                            <Badge key={m} variant="secondary" className="text-xs">
                              {months.find(mo => mo.value === m)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly Costs Summary */}
            {monthlyExpenses.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  Custos Mensais Recorrentes
                </h4>
                <div className="space-y-2">
                  {monthlyExpenses.map((expense, idx) => {
                    const info = expenseLabels[expense.expenseType];

                    return (
                      <div key={idx} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded bg-primary/10 text-primary">
                              {info?.icon}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{info?.label}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {paymentMethodIcons[expense.paymentMethod || 'boleto']}
                                <span>{paymentMethodLabels[expense.paymentMethod || 'boleto']}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-expense">
                              {formatCurrency(expense.monthlyValue)}/mês
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(expense.monthlyValue * 12)}/ano
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Totals */}
            <div className="p-4 rounded-lg bg-expense/10 border border-expense/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Total Estimado</p>
                  <p className="text-xs text-muted-foreground">
                    {linkedExpenses.length} tipos de custo configurados
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-expense">{formatCurrency(totalMonthly)}/mês</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(totalAnnual)}/ano</p>
                </div>
              </div>
            </div>

            {/* Contas a pagar info */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <Receipt className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Vinculação ao Fluxo Financeiro</p>
                  <p className="text-xs text-muted-foreground">
                    Ao confirmar, serão geradas <strong>{contasCount} contas a pagar</strong> no seu 
                    fluxo financeiro para o próximo ano, de acordo com as configurações acima.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onCancel}>
            Voltar e Ajustar
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-income hover:bg-income/90">
            Confirmar e Salvar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
