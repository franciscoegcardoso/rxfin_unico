import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export interface IrBemDetalhe {
  ir_item_index: number;
  ir_item_code: string;
  descricao: string;
  discriminacao: string;
  situacao_anterior: number;
  situacao_atual: number;
  reconciliation_status: 'pending' | 'linked' | 'created' | 'ignored';
  real_name: string | null;
  real_value: number | null;
  delta: number | null;
}

export interface IrGrupo {
  asset_type: string;
  label: string;
  total_declarado: number;
  total_mercado: number | null;
  bens: IrBemDetalhe[];
}

export interface IrBensDireitos {
  ano_calendario: number;
  import_id: string | null;
  grupos: IrGrupo[];
  totais: {
    total_declarado: number;
    total_mercado: number;
    delta: number;
    bens_sem_valor_mercado: number;
  };
  anos_disponiveis: number[];
}

export interface IrBensDireitosTabProps {
  /** Callback para abrir importação (ex.: trocar para tab historico e abrir dialog) */
  onImportIRClick?: () => void;
  /** Callback para ir à reconciliação (ex.: trocar para tab historico onde estão os banners) */
  onNavigateToReconcile?: () => void;
}

export function IrBensDireitosTab({ onImportIRClick, onNavigateToReconcile }: IrBensDireitosTabProps) {
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [data, setData] = useState<IrBensDireitos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_ir_bens_direitos', {
        p_ano_calendario: anoSelecionado,
      });
      if (rpcError) throw rpcError;
      setData((rpcData ?? null) as IrBensDireitos | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar bens e direitos');
    } finally {
      setLoading(false);
    }
  }, [anoSelecionado]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePendingRowClick = (bem: IrBemDetalhe) => {
    if (bem.reconciliation_status !== 'pending') return;
    toast('Vincule este bem ao seu patrimônio', {
      description: 'Conclua a reconciliação na aba Declarações anteriores.',
      action: onNavigateToReconcile
        ? { label: 'Ir para reconciliação', onClick: onNavigateToReconcile }
        : undefined,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        {[1, 2, 3].map((g) => (
          <div key={g} className="rounded-lg border overflow-hidden">
            <Skeleton className="h-12 w-full" />
            <div className="p-2 space-y-2">
              {[1, 2, 3, 4].map((r) => (
                <Skeleton key={r} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const emptyState = data.import_id == null;
  if (emptyState) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma declaração importada</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Importe sua declaração de Imposto de Renda para visualizar bens e direitos por grupo.
          </p>
          <Button onClick={onImportIRClick} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar IR
          </Button>
        </CardContent>
      </Card>
    );
  }

  const anos = data.anos_disponiveis ?? [];
  const tot = data.totais;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-muted-foreground">Ano</label>
        <Select
          value={anoSelecionado != null ? String(anoSelecionado) : '__latest__'}
          onValueChange={(v) => setAnoSelecionado(v === '__latest__' ? null : Number(v))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Mais recente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__latest__">Mais recente</SelectItem>
            {anos.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Patrimônio declarado</p>
            <p className="text-lg font-semibold">{formatBRL(tot.total_declarado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Valor de mercado</p>
            <p className={cn("text-lg font-semibold", tot.total_mercado === 0 && "text-muted-foreground")}>
              {formatBRL(tot.total_mercado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Variação</p>
            <p
              className={cn(
                "text-lg font-semibold",
                tot.delta > 0 && "text-green-600",
                tot.delta < 0 && "text-destructive"
              )}
            >
              {formatBRL(tot.delta)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sem valor de mercado</p>
            <p className="text-lg font-semibold">{tot.bens_sem_valor_mercado}</p>
            {tot.bens_sem_valor_mercado > 0 && (
              <Badge variant="secondary" className="mt-1 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                Atenção
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Accordion type="multiple" className="w-full space-y-2">
        {data.grupos?.map((grupo) => (
          <AccordionItem key={grupo.asset_type} value={grupo.asset_type} className="rounded-lg border px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <span className="font-medium">{grupo.label}</span>
              <span className="text-muted-foreground font-normal ml-2">
                {formatBRL(grupo.total_declarado)}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bem</TableHead>
                    <TableHead className="text-right">Declarado</TableHead>
                    <TableHead className="text-right">Mercado</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupo.bens?.map((bem) => {
                    const statusLabel =
                      bem.reconciliation_status === 'linked'
                        ? 'Vinculado'
                        : bem.reconciliation_status === 'created'
                          ? 'Criado'
                          : bem.reconciliation_status === 'ignored'
                            ? 'Ignorado'
                            : 'Pendente';
                    const isPending = bem.reconciliation_status === 'pending';
                    return (
                      <TableRow
                        key={bem.ir_item_index}
                        className={cn(isPending && "cursor-pointer hover:bg-muted/60")}
                        onClick={() => handlePendingRowClick(bem)}
                      >
                        <TableCell className="max-w-[200px] truncate" title={bem.descricao || bem.discriminacao}>
                          {bem.descricao || bem.discriminacao || '—'}
                        </TableCell>
                        <TableCell className="text-right">{formatBRL(bem.situacao_atual)}</TableCell>
                        <TableCell className="text-right">
                          {bem.real_value != null ? (
                            formatBRL(bem.real_value)
                          ) : (
                            <span className="text-muted-foreground">
                              — <Badge variant="outline" className="text-[10px] ml-1">Pendente</Badge>
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            bem.delta != null && bem.delta > 0 && "text-green-600",
                            bem.delta != null && bem.delta < 0 && "text-destructive"
                          )}
                        >
                          {bem.delta != null ? formatBRL(bem.delta) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={isPending ? 'secondary' : 'default'}
                            className={cn(
                              bem.reconciliation_status === 'linked' && "bg-green-600",
                              bem.reconciliation_status === 'created' && "bg-blue-600",
                              bem.reconciliation_status === 'ignored' && "bg-muted"
                            )}
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
