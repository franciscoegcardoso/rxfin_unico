import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';

const BENEFITS = [
  { icon: '📊', text: 'Controle total das suas finanças em um só lugar' },
  { icon: '✨', text: 'IA Cibélia: sua consultora financeira pessoal' },
  { icon: '🚗', text: 'Simuladores FIPE e comparadores de veículos' },
  { icon: '📄', text: 'Planejamento de IR integrado e simplificado' },
];

export default function Convite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [referrer, setReferrer] = useState<{ full_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('referral_codes')
          .select('full_name, code, uses')
          .eq('code', code)
          .eq('is_active', true)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setReferrer(null);
          setLoading(false);
          return;
        }

        setReferrer({ full_name: data.full_name ?? null });
        const nextUses = (data.uses ?? 0) + 1;
        await supabase.from('referral_codes').update({ uses: nextUses }).eq('code', code);
      } catch {
        if (!cancelled) setReferrer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        await supabase.rpc('track_route_event', {
          p_event_type: 'page_view',
          p_event_name: 'invite_page_viewed',
          p_metadata: { referral_code: code },
        });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleCTA = () => {
    try {
      void supabase.rpc('track_route_event', {
        p_event_type: 'conversion',
        p_event_name: 'invite_signup_cta_click',
        p_metadata: { referral_code: code },
      });
    } catch {
      /* ignore */
    }
    navigate(`/signup?convite=${encodeURIComponent(code ?? '')}`);
  };

  const ogTitle = referrer?.full_name
    ? `${referrer.full_name} te convidou para o RXFin`
    : 'Você foi convidado para o RXFin';

  return (
    <>
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta
          property="og:description"
          content="Controle total das suas finanças com IA. Acesse gratuitamente."
        />
        <meta property="og:image" content="https://rxfin.com.br/og-image.png" />
        <meta
          property="og:url"
          content={typeof window !== 'undefined' ? window.location.href : ''}
        />
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
        <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-8">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-8 bg-muted rounded w-3/4" />
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">
                  {referrer?.full_name
                    ? `${referrer.full_name} te convidou para o RXFin 🎉`
                    : 'Um amigo te convidou para o RXFin'}
                </h1>
                <p style={{ color: 'var(--muted-foreground)' }}>
                  Junte-se a quem já cuida melhor do dinheiro.
                </p>
              </div>
              <div className="space-y-3">
                {BENEFITS.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <span className="text-2xl">{b.icon}</span>
                    <span className="text-sm">{b.text}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCTA}
                className="w-full px-6 py-4 rounded-lg font-semibold text-base"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Aceitar convite e criar conta
              </button>
            </>
          )}
        </main>
        <footer
          className="border-t p-4 flex justify-center text-sm"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <button type="button" onClick={() => navigate('/login')}>
            Já tenho conta
          </button>
        </footer>
      </div>
    </>
  );
}
