import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export interface DeducaoCategoria {
  categoria: string;
  total: number;
}

export interface IrExercicioSummaryAlertas {
  bens_pendentes: number;
  bens_sem_mercado: number;
  anos_sem_import: number[];
}

export interface IrExercicioSummaryData {
  ano_exercicio: number;
  import_id?: string | null;
  patrimonio_declarado_anterior: number;
  patrimonio_declarado_atual: number;
  patrimonio_mercado: number;
  variacao_declarada: number;
  deducoes_por_categoria: DeducaoCategoria[];
  total_deducoes: number;
  alertas: IrExercicioSummaryAlertas;
}

export interface IrExercicioSummaryCardProps {
  anoExercicio?: number;
  onReconcileClick?: () => void;
  onBensDireitosClick?: () => void;
  onImportClick?: () => void;
}

function IrExercicioSummaryCard({
  anoExercicio = new Date().getFullYear(),
}: IrExercicioSummaryCardProps) {
  const [data, setData] = useState<IrExercicioSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deducoesOpen, setDeducoesOpen] = useState(false);

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
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-4 text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  const semDados = !data || data.import_id == null;
  if (semDados) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Importe seu IR para ver o resumo do exercício</p>
          <p className="text-xs text-muted-foreground mb-4">Acesse Meu IR e importe sua declaração.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/meu-ir">Ir para Meu IR</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const anterior = data.patrimonio_declarado_anterior ?? 0;
  const atual = data.patrimonio_declarado_atual ?? 0;
  const mercado = data.patrimonio_mercado ?? 0;
  const variacao = data.variacao_declarada ?? 0;
  const totalDeducoes = data.total_deducoes ?? 0;
  const deducoes = data.deducoes_por_categoria ?? [];
  const alertas = data.alertas ?? { bens_pendentes: 0, bens_sem_mercado: 0, anos_sem_import: [] };
  const { bens_pendentes, bens_sem_mercado, anos_sem_import } = alertas;

  const variacaoPrefix = variacao >= 0 ? '+' : '';
  const variacaoColor = variacao > 0 ? 'text-green-600' : variacao < 0 ? 'text-destructive' : '';

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Seção superior — grid 2x2 KPI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Patrimônio declarado (ano anterior)</p>
            <p className="text-lg font-semibold tabular-nums">{formatBRL(anterior)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Patrimônio (valor mercado)</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-semibold tabular-nums">{formatBRL(mercado)}</p>
              {mercado > 0 && (
                <Badge variant="secondary" className="text-[10px]">Open Finance</Badge>
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Variação declarada</p>
            <p className={cn('text-lg font-semibold tabular-nums', variacaoColor)}>
              {variacaoPrefix}{formatBRL(variacao)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Total deduções</p>
            <p className="text-lg font-semibold tabular-nums">{formatBRL(totalDeducoes)}</p>
          </div>
        </div>

        {/* Alertas inline */}
        {bens_pendentes > 0 && (
          <Alert className="border-amber-500/50 bg-amber-500/10 [&>svg]:text-amber-600">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{bens_pendentes} bens aguardam reconciliação</span>
              <Button asChild variant="link" size="sm" className="h-auto p-0 text-amber-700 dark:text-amber-300">
                <Link to="/meu-ir">Ir para Meu IR</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {bens_sem_mercado > 0 && (
          <Alert className="border-muted bg-muted/30">
            <AlertDescription>
              {bens_sem_mercado} bens sem valor de mercado atualizado
            </AlertDescription>
          </Alert>
        )}
        {anos_sem_import != null && anos_sem_import.length > 0 && (
          <Alert className="border-blue-500/50 bg-blue-500/10 [&>svg]:text-blue-600">
            <AlertDescription>
              Anos sem IR importado: {anos_sem_import.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Seção inferior — Deduções por categoria (colapsável) */}
        {deducoes.length > 0 && (
          <Collapsible open={deducoesOpen} onOpenChange={setDeducoesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between font-normal text-muted-foreground">
                Deduções por categoria
                {deducoesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-2 space-y-1.5 rounded-md border bg-muted/20 p-3 text-sm">
                {deducoes.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{item.categoria || 'Outros'}</span>
                    <span className="font-medium tabular-nums">{formatBRL(item.total ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export default IrExercicioSummaryCard;
