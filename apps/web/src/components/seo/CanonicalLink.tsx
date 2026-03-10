import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Base URL para as tags canônicas (SEO).
 * App = app.rxfin.com.br | Landing = rxfin.com.br — cada um no seu subdomínio para não disputar canonical.
 * Defina VITE_CANONICAL_BASE no .env do app (ex: https://app.rxfin.com.br).
 */
const CANONICAL_BASE =
  (import.meta.env.VITE_CANONICAL_BASE as string) ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://app.rxfin.com.br');

function normalizePath(pathname: string): string {
  const p = pathname || '/';
  return p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p || '/';
}

/**
 * Atualiza a tag <link rel="canonical"> no <head> com a URL canônica da rota atual.
 * Evita "Cópia sem página canônica" no Google Search Console.
 * Deve ser renderizado dentro de BrowserRouter.
 */
export function CanonicalLink() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = normalizePath(pathname);
    const canonicalUrl = `${CANONICAL_BASE.replace(/\/$/, '')}${path}`;

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);
    return () => {
      // Não removemos a tag ao desmontar; o próximo efeito (nova rota) atualiza href
    };
  }, [pathname]);

  return null;
}
