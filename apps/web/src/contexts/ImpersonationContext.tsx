import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/contexts/AuthContext';

// Allow any string role slug from database
type SubscriptionRole = string | null;

interface ImpersonationContextType {
  impersonatedRole: SubscriptionRole;
  isImpersonating: boolean;
  setImpersonatedRole: (role: SubscriptionRole) => void;
  clearImpersonation: () => void;
  canImpersonate: boolean;
}

export const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'rxfin_impersonated_role';

export const ImpersonationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading } = useIsAdmin();
  const [impersonatedRole, setImpersonatedRoleState] = useState<SubscriptionRole>(null);

  // Load from sessionStorage on mount (only for admins)
  useEffect(() => {
    // IMPORTANTE: no reload, o AuthContext pode começar com user=null enquanto ainda está carregando.
    // Se limparmos aqui, perdemos o persona antes de saber se o usuário é admin.
    if (authLoading) return;

    // Se não há usuário (logout real), aí sim limpamos.
    if (!user) {
      sessionStorage.removeItem(STORAGE_KEY);
      setImpersonatedRoleState(null);
      return;
    }

    // CORREÇÃO: Aguardar carregamento do status de admin antes de executar lógica
    if (isLoading) return;
    
    if (isAdmin) {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setImpersonatedRoleState(stored);
      }
    } else {
      // Clear impersonation if user is not admin
      sessionStorage.removeItem(STORAGE_KEY);
      setImpersonatedRoleState(null);
    }
  }, [authLoading, user, isAdmin, isLoading]);

  const setImpersonatedRole = (role: SubscriptionRole) => {
    if (!isAdmin) return;
    
    const currentRole = sessionStorage.getItem(STORAGE_KEY);
    const isChanging = currentRole !== role;
    
    if (role) {
      sessionStorage.setItem(STORAGE_KEY, role);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setImpersonatedRoleState(role);
    
    // Reload page to ensure all components reflect the new role
    if (isChanging) {
      window.location.reload();
    }
  };

  const clearImpersonation = () => {
    const wasImpersonating = sessionStorage.getItem(STORAGE_KEY) !== null;
    sessionStorage.removeItem(STORAGE_KEY);
    setImpersonatedRoleState(null);
    
    // Reload page to restore original view
    if (wasImpersonating) {
      window.location.reload();
    }
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedRole,
        isImpersonating: !!impersonatedRole,
        setImpersonatedRole,
        clearImpersonation,
        canImpersonate: isAdmin,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};

// Hook to get the effective subscription role (real or impersonated)
export const useEffectiveRole = (realRole: string): string => {
  const { impersonatedRole, isImpersonating } = useImpersonation();
  
  if (isImpersonating && impersonatedRole) {
    return impersonatedRole;
  }
  
  return realRole;
};
