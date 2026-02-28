import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BacenDataPoint {
  data: string;
  valor: string;
}

interface FocusDataPoint {
  Indicador: string;
  Data: string;
  DataReferencia: string;
  Mediana: number;
  Media: number;
  Minimo: number;
  Maximo: number;
}

interface IndicatorResult {
  code: string;
  name: string;
  currentValue: number | null;
  unit: string;
  lastUpdate: string | null;
  history: { date: string; value: number }[];
}

interface FocusProjection {
  indicator: string;
  referenceDate: string;
  median: number;
  mean: number;
  min: number;
  max: number;
  publishDate: string;
}

const INDICATORS = {
  selic: { code: '432', name: 'SELIC', unit: '% a.a.', isMonthly: false },
  cdi: { code: '4389', name: 'CDI', unit: '% a.a.', isMonthly: false },
  ipca: { code: '13522', name: 'IPCA', unit: '% a.a.', isMonthly: false }, // IPCA acumulado 12 meses
  igpm: { code: '28655', name: 'IGP-M', unit: '% a.a.', isMonthly: false }, // IGP-M acumulado 12 meses
  dollar: { code: '1', name: 'Dólar (PTAX)', unit: 'R$', isMonthly: false },
  tr: { code: '226', name: 'TR', unit: '% a.m.', isMonthly: true },
};

const FOCUS_INDICATORS = ['IPCA', 'IGP-M', 'Selic', 'Câmbio', 'PIB Total'];

async function fetchBacenSeries(seriesCode: string): Promise<BacenDataPoint[]> {
  try {
    // Fetch data from Jan 2023 to today
    const startDate = '01/01/2023';
    const today = new Date();
    const endDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;
    console.log(`Fetching BACEN series ${seriesCode} from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch series ${seriesCode}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`Fetched ${data.length} data points for series ${seriesCode}`);
    return data;
  } catch (error) {
    console.error(`Error fetching series ${seriesCode}:`, error);
    return [];
  }
}

async function fetchFocusData(): Promise<FocusProjection[]> {
  const projections: FocusProjection[] = [];
  
  try {
    // Get current year and next year for projections
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];
    
    for (const indicator of FOCUS_INDICATORS) {
      for (const year of years) {
        try {
          const encodedIndicator = encodeURIComponent(indicator);
          const url = `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=1&$filter=Indicador%20eq%20'${encodedIndicator}'%20and%20DataReferencia%20eq%20'${year}'&$orderby=Data%20desc&$format=json`;
          
          console.log(`Fetching Focus data for ${indicator} ${year}`);
          
          const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.value && data.value.length > 0) {
              const item = data.value[0];
              projections.push({
                indicator: item.Indicador,
                referenceDate: item.DataReferencia,
                median: item.Mediana,
                mean: item.Media,
                min: item.Minimo,
                max: item.Maximo,
                publishDate: item.Data,
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching Focus for ${indicator} ${year}:`, err);
        }
      }
    }
    
    console.log(`Fetched ${projections.length} Focus projections`);
  } catch (error) {
    console.error('Error fetching Focus data:', error);
  }
  
  return projections;
}

function parseDate(dateStr: string): string {
  // BACEN format: dd/mm/yyyy
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching economic indicators from BACEN...');
    
    const results: Record<string, IndicatorResult> = {};
    
    // Fetch all indicators and Focus data in parallel
    const [focusData, ...seriesData] = await Promise.all([
      fetchFocusData(),
      ...Object.entries(INDICATORS).map(async ([key, indicator]) => {
        const data = await fetchBacenSeries(indicator.code);
        return { key, indicator, data };
      }),
    ]);
    
    // Process series data
    for (const { key, indicator, data } of seriesData) {
      const history = data.map((point) => ({
        date: parseDate(point.data),
        value: parseFloat(point.valor),
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const latestPoint = history[history.length - 1];
      
      results[key] = {
        code: indicator.code,
        name: indicator.name,
        currentValue: latestPoint ? latestPoint.value : null,
        unit: indicator.unit,
        lastUpdate: latestPoint ? latestPoint.date : null,
        history,
      };
    }
    
    console.log('Successfully fetched all indicators');
    
    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        focus: focusData,
        fetchedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in economic-indicators function:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
