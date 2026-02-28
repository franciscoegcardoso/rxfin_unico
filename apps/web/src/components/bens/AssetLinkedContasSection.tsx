import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Conta, useContasPagarReceber } from '@/hooks/useContasPagarReceber';
import { PaymentMethod } from '@/types/financial';
import { 
  Receipt, 
  Pencil, 
  Trash2, 
  Calendar, 
  CreditCard, 
  Wallet, 
  Banknote,
  Link2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  auto_debit: 'Débito Automático',
  cash: 'Dinheiro em Espécie',
};

const paymentMethodIcons: Record<PaymentMethod, React.ReactNode> = {
  pix: <Wallet className="h-3 w-3" />,
  boleto: <Receipt className="h-3 w-3" />,
  credit_card: <CreditCard className="h-3 w-3" />,
  debit_card: <CreditCard className="h-3 w-3" />,
  auto_debit: <CreditCard className="h-3 w-3" />,
  cash: <Banknote className="h-3 w-3" />,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface AssetLinkedContasSectionProps {
  assetId: string;
  assetName: string;
}

export const AssetLinkedContasSection: React.FC<AssetLinkedContasSectionProps> = ({
  assetId,
  assetName,
}) => {
  const { rawContas, updateConta, deleteConta, deleteContasByVinculoAtivo, getContasByVinculoAtivo } = useContasPagarReceber();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<Conta | null>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    valor: 0,
    formaPagamento: 'boleto' as PaymentMethod,
    diaRecorrencia: 10,
  });

  // Get contas linked to this asset
  const linkedContas = getContasByVinculoAtivo(assetId);

  const handleEditClick = (conta: Conta) => {
    setSelectedConta(conta);
    setEditForm({
      nome: conta.nome,
      valor: conta.valor,
      formaPagamento: conta.formaPagamento || 'boleto',
      diaRecorrencia: conta.diaRecorrencia || 10,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (conta: Conta) => {
    setSelectedConta(conta);
    setDeleteConfirmOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedConta) return;

    const success = await updateConta(selectedConta.id, {
      nome: editForm.nome,
      valor: editForm.valor,
      formaPagamento: editForm.formaPagamento,
      diaRecorrencia: editForm.diaRecorrencia,
    });

    if (success) {
      toast.success('Conta atualizada com sucesso!');
      setEditDialogOpen(false);
      setSelectedConta(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedConta) return;

    const success = await deleteConta(selectedConta.id);
    if (success) {
      toast.success('Conta excluída com sucesso!');
    }
    setDeleteConfirmOpen(false);
    setSelectedConta(null);
  };

  const handleDeleteAll = async () => {
    const success = await deleteContasByVinculoAtivo(assetId);
    if (success) {
      toast.success('Todas as contas vinculadas foram excluídas!');
    }
    setDeleteAllConfirmOpen(false);
  };

  if (linkedContas.length === 0) {
    return null;
  }

  // Group by recurrent vs one-time
  const recurrentContas = linkedContas.filter(c => c.recorrente);
  const oneTimeContas = linkedContas.filter(c => !c.recorrente);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Contas a Pagar Vinculadas
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {linkedContas.length} {linkedContas.length === 1 ? 'conta' : 'contas'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Recurrent */}
          {recurrentContas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Recorrentes</span>
              </div>
              {recurrentContas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conta.nome}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {paymentMethodIcons[conta.formaPagamento || 'boleto']}
                        {paymentMethodLabels[conta.formaPagamento || 'boleto']}
                      </span>
                      <span>•</span>
                      <span>Dia {conta.diaRecorrencia}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-expense">
                      {formatCurrency(conta.valor)}/mês
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditClick(conta)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(conta)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* One-time/Installments */}
          {oneTimeContas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Únicas/Parceladas</span>
              </div>
              {oneTimeContas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conta.nome}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {paymentMethodIcons[conta.formaPagamento || 'boleto']}
                        {paymentMethodLabels[conta.formaPagamento || 'boleto']}
                      </span>
                      <span>•</span>
                      <span>
                        {format(parseISO(conta.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      {conta.parcelaAtual && conta.totalParcelas && (
                        <>
                          <span>•</span>
                          <span>{conta.parcelaAtual}/{conta.totalParcelas}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-expense">
                      {formatCurrency(conta.valor)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditClick(conta)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(conta)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete all button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => setDeleteAllConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir todas as contas vinculadas
          </Button>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>
              Altere os dados da conta vinculada ao veículo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <CurrencyInput
                value={editForm.valor}
                onChange={(v) => setEditForm(prev => ({ ...prev, valor: v }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={editForm.formaPagamento}
                onValueChange={(v: PaymentMethod) => setEditForm(prev => ({ ...prev, formaPagamento: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        {paymentMethodIcons[value as PaymentMethod]}
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedConta?.recorrente && (
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={editForm.diaRecorrencia}
                  onChange={(e) => setEditForm(prev => ({ ...prev, diaRecorrencia: parseInt(e.target.value) || 10 }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Conta
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{selectedConta?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Todas as Contas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir todas as {linkedContas.length} contas vinculadas 
              ao veículo "{assetName}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
