import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Car } from 'lucide-react';

/**
 * Skeleton de carregamento para a seleção de veículos
 */
export const VehicleTypeSkeleton: React.FC = () => (
  <div className="grid grid-cols-3 gap-2">
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-16 rounded-lg" />
    ))}
  </div>
);

/**
 * Skeleton de carregamento para os campos de seleção (Marca, Modelo, Ano)
 */
export const SelectFieldSkeleton: React.FC<{ label?: string }> = ({ label }) => (
  <div className="space-y-2">
    {label && <Skeleton className="h-4 w-16" />}
    <Skeleton className="h-9 w-full rounded-lg" />
  </div>
);

/**
 * Skeleton para o resultado do preço FIPE
 */
export const FipePriceResultSkeleton: React.FC = () => (
  <div className="p-6 lg:p-8 rounded-xl bg-muted/50 border border-border animate-pulse">
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-10 w-48 mx-auto" />
      <Skeleton className="h-5 w-64 mx-auto" />
      <div className="pt-4 mt-4 border-t border-border/50">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton para o gráfico de depreciação
 */
export const DepreciationChartSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-6 w-36 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 rounded-lg bg-muted animate-pulse">
            <Skeleton className="h-3 w-16 mx-auto mb-2" />
            <Skeleton className="h-5 w-24 mx-auto" />
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-28" />
      </div>

      {/* Gráfico */}
      <div className="h-[300px] sm:h-[380px] flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <div className="text-sm font-medium">Carregando gráfico...</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton para o gráfico de barras (preço por ano)
 */
export const YearPricesChartSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-4 w-80 mt-1" />
    </CardHeader>
    <CardContent>
      <div className="h-[300px] flex items-end gap-2 p-4 bg-muted/30 rounded-lg">
        {[40, 60, 80, 100, 90, 75, 55, 45, 35, 25].map((height, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1">
            <Skeleton 
              className="w-full rounded-t" 
              style={{ height: `${height * 2}px` }} 
            />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton completo do simulador
 */
export const FipeSimulatorSkeleton: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          Dados do veículo na FIPE
        </CardTitle>
        <CardDescription>
          Carregando dados...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <VehicleTypeSkeleton />
            </div>
            <SelectFieldSkeleton label="Marca" />
            <SelectFieldSkeleton label="Modelo" />
            <SelectFieldSkeleton label="Ano/Modelo" />
          </div>
          
          {/* Right Column */}
          <FipePriceResultSkeleton />
        </div>
      </CardContent>
    </Card>
  </div>
);
