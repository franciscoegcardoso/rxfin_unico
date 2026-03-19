import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeShortcuts } from '@/hooks/useHomeShortcuts';
import { EditShortcutsDialog } from '@/components/inicio/EditShortcutsDialog';
import { Pencil } from 'lucide-react';
import { useRealtimeBalance, getTotalCheckingBalance } from '@/hooks/useRealtimeBalance';

interface MobileHomeHeroProps {
  firstName: string;
}

export const MobileHomeHero: React.FC<MobileHomeHeroProps> = ({ firstName }) => {
  const navigate = useNavigate();
  const { isHidden } = useVisibility();
  const { user } = useAuth();
  const { data: balanceData, isLoading: balanceLoading } = useRealtimeBalance();
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768;
  const { shortcuts } = useHomeShortcuts(isTablet ? 5 : 4);
  const [editOpen, setEditOpen] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const totalContas = getTotalCheckingBalance(balanceData);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <>
      <div className="mobile-hero-bg text-primary-foreground -mx-4 -mt-4 px-5 pt-6 pb-8 rounded-b-3xl">
        {/* Top row: avatar + visibility toggle */}
        <div className="flex items-center justify-between mb-4">
          <Avatar className="h-12 w-12 border-2 border-primary-foreground/30">
            <AvatarImage src={avatarUrl} alt={firstName} />
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-semibold">
              {getInitials(firstName || 'U')}
            </AvatarFallback>
          </Avatar>
          <VisibilityToggle className="text-primary-foreground/80 hover:text-primary-foreground" />
        </div>

        {/* Greeting + value */}
        <div className="mb-6">
          <h1 className="text-lg font-medium text-primary-foreground">Olá, {firstName || 'Usuário'} 👋</h1>
          <p className="text-xs text-primary-foreground/70 mt-0.5">Saldo em contas</p>
          <p className="font-numeric font-bold tracking-[-0.02em] leading-none tabular-nums text-2xl sm:text-[32px] mt-1 text-primary-foreground">
            {balanceLoading && !balanceData ? '—' : formatCurrency(totalContas)}
          </p>
        </div>

        {/* Quick actions */}
        <div className="relative">
          <div className={`grid gap-3 ${isTablet ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {shortcuts.map((action) => (
              <button
                key={action.slug}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-1.5 group text-primary-foreground"
              >
                <div className="h-11 w-11 rounded-full bg-primary-foreground/15 flex items-center justify-center group-active:bg-primary-foreground/25 transition-colors text-primary-foreground">
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-primary-foreground/90 leading-tight text-center">
                  {action.label}
                </span>
              </button>
            ))}
          </div>

          {/* Edit button */}
          <button
            onClick={() => setEditOpen(true)}
            className="absolute -bottom-5 right-0 h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center active:bg-primary-foreground/30 transition-colors text-primary-foreground"
            aria-label="Editar atalhos"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>

      <EditShortcutsDialog open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
};
