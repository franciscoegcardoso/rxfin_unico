import React, { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FileBarChart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

export interface IrHistoricoRow {
  ano_calendario: number;
  total_declarado: number;
  total_mercado: number | null;
  total_bens: number;
  bens_pendentes: number;
  bens_vinculados?: number;
  bens_criados?: number;
  bens_ignorados?: number;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

/** Abreviado para eixo Y: "R$ 820k", "R$ 1,2M" */
function formatBRLShort(value: number): string {
  if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(1).replace('.', ',')}M`;
  if (value >= 1e3) return `R$ ${(value / 1e3).toFixed(0)}k`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

const COLOR_DECLARADO = 'var(--color-text-info, #378ADD)';
const COLOR_MERCADO = 'var(--color-text-success, #639922)';

interface ChartPayload {
  ano_calendario: number;
  total_declarado: number;
  total_mercado: number;
  total_bens: number;
  bens_pendentes: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
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

function IrHistoricoPatrimonial() {
  const isMobile = useIsMobile();
  const [data, setData] = useState<IrHistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await (supabase as any)
        .from('ir_historico_patrimonial')
        .select('*')
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
    return <Skeleton className="h-[220px] w-full rounded-lg" />;
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
      <EmptyState
        icon={<FileBarChart className="h-6 w-6 text-muted-foreground" />}
        title="Nenhum histórico disponível"
        description="O histórico de IR será preenchido conforme você cadastra bens, investimentos e realiza declarações."
      />
    );
  }

  const chartData: ChartPayload[] = data.map((r) => ({
    ano_calendario: r.ano_calendario,
    total_declarado: r.total_declarado ?? 0,
    total_mercado: r.total_mercado ?? 0,
    total_bens: r.total_bens ?? 0,
    bens_pendentes: r.bens_pendentes ?? 0,
  }));

  const maxAno = Math.max(...data.map((r) => r.ano_calendario));
  const hasMercado = data.some((r) => (r.total_mercado ?? 0) > 0);

  return (
    <div className="space-y-4 mb-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Evolução patrimonial</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Baseado nos IRs importados</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <XAxis
                  dataKey="ano_calendario"
                  type="category"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => String(v)}
                />
                <YAxis
                  hide={isMobile}
                  tickFormatter={(v) => formatBRLShort(v)}
                  tick={{ fontSize: 11 }}
                  width={56}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="total_declarado"
                  name="Declarado"
                  stroke={COLOR_DECLARADO}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COLOR_DECLARADO }}
                />
                {hasMercado && (
                  <Line
                    type="monotone"
                    dataKey="total_mercado"
                    name="Mercado"
                    stroke={COLOR_MERCADO}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLOR_MERCADO }}
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
              <TableRow className="text-xs">
                <TableHead className="text-xs">Ano</TableHead>
                <TableHead className="text-right text-xs">Declarado</TableHead>
                <TableHead className="text-right text-xs">Mercado</TableHead>
                <TableHead className="text-right text-xs">Bens</TableHead>
                <TableHead className="text-right text-xs">Pendentes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const isLatest = row.ano_calendario === maxAno;
                return (
                  <TableRow
                    key={row.ano_calendario}
                    className={`text-xs ${isLatest ? 'font-medium' : ''}`}
                  >
                    <TableCell className="text-xs">{row.ano_calendario}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {formatBRL(row.total_declarado ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {row.total_mercado != null && row.total_mercado > 0
                        ? formatBRL(row.total_mercado)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.total_bens ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.bens_pendentes ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default IrHistoricoPatrimonial;
