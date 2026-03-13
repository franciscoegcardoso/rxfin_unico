import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export interface DeducaoCategoria {
  categoria?: string;
  label?: string;
  valor?: number;
}

export interface IrExercicioSummaryData {
  ano_exercicio?: number;
  ano_calendario?: number;
  patrimonio_declarado?: number;
  valor_mercado?: number;
  variacao_declarada?: number;
  total_deducoes?: number;
  deducoes_por_categoria?: DeducaoCategoria[];
  bens_pendentes?: number;
  bens_sem_valor_mercado?: number;
  tem_import_atual?: boolean;
}

const MAX_CATEGORIAS = 3;

export interface IrExercicioSummaryCardProps {
  anoExercicio?: number;
  onReconcileClick?: () => void;
  onBensDireitosClick?: () => void;
  onImportClick?: () => void;
}

export function IrExercicioSummaryCard({
  anoExercicio = new Date().getFullYear(),
  onReconcileClick,
  onBensDireitosClick,
  onImportClick,
}: IrExercicioSummaryCardProps) {
  const [data, setData] = useState<IrExercicioSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_ir_exercicio_summary', {
        p_ano_exercicio: anoExercicio,
      });
      if (rpcError) throw rpcError;
      setData((rpcData ?? null) as IrExercicioSummaryData | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar resumo');
    } finally {
      setLoading(false);
    }
  }, [anoExercicio]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-4 text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const d = data as IrExercicioSummaryData;
  const patrimonioDeclarado = d.patrimonio_declarado ?? 0;
  const valorMercado = d.valor_mercado ?? 0;
  const variacaoDeclarada = d.variacao_declarada ?? 0;
  const totalDeducoes = d.total_deducoes ?? 0;
  const deducoesList = d.deducoes_por_categoria ?? [];
  const bensPendentes = d.bens_pendentes ?? 0;
  const bensSemValorMercado = d.bens_sem_valor_mercado ?? 0;
  const temImportAtual = d.tem_import_atual ?? false;
  const anoCalendario = d.ano_calendario ?? anoExercicio;

  const variacaoPrefix = variacaoDeclarada >= 0 ? '+' : '';
  const variacaoColor = variacaoDeclarada > 0 ? 'text-green-600' : variacaoDeclarada < 0 ? 'text-destructive' : '';

  const categoriasExibir = deducoesList.slice(0, MAX_CATEGORIAS);
  const restante = deducoesList.length - MAX_CATEGORIAS;

  return (
    <div className="space-y-4">
      {/* Bloco 1 — Grid 2×2 KPI */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Patrimônio declarado</p>
            <p className="text-sm text-muted-foreground/80">ano-calendário atual</p>
            <p className="text-lg font-semibold mt-1">{formatBRL(patrimonioDeclarado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Valor de mercado</p>
            <p className="text-sm text-muted-foreground/80">bens reconciliados</p>
            <p className="text-lg font-semibold mt-1">{formatBRL(valorMercado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Variação declarada</p>
            <p className="text-sm text-muted-foreground/80">vs. ano anterior</p>
            <p className={cn('text-lg font-semibold mt-1', variacaoColor)}>
              {variacaoPrefix}{formatBRL(variacaoDeclarada)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total deduções</p>
            <p className="text-sm text-muted-foreground/80">ano-calendário</p>
            <p className="text-lg font-semibold mt-1">{formatBRL(totalDeducoes)}</p>
            {categoriasExibir.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {categoriasExibir.map((item, i) => (
                  <li key={i}>
                    {(item.label ?? item.categoria ?? 'Outros')}: {formatBRL(item.valor ?? 0)}
                  </li>
                ))}
                {restante > 0 && (
                  <li className="text-muted-foreground/80">…e mais {restante}</li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloco 2 — Alertas */}
      <div className="space-y-2">
        {bensPendentes > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {bensPendentes} bens aguardam reconciliação
            </span>
            <Button variant="outline" size="sm" className="border-amber-600/50 text-amber-800 dark:text-amber-200" onClick={onReconcileClick}>
              Reconciliar agora
            </Button>
          </div>
        )}
        {bensSemValorMercado > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {bensSemValorMercado} bens sem valor de mercado
            </span>
            <Button variant="outline" size="sm" className="border-blue-600/50 text-blue-800 dark:text-blue-200" onClick={onBensDireitosClick}>
              Atualizar valores
            </Button>
          </div>
        )}
        {!temImportAtual && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">
              IR {anoCalendario} não importado
            </span>
            <Button variant="outline" size="sm" onClick={onImportClick}>
              Importar agora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
