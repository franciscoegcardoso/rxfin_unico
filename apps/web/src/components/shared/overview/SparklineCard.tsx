import React, { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SparklineCardProps {
  data: Array<{ date: string; total_brl: number }>;
  isLoading?: boolean;
}

export const SparklineCard: React.FC<SparklineCardProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Evolução patrimonial (investimentos)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-muted rounded-md h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Sem dados de evolução ainda</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d, i) => ({ i, v: d.total_brl, date: d.date }));

  return (
    <Card className="border-border">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium">Evolução patrimonial (investimentos)</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="#10b981"
              strokeWidth={2}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
