import React, { useState, useMemo, useCallback } from 'react';
import { ConsolidatedRecord } from '@/hooks/useConsolidatedData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkActions } from './BulkActions';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { Search, CreditCard, FileText, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface ConsolidatedTableProps {
  data: ConsolidatedRecord[];
  loading?: boolean;
  onDeleteSelected: (ids: string[], records: ConsolidatedRecord[]) => Promise<boolean>;
  deleting?: boolean;
}

const PAGE_SIZE = 50;

export const ConsolidatedTable: React.FC<ConsolidatedTableProps> = ({
  data,
  loading,
  onDeleteSelected,
  deleting,
}) => {
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.friendlyName && r.friendlyName.toLowerCase().includes(q)) ||
        r.category.toLowerCase().includes(q)
      );
    }
    if (originFilter !== 'all') result = result.filter(r => r.origin === originFilter);
    if (tipoFilter !== 'all') result = result.filter(r => r.tipo === tipoFilter);
    if (sourceFilter !== 'all') result = result.filter(r => r.source === sourceFilter);
    return result;
  }, [data, search, originFilter, tipoFilter, sourceFilter]);

  const paged = useMemo(() => filtered.slice(0, (page + 1) * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  const allSelected = paged.length > 0 && paged.every(r => selectedIds.has(r.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map(r => r.id)));
    }
  }, [allSelected, paged]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedRecords = useMemo(() => data.filter(r => selectedIds.has(r.id)), [data, selectedIds]);

  const buildExportRows = useCallback(() => {
    const records = selectedIds.size > 0 ? selectedRecords : filtered;
    return records.map(r => ({
      Origem: r.origin === 'lancamento' ? 'Lançamento' : 'Cartão',
      Data: r.date,
      Nome: r.friendlyName || r.name,
      Categoria: r.category,
      Valor: r.value,
      Tipo: r.tipo === 'receita' ? 'Entrada' : 'Saída',
      Fonte: r.source === 'pluggy' ? 'Open Finance' : r.source === 'import' ? 'Importação' : 'Manual',
      Status: r.status,
    }));
  }, [selectedIds, selectedRecords, filtered]);

  const exportExcel = useCallback(() => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    XLSX.writeFile(wb, `dados-financeiros.xlsx`);
  }, [buildExportRows]);

  const exportCSV = useCallback(() => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados-financeiros.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildExportRows]);

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    const success = await onDeleteSelected(ids, selectedRecords);
    if (success) {
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    }
  };

  const lancCount = selectedRecords.filter(r => r.origin === 'lancamento').length;
  const txCount = selectedRecords.filter(r => r.origin === 'cartao').length;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={originFilter} onValueChange={(v) => { setOriginFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="lancamento">Lançamentos</SelectItem>
            <SelectItem value="cartao">Cartão</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="receita">Entradas</SelectItem>
            <SelectItem value="despesa">Saídas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas fontes</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="pluggy">Open Finance</SelectItem>
            <SelectItem value="import">Importação</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} registro(s)
        </span>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={selectedIds.size}
        onExportExcel={exportExcel}
        onExportCSV={exportCSV}
        onDelete={() => setShowDeleteDialog(true)}
        onClearSelection={() => setSelectedIds(new Set())}
        deleting={deleting}
      />

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="w-[70px]">Origem</TableHead>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right w-[120px]">Valor</TableHead>
              <TableHead className="w-[80px]">Tipo</TableHead>
              <TableHead className="w-[100px]">Fonte</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              paged.map((record) => (
                <TableRow key={`${record.origin}-${record.id}`} data-state={selectedIds.has(record.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(record.id)}
                      onCheckedChange={() => toggleOne(record.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {record.origin === 'cartao' ? (
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDate(record.date)}</TableCell>
                  <TableCell className="max-w-[250px] truncate">
                    {record.friendlyName || record.name}
                  </TableCell>
                  <TableCell>
                    {record.category && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {record.category}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${record.tipo === 'receita' ? 'text-income' : 'text-expense'}`}>
                    {formatCurrency(record.value)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.tipo === 'receita' ? 'default' : 'outline'} className="text-xs">
                      {record.tipo === 'receita' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {record.source === 'pluggy' ? 'Open Finance' : record.source === 'import' ? 'Import' : 'Manual'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>
            Carregar mais ({filtered.length - paged.length} restantes)
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      <BulkDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        lancamentoCount={lancCount}
        cartaoCount={txCount}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
};
