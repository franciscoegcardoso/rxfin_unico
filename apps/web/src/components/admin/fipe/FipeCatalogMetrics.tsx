import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Database, BarChart3, Hash, Calendar, Layers, HardDrive } from 'lucide-react';
import type { FipeAdminSummary } from '@/hooks/useFipeAdminSummary';

interface FipeCatalogMetricsProps {
  data: FipeAdminSummary | null;
}

function MetricRow({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function FipeCatalogMetrics({ data }: FipeCatalogMetricsProps) {
  if (!data?.catalog) return null;
  const c = data.catalog;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricRow icon={Database} value={c.total_entries?.toLocaleString('pt-BR') ?? '—'} label="Entradas no catálogo" />
      <MetricRow icon={BarChart3} value={c.total_price_history?.toLocaleString('pt-BR') ?? '—'} label="Histórico de preços" />
      <MetricRow icon={BarChart3} value={`${c.prices_real?.toLocaleString('pt-BR') ?? 0} / ${c.sentinelas?.toLocaleString('pt-BR') ?? 0}`} label="Preços reais / Sentinelas" />
      <MetricRow icon={Hash} value={c.distinct_fipe_codes?.toLocaleString('pt-BR') ?? '—'} label="FIPE codes distintos" />
      <MetricRow icon={Calendar} value={String(c.total_references ?? '—')} label="Meses de referência" />
      <MetricRow icon={Layers} value={c.latest_reference?.slug ?? '—'} label="Referência mais recente" />
      <MetricRow icon={HardDrive} value={c.storage_price_history ?? '—'} label="Storage price_history" />
      <MetricRow icon={HardDrive} value={c.storage_catalog ?? '—'} label="Storage catalog" />
      <MetricRow icon={BarChart3} value={`${c.coverage_pct ?? 0}%`} label="Cobertura" />
    </div>
  );
}
