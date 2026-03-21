import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';

function getSessionId(): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  let id = sessionStorage.getItem('rxfin_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('rxfin_session_id', id);
  }
  return id;
}

type ShareRow = {
  id: string;
  simulator_slug: string;
  title: string | null;
  expires_at: string | null;
  views: number;
};

export default function CompartilharSimulacao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ShareRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        const { data: share, error } = await supabase
          .from('simulation_shares')
          .select('id, simulator_slug, title, expires_at, views')
          .eq('id', id)
          .maybeSingle();

        if (cancelled) return;
        if (error || !share) {
          setLoading(false);
          return;
        }

        if (share.expires_at && new Date(share.expires_at) < new Date()) {
          setExpired(true);
        } else {
          setData(share as ShareRow);
          const nextViews = (share.views ?? 0) + 1;
          await supabase.from('simulation_shares').update({ views: nextViews }).eq('id', id);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }

      const sid = getSessionId();
      try {
        await supabase.rpc('track_route_event', {
          p_event_type: 'page_view',
          p_event_name: 'share_page_viewed',
          p_metadata: { share_id: id },
          p_session_id: sid,
        });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCTA = () => {
    try {
      void supabase.rpc('track_route_event', {
        p_event_type: 'conversion',
        p_event_name: 'share_signup_cta_click',
        p_metadata: { share_id: id },
      });
    } catch {
      /* ignore */
    }
    navigate('/signup');
  };

  const ogTitle = data
    ? `Simulação de ${data.simulator_slug} - RXFin`
    : 'RXFin — Finanças inteligentes';

  return (
    <>
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta
          property="og:description"
          content="Veja esta simulação e crie sua conta grátis no RXFin."
        />
        <meta property="og:image" content="https://rxfin.com.br/og-image.png" />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'var(--background)', color: 'var(--foreground)' }}
      >
        <header className="border-b p-4">
          <span className="font-bold text-lg" style={{ color: 'var(--primary)' }}>
            RXFin
          </span>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          {loading ? (
            <div className="animate-pulse space-y-3 w-full max-w-md">
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded" />
            </div>
          ) : expired || !data ? (
            <div className="text-center space-y-4 max-w-md">
              <p className="text-lg font-medium">Esta simulação não está mais disponível.</p>
              <button
                type="button"
                onClick={handleCTA}
                className="px-6 py-3 rounded-lg font-medium"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Criar minha conta grátis
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6 max-w-md w-full">
              <h1 className="text-2xl font-bold">
                {data.title ?? `Simulação: ${data.simulator_slug}`}
              </h1>
              <p style={{ color: 'var(--muted-foreground)' }}>
                Crie sua conta para ver todos os detalhes e fazer suas próprias simulações.
              </p>
              <button
                type="button"
                onClick={handleCTA}
                className="w-full px-6 py-3 rounded-lg font-medium"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Criar minha conta grátis
              </button>
            </div>
          )}
        </main>
        <footer
          className="border-t p-4 flex justify-center gap-6 text-sm"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <button type="button" onClick={() => navigate('/login')}>
            Entrar
          </button>
          <button type="button" onClick={() => navigate('/signup')}>
            Cadastrar
          </button>
        </footer>
      </div>
    </>
  );
}
