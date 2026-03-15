import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LabelList } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

// Paleta de cores com alta distinção visual - ordenada por categorias comuns
// 0: IPVA (Verde), 1: Seguro (Roxo), 2: Depreciação (Azul escuro), 3: Licenciamento (Rosa)
// 4: Combustível (Laranja), 5: Revisão/Manutenção (Amarelo), 6: Pneus (Teal)
// 7: Limpeza (Violeta), 8: Estacionamento (Marrom/Terra), 9: Pedágio (Azul royal)
// 10: Custo de Oportunidade (Verde menta), 11: Outros (Cinza claro)
const CHART_COLORS = [
  'hsl(142 71% 45%)',        // 0: Verde esmeralda (IPVA)
  'hsl(262 83% 58%)',        // 1: Roxo vibrante (Seguro)
  'hsl(215 70% 35%)',        // 2: Azul escuro (Depreciação) - diferente de combustível
  'hsl(340 82% 52%)',        // 3: Rosa magenta (Licenciamento)
  'hsl(25 95% 53%)',         // 4: Laranja queimado (Combustível)
  'hsl(45 93% 47%)',         // 5: Amarelo ouro (Revisão/Manutenção)
  'hsl(173 80% 40%)',        // 6: Teal (Pneus)
  'hsl(280 70% 50%)',        // 7: Violeta (Limpeza)
  'hsl(30 50% 40%)',         // 8: Marrom/Terra (Estacionamento) - contraste com laranja
  'hsl(220 70% 50%)',        // 9: Azul royal (Pedágio)
  'hsl(160 60% 45%)',        // 10: Verde menta (Custo de Oportunidade)
  'hsl(220 10% 70%)',        // 11: Cinza claro (Outros)
];

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMoneyCompact = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

interface CostItem {
  key: string;
  label: string;
  monthlyValue: number;
  annualValue: number;
}

interface CostDistributionChartProps {
  costItems: CostItem[];
  costFilters: Record<string, boolean>;
  onToggleFilter: (key: string) => void;
  onToggleAllFilters: (enabled: boolean) => void;
  chartView: 'annual' | 'monthly';
  onChartViewChange: (view: 'annual' | 'monthly') => void;
  opportunityCostNote?: string;
}

export const CostDistributionChart: React.FC<CostDistributionChartProps> = ({
  costItems,
  costFilters,
  onToggleFilter,
  onToggleAllFilters,
  chartView,
  onChartViewChange,
  opportunityCostNote,
}) => {
  const isMobile = useIsMobile();
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileChartType, setMobileChartType] = useState<'pie' | 'bar'>('pie');

  // Filtrar itens de custo
  const filteredCostItems = useMemo(() => {
    return costItems.filter(item => costFilters[item.key] !== false);
  }, [costItems, costFilters]);

  // Totais filtrados
  const filteredTotals = useMemo(() => {
    return filteredCostItems.reduce(
      (acc, item) => ({
        monthly: acc.monthly + item.monthlyValue,
        annual: acc.annual + item.annualValue,
      }),
      { monthly: 0, annual: 0 }
    );
  }, [filteredCostItems]);

  // Identificar itens com valor negativo (como depreciação negativa)
  const negativeItems = useMemo(() => {
    return filteredCostItems.filter(item => {
      const value = chartView === 'annual' ? item.annualValue : item.monthlyValue;
      return value < 0;
    });
  }, [filteredCostItems, chartView]);

  // Dados para o gráfico de pizza com agrupamento "Outros"
  // Exclui valores negativos do gráfico mas mantém na tabela
  const pieChartData = useMemo(() => {
    // Para o gráfico, só considera valores positivos
    const positiveItems = filteredCostItems.filter(item => {
      const value = chartView === 'annual' ? item.annualValue : item.monthlyValue;
      return value > 0;
    });
    
    const positiveTotal = positiveItems.reduce((acc, item) => {
      return acc + (chartView === 'annual' ? item.annualValue : item.monthlyValue);
    }, 0);
    
    if (positiveTotal === 0) return { mainItems: [], othersItem: null, allItems: [], negativeItems: [] };
    
    const THRESHOLD = 0.05; // 5%
    const mainItems: Array<{ key: string; label: string; value: number; percent: number; color: string; isNegative?: boolean }> = [];
    let othersValue = 0;
    const othersLabels: string[] = [];
    const allItems: Array<{ key: string; label: string; value: number; percent: number; color: string; isNegative?: boolean }> = [];
    
    // Processar itens positivos para o gráfico
    positiveItems.forEach((item) => {
      const value = chartView === 'annual' ? item.annualValue : item.monthlyValue;
      const percent = value / positiveTotal;
      const originalIndex = costItems.findIndex(c => c.key === item.key);
      const color = CHART_COLORS[originalIndex % CHART_COLORS.length];
      
      allItems.push({
        key: item.key,
        label: item.label,
        value,
        percent: percent * 100,
        color,
      });
      
      if (percent < THRESHOLD) {
        othersValue += value;
        othersLabels.push(item.label);
      } else {
        mainItems.push({
          key: item.key,
          label: item.label,
          value,
          percent: percent * 100,
          color,
        });
      }
    });
    
    // Adicionar itens negativos para a tabela (não para o gráfico)
    const negativeItemsData = negativeItems.map(item => {
      const value = chartView === 'annual' ? item.annualValue : item.monthlyValue;
      const originalIndex = costItems.findIndex(c => c.key === item.key);
      const color = CHART_COLORS[originalIndex % CHART_COLORS.length];
      return {
        key: item.key,
        label: item.label,
        value,
        percent: 0, // Não conta no percentual
        color,
        isNegative: true,
      };
    });
    
    // Ordenar por valor (maior primeiro)
    mainItems.sort((a, b) => b.value - a.value);
    allItems.sort((a, b) => b.value - a.value);
    
    const othersItem = othersValue > 0 ? {
      key: 'others',
      label: 'Outros',
      value: othersValue,
      percent: (othersValue / positiveTotal) * 100,
      color: CHART_COLORS[11], // Cinza claro para "Outros"
      tooltip: othersLabels.join(', '),
    } : null;
    
    return { mainItems, othersItem, allItems, negativeItems: negativeItemsData };
  }, [filteredCostItems, filteredTotals, chartView, costItems, negativeItems]);

  // Renderizar gráfico de barras horizontal
  const renderBarChart = (height: number = 200, marginLeft: number = 100) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={pieChartData.allItems.map(item => ({
          name: item.label,
          value: item.value,
          fill: item.color,
          formattedValue: formatMoney(item.value),
        }))}
        layout="vertical"
        margin={{ top: 5, right: 70, left: marginLeft, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis
          hide={isMobile}
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: isMobile ? 10 : 11, fill: 'hsl(var(--muted-foreground))' }}
          width={marginLeft - 10}
        />
        <Tooltip 
          formatter={(value: number) => [formatMoney(value), 'Valor']}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
        <Bar 
          dataKey="value" 
          radius={[0, 4, 4, 0]}
          animationDuration={600}
          animationEasing="ease-out"
        >
          {pieChartData.allItems.map((item) => (
            <Cell key={item.key} fill={item.color} />
          ))}
          <LabelList 
            dataKey="formattedValue"
            position="right"
            style={{ fontSize: isMobile ? 9 : 10, fill: 'hsl(var(--foreground))' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  // Renderizar legenda em tabela (desktop/tablet)
  const renderLegendTable = () => (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 px-2 text-[10px]">Categoria</TableHead>
            <TableHead className="h-8 px-2 text-right text-[10px]">Valor</TableHead>
            <TableHead className="h-8 px-2 text-right text-[10px]">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...pieChartData.mainItems, ...(pieChartData.othersItem ? [pieChartData.othersItem] : [])].map((item) => (
            <TableRow key={item.key} className="hover:bg-muted/30">
              <TableCell className="py-1.5 px-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium truncate">
                    {item.label}
                    {'tooltip' in item && (item as { tooltip?: string }).tooltip && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({(item as { tooltip?: string }).tooltip})
                      </span>
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-1.5 px-2 text-right">
                <span className="text-xs font-medium tabular-nums">
                  {formatMoney(item.value)}
                </span>
              </TableCell>
              <TableCell className="py-1.5 px-2 text-right">
                <span className="text-xs font-semibold tabular-nums text-primary">
                  {item.percent.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
          {/* Itens negativos (valorização) */}
          {pieChartData.negativeItems?.map((item) => (
            <TableRow key={item.key} className="hover:bg-muted/30 bg-green-50/50 dark:bg-green-950/20">
              <TableCell className="py-1.5 px-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded shrink-0 border-2 border-dashed"
                    style={{ borderColor: item.color, backgroundColor: 'transparent' }}
                  />
                  <span className="text-xs font-medium truncate">
                    {item.label}
                    <span className="text-[10px] text-green-600 dark:text-green-400 ml-1">
                      (valorização)*
                    </span>
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-1.5 px-2 text-right">
                <span className="text-xs font-medium tabular-nums text-green-600 dark:text-green-400">
                  {formatMoney(item.value)}
                </span>
              </TableCell>
              <TableCell className="py-1.5 px-2 text-right">
                <span className="text-[10px] text-muted-foreground">
                  N/A
                </span>
              </TableCell>
            </TableRow>
          ))}
          {/* Total row */}
          <TableRow className="bg-muted/50 font-medium">
            <TableCell className="py-2 px-2 text-xs">Total</TableCell>
            <TableCell className="py-2 px-2 text-right">
              <span className="text-xs font-bold text-primary tabular-nums">
                {formatMoney(chartView === 'annual' ? filteredTotals.annual : filteredTotals.monthly)}
              </span>
            </TableCell>
            <TableCell className="py-2 px-2 text-right">
              <span className="text-xs font-bold tabular-nums">100%</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {/* Nota explicativa para valores negativos */}
      {pieChartData.negativeItems && pieChartData.negativeItems.length > 0 && (
        <div className="mt-2 text-[10px] text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20 rounded p-2">
          <strong>*Nota:</strong> Valores negativos indicam valorização do veículo no período. 
          Estes valores não são incluídos no gráfico de pizza, pois representam um ganho e não um custo.
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
      {/* Header com controles */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Distribuição de Custos</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Mobile: Pizza/Barras */}
          {isMobile && (
            <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
              <button
                onClick={() => setMobileChartType('pie')}
                className={`p-1.5 rounded-full transition-colors ${
                  mobileChartType === 'pie' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Gráfico de Pizza"
              >
                <PieChartIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMobileChartType('bar')}
                className={`p-1.5 rounded-full transition-colors ${
                  mobileChartType === 'bar' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Gráfico de Barras"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          
          {/* Filtro de Custos */}
          <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Filtrar
                <ChevronDown className={`h-3 w-3 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          
          {/* Toggle Mensal/Anual */}
          <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
            <button
              onClick={() => onChartViewChange('monthly')}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                chartView === 'monthly' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => onChartViewChange('annual')}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                chartView === 'annual' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Anual
            </button>
          </div>
        </div>
      </div>
      
      {/* Painel de Filtros Expansível */}
      <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
        <CollapsibleContent>
          <div className="mb-4 p-3 bg-background rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Selecionar custos para análise:</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => onToggleAllFilters(true)}>
                  Todos
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => onToggleAllFilters(false)}>
                  Nenhum
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {costItems.map((item, index) => (
                <label 
                  key={item.key} 
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 transition-colors"
                >
                  <Checkbox 
                    checked={costFilters[item.key] !== false}
                    onCheckedChange={() => onToggleFilter(item.key)}
                    className="h-3.5 w-3.5"
                  />
                  <div 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="truncate">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Mobile Layout */}
      {isMobile ? (
        <div className="space-y-4">
          {mobileChartType === 'pie' ? (
            // Donut Chart + Legenda organizada
            <div className="flex flex-col items-center gap-4">
              <div className="relative" style={{ width: 200, height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        ...pieChartData.mainItems.map(item => ({
                          name: item.label,
                          value: item.value,
                          color: item.color,
                        })),
                        ...(pieChartData.othersItem ? [{
                          name: pieChartData.othersItem.label,
                          value: pieChartData.othersItem.value,
                          color: pieChartData.othersItem.color,
                        }] : []),
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={600}
                    >
                      {pieChartData.mainItems.map((item) => (
                        <Cell key={`cell-${item.key}`} fill={item.color} />
                      ))}
                      {pieChartData.othersItem && (
                        <Cell key="cell-others" fill={pieChartData.othersItem.color} />
                      )}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        const total = chartView === 'annual' ? filteredTotals.annual : filteredTotals.monthly;
                        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        const othersTooltip = name === 'Outros' && pieChartData.othersItem?.tooltip 
                          ? ` (${pieChartData.othersItem.tooltip})`
                          : '';
                        return [`${formatMoney(value)} (${percent}%)${othersTooltip}`, name];
                      }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div 
                  className="absolute pointer-events-none flex flex-col items-center justify-center"
                  style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                >
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {chartView === 'annual' ? 'Ano' : 'Mês'}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {formatMoneyCompact(chartView === 'annual' ? filteredTotals.annual : filteredTotals.monthly)}
                  </span>
                </div>
              </div>

              {/* Legenda Mobile - Grid 2 colunas organizado */}
              <div className="w-full bg-background/60 rounded-lg p-2">
                <div className="grid grid-cols-1 gap-1">
                  {[...pieChartData.mainItems, ...(pieChartData.othersItem ? [pieChartData.othersItem] : [])].map((item) => (
                    <div 
                      key={item.key} 
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div 
                          className="w-3 h-3 rounded shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-foreground truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatMoney(item.value)}
                        </span>
                        <span className="text-xs font-semibold text-primary tabular-nums w-10 text-right">
                          {item.percent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Itens negativos (valorização) no mobile */}
                  {pieChartData.negativeItems?.map((item) => (
                    <div 
                      key={item.key} 
                      className="flex items-center justify-between py-1 px-2 rounded bg-green-50/50 dark:bg-green-950/20"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div 
                          className="w-3 h-3 rounded shrink-0 border-2 border-dashed"
                          style={{ borderColor: item.color, backgroundColor: 'transparent' }}
                        />
                        <span className="text-xs text-foreground truncate">
                          {item.label}
                          <span className="text-[9px] text-green-600 dark:text-green-400 ml-1">*</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-green-600 dark:text-green-400 tabular-nums">
                          {formatMoney(item.value)}
                        </span>
                        <span className="text-[10px] text-muted-foreground w-10 text-right">
                          N/A
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Nota explicativa mobile */}
                {pieChartData.negativeItems && pieChartData.negativeItems.length > 0 && (
                  <div className="mt-2 text-[9px] text-green-600 dark:text-green-400">
                    *Valorização não incluída no gráfico
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Bar Chart Mobile
            <div className="w-full">
              {renderBarChart(Math.max(180, pieChartData.allItems.length * 28), 90)}
            </div>
          )}
        </div>
      ) : (
        // Desktop/Tablet Layout: Pizza + Tabela lado a lado
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza SEM labels internos */}
          <div className="flex flex-col items-center">
            <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
              Composição ({chartView === 'annual' ? 'Anual' : 'Mensal'})
            </div>
            <div className="relative" style={{ width: 220, height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      ...pieChartData.mainItems.map(item => ({
                        name: item.label,
                        value: item.value,
                        percent: item.percent,
                        fill: item.color,
                      })),
                      ...(pieChartData.othersItem ? [{
                        name: pieChartData.othersItem.label,
                        value: pieChartData.othersItem.value,
                        percent: pieChartData.othersItem.percent,
                        fill: pieChartData.othersItem.color,
                      }] : []),
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={600}
                  >
                    {pieChartData.mainItems.map((item) => (
                      <Cell key={`pie-${item.key}`} fill={item.color} />
                    ))}
                    {pieChartData.othersItem && (
                      <Cell key="pie-others" fill={pieChartData.othersItem.color} />
                    )}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      const total = chartView === 'annual' ? filteredTotals.annual : filteredTotals.monthly;
                      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                      const othersTooltip = name === 'Outros' && pieChartData.othersItem?.tooltip 
                        ? ` (${pieChartData.othersItem.tooltip})`
                        : '';
                      return [`${formatMoney(value)} (${percent}%)${othersTooltip}`, name];
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div 
                className="absolute pointer-events-none flex flex-col items-center justify-center"
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <span className="text-[10px] text-muted-foreground uppercase">Total</span>
                <span className="text-base font-bold text-primary">
                  {formatMoneyCompact(chartView === 'annual' ? filteredTotals.annual : filteredTotals.monthly)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Tabela de Legenda */}
          <div className="flex flex-col justify-center">
            {renderLegendTable()}
          </div>
        </div>
      )}
      
      {/* Rodapé */}
      <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
        <div className="flex justify-end">
          <div className="text-right">
            <span className="text-xs text-muted-foreground mr-2">
              Total {chartView === 'annual' ? 'Anual' : 'Mensal'} (Filtrado):
            </span>
            <span className="text-sm font-bold text-primary">
              {formatMoney(chartView === 'annual' ? filteredTotals.annual : filteredTotals.monthly)}
            </span>
          </div>
        </div>
        
        {opportunityCostNote && costFilters.opportunityCost !== false && (
          <div className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2">
            <strong>Nota:</strong> {opportunityCostNote}
          </div>
        )}
      </div>
    </div>
  );
};
