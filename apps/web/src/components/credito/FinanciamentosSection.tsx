import React, { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Financiamento } from '@/types/credito';
import { FinanciamentoDialog } from './FinanciamentoDialog';
import { useCreditos } from '@/hooks/useCreditos';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { 
  Landmark, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Clock
} from 'lucide-react';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface FinanciamentosSectionProps {
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
}

export const FinanciamentosSection: React.FC<FinanciamentosSectionProps> = ({
  dialogOpen: externalDialogOpen,
  onDialogOpenChange,
}) => {
  const {
    financiamentos,
    loading,
    loadError,
    refetch,
    addFinanciamento,
    updateFinanciamento,
    deleteFinanciamento,
  } = useCreditos();

  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [editingFinanciamento, setEditingFinanciamento] = useState<Financiamento | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal
  const dialogOpen = externalDialogOpen !== undefined ? externalDialogOpen : internalDialogOpen;
  const setDialogOpen = onDialogOpenChange || setInternalDialogOpen;

  const handleSave = async (data: any) => {
    if (editingFinanciamento) {
      return updateFinanciamento(editingFinanciamento.id, data);
    }
    return addFinanciamento(data);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteFinanciamento(deleteConfirm);
    setDeleteConfirm(null);
  };

  // Reset editing when dialog closes
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingFinanciamento(null);
    }
    setDialogOpen(open);
  };

  const totalFinanciamentos = financiamentos.reduce((acc, f) => acc + f.saldo_devedor, 0);

  if (loading) {
    return (
      <RXFinLoadingSpinner height="py-12" message="Carregando..." />
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <Button onClick={refetch} variant="outline">Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">Total Financiamentos</p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{financiamentos.length}</p>
              </div>
              <Landmark className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Saldo devedor: {formatMoney(totalFinanciamentos)}</p>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            {financiamentos.length === 0 ? (
              <EmptyState
                icon={<Landmark className="h-6 w-6 text-muted-foreground" />}
                description="Você ainda não cadastrou nenhum financiamento"
                actionLabel="Adicionar primeiro financiamento"
                onAction={() => { setEditingFinanciamento(null); setDialogOpen(true); }}
              />
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Saldo Devedor</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Sistema</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financiamentos.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{f.nome}</p>
                            {f.instituicao_financeira && (
                              <p className="text-xs text-muted-foreground">{f.instituicao_financeira}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatMoney(f.saldo_devedor)}</TableCell>
                        <TableCell>{formatMoney(f.valor_parcela_atual)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{f.parcelas_pagas}/{f.prazo_total}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {f.sistema_amortizacao}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => { setEditingFinanciamento(f); setDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setDeleteConfirm(f.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <FinanciamentoDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        financiamento={editingFinanciamento}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este financiamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
