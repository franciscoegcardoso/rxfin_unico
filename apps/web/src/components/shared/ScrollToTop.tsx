import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolla o viewport para o topo ao mudar de rota.
 * Deve ser usado dentro de BrowserRouter.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
