import { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

const AlocacaoPage = lazy(() => import('./index'));

export function AlocacaoRoute() {
  const featAlocacao = useFeatureFlag('feat_asset_allocation');

  if (!featAlocacao) {
    return <Navigate to="/inicio" replace />;
  }

  return (
    <Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}>
      <AlocacaoPage />
    </Suspense>
  );
}
