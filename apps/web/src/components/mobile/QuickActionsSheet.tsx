import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingDown, 
  TrendingUp, 
  Car,
  Scissors,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface QuickActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
  variant: 'expense' | 'income' | 'neutral';
}

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const actions: QuickAction[] = [
    {
      icon: TrendingDown,
      label: 'Lançar Despesa',
      description: 'Registrar uma saída de dinheiro',
      onClick: () => handleAction('/lancamentos?action=despesa&tipo=despesa'),
      variant: 'expense',
    },
    {
      icon: TrendingUp,
      label: 'Lançar Receita',
      description: 'Registrar uma entrada de dinheiro',
      onClick: () => handleAction('/lancamentos?action=receita&tipo=receita'),
      variant: 'income',
    },
    {
      icon: Scissors,
      label: 'Dividir Conta',
      description: 'Dividir conta de restaurante',
      onClick: () => handleAction('/dividir-conta'),
      variant: 'neutral',
    },
    {
      icon: Users,
      label: 'RX Split',
      description: 'Despesas compartilhadas',
      onClick: () => handleAction('/rx-split'),
      variant: 'neutral',
    },
    {
      icon: Car,
      label: 'Despesa de Veículo',
      description: 'Combustível, manutenção, etc.',
      onClick: () => handleAction('/gestao-veiculos?action=novo-registro'),
      variant: 'neutral',
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-safe">
        <DrawerHeader className="relative">
          <DrawerTitle className="text-center">Ação Rápida</DrawerTitle>
          <DrawerClose asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-2 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        
        <div className="px-4 pb-6 grid grid-cols-3 sm:grid-cols-5 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95",
                action.variant === 'expense' && "bg-expense/5 border-expense/20 hover:bg-expense/10",
                action.variant === 'income' && "bg-income/5 border-income/20 hover:bg-income/10",
                action.variant === 'neutral' && "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full mb-1.5",
                action.variant === 'expense' && "bg-expense/10 text-expense",
                action.variant === 'income' && "bg-income/10 text-income",
                action.variant === 'neutral' && "bg-muted text-muted-foreground"
              )}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-xs font-medium text-center leading-tight",
                action.variant === 'expense' && "text-expense",
                action.variant === 'income' && "text-income",
                action.variant === 'neutral' && "text-foreground"
              )}>
                {action.label}
              </span>
              <span className="text-[9px] text-muted-foreground text-center mt-0.5 leading-tight line-clamp-2">
                {action.description}
              </span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
