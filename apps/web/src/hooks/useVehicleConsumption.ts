import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  inferCategoryFromModel, 
  getConsumptionByCategory,
  CategoryConsumption 
} from '@/data/vehicleBenchmarks';

export type ConsumptionSource = 'inmetro' | 'estimate' | 'manual';

export interface ConsumptionSuggestion {
  urban: number;
  highway: number;
  average: number;
  source: ConsumptionSource;
  sourceLabel: string;
  category?: string;
  engine?: string;
}

interface VehicleFuelData {
  brand: string;
  model: string;
  year_start: number | null;
  year_end: number | null;
  consumption_urban: number;
  consumption_highway: number;
  consumption_average: number;
  category: string;
  engine: string | null;
  source: string;
}

export const useVehicleConsumption = () => {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<ConsumptionSuggestion | null>(null);

  const fetchConsumption = useCallback(async (
    brand: string,
    model: string,
    year?: number
  ): Promise<ConsumptionSuggestion | null> => {
    if (!brand || !model) {
      setSuggestion(null);
      return null;
    }

    setLoading(true);

    try {
      // Normalizar nomes para busca
      const normalizedBrand = brand.trim();
      const normalizedModel = model.trim();

      // 1. Tentar busca exata por marca e modelo
      let { data, error } = await supabase
        .from('vehicle_fuel_consumption')
        .select('*')
        .ilike('brand', normalizedBrand)
        .ilike('model', `%${normalizedModel.split(' ')[0]}%`)
        .limit(5);

      if (error) {
        console.error('Erro ao buscar consumo:', error);
      }

      // Se encontrou dados, filtrar pelo mais adequado
      if (data && data.length > 0) {
        // Tentar encontrar match exato com ano
        let bestMatch: VehicleFuelData | null = null;

        for (const item of data as VehicleFuelData[]) {
          // Verificar se o modelo contém as palavras-chave
          const modelWords = normalizedModel.toLowerCase().split(' ');
          const itemModelLower = item.model.toLowerCase();
          
          const matches = modelWords.filter(word => 
            itemModelLower.includes(word) || word.includes(itemModelLower.split(' ')[0])
          );

          if (matches.length > 0) {
            // Verificar ano se disponível
            if (year && item.year_start && item.year_end) {
              if (year >= item.year_start && year <= item.year_end) {
                bestMatch = item;
                break;
              }
            } else if (!bestMatch) {
              bestMatch = item;
            }
          }
        }

        if (!bestMatch && data.length > 0) {
          bestMatch = data[0] as VehicleFuelData;
        }

        if (bestMatch) {
          const result: ConsumptionSuggestion = {
            urban: Number(bestMatch.consumption_urban),
            highway: Number(bestMatch.consumption_highway),
            average: Number(bestMatch.consumption_average),
            source: 'inmetro',
            sourceLabel: 'INMETRO',
            category: bestMatch.category,
            engine: bestMatch.engine || undefined,
          };
          
          setSuggestion(result);
          setLoading(false);
          return result;
        }
      }

      // 2. Fallback: inferir categoria e usar benchmark
      const inferredCategory = inferCategoryFromModel(normalizedModel);
      const categoryConsumption = getConsumptionByCategory(inferredCategory);

      const result: ConsumptionSuggestion = {
        urban: categoryConsumption.urban,
        highway: categoryConsumption.highway,
        average: categoryConsumption.average,
        source: 'estimate',
        sourceLabel: 'Estimativa',
        category: inferredCategory,
      };

      setSuggestion(result);
      setLoading(false);
      return result;

    } catch (err) {
      console.error('Erro ao buscar sugestão de consumo:', err);
      
      // Fallback final: usar default
      const defaultConsumption = getConsumptionByCategory('default');
      const result: ConsumptionSuggestion = {
        urban: defaultConsumption.urban,
        highway: defaultConsumption.highway,
        average: defaultConsumption.average,
        source: 'estimate',
        sourceLabel: 'Estimativa',
        category: 'default',
      };
      
      setSuggestion(result);
      setLoading(false);
      return result;
    }
  }, []);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  const setManualSource = useCallback(() => {
    if (suggestion) {
      setSuggestion({
        ...suggestion,
        source: 'manual',
        sourceLabel: 'Manual',
      });
    }
  }, [suggestion]);

  return {
    loading,
    suggestion,
    fetchConsumption,
    clearSuggestion,
    setManualSource,
  };
};
// sync
