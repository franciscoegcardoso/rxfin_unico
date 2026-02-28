import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Settings2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASSETS_CONFIG, ASSET_GROUPS } from './types';

interface IndicatorsSidebarProps {
  tab: 'overview' | 'portfolio';
  activeIndicators: string[];
  weights: Record<string, number>;
  selectedBenchmarks: Record<string, boolean>;
  totalWeight: number;
  isWeightValid: boolean;
  startYear?: number; // Year of the start date filter
  onToggleIndicator: (id: string) => void;
  onBulkIndicator: (type: 'all' | 'none' | 'main') => void;
  onWeightChange: (id: string, value: number) => void;
  onResetWeights: () => void;
  onToggleBenchmark: (id: string) => void;
  onBulkBenchmark: (type: 'all' | 'none' | 'main' | 'global') => void;
}

export const IndicatorsSidebar: React.FC<IndicatorsSidebarProps> = ({
  tab,
  activeIndicators,
  weights,
  selectedBenchmarks,
  totalWeight,
  isWeightValid,
  startYear,
  onToggleIndicator,
  onBulkIndicator,
  onWeightChange,
  onResetWeights,
  onToggleBenchmark,
  onBulkBenchmark,
}) => {
  // Bitcoin is only valid for periods starting 2018 or later
  const isBitcoinDisabled = startYear !== undefined && startYear < 2018;
  // Group assets by category
  const groupedAssets = ASSET_GROUPS.map(group => ({
    group,
    assets: Object.entries(ASSETS_CONFIG).filter(([, config]) => config.group === group)
  }));

  if (tab === 'overview') {
    return (
      <div className="space-y-4">
        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkIndicator('all')}
            className="text-xs h-7"
          >
            Todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkIndicator('none')}
            className="text-xs h-7"
          >
            Limpar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkIndicator('main')}
            className="text-xs h-7"
          >
            🇧🇷 Principais
          </Button>
        </div>
        
        {/* Indicators grouped */}
        <div className="space-y-4">
          {groupedAssets.map(({ group, assets }) => (
            <div key={group} className="space-y-1">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/50">
                {group}
              </div>
              {assets.map(([key, config]) => (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    activeIndicators.includes(key) && "bg-muted"
                  )}
                >
                  <Checkbox
                    checked={activeIndicators.includes(key)}
                    onCheckedChange={() => onToggleIndicator(key)}
                    className="h-4 w-4"
                  />
                  <div 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-medium flex-1">
                    {config.label}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Portfolio tab - Professional allocation layout matching reference
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Settings2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Alocação</span>
      </div>

      {/* Column Headers */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex-1">Alocação</div>
        <Badge
          variant={isWeightValid ? "outline" : "destructive"}
          className="text-[10px] h-5 px-1.5"
        >
          {totalWeight}%
        </Badge>
        <div className="w-8 text-center">Bench</div>
      </div>

      {!isWeightValid && (
        <p className="text-xs text-destructive">
          A soma dos pesos deve ser 100%
        </p>
      )}

      {/* Grouped Assets */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {groupedAssets.map(({ group, assets }) => (
          <div key={group} className="space-y-1.5">
            {/* Group Header - Full width bar */}
            <div className="bg-muted/80 text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-1.5 px-2 -mx-1 rounded">
              {group}
            </div>
            
            {/* Asset Rows */}
            {assets.map(([key, config]) => {
              const isDisabled = key === 'btc' && isBitcoinDisabled;
              
              return (
                <div key={key} className="space-y-0.5">
                  <div className={cn(
                    "flex items-center gap-2 py-1",
                    isDisabled && "opacity-50"
                  )}>
                    {/* Color + Label */}
                    <div className="flex items-center gap-1.5 w-[72px] shrink-0">
                      <div 
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-xs font-medium truncate">
                        {config.label}
                      </span>
                    </div>
                    
                    {/* Slider */}
                    <div className="flex-1 min-w-0">
                      <Slider
                        value={[weights[key]]}
                        onValueChange={([value]) => onWeightChange(key, value)}
                        max={100}
                        step={5}
                        className="w-full"
                        disabled={isDisabled}
                      />
                    </div>
                    
                    {/* Percentage */}
                    <span className="text-xs font-medium tabular-nums w-8 text-right">
                      {weights[key]}%
                    </span>
                    
                    {/* Benchmark checkbox */}
                    <div className="w-8 flex justify-center">
                      <Checkbox
                        checked={selectedBenchmarks[key]}
                        onCheckedChange={() => onToggleBenchmark(key)}
                        disabled={isDisabled}
                        className={cn(
                          "h-4 w-4 rounded border-2 transition-colors",
                          selectedBenchmarks[key] 
                            ? "bg-emerald-500 border-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" 
                            : "border-muted-foreground/40"
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Bitcoin disabled warning */}
                  {isDisabled && (
                    <div className="flex items-start gap-1.5 ml-3 pb-1">
                      <AlertCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                      <span className="text-[10px] text-destructive leading-tight">
                        Disponível apenas para períodos a partir de 2018
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Reset Button */}
      <Button
        variant="ghost"
        onClick={onResetWeights}
        className="w-full gap-2 h-8 text-xs text-muted-foreground hover:text-foreground"
        size="sm"
      >
        <RotateCcw className="w-3 h-3" />
        Resetar Alocação
      </Button>
    </div>
  );
};
