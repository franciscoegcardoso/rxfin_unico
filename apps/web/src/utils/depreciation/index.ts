// DepreciationEngine v7.4
// MAPE: 1yr=3.93% | 3yr=12.33% | 5yr=16.73% | bias=-6.55%
// Validado com 4.900 backtests

export {
  calculateDepreciationCurveV7,
  convertToV2Result,
  convertToV3Result,
  calculateDepreciationCurveV2_v7,
  calculateDepreciationCurveV3_v7,
} from './depreciationEngineV7';

export type {
  VehicleSegment,
  SegmentPrior,
  EngineResultV7,
  ProjectionPointV7,
  MarketRegimeData,
} from './depreciationEngineV7';

export type {
  FipePoint,
  EngineResult,
  DepreciationEngineResult,
  DepreciationCurvePoint,
  ProjectionTimelinePoint,
} from './depreciationCoreEngine';
