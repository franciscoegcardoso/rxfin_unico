import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  HelpCircle, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldQuestion,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ProjectionStrategy, CohortAnalysisData } from '@/utils/depreciationRegression';

interface ProjectionConfidenceIndicatorProps {
  strategy?: ProjectionStrategy;
  rSquared: number;
  dataPoints: number;
  monthsOfHistory: number;
  cohortData?: CohortAnalysisData | null;
  usedFallback?: boolean;
}

type ConfidenceLevel = 'high' | 'medium' | 'low';

interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number; // 0-100
  label: string;
  description: string;
}

function calculateConfidence(props: ProjectionConfidenceIndicatorProps): ConfidenceResult {
  const { strategy, rSquared, dataPoints, monthsOfHistory, cohortData, usedFallback } = props;
  
  let score = 0;
  const factors: string[] = [];
  
  // === Factor 1: Strategy (max 40 points) ===
  if (strategy === 'standard_regression' && !usedFallback) {
    score += 40;
    factors.push('Regressão própria');
  } else if (strategy === 'cohort_analysis') {
    const siblings = cohortData?.samplesUsed || 0;
    if (siblings >= 3) {
      score += 35;
      factors.push(`${siblings} modelos antigos`);
    } else if (siblings >= 2) {
      score += 28;
      factors.push(`${siblings} modelos antigos`);
    } else {
      score += 20;
      factors.push('1 modelo antigo');
    }
  } else if (strategy === 'category_fallback' || usedFallback) {
    score += 10;
    factors.push('Taxa genérica');
  }
  
  // === Factor 2: R² Quality (max 25 points) - only for regression ===
  if (strategy === 'standard_regression' && rSquared > 0) {
    if (rSquared >= 0.8) {
      score += 25;
      factors.push(`R²=${(rSquared * 100).toFixed(0)}%`);
    } else if (rSquared >= 0.6) {
      score += 18;
      factors.push(`R²=${(rSquared * 100).toFixed(0)}%`);
    } else if (rSquared >= 0.4) {
      score += 10;
      factors.push(`R² baixo`);
    }
  } else if (strategy === 'cohort_analysis') {
    // Cohort gets partial R² points based on sample size
    score += Math.min(20, (cohortData?.samplesUsed || 0) * 7);
  }
  
  // === Factor 3: Data Quantity (max 20 points) ===
  if (dataPoints >= 48) { // 4+ years
    score += 20;
  } else if (dataPoints >= 24) { // 2+ years
    score += 15;
  } else if (dataPoints >= 12) {
    score += 10;
  } else {
    score += 5;
  }
  
  // === Factor 4: Historical Depth (max 15 points) ===
  if (monthsOfHistory >= 60) { // 5+ years
    score += 15;
  } else if (monthsOfHistory >= 36) { // 3+ years
    score += 12;
  } else if (monthsOfHistory >= 24) {
    score += 8;
  } else if (monthsOfHistory >= 12) {
    score += 4;
  }
  
  // Determine level
  let level: ConfidenceLevel;
  let label: string;
  
  if (score >= 70) {
    level = 'high';
    label = 'Alta';
  } else if (score >= 45) {
    level = 'medium';
    label = 'Média';
  } else {
    level = 'low';
    label = 'Baixa';
  }
  
  return {
    level,
    score: Math.min(100, Math.round(score)),
    label,
    description: factors.join(' • '),
  };
}

export const ProjectionConfidenceIndicator: React.FC<ProjectionConfidenceIndicatorProps> = (props) => {
  const confidence = calculateConfidence(props);
  
  const colorMap: Record<ConfidenceLevel, { bg: string; text: string; border: string; progress: string }> = {
    high: { 
      bg: 'bg-income/10', 
      text: 'text-income', 
      border: 'border-income/30',
      progress: 'bg-income'
    },
    medium: { 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-600 dark:text-amber-400', 
      border: 'border-amber-500/30',
      progress: 'bg-amber-500'
    },
    low: { 
      bg: 'bg-destructive/10', 
      text: 'text-destructive', 
      border: 'border-destructive/30',
      progress: 'bg-destructive'
    },
  };
  
  const colors = colorMap[confidence.level];
  
  const IconComponent = confidence.level === 'high' 
    ? ShieldCheck 
    : confidence.level === 'medium' 
      ? ShieldAlert 
      : ShieldQuestion;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 p-2 rounded-lg ${colors.bg} border ${colors.border} cursor-help`}>
            <IconComponent className={`h-4 w-4 ${colors.text}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-medium ${colors.text}`}>
                  Confiança: {confidence.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {confidence.score}%
                </span>
              </div>
              <Progress 
                value={confidence.score} 
                className="h-1.5 mt-1"
              />
            </div>
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p className="font-medium">Indicador de Confiança da Projeção</p>
            <p className="text-muted-foreground">
              Calculado com base em: estratégia de projeção, qualidade da regressão (R²), 
              quantidade de dados e profundidade histórica.
            </p>
            <div className="pt-1 border-t">
              <span className="text-muted-foreground">Fatores: </span>
              <span>{confidence.description}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px] pt-1 border-t">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-income" />
                <span>≥70: Alta</span>
              </div>
              <div className="flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-500" />
                <span>45-69: Média</span>
              </div>
              <div className="flex items-center gap-1">
                <ShieldQuestion className="h-3 w-3 text-destructive" />
                <span>&lt;45: Baixa</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
