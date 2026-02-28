import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Car, Database, Globe, History } from 'lucide-react';
import type { ConsideredModelInfo } from '@/utils/depreciationCoreEngine';
import { SELF_REGRESSION_MIN_AGE } from '@/utils/depreciationCoreEngine';

interface ConsideredModelsInfoProps {
  familyName: string | null;
  models: ConsideredModelInfo[];
  /** Method used for calculation (to determine note content) */
  methodUsed: 'exact' | 'family' | 'brand';
  /** Vehicle age in years (to show self-regression badge for 15+ years) */
  vehicleAge?: number;
  /** Number of data years used in calculation */
  dataYearsUsed?: number;
}

/**
 * Exibe nota explicativa quando a projeção usa múltiplos veículos
 * ou quando usa auto-regressão (veículos com 15+ anos)
 * e um botão para mostrar a lista de modelos considerados
 */
export const ConsideredModelsInfo: React.FC<ConsideredModelsInfoProps> = ({
  familyName,
  models,
  methodUsed,
  vehicleAge,
  dataYearsUsed,
}) => {
  // Sanitiza valores para garantir que são primitivos (evita React Error #31)
  const safeMethodUsed = typeof methodUsed === 'string' ? methodUsed : 'exact';
  const safeFamilyName = typeof familyName === 'string' ? familyName : '';
  const safeVehicleAge = typeof vehicleAge === 'number' ? vehicleAge : 0;
  const safeDataYearsUsed = typeof dataYearsUsed === 'number' ? dataYearsUsed : 0;
  
  // Verifica se é veículo maduro (usa auto-regressão)
  const isMatureVehicle = safeVehicleAge >= SELF_REGRESSION_MIN_AGE;
  
  // Se usa modelo exato E é veículo maduro, exibe badge de auto-regressão
  if (safeMethodUsed === 'exact' && isMatureVehicle) {
    const displayYears = safeDataYearsUsed > 0 ? safeDataYearsUsed : safeVehicleAge;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge 
          variant="outline" 
          className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
        >
          <History className="h-3 w-3 mr-1" />
          Projeção baseada no histórico próprio ({displayYears}+ anos de dados)
        </Badge>
      </div>
    );
  }
  
  // Se usa modelo exato sem ser maduro, não exibe nada
  if (safeMethodUsed === 'exact') {
    return null;
  }

  const isFamily = safeMethodUsed === 'family';
  const hasModels = models.length > 0;
  
  // Agrupa modelos únicos por nome
  const uniqueModels = React.useMemo(() => {
    if (!hasModels) return [];
    const seen = new Map<string, ConsideredModelInfo>();
    for (const model of models) {
      const key = `${model.fipeCode}-${model.modelYear}`;
      if (!seen.has(key)) {
        seen.set(key, model);
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      // Ordena por nome, depois por ano
      const nameCompare = (a.modelName || '').localeCompare(b.modelName || '');
      if (nameCompare !== 0) return nameCompare;
      return (a.modelYear || 0) - (b.modelYear || 0);
    });
  }, [models, hasModels]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Nota explicativa */}
      <Badge 
        variant="outline" 
        className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
      >
        <Info className="h-3 w-3 mr-1" />
        {isFamily 
          ? `Projeção baseada na família "${safeFamilyName}"`
          : `Projeção baseada em veículos da marca`
        }
      </Badge>
      
      {/* Botão para ver lista de modelos */}
      {hasModels && (
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            >
              <Car className="h-3 w-3" />
              Ver {uniqueModels.length} {uniqueModels.length === 1 ? 'modelo' : 'modelos'}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 p-0" 
            align="start"
          >
            <div className="p-3 border-b border-border">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Modelos Considerados na Análise
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {isFamily 
                  ? `Veículos da família "${safeFamilyName}" usados para estimar a curva de depreciação.`
                  : `Veículos da marca usados para estimar a curva de depreciação.`
                }
              </p>
            </div>
            <ScrollArea className="h-60">
              <div className="p-2 space-y-1">
                {uniqueModels.map((model, index) => (
                  <div 
                    key={`${model.fipeCode}-${model.modelYear}-${index}`}
                    className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {model.modelName || model.fipeCode}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {model.modelYear && (
                          <span className="text-[10px] text-muted-foreground">
                            Ano: {model.modelYear}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/70">
                          FIPE: {model.fipeCode}
                        </span>
                      </div>
                    </div>
                    {model.source === 'database' ? (
                      <Database className="h-3 w-3 text-muted-foreground shrink-0" />
                    ) : (
                      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Dados agregados de {uniqueModels.length} variação{uniqueModels.length !== 1 ? 'ões' : ''} para maior precisão estatística
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
