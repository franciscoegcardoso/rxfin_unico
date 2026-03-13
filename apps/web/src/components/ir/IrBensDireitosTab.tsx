import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const truncate = (s: string, max: number) =>
  s.length <= max ? s : s.slice(0, max) + '…';

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
  asset_id: string | null;
  user_asset_id: string | null;
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
  anos_disponiveis: number[];
  grupos: IrGrupo[];
  totais: {
    total_declarado: number;
    total_mercado: number;
    delta: number;
    bens_sem_valor_mercado: number;
  };
}

export interface IrBensDireitosTabProps {
  anoCalendario?: number;
  /** Opcional: usado pela página Meu IR para abrir importação (componente usa link /meu-ir se não informado) */
  onImportIRClick?: () => void;
  /** Opcional: usado pela página Meu IR para ir à reconciliação */
  onNavigateToReconcile?: () => void;
}

function IrBensDireitosTab({ anoCalendario: anoCalendarioProp }: IrBensDireitosTabProps) {
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(anoCalendarioProp ?? null);
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

  useEffect(() => {
    if (anoCalendarioProp != null && anoSelecionado !== anoCalendarioProp) {
      setAnoSelecionado(anoCalendarioProp);
    }
  }, [anoCalendarioProp]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-md" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((g) => (
            <div key={g} className="rounded-md overflow-hidden">
              <Skeleton className="h-12 w-full" />
              <div className="p-2 space-y-2">
                {[1, 2, 3, 4].map((r) => (
                  <Skeleton key={r} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-muted-foreground text-center">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const semImport = data.import_id == null;
  if (semImport) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-sm font-medium text-foreground mb-1">Importe seu IR para ver os bens declarados</p>
        <p className="text-xs text-muted-foreground mb-4">Acesse Meu IR e importe sua declaração.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/meu-ir">Ir para Meu IR</Link>
        </Button>
      </div>
    );
  }

  const anos = data.anos_disponiveis ?? [];
  const tot = data.totais;
  const hasBens = (data.grupos?.length ?? 0) > 0 && data.grupos.some((g) => (g.bens?.length ?? 0) > 0);

  if (!hasBens) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-[13px] text-muted-foreground">Ano</label>
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
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum bem declarado encontrado para este ano.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-[13px] text-muted-foreground">Ano</label>
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
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md bg-secondary p-4">
          <p className="text-[13px] text-muted-foreground mb-1">Total declarado</p>
          <p className="text-2xl font-medium tabular-nums">{formatBRL(tot.total_declarado)}</p>
        </div>
        <div className="rounded-md bg-secondary p-4">
          <p className="text-[13px] text-muted-foreground mb-1">Total mercado</p>
          <p className={cn('text-2xl font-medium tabular-nums', (tot.total_mercado ?? 0) === 0 && 'text-muted-foreground')}>
            {formatBRL(tot.total_mercado ?? 0)}
          </p>
        </div>
        <div className="rounded-md bg-secondary p-4">
          <p className="text-[13px] text-muted-foreground mb-1">Variação</p>
          <p
            className={cn(
              'text-2xl font-medium tabular-nums',
              (tot.delta ?? 0) > 0 && 'text-green-600',
              (tot.delta ?? 0) < 0 && 'text-destructive'
            )}
          >
            {(tot.delta ?? 0) >= 0 ? '+' : ''}{formatBRL(tot.delta ?? 0)}
          </p>
        </div>
        <div className="rounded-md bg-secondary p-4">
          <p className="text-[13px] text-muted-foreground mb-1">Bens s/ valor mercado</p>
          <p className="text-2xl font-medium tabular-nums">{tot.bens_sem_valor_mercado ?? 0}</p>
        </div>
      </div>

      <Accordion type="multiple" className="w-full space-y-2">
        {data.grupos?.map((grupo) => (
          <AccordionItem key={grupo.asset_type} value={grupo.asset_type} className="rounded-lg border px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <span className="font-medium">{grupo.label}</span>
              <span className="text-muted-foreground font-normal ml-2">
                {formatBRL(grupo.total_declarado)}
              </span>
              {(grupo.total_mercado ?? 0) > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
                  · Mercado {formatBRL(grupo.total_mercado!)}
                </span>
              )}
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
                      bem.reconciliation_status === 'linked' ? 'Vinculado'
                      : bem.reconciliation_status === 'created' ? 'Criado'
                      : bem.reconciliation_status === 'ignored' ? 'Ignorado'
                      : 'Pendente';
                    const desc = (bem.descricao || bem.discriminacao || '—').trim();
                    const bemLabel = truncate(desc, 40);
                    const badgeVariant =
                      bem.reconciliation_status === 'pending' ? 'outline'
                      : bem.reconciliation_status === 'linked' ? 'default'
                      : bem.reconciliation_status === 'created' ? 'secondary'
                      : 'destructive';
                    return (
                      <TableRow key={bem.ir_item_index}>
                        <TableCell className="max-w-[240px]" title={desc}>
                          {bemLabel}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatBRL(bem.situacao_atual)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {bem.real_value != null ? formatBRL(bem.real_value) : '—'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums font-medium',
                            bem.delta != null && bem.delta > 0 && 'text-green-600',
                            bem.delta != null && bem.delta < 0 && 'text-destructive'
                          )}
                        >
                          {bem.delta != null
                            ? `${bem.delta >= 0 ? '+' : ''}${formatBRL(bem.delta)}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={badgeVariant as 'outline' | 'default' | 'secondary' | 'destructive'}>
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

export default IrBensDireitosTab;
