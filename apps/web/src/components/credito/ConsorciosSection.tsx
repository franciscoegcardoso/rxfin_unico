import React, { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Consorcio } from '@/types/credito';
import { ConsorcioDialog } from './ConsorcioDialog';
import { useCreditos } from '@/hooks/useCreditos';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { 
  TrendingUp, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface ConsorciosSectionProps {
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
}

export const ConsorciosSection: React.FC<ConsorciosSectionProps> = ({
  dialogOpen: externalDialogOpen,
  onDialogOpenChange,
}) => {
  const {
    consorcios,
    loading,
    loadError,
    refetch,
    addConsorcio,
    updateConsorcio,
    deleteConsorcio,
  } = useCreditos();

  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [editingConsorcio, setEditingConsorcio] = useState<Consorcio | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal
  const dialogOpen = externalDialogOpen !== undefined ? externalDialogOpen : internalDialogOpen;
  const setDialogOpen = onDialogOpenChange || setInternalDialogOpen;

  const handleSave = async (data: any) => {
    if (editingConsorcio) {
      return updateConsorcio(editingConsorcio.id, data);
    }
    return addConsorcio(data);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteConsorcio(deleteConfirm);
    setDeleteConfirm(null);
  };

  // Reset editing when dialog closes
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingConsorcio(null);
    }
    setDialogOpen(open);
  };

  const totalConsorcios = consorcios.reduce((acc, c) => acc + c.valor_carta, 0);

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
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400">Total Consórcios</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{consorcios.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Total cartas: {formatMoney(totalConsorcios)}</p>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            {consorcios.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
                description="Você ainda não cadastrou nenhum consórcio"
                actionLabel="Adicionar primeiro consórcio"
                onAction={() => { setEditingConsorcio(null); setDialogOpen(true); }}
              />
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Carta</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consorcios.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.nome}</p>
                            {c.administradora && (
                              <p className="text-xs text-muted-foreground">{c.administradora}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatMoney(c.valor_carta)}</TableCell>
                        <TableCell>{formatMoney(c.valor_parcela_atual)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{c.parcelas_pagas}/{c.prazo_total}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.contemplado ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Contemplado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                              <Clock className="h-3 w-3 mr-1" />
                              Aguardando
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => { setEditingConsorcio(c); setDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setDeleteConfirm(c.id)}
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

      <ConsorcioDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        consorcio={editingConsorcio}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este consórcio? Esta ação não pode ser desfeita.
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
