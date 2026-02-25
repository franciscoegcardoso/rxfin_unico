import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleRecord } from '@/types/vehicle';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';
import { Info, TrendingUp } from 'lucide-react';
import { ExpandableChartButton } from '@/components/charts/ExpandableChartButton';
import { format, startOfMonth, differenceInDays, addMonths, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MileageHistoryChartProps {
  records: VehicleRecord[];
}

interface OdometerReading {
  date: Date;
  odometer: number;
  vehicleId: string;
  vehicleName: string;
}

interface InterpolatedData {
  month: string;
  monthDate: Date;
  [vehicleName: string]: number | string | Date;
}

// Function to perform linear interpolation
const linearInterpolate = (
  targetDate: Date,
  beforeReading: OdometerReading,
  afterReading: OdometerReading
): number => {
  const totalDays = differenceInDays(afterReading.date, beforeReading.date);
  const daysFromBefore = differenceInDays(targetDate, beforeReading.date);
  
  if (totalDays === 0) return beforeReading.odometer;
  
  const ratio = daysFromBefore / totalDays;
  const interpolatedValue = beforeReading.odometer + (afterReading.odometer - beforeReading.odometer) * ratio;
  
  return Math.round(interpolatedValue);
};

// Get odometer reading for the 1st of a specific month using interpolation
const getInterpolatedOdometer = (
  targetDate: Date,
  sortedReadings: OdometerReading[]
): number | null => {
  if (sortedReadings.length === 0) return null;
  
  // Find the reading immediately before and after the target date
  let beforeReading: OdometerReading | null = null;
  let afterReading: OdometerReading | null = null;
  
  for (let i = 0; i < sortedReadings.length; i++) {
    const reading = sortedReadings[i];
    const readingDate = reading.date;
    
    if (isBefore(readingDate, targetDate) || readingDate.getTime() === targetDate.getTime()) {
      beforeReading = reading;
    }
    
    if ((isAfter(readingDate, targetDate) || readingDate.getTime() === targetDate.getTime()) && !afterReading) {
      afterReading = reading;
      break;
    }
  }
  
  // If we have an exact match
  if (beforeReading && beforeReading.date.getTime() === targetDate.getTime()) {
    return beforeReading.odometer;
  }
  
  // If we have both before and after, interpolate
  if (beforeReading && afterReading) {
    return linearInterpolate(targetDate, beforeReading, afterReading);
  }
  
  // If we only have readings before, extrapolate forward (but only for the current/next month)
  if (beforeReading && !afterReading) {
    const daysSinceLast = differenceInDays(targetDate, beforeReading.date);
    if (daysSinceLast <= 31) {
      return beforeReading.odometer; // Use the last known value for recent dates
    }
  }
  
  return null;
};

export const MileageHistoryChart: React.FC<MileageHistoryChartProps> = ({ records }) => {
  // Process records to get odometer readings by vehicle
  const chartData = useMemo(() => {
    if (records.length === 0) return [];
    
    // Group records by vehicle
    const vehicleReadings: Record<string, OdometerReading[]> = {};
    const vehicleNames = new Set<string>();
    
    records.forEach(record => {
      const reading: OdometerReading = {
        date: new Date(record.date),
        odometer: record.odometer,
        vehicleId: record.vehicleId,
        vehicleName: record.vehicleName,
      };
      
      if (!vehicleReadings[record.vehicleId]) {
        vehicleReadings[record.vehicleId] = [];
      }
      vehicleReadings[record.vehicleId].push(reading);
      vehicleNames.add(record.vehicleName);
    });
    
    // Sort readings by date for each vehicle
    Object.keys(vehicleReadings).forEach(vehicleId => {
      vehicleReadings[vehicleId].sort((a, b) => a.date.getTime() - b.date.getTime());
    });
    
    // Find the date range
    const allDates = records.map(r => new Date(r.date));
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Generate months from first record to last record (plus one month)
    const months: Date[] = [];
    let currentMonth = startOfMonth(minDate);
    const endMonth = addMonths(startOfMonth(maxDate), 1);
    
    while (isBefore(currentMonth, endMonth) || currentMonth.getTime() === endMonth.getTime()) {
      months.push(currentMonth);
      currentMonth = addMonths(currentMonth, 1);
    }
    
    // Create interpolated data for each month
    const data: InterpolatedData[] = months.map(monthDate => {
      const monthData: InterpolatedData = {
        month: format(monthDate, 'MMM/yy', { locale: ptBR }),
        monthDate,
      };
      
      // For each vehicle, get the interpolated odometer reading
      Object.entries(vehicleReadings).forEach(([vehicleId, readings]) => {
        const vehicleName = readings[0].vehicleName;
        const interpolatedValue = getInterpolatedOdometer(monthDate, readings);
        if (interpolatedValue !== null) {
          monthData[vehicleName] = interpolatedValue;
        }
      });
      
      return monthData;
    });
    
    // Filter out months where no vehicle has data
    return data.filter(d => {
      const keys = Object.keys(d).filter(k => k !== 'month' && k !== 'monthDate');
      return keys.some(k => typeof d[k] === 'number');
    });
  }, [records]);

  // Get unique vehicle names for the legend
  const vehicleNames = useMemo(() => {
    const names = new Set<string>();
    records.forEach(r => names.add(r.vehicleName));
    return Array.from(names);
  }, [records]);

  // Color palette for vehicles
  const colors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Histórico de Quilometragem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Adicione registros com quilometragem para visualizar o histórico.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Histórico de Quilometragem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>São necessários registros em pelo menos 2 meses diferentes para gerar o gráfico.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Histórico de Evolução de Quilometragem
        </CardTitle>
        <ExpandableChartButton title="Histórico de Evolução de Quilometragem">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid {...premiumGrid} />
              <XAxis dataKey="month" {...premiumXAxis} />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} {...premiumYAxis} domain={['dataMin - 1000', 'dataMax + 1000']} />
              <Tooltip formatter={(value: number, name: string) => [`${value.toLocaleString('pt-BR')} km`, name]} labelFormatter={(label) => `1º de ${label}`} contentStyle={premiumTooltipStyle} />
              <Legend />
              {vehicleNames.map((name, index) => (
                <Line key={name} type="monotone" dataKey={name} name={name} stroke={colors[index % colors.length]} strokeWidth={3} dot={{ r: 3, fill: colors[index % colors.length] }} activeDot={{ r: 5, stroke: 'hsl(var(--background))', strokeWidth: 2 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ExpandableChartButton>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid {...premiumGrid} />
              <XAxis 
                dataKey="month" 
                {...premiumXAxis}
              />
              <YAxis 
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                {...premiumYAxis}
                domain={['dataMin - 1000', 'dataMax + 1000']}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString('pt-BR')} km`,
                  name
                ]}
                labelFormatter={(label) => `1º de ${label}`}
                contentStyle={premiumTooltipStyle}
              />
              <Legend />
              {vehicleNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={name}
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={{ r: 3, fill: colors[index % colors.length] }}
                  activeDot={{ r: 5, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Info Card - Explanation */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Como este gráfico é calculado?</p>
            <p>
              Como os registros de odômetro nem sempre ocorrem no dia exato da virada do mês, 
              este gráfico utiliza uma <strong className="text-foreground">média ponderada diária (interpolação linear)</strong> entre 
              seus registros reais para estimar a quilometragem provável no dia 1º de cada mês. 
              Isso permite uma visão comparativa padronizada da evolução do uso do veículo ao longo do tempo.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
