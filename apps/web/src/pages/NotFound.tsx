import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    supabase.rpc('track_route_event', {
      p_event_type: 'error',
      p_event_name: 'route_not_found',
      p_metadata: { path: window.location.pathname },
      p_session_id: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rxfin_session_id') ?? undefined : undefined,
    });
  }, []);

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    return () => meta?.remove();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <div className="w-full max-w-md text-center space-y-6">
        <h1
          className="text-7xl font-bold"
          style={{ color: 'var(--primary)' }}
        >
          404
        </h1>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
            Página não encontrada
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            A página que você procura não existe ou foi movida.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
          <button
            type="button"
            onClick={() => navigate('/inicio')}
            className="px-4 py-2 rounded-md font-medium text-primary-foreground"
            style={{ background: 'var(--primary)' }}
          >
            Voltar ao Início
          </button>
          {!user && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-md font-medium border border-border bg-background text-foreground hover:bg-muted/60 transition-colors"
            >
              Ir para o Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
