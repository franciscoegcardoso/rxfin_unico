import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Download, 
  Trash2, 
  Loader2,
  Calendar,
  FileSpreadsheet,
  Receipt,
  ArrowDownToLine,
  FolderOpen,
  CreditCard,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { CreditCardImport, useCreditCardImports } from '@/hooks/useCreditCardImports';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useVisibility } from '@/contexts/VisibilityContext';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExtension = (fileName: string) => {
  return fileName.split('.').pop()?.toUpperCase() || 'FILE';
};

const getFileTypeColor = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return 'bg-income/10 text-income border-income/20';
  if (ext === 'xlsx' || ext === 'xls') return 'bg-primary/10 text-primary border-primary/20';
  if (ext === 'pdf') return 'bg-expense/10 text-expense border-expense/20';
  return 'bg-muted text-muted-foreground border-border';
};

interface ImportedFilesSectionProps {
  cardFilter?: string;
}

export function ImportedFilesSection({ cardFilter }: ImportedFilesSectionProps) {
  const { imports, loading, downloadImport, deleteImport } = useCreditCardImports();
  const { isHidden } = useVisibility();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredImports = cardFilter && cardFilter !== 'all'
    ? imports.filter(i => i.card_id === cardFilter)
    : imports;

  const handleDownload = async (importRecord: CreditCardImport) => {
    setDownloadingId(importRecord.id);
    await downloadImport(importRecord);
    setDownloadingId(null);
  };

  const handleDelete = async (importRecord: CreditCardImport) => {
    setDeletingId(importRecord.id);
    await deleteImport(importRecord);
    setDeletingId(null);
  };

  // Calculate totals
  const totalTransactions = filteredImports.reduce((sum, i) => sum + i.transaction_count, 0);
  const totalValue = filteredImports.reduce((sum, i) => sum + i.total_value, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const hasNoImports = imports.length === 0;

  return (
    <div className="space-y-4">
        {/* Summary Cards - Same style as page header */}
        {filteredImports.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Arquivos</p>
                  <p className="text-sm font-bold text-primary truncate">{filteredImports.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-income/10 border-income/30">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-income/20 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-income" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Transações</p>
                  <p className="text-sm font-bold text-income truncate">{totalTransactions}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-expense/10 border-expense/30">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-expense/20 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-expense" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Total Importado</p>
                  <p className="text-sm font-bold text-expense truncate">{formatCurrency(totalValue, isHidden)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-border">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Última Importação</p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {filteredImports.length > 0 
                      ? format(new Date(filteredImports[0].imported_at), "dd/MM/yyyy", { locale: ptBR })
                      : '-'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {hasNoImports ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Nenhuma fatura importada ainda
            </p>
            <p className="text-xs text-muted-foreground/70 max-w-xs">
              Ao importar novas faturas, os arquivos aparecerão aqui com opções para download e exclusão.
            </p>
          </div>
        ) : filteredImports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum arquivo importado para o cartão selecionado.
          </p>
        ) : (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <span className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="text-xs">
                    {isExpanded ? 'Ocultar arquivos' : 'Ver todos os arquivos'}
                  </span>
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {filteredImports.length} {filteredImports.length === 1 ? 'arquivo' : 'arquivos'}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {filteredImports.map((importRecord) => {
                    const isDownloading = downloadingId === importRecord.id;
                    const isDeleting = deletingId === importRecord.id;
                    const fileExt = getFileExtension(importRecord.file_name);
                    const fileTypeColor = getFileTypeColor(importRecord.file_name);
                    
                    return (
                      <div
                        key={importRecord.id}
                        className={cn(
                          "group rounded-lg border bg-card transition-all duration-200",
                          "hover:shadow-sm hover:border-primary/20",
                          isDeleting && "opacity-50"
                        )}
                      >
                        {/* Main Content */}
                        <div className="p-3">
                          <div className="flex items-start gap-3">
                            {/* File Type Badge */}
                            <div className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-lg border shrink-0",
                              fileTypeColor
                            )}>
                              <span className="text-[10px] font-bold">{fileExt}</span>
                            </div>
                            
                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate pr-2" title={importRecord.file_name}>
                                {importRecord.file_name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(importRecord.imported_at), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <span className="text-[11px] text-muted-foreground">•</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {format(new Date(importRecord.imported_at), "HH:mm", { locale: ptBR })}
                                </span>
                                {importRecord.file_size && (
                                  <>
                                    <span className="text-[11px] text-muted-foreground">•</span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {formatFileSize(importRecord.file_size)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleDownload(importRecord)}
                                disabled={isDownloading}
                                title="Baixar arquivo"
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ArrowDownToLine className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-expense hover:bg-expense/10"
                                    disabled={isDeleting}
                                    title="Excluir importação"
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir importação?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação irá excluir o arquivo "{importRecord.file_name}" e todas as {importRecord.transaction_count} transações associadas. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(importRecord)}
                                      className="bg-expense hover:bg-expense/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>

                        {/* Stats Bar */}
                        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30 rounded-b-lg">
                          <div className="flex items-center gap-1.5">
                            <Receipt className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium">
                              {importRecord.transaction_count} transações
                            </span>
                          </div>
                          <span className="text-xs font-bold text-primary">
                            {formatCurrency(importRecord.total_value, isHidden)}
                          </span>
                        </div>
                      </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
    </div>
  );
}
