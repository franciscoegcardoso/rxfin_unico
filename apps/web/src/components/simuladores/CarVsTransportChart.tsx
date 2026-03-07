import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Car, Bus, TrendingUp, HelpCircle, Wallet, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface CarVsTransportChartProps {
  // Dados básicos
  vehicleValue: number;
  vehicleName: string;
  projectionMonths: number;
  cdiAnual: number;
  cdiMensal: number;
  
  // Custos do carro
  monthlyExpenses: number; // despesas operacionais mensais
  monthlyDepreciation: number; // depreciação mensal
  
  // Status do pagamento
  isCarPaidOff: boolean;
  
  // Dados de crédito (financiamento ou consórcio)
  creditType?: 'financiamento' | 'consorcio';
  creditInfo?: {
    // Financiamento
    entradaValue?: number;
    parcelasPagas?: number;
    parcelasRestantes?: number;
    valorParcela?: number;
    totalJuros?: number;
    capitalImobilizado?: number;
    // Consórcio
    mesesSemBem?: number;
    valorPagoSemBem?: number;
    contemplado?: boolean;
    totalTaxas?: number;
    mesesAteBem?: number; // meses até receber o veículo (para projeção bifásica)
  };
}

// Tipo de transporte alternativo
type TransportMode = 'app' | 'public' | 'mixed';

// Preços de referência (podem ser ajustados via slider)
const DEFAULT_APP_COST = 25; // R$/dia em média usando apps
const DEFAULT_PUBLIC_COST = 8; // R$/dia usando transporte público

export const CarVsTransportChart: React.FC<CarVsTransportChartProps> = ({
  vehicleValue,
  vehicleName,
  projectionMonths,
  cdiAnual,
  cdiMensal,
  monthlyExpenses,
  monthlyDepreciation,
  isCarPaidOff,
  creditType,
  creditInfo,
}) => {
  // Estados para configuração do transporte alternativo
  const [transportMode, setTransportMode] = useState<TransportMode>('app');
  const [appDailyCost, setAppDailyCost] = useState(DEFAULT_APP_COST);
  const [publicDailyCost, setPublicDailyCost] = useState(DEFAULT_PUBLIC_COST);
  const [daysPerWeekUsingTransport, setDaysPerWeekUsingTransport] = useState(5); // dias úteis

  // Custo mensal do transporte alternativo
  const monthlyTransportCost = useMemo(() => {
    const daysPerMonth = daysPerWeekUsingTransport * 4.33;
    
    if (transportMode === 'app') {
      return appDailyCost * daysPerMonth;
    }
    if (transportMode === 'public') {
      return publicDailyCost * daysPerMonth;
    }
    // Mixed: 50% app, 50% público
    return ((appDailyCost + publicDailyCost) / 2) * daysPerMonth;
  }, [transportMode, appDailyCost, publicDailyCost, daysPerWeekUsingTransport]);

  // Capital inicial disponível para investir
  const initialCapital = useMemo(() => {
    if (isCarPaidOff) {
      return vehicleValue;
    }
    
    // Se financiado: entrada + parcelas já pagas
    if (creditType === 'financiamento' && creditInfo) {
      return creditInfo.capitalImobilizado || 0;
    }
    
    // Se consórcio: valor já pago
    if (creditType === 'consorcio' && creditInfo) {
      return creditInfo.capitalImobilizado || 0;
    }
    
    return 0;
  }, [isCarPaidOff, vehicleValue, creditType, creditInfo]);

  // Custo mensal do carro (para cada cenário)
  const monthlyCarCost = useMemo(() => {
    let cost = monthlyExpenses + monthlyDepreciation;
    
    // Se não quitado, adicionar parcela mensal
    if (!isCarPaidOff && creditInfo?.valorParcela && creditInfo.parcelasRestantes && creditInfo.parcelasRestantes > 0) {
      cost += creditInfo.valorParcela;
    }
    
    return cost;
  }, [monthlyExpenses, monthlyDepreciation, isCarPaidOff, creditInfo]);

  // Projeção comparativa com lógica bifásica para consórcio não contemplado
  const projectionData = useMemo(() => {
    const data = [];
    
    // Cenário A: Ter o carro
    let carTotalCost = 0;
    let carParcelasRestantes = creditInfo?.parcelasRestantes || 0;
    
    // Cenário B: Vender/não comprar e investir
    let investedCapital = initialCapital;
    let transportTotalCost = 0;
    
    // Para consórcio não contemplado: projeção bifásica
    const isConsorcioNaoContemplado = creditType === 'consorcio' && !creditInfo?.contemplado;
    const mesesAteBem = isConsorcioNaoContemplado ? (creditInfo?.mesesAteBem || 0) : 0;
    
    for (let month = 0; month <= projectionMonths; month++) {
      if (month > 0) {
        // Verificar se já tem o carro (para consórcio não contemplado)
        const temCarroNesteMes = !isConsorcioNaoContemplado || month > mesesAteBem;
        
        // Cenário A: Custo do carro
        if (temCarroNesteMes) {
          // FASE 2: Já tem o carro - incluir despesas operacionais e depreciação
          carTotalCost += monthlyExpenses + monthlyDepreciation;
        }
        // FASE 1 (consórcio não contemplado): Não tem despesas do carro ainda
        
        // Parcelas: paga independente de ter o carro ou não
        if (!isCarPaidOff && creditInfo?.valorParcela && carParcelasRestantes > 0) {
          carTotalCost += creditInfo.valorParcela;
          carParcelasRestantes--;
        }
        
        // Cenário B: Transporte alternativo
        // Render o capital investido
        investedCapital = investedCapital * (1 + cdiMensal);
        
        // Gastar com transporte alternativo
        transportTotalCost += monthlyTransportCost;
        
        // Se tinha parcelas, na alternativa esse dinheiro é investido
        if (!isCarPaidOff && creditInfo?.valorParcela) {
          const parcelasOriginais = (creditInfo.parcelasRestantes || 0);
          const parcelasJaContadas = parcelasOriginais - carParcelasRestantes - 1;
          if (parcelasJaContadas < parcelasOriginais) {
            // Investe o que seria pago de parcela
            investedCapital += creditInfo.valorParcela;
          }
        }
      }
      
      // Patrimônio líquido em cada cenário
      // Para consórcio não contemplado: só começa a depreciar após ter o carro
      const mesesComCarro = Math.max(0, month - mesesAteBem);
      const depreciacaoAcumulada = isConsorcioNaoContemplado 
        ? monthlyDepreciation * mesesComCarro 
        : monthlyDepreciation * month;
      const valorCarroAtual = Math.max(0, vehicleValue - depreciacaoAcumulada);
      
      // Cenário A: Valor do carro - custos pagos
      // Se não tem o carro ainda (consórcio não contemplado), patrimônio é 0
      const temCarro = !isConsorcioNaoContemplado || month > mesesAteBem;
      const patrimonioComCarro = temCarro 
        ? valorCarroAtual - carTotalCost 
        : -carTotalCost; // Só custos, sem o ativo
      
      // Cenário B: Capital investido - custos de transporte
      const patrimonioSemCarro = investedCapital - transportTotalCost;
      
      // Custo de oportunidade = diferença entre ter o carro e não ter
      const custoOportunidade = patrimonioSemCarro - patrimonioComCarro;
      
      data.push({
        month,
        label: month === 0 ? 'Hoje' : month <= 12 ? `${month}m` : `${(month/12).toFixed(1)}a`,
        // Custos acumulados
        custoTotalCarro: Math.round(carTotalCost),
        custoTotalTransporte: Math.round(transportTotalCost),
        // Patrimônios
        patrimonioComCarro: Math.round(patrimonioComCarro),
        patrimonioSemCarro: Math.round(patrimonioSemCarro),
        // Capital investido
        capitalInvestido: Math.round(investedCapital),
        // Diferença
        diferencaPatrimonio: Math.round(custoOportunidade),
        // Valor do carro
        valorCarro: Math.round(valorCarroAtual),
        // Marcador de fase (para visualização)
        fase: temCarro ? 2 : 1,
        temCarro,
      });
    }
    
    return data;
  }, [
    projectionMonths, 
    initialCapital, 
    monthlyExpenses, 
    monthlyDepreciation, 
    monthlyTransportCost,
    monthlyCarCost,
    isCarPaidOff,
    creditType,
    creditInfo,
    cdiMensal,
    vehicleValue,
  ]);

  // Resumo final
  const finalSummary = useMemo(() => {
    if (projectionData.length === 0) return null;
    
    const last = projectionData[projectionData.length - 1];
    const mid = projectionData[Math.floor(projectionData.length / 2)];
    
    return {
      custoTotalCarro: last.custoTotalCarro,
      custoTotalTransporte: last.custoTotalTransporte,
      economiaOuPerda: last.diferencaPatrimonio,
      patrimonioFinalComCarro: last.patrimonioComCarro,
      patrimonioFinalSemCarro: last.patrimonioSemCarro,
      breakEvenMonth: projectionData.findIndex(d => d.diferencaPatrimonio > 0),
      meioDoPeríodo: {
        mes: mid.month,
        diferenca: mid.diferencaPatrimonio,
      },
    };
  }, [projectionData]);

  // Determina se usar transporte alternativo é vantajoso
  const isTransportBetter = finalSummary && finalSummary.economiaOuPerda > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Car className="h-4 w-4 text-primary" />
          Carro vs Transporte Alternativo
        </CardTitle>
        <CardDescription>
          Compare ter o carro com vender/investir e usar transporte alternativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuração do transporte alternativo */}
        <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Bus className="h-4 w-4" />
              Transporte Alternativo
            </Label>
            <Badge variant="outline" className="text-xs">
              {formatMoney(monthlyTransportCost)}/mês
            </Badge>
          </div>
          
          {/* Seletor de modo */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'app', label: 'Apps (Uber)', icon: '🚗' },
              { key: 'public', label: 'Público', icon: '🚌' },
              { key: 'mixed', label: 'Misto', icon: '🔄' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTransportMode(key as TransportMode)}
                className={cn(
                  "p-2 rounded-lg border text-center transition-all text-xs",
                  transportMode === key 
                    ? "border-primary bg-primary/10" 
                    : "hover:bg-muted"
                )}
              >
                <span className="text-lg">{icon}</span>
                <p className={cn(
                  "mt-1",
                  transportMode === key ? "font-medium text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </p>
              </button>
            ))}
          </div>
          
          {/* Sliders de configuração */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Dias por semana</Label>
                <span className="text-xs font-medium">{daysPerWeekUsingTransport} dias</span>
              </div>
              <Slider
                value={[daysPerWeekUsingTransport]}
                onValueChange={([v]) => setDaysPerWeekUsingTransport(v)}
                min={1}
                max={7}
                step={1}
                className="w-full"
              />
            </div>
            
            {(transportMode === 'app' || transportMode === 'mixed') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Custo diário (apps)</Label>
                  <span className="text-xs font-medium">{formatMoney(appDailyCost)}/dia</span>
                </div>
                <Slider
                  value={[appDailyCost]}
                  onValueChange={([v]) => setAppDailyCost(v)}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            )}
            
            {(transportMode === 'public' || transportMode === 'mixed') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Custo diário (público)</Label>
                  <span className="text-xs font-medium">{formatMoney(publicDailyCost)}/dia</span>
                </div>
                <Slider
                  value={[publicDailyCost]}
                  onValueChange={([v]) => setPublicDailyCost(v)}
                  min={4}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Cenário explicativo */}
        <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/20">
          <p className="text-xs text-muted-foreground">
            <strong>Cenário comparado:</strong>{' '}
            {isCarPaidOff 
              ? `Se você vendesse o ${vehicleName} por ${formatMoney(vehicleValue)} hoje, investisse o dinheiro e usasse transporte alternativo.`
              : creditType === 'financiamento'
                ? `Se você vendesse o ${vehicleName}, quitasse o financiamento, investisse ${formatMoney(initialCapital)} (entrada + parcelas pagas) e as parcelas futuras que economizaria.`
                : creditInfo?.contemplado
                  ? `Se você desistisse do consórcio, investisse ${formatMoney(initialCapital)} (parcelas já pagas) e usasse transporte alternativo.`
                  : `Se você desistisse do consórcio agora, investisse ${formatMoney(initialCapital)} (parcelas já pagas) e usasse transporte alternativo. O cenário "com carro" só inclui custos operacionais após a contemplação (${creditInfo?.mesesAteBem || 0} meses).`
            }
          </p>
        </div>
        
        {/* Alerta sobre projeção bifásica para consórcio não contemplado */}
        {creditType === 'consorcio' && !creditInfo?.contemplado && (creditInfo?.mesesAteBem || 0) > 0 && (
          <div className="p-3 rounded-lg border bg-purple-500/10 border-purple-500/20">
            <p className="text-xs text-purple-700 dark:text-purple-400">
              <strong>📅 Projeção em duas fases:</strong>{' '}
              Nos próximos <strong>{creditInfo?.mesesAteBem} meses</strong> você pagará parcelas mas não terá custos de carro 
              (IPVA, seguro, combustível, manutenção). Esses custos só entram na projeção após a contemplação.
            </p>
          </div>
        )}

        {/* Gráfico comparativo */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 15, left: 15, bottom: 0 }}>
              <CartesianGrid {...premiumGrid} />
              <XAxis 
                dataKey="label" 
                {...premiumXAxis}
                tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                interval={Math.floor(projectionMonths / 8)}
              />
              <YAxis 
                hide
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()}
              />
              <RechartsTooltip 
                formatter={(value: number, name: string) => [formatMoney(value), name]}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={premiumTooltipStyle.contentStyle}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="patrimonioSemCarro"
                name="💰 Patrimônio sem carro"
                stroke="hsl(var(--income))"
                fill="hsl(var(--income))"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="patrimonioComCarro"
                name="🚗 Patrimônio com carro"
                stroke="hsl(var(--expense))"
                fill="hsl(var(--expense))"
                fillOpacity={0.3}
              />
              {/* Linha de break-even */}
              {finalSummary && finalSummary.breakEvenMonth > 0 && (
                <ReferenceLine 
                  x={projectionData[finalSummary.breakEvenMonth]?.label} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: 'Break-even', 
                    position: 'top',
                    fontSize: 10,
                    fill: 'hsl(var(--primary))',
                  }}
                />
              )}
              {/* Linha de contemplação (consórcio não contemplado) */}
              {creditType === 'consorcio' && !creditInfo?.contemplado && (creditInfo?.mesesAteBem || 0) > 0 && (
                <ReferenceLine 
                  x={projectionData.find(d => d.temCarro)?.label} 
                  stroke="hsl(142 76% 36%)"
                  strokeDasharray="3 3"
                  label={{ 
                    value: '🚗 Contemplação', 
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: 'hsl(142 76% 36%)',
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cards de resultado */}
        {finalSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-expense/10 border border-expense/20 text-center">
              <Car className="h-5 w-5 mx-auto mb-1 text-expense" />
              <p className="text-xs text-muted-foreground">Custo total do carro</p>
              <p className="text-lg font-bold text-expense">{formatMoney(finalSummary.custoTotalCarro)}</p>
              <p className="text-[10px] text-muted-foreground">em {projectionMonths} meses</p>
            </div>
            
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <Bus className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xs text-muted-foreground">Custo transporte alt.</p>
              <p className="text-lg font-bold text-blue-600">{formatMoney(finalSummary.custoTotalTransporte)}</p>
              <p className="text-[10px] text-muted-foreground">+ rendimento do capital</p>
            </div>
            
            <div className={cn(
              "p-3 rounded-lg text-center border",
              isTransportBetter 
                ? "bg-income/10 border-income/20" 
                : "bg-amber-500/10 border-amber-500/20"
            )}>
              <Wallet className="h-5 w-5 mx-auto mb-1" style={{ color: isTransportBetter ? 'hsl(var(--income))' : 'rgb(245 158 11)' }} />
              <p className="text-xs text-muted-foreground">
                {isTransportBetter ? 'Economia sem carro' : 'Custo extra sem carro'}
              </p>
              <p className={cn(
                "text-lg font-bold",
                isTransportBetter ? "text-income" : "text-amber-600"
              )}>
                {isTransportBetter ? '+' : ''}{formatMoney(Math.abs(finalSummary.economiaOuPerda))}
              </p>
              <p className="text-[10px] text-muted-foreground">diferença patrimonial</p>
            </div>
          </div>
        )}

        {/* Veredito */}
        {finalSummary && (
          <div className={cn(
            "p-4 rounded-lg border",
            isTransportBetter 
              ? "bg-income/10 border-income/20" 
              : "bg-amber-500/10 border-amber-500/20"
          )}>
            <div className="flex items-start gap-3">
              {isTransportBetter ? (
                <TrendingUp className="h-5 w-5 text-income flex-shrink-0 mt-0.5" />
              ) : (
                <Car className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isTransportBetter 
                    ? 'Transporte alternativo é mais vantajoso!' 
                    : 'Manter o carro é mais vantajoso neste cenário'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isTransportBetter 
                    ? `Com o custo de transporte de ${formatMoney(monthlyTransportCost)}/mês, você economizaria ${formatMoney(finalSummary.economiaOuPerda)} em ${projectionMonths} meses ao investir o capital e usar transporte alternativo.`
                    : `Com o custo de transporte de ${formatMoney(monthlyTransportCost)}/mês, manter o carro resulta em um patrimônio ${formatMoney(Math.abs(finalSummary.economiaOuPerda))} maior após ${projectionMonths} meses.`
                  }
                </p>
                {finalSummary.breakEvenMonth > 0 && finalSummary.breakEvenMonth < projectionMonths && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Break-even em {finalSummary.breakEvenMonth} meses
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
