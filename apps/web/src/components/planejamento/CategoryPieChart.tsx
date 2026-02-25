import React, { useState } from 'react';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpandableChartButton } from '@/components/charts/ExpandableChartButton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { premiumTooltipStyle } from '@/components/charts/premiumChartTheme';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

interface CategoryData {
  name: string;
  planejado: number;
  realizado: number;
}

interface CategoryPieChartProps {
  selectedMonth?: string;
  categoryData?: CategoryData[];
}

const mockCategoryData: CategoryData[] = [
  { name: 'Moradia', planejado: 2800, realizado: 2500 },
  { name: 'Alimentação', planejado: 1500, realizado: 1200 },
  { name: 'Transporte', planejado: 1000, realizado: 800 },
  { name: 'Saúde', planejado: 800, realizado: 600 },
  { name: 'Lazer', planejado: 600, realizado: 500 },
  { name: 'Outros', planejado: 400, realizado: 400 },
];

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ selectedMonth, categoryData }) => {
  const { isHidden } = useVisibility();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'realizado' | 'planejado'>('realizado');

  const data = categoryData || mockCategoryData;

  const chartData = data.map((d, i) => ({
    name: d.name,
    value: isHidden ? 0 : (viewMode === 'realizado' ? d.realizado : d.planejado),
    color: COLORS[i % COLORS.length],
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold whitespace-nowrap">Despesas por Categoria</CardTitle>
          <ExpandableChartButton title="Despesas por Categoria">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={150} paddingAngle={2} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-exp-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => (isHidden ? '••••' : `R$ ${v.toLocaleString('pt-BR')}`)}
                  contentStyle={premiumTooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </ExpandableChartButton>
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as 'realizado' | 'planejado')}
          size="sm"
          className="justify-start mt-1"
        >
          <ToggleGroupItem value="realizado" className="text-xs px-3">
            Realizado
          </ToggleGroupItem>
          <ToggleGroupItem value="planejado" className="text-xs px-3">
            Planejado
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => (isHidden ? '••••' : `R$ ${v.toLocaleString('pt-BR')}`)}
                contentStyle={premiumTooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {chartData.map(cat => (
            <div key={cat.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-muted-foreground">{cat.name}</span>
              </div>
              <span className="font-medium text-foreground">
                {isHidden ? '••••' : `R$ ${cat.value.toLocaleString('pt-BR')}`}
              </span>
            </div>
          ))}
        </div>
        {!isHidden && total > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm font-semibold">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground">R$ {total.toLocaleString('pt-BR')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
