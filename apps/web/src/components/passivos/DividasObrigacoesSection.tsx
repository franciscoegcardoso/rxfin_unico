import React, { useState } from 'react';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { AddAssetDialog } from '@/components/bens/AddAssetDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFinancial } from '@/contexts/FinancialContext';
import { Asset } from '@/types/financial';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const DividasObrigacoesSection: React.FC = () => {
  const { config, removeAsset } = useFinancial();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const dividas = config.assets.filter(a => a.type === 'obligations' && !a.isSold);
  const total = dividas.reduce((sum, a) => sum + a.value, 0);

  const handleAdd = () => {
    setEditingAsset(null);
    setDialogOpen(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    removeAsset(deleteConfirm);
    setDeleteConfirm(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dívidas e Obrigações</h2>
            {dividas.length > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Total: {formatMoney(total)}
              </p>
            )}
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova dívida
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {dividas.length === 0 ? (
              <EmptyState
                icon={<AlertCircle className="h-6 w-6 text-muted-foreground" />}
                description="Nenhuma dívida ou obrigação cadastrada"
                actionLabel="Adicionar dívida"
                onAction={handleAdd}
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground text-sm">Nome</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-sm hidden sm:table-cell">Credor</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-sm">Saldo Devedor</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-sm w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {dividas.map(a => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="p-3">
                        <p className="font-medium text-foreground">{a.name}</p>
                        {a.description && (
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        )}
                      </td>
                      <td className="p-3 hidden sm:table-cell text-sm text-muted-foreground">
                        {(a as { passivoBanco?: string }).passivoBanco || '—'}
                      </td>
                      <td className="p-3 text-right font-semibold text-destructive">
                        {formatMoney(a.value)}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEdit(a)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(a.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <AddAssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingAsset={editingAsset}
        defaultType="obligations"
        lockedType={true}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta dívida? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
