import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionPermissions } from '@/hooks/useSubscriptionPermissions';
import { usePageAvailability } from '@/hooks/useNavMenuPages';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import ComingSoon from '@/pages/ComingSoon';

// Map routes to human-readable feature names
const ROUTE_FEATURE_NAMES: Record<string, string> = {
  '/lancamentos': 'Lançamentos',
  '/gestao-veiculos': 'Gestão de Veículos',
  '/seguros': 'Seguros',
  '/planejamento': 'Planejamento Mensal',
  '/planejamento-anual': 'Projeção 30 Anos',
  '/pacotes-orcamento': 'Pacotes de Orçamento',
  '/registro-compras': 'Registro de Compras',
  '/presentes': 'Presentes',
  '/dashboard': 'Início',
  '/sonhos': 'Sonhos',
  '/metas-mensais': 'Metas Mensais',
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasRoutePermission, loading: permissionsLoading, isAdmin, isImpersonating } = useSubscriptionPermissions();
  const location = useLocation();
  const { isAvailable, isLoading: availabilityLoading, pageName, canAdminBypass } = usePageAvailability(location.pathname);

  // Wait for auth, permissions, and availability to load
  if (authLoading || permissionsLoading || availabilityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RXFinLoadingSpinner size={56} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin has access to everything — real admin or impersonating as admin
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if page is available (is_active_users = true)
  // If page is disabled, show "Coming Soon" regardless of plan
  if (!isAvailable) {
    const featureName = pageName || ROUTE_FEATURE_NAMES[location.pathname];
    return <ComingSoon featureName={featureName} />;
  }

  // Check if user has permission for this route (based on plan hierarchy)
  if (!hasRoutePermission(location.pathname)) {
    const featureName = pageName || ROUTE_FEATURE_NAMES[location.pathname];
    return <ComingSoon featureName={featureName} />;
  }

  return <>{children}</>;
};
