import React, { Suspense, lazy, ComponentType } from 'react';
import { DepreciationChartSkeleton } from './FipeSimulatorSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// ============================================================================
// LAZY LOADED CHART COMPONENTS
// These heavy visualization components are loaded on-demand to improve
// initial page load performance. Uses React.lazy() with Suspense fallbacks.
// ============================================================================

/**
 * Lazy-loaded TimeSeriesDepreciationChart
 * - Heavy component with Recharts visualizations
 * - Contains complex projection calculations
 * - Only loaded when depreciation data is available
 */
export const LazyTimeSeriesDepreciationChart = lazy(() => 
  import('./TimeSeriesDepreciationChart').then(module => ({
    default: module.TimeSeriesDepreciationChart
  }))
);

/**
 * Lazy-loaded DepreciationCohortMatrix
 * - Heavy heatmap visualization component
 * - Complex color calculations and cell rendering
 * - Only loaded when cohort matrix data is fetched
 */
export const LazyDepreciationCohortMatrix = lazy(() => 
  import('./DepreciationCohortMatrix').then(module => ({
    default: module.DepreciationCohortMatrix
  }))
);

// ============================================================================
// SKELETON FALLBACKS
// Custom loading states that match the expected layout of each component
// ============================================================================

/**
 * Skeleton for the Cohort Matrix while loading
 */
export const CohortMatrixSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Legend skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      {/* Matrix grid skeleton */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid gap-px bg-muted/30" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
          {Array.from({ length: 48 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-10 rounded-none" 
              style={{ animationDelay: `${(i % 8) * 50}ms` }}
            />
          ))}
        </div>
      </div>
      
      {/* Color scale skeleton */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>
    </CardContent>
  </Card>
);

// ============================================================================
// WRAPPER COMPONENTS WITH SUSPENSE
// Pre-configured wrappers that handle loading states automatically
// ============================================================================

type TimeSeriesChartProps = React.ComponentProps<typeof LazyTimeSeriesDepreciationChart extends React.LazyExoticComponent<infer T> ? T : never>;
type CohortMatrixProps = React.ComponentProps<typeof LazyDepreciationCohortMatrix extends React.LazyExoticComponent<infer T> ? T : never>;

/**
 * TimeSeriesDepreciationChart with built-in Suspense
 * Drop-in replacement for direct TimeSeriesDepreciationChart usage
 */
export const SuspenseTimeSeriesChart: React.FC<TimeSeriesChartProps> = (props) => (
  <Suspense fallback={<DepreciationChartSkeleton />}>
    <LazyTimeSeriesDepreciationChart {...props} />
  </Suspense>
);

/**
 * DepreciationCohortMatrix with built-in Suspense
 * Drop-in replacement for direct DepreciationCohortMatrix usage
 */
export const SuspenseCohortMatrix: React.FC<CohortMatrixProps> = (props) => (
  <Suspense fallback={<CohortMatrixSkeleton />}>
    <LazyDepreciationCohortMatrix {...props} />
  </Suspense>
);
