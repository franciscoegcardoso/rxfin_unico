import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, LayoutDashboard, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  variant: 'income' | 'expense' | 'neutral';
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, description, onClick, variant }) => {
  const variants = {
    income: 'bg-gradient-to-br from-income/20 to-income/5 border-income/30 hover:border-income/50 hover:shadow-income/20',
    expense: 'bg-gradient-to-br from-expense/20 to-expense/5 border-expense/30 hover:border-expense/50 hover:shadow-expense/20',
    neutral: 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:border-primary/50 hover:shadow-primary/20',
  };

  const iconColors = {
    income: 'text-income',
    expense: 'text-expense',
    neutral: 'text-primary',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-6 rounded-2xl border-2 transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
        "flex flex-col items-center gap-3 text-center",
        variants[variant]
      )}
    >
      <div className={cn(
        "p-4 rounded-full bg-background/80 shadow-sm",
        iconColors[variant]
      )}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-lg">{label}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </button>
  );
};

export const MobileHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <header className="pt-12 pb-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Meu Raio-X Financeiro
        </h1>
        <p className="text-muted-foreground mt-2">
          O que deseja fazer hoje?
        </p>
      </header>

      {/* Quick Actions */}
      <main className="flex-1 px-6 pb-8 flex flex-col gap-4">
        <QuickAction
          icon={<Wallet className="h-8 w-8" />}
          label="Lançamentos"
          description="Registrar entradas e saídas"
          onClick={() => navigate('/movimentacoes')}
          variant="income"
        />

        <QuickAction
          icon={<LayoutDashboard className="h-8 w-8" />}
          label="Dashboard"
          description="Visualizar resumo financeiro"
          onClick={() => navigate('/inicio')}
          variant="neutral"
        />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground">
        <p>RXFin - Meu Raio-X Financeiro</p>
      </footer>
    </div>
  );
};
