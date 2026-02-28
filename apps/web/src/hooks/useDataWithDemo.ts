import { useDemoMode } from './useDemoMode';

interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
}

interface DataWithDemoResult<T> {
  data: T;
  isLoading: boolean;
  isDemo: boolean;
}

/**
 * Higher-Order Hook: injects demo data when in demo mode,
 * avoiding `if (isDemoMode)` scattered across 50+ files.
 */
export function useDataWithDemo<T>(
  queryResult: QueryLike<T>,
  demoFallback: T
): DataWithDemoResult<T> {
  const { isDemoMode } = useDemoMode();

  if (isDemoMode) {
    return { data: demoFallback, isLoading: false, isDemo: true };
  }

  return {
    data: queryResult.data ?? demoFallback,
    isLoading: queryResult.isLoading,
    isDemo: false,
  };
}
