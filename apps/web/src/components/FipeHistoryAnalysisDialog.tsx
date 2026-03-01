import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, LineChart, BarChart3 } from 'lucide-react';
import { SuspenseTimeSeriesChart, SuspenseCohortMatrix } from '@/components/simuladores/LazyChartComponents';

import type { ParsedHistoryPoint } from '@/hooks/useFipeFullHistory';
import type { CohortAnalysisData } from '@/utils/depreciationRegression';
import type { DepreciationEngineResult, ConsideredModelInfo } from '@/utils/depreciationCoreEngine';

interface FipeHistoryAnalysisDialogProps {
  // For chart
  priceHistory: ParsedHistoryPoint[];
  currentPrice: number;
  modelName: string;
  modelYear: number;
  loading: boolean;
  progress: { current: number; total: number } | null;
  cohortData: CohortAnalysisData | null;
  engineV2Result: DepreciationEngineResult | null;
  consideredModels?: ConsideredModelInfo[];
  familyName?: string | null;
  // For cohort matrix
  fipeCode: string;
  // State
  hasHistory: boolean;
}

export const FipeHistoryAnalysisDialog: React.FC<FipeHistoryAnalysisDialogProps> = ({
  priceHistory,
  currentPrice,
  modelName,
  modelYear,
  loading,
  progress,
  cohortData,
  engineV2Result,
  consideredModels,
  familyName,
  fipeCode,
  hasHistory,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={!hasHistory && !loading}
        >
          <LineChart className="h-4 w-4" />
          <span>Análise Histórica</span>
          {engineV2Result && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              {(engineV2Result.metadata.annualRatePhaseA * 100).toFixed(1)}%/ano
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Análise do Histórico FIPE
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Time Series Depreciation Chart */}
          {(hasHistory || loading) && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                Histórico FIPE
              </h3>
              <SuspenseTimeSeriesChart
                priceHistory={priceHistory}
                currentPrice={currentPrice}
                modelName={modelName}
                modelYear={modelYear}
                loading={loading}
                progress={progress}
                cohortData={cohortData}
                engineV2Result={engineV2Result}
                consideredModels={consideredModels}
                familyName={familyName}
              />
            </div>
          )}

          {/* Cohort Matrix */}
          {fipeCode && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Análise de Safra (Depreciação por Ano Calendário)
              </h3>
              <SuspenseCohortMatrix
                fipeCode={fipeCode}
                modelName={modelName}
              />
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
