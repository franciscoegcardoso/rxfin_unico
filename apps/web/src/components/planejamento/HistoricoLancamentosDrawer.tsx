import React, { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, formatCompactCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Search,
  Calendar,
  Trash2,
  Download,
} from 'lucide-react';
import { LancamentoRealizado } from '@/hooks/useLancamentosRealizados';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HistoricoLancamentosDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamentos: LancamentoRealizado[];
  onDelete: (id: string) => Promise<boolean>;
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year}`;
};

export function HistoricoLancamentosDrawer({
  open,
  onOpenChange,
  lancamentos,
  onDelete,
  loading,
}: HistoricoLancamentosDrawerProps) {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'receita' | 'despesa'>('all');
  const [mesFilter, setMesFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Get unique months
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set(lancamentos.map(l => l.mes_referencia));
    return Array.from(meses).sort().reverse();
  }, [lancamentos]);

  // Filter lancamentos
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(l => {
      if (tipoFilter !== 'all' && l.tipo !== tipoFilter) return false;
      if (mesFilter !== 'all' && l.mes_referencia !== mesFilter) return false;
      if (search && !l.nome.toLowerCase().includes(search.toLowerCase()) && 
          !l.categoria.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [lancamentos, tipoFilter, mesFilter, search]);

  // Group by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, LancamentoRealizado[]> = {};
    filteredLancamentos.forEach(l => {
      if (!groups[l.mes_referencia]) {
        groups[l.mes_referencia] = [];
      }
      groups[l.mes_referencia].push(l);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredLancamentos]);

  // Totals
  const totals = useMemo(() => {
    const receitas = filteredLancamentos
      .filter(l => l.tipo === 'receita')
      .reduce((sum, l) => sum + l.valor_realizado, 0);
    const despesas = filteredLancamentos
      .filter(l => l.tipo === 'despesa')
      .reduce((sum, l) => sum + l.valor_realizado, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [filteredLancamentos]);

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Mês', 'Tipo', 'Categoria', 'Nome', 'Previsto', 'Realizado', 'Data Pagamento', 'Data Registro'];
    const rows = filteredLancamentos.map(l => [
      l.mes_referencia,
      l.tipo,
      l.categoria,
      l.nome,
      l.valor_previsto,
      l.valor_realizado,
      l.data_pagamento || '',
      l.data_registro,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lancamentos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Lançamentos
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou categoria..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mesFilter} onValueChange={setMesFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {mesesDisponiveis.map(mes => (
                    <SelectItem key={mes} value={mes}>
                      {formatMonthLabel(mes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={exportToCSV} title="Exportar CSV" aria-label="Exportar CSV">
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-income/10 border border-income/20">
                <p className="text-[10px] text-muted-foreground">Receitas</p>
                <p className="text-sm font-bold text-income truncate">{formatCompactCurrency(totals.receitas)}</p>
              </div>
              <div className="p-2 rounded-lg bg-expense/10 border border-expense/20">
                <p className="text-[10px] text-muted-foreground">Despesas</p>
                <p className="text-sm font-bold text-expense truncate">{formatCompactCurrency(totals.despesas)}</p>
              </div>
              <div className={cn(
                "p-2 rounded-lg border",
                totals.saldo >= 0 ? "bg-income/10 border-income/20" : "bg-expense/10 border-expense/20"
              )}>
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className={cn(
                  "text-sm font-bold truncate",
                  totals.saldo >= 0 ? "text-income" : "text-expense"
                )}>
                  {formatCompactCurrency(totals.saldo)}
                </p>
              </div>
            </div>

            {/* Lancamentos List */}
            <ScrollArea className="h-[calc(100vh-320px)]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : groupedByMonth.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado.
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedByMonth.map(([mes, items]) => (
                    <div key={mes} className="space-y-2">
                      <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{formatMonthLabel(mes)}</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {items.length} lançamentos
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Previsto</TableHead>
                            <TableHead className="text-right">Realizado</TableHead>
                            <TableHead>Data Pgto</TableHead>
                            <TableHead>Registro</TableHead>
                            <TableHead className="w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {item.tipo === 'receita' ? (
                                  <TrendingUp className="h-4 w-4 text-income" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-expense" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{item.nome}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {item.categoria}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(item.valor_previsto)}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-medium",
                                item.tipo === 'receita' ? "text-income" : "text-expense"
                              )}>
                                {formatCurrency(item.valor_realizado)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {item.data_pagamento 
                                  ? format(new Date(item.data_pagamento), 'dd/MM/yy')
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(item.data_registro), 'dd/MM/yy HH:mm', { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteId(item.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
