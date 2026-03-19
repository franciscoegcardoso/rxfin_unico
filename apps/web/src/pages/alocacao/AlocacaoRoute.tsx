import { Suspense, lazy } from 'react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

const AlocacaoPage = lazy(() => import('./index'));

/** Rota /bens-investimentos/investimentos/alocacao — já registrada em App.tsx. */
export function AlocacaoRoute() {
  return (
    <Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}>
      <AlocacaoPage />
    </Suspense>
  );
}
