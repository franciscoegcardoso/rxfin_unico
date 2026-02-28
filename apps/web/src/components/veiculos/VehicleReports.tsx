import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleRecord, vehicleExpenseCategoryLabels, vehicleServiceTypeLabels, vehicleFuelTypeLabels } from '@/types/vehicle';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, Fuel, PieChart as PieChartIcon, Gauge } from 'lucide-react';
import { MileageHistoryChart } from './MileageHistoryChart';
interface VehicleReportsProps {
  records: VehicleRecord[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export const VehicleReports: React.FC<VehicleReportsProps> = ({ records }) => {
  // Monthly evolution data
  const monthlyData = useMemo(() => {
    const groupedByMonth: Record<string, { total: number; fuel: number; expenses: number; services: number }> = {};
    
    records.forEach((record) => {
      const month = record.date.substring(0, 7); // YYYY-MM
      if (!groupedByMonth[month]) {
        groupedByMonth[month] = { total: 0, fuel: 0, expenses: 0, services: 0 };
      }
      
      if (record.type === 'fuel') {
        groupedByMonth[month].fuel += record.totalAmount;
        groupedByMonth[month].total += record.totalAmount;
      } else if (record.type === 'expense') {
        groupedByMonth[month].expenses += record.amount;
        groupedByMonth[month].total += record.amount;
      } else if (record.type === 'service') {
        groupedByMonth[month].services += record.amount;
        groupedByMonth[month].total += record.amount;
      }
    });

    return Object.entries(groupedByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        ...data,
      }));
  }, [records]);

  // Expense composition
  const compositionData = useMemo(() => {
    const totals: Record<string, number> = {
      'Combustível': 0,
      'Despesas': 0,
      'Serviços': 0,
    };

    records.forEach((record) => {
      if (record.type === 'fuel') {
        totals['Combustível'] += record.totalAmount;
      } else if (record.type === 'expense') {
        totals['Despesas'] += record.amount;
      } else if (record.type === 'service') {
        totals['Serviços'] += record.amount;
      }
    });

    return Object.entries(totals)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [records]);

  // Detailed expense breakdown
  const expenseBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};

    records.forEach((record) => {
      if (record.type === 'expense') {
        const label = vehicleExpenseCategoryLabels[record.category];
        breakdown[label] = (breakdown[label] || 0) + record.amount;
      } else if (record.type === 'service') {
        const label = vehicleServiceTypeLabels[record.serviceType];
        breakdown[label] = (breakdown[label] || 0) + record.amount;
      } else if (record.type === 'fuel') {
        const label = vehicleFuelTypeLabels[record.fuelType];
        breakdown[label] = (breakdown[label] || 0) + record.totalAmount;
      }
    });

    return Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [records]);

  // Calculate km/L based on full tank records
  const fuelEfficiency = useMemo(() => {
    const fuelRecords = records
      .filter((r): r is Extract<VehicleRecord, { type: 'fuel' }> => r.type === 'fuel')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const efficiencyByVehicle: Record<string, { totalKm: number; totalLiters: number; readings: number }> = {};

    for (let i = 1; i < fuelRecords.length; i++) {
      const current = fuelRecords[i];
      const previous = fuelRecords[i - 1];
      
      // Only calculate if both records are from the same vehicle and current is a full tank
      if (current.vehicleId === previous.vehicleId && current.isFullTank && current.unit === 'liter') {
        const kmDiff = current.odometer - previous.odometer;
        if (kmDiff > 0 && current.quantity > 0) {
          if (!efficiencyByVehicle[current.vehicleId]) {
            efficiencyByVehicle[current.vehicleId] = { totalKm: 0, totalLiters: 0, readings: 0 };
          }
          efficiencyByVehicle[current.vehicleId].totalKm += kmDiff;
          efficiencyByVehicle[current.vehicleId].totalLiters += current.quantity;
          efficiencyByVehicle[current.vehicleId].readings++;
        }
      }
    }

    const results: { vehicle: string; kmPerLiter: number; readings: number }[] = [];
    
    Object.entries(efficiencyByVehicle).forEach(([vehicleId, data]) => {
      if (data.totalLiters > 0) {
        const vehicleName = fuelRecords.find(r => r.vehicleId === vehicleId)?.vehicleName || vehicleId;
        results.push({
          vehicle: vehicleName,
          kmPerLiter: Math.round((data.totalKm / data.totalLiters) * 100) / 100,
          readings: data.readings,
        });
      }
    });

    return results;
  }, [records]);

  // Overall average km/L
  const overallKmPerLiter = useMemo(() => {
    const totalKm = fuelEfficiency.reduce((acc, v) => acc + (v.kmPerLiter * v.readings), 0);
    const totalReadings = fuelEfficiency.reduce((acc, v) => acc + v.readings, 0);
    return totalReadings > 0 ? Math.round((totalKm / totalReadings) * 100) / 100 : 0;
  }, [fuelEfficiency]);

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Adicione registros para ver os relatórios</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mileage History Chart */}
      <MileageHistoryChart records={records} />
      {/* KM/L Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média km/L</p>
                <p className="text-2xl font-bold text-primary">
                  {overallKmPerLiter > 0 ? `${overallKmPerLiter.toLocaleString('pt-BR')} km/L` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {fuelEfficiency.map((vehicle, index) => (
          <Card key={vehicle.vehicle}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <Fuel className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground truncate">{vehicle.vehicle}</p>
                  <p className="text-xl font-bold text-foreground">
                    {vehicle.kmPerLiter.toLocaleString('pt-BR')} km/L
                  </p>
                  <p className="text-xs text-muted-foreground">{vehicle.readings} medição(ões)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution - Total */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução Mensal - Despesas Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Total']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados suficientes</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Evolution - Fuel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fuel className="h-5 w-5 text-primary" />
              Evolução Mensal - Combustível
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Combustível']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fuel" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados suficientes</p>
            )}
          </CardContent>
        </Card>

        {/* Expense Composition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Composição dos Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {compositionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={compositionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {compositionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados suficientes</p>
            )}
          </CardContent>
        </Card>

        {/* Detailed Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={expenseBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados suficientes</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};