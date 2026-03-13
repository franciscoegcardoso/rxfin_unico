import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface IrHistoricoRow {
  ano_calendario: number;
  total_declarado: number;
  total_mercado: number | null;
  total_bens: number;
  bens_pendentes: number;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

/** Abreviado para eixo Y: "R$ 820k", "R$ 1,2M" */
function formatBRLShort(value: number): string {
  if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(1).replace('.', ',')}M`;
  if (value >= 1e3) return `R$ ${(value / 1e3).toFixed(0)}k`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

interface ChartPayload {
  ano_calendario: number;
  total_declarado: number;
  total_mercado: number;
  total_bens: number;
  bens_pendentes: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length || label == null) return null;
  const row = payload[0]?.payload as ChartPayload | undefined;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-sm">
      <p className="font-semibold mb-1.5">Ano {label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
      {row != null && (
        <>
          <p className="text-muted-foreground mt-1">Total bens: {row.total_bens}</p>
          {row.bens_pendentes > 0 && (
            <p className="text-amber-600 dark:text-amber-400">Pendentes: {row.bens_pendentes}</p>
          )}
        </>
      )}
    </div>
  );
}

export function IrHistoricoPatrimonial() {
  const [data, setData] = useState<IrHistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await (supabase as any)
        .from('ir_historico_patrimonial')
        .select('ano_calendario, total_declarado, total_mercado, total_bens, bens_pendentes')
        .order('ano_calendario', { ascending: true });
      if (err) throw err;
      setData((rows ?? []) as IrHistoricoRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-4 text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (data.length < 2) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="font-medium text-foreground">Importe mais de um IR para ver a evolução do patrimônio</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Com pelo menos duas declarações importadas, o gráfico mostrará a evolução do patrimônio declarado e de mercado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData: ChartPayload[] = data.map((r) => ({
    ano_calendario: r.ano_calendario,
    total_declarado: r.total_declarado ?? 0,
    total_mercado: r.total_mercado ?? 0,
    total_bens: r.total_bens ?? 0,
    bens_pendentes: r.bens_pendentes ?? 0,
  }));

  const hasMercado = data.some((r) => (r.total_mercado ?? 0) > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <XAxis
                  dataKey="ano_calendario"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => String(v)}
                />
                <YAxis
                  tickFormatter={(v) => formatBRLShort(v)}
                  tick={{ fontSize: 11 }}
                  width={56}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total_declarado"
                  name="Declarado (IR)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                />
                {hasMercado && (
                  <Line
                    type="monotone"
                    dataKey="total_mercado"
                    name="Mercado"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: 'hsl(var(--muted-foreground))' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano</TableHead>
                <TableHead className="text-right">Declarado</TableHead>
                <TableHead className="text-right">Mercado</TableHead>
                <TableHead className="text-right">Bens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.ano_calendario}>
                  <TableCell className="font-medium">{row.ano_calendario}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(row.total_declarado ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.total_mercado != null && row.total_mercado > 0
                      ? formatBRL(row.total_mercado)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.total_bens ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
