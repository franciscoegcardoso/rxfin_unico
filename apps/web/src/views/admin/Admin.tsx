import { Navigate, useLocation } from 'react-router-dom';

export default function Admin() {
  const location = useLocation();

  // Backward compat: redirect ?tab= query params to new routes
  const params = new URLSearchParams(location.search);
  const tabParam = params.get('tab');
  const subtabParam = params.get('subtab');

  if (tabParam) {
    const tabRouteMap: Record<string, string> = {
      usuarios: '/admin/usuarios',
      planos: '/admin/planos',
      paginas: '/admin/paginas',
      simuladores: '/admin/paginas',
      emails: '/admin/emails',
      legal: '/admin/termos',
      notificacoes: '/admin/notificacoes',
      deploy: '/admin/deploy',
      rollbacks: '/admin/rollbacks',
      health: '/admin/database-health',
    };
    const target = tabRouteMap[tabParam] || '/admin/usuarios';
    const suffix = tabParam === 'usuarios' && subtabParam ? `?subtab=${subtabParam}` : '';
    return <Navigate to={`${target}${suffix}`} replace />;
  }

  return <Navigate to="/admin/dashboard" replace />;
}
