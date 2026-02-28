import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

interface DeleteAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCount: number;
  lancamentoCount: number;
  cartaoCount: number;
  onConfirm: () => void;
  deleting?: boolean;
}

const CONFIRM_TEXT = 'EXCLUIR TUDO';

export const DeleteAllDialog: React.FC<DeleteAllDialogProps> = ({
  open,
  onOpenChange,
  totalCount,
  lancamentoCount,
  cartaoCount,
  onConfirm,
  deleting,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const isConfirmed = confirmInput === CONFIRM_TEXT;

  const handleOpenChange = (value: boolean) => {
    if (!value) setConfirmInput('');
    onOpenChange(value);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-card max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-destructive">
              Excluir todo o histórico?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Ação irreversível
                </p>
                <p className="text-sm text-muted-foreground">
                  Todos os <strong>{totalCount}</strong> registros serão excluídos permanentemente:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  {lancamentoCount > 0 && (
                    <li><strong>{lancamentoCount}</strong> lançamento(s) realizado(s)</li>
                  )}
                  {cartaoCount > 0 && (
                    <li><strong>{cartaoCount}</strong> transação(ões) de cartão de crédito</li>
                  )}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta ação <strong>não pode ser desfeita</strong>. Os dados não poderão ser recuperados.
              </p>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Digite <strong className="text-destructive font-mono">{CONFIRM_TEXT}</strong> para confirmar:
                </p>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={CONFIRM_TEXT}
                  className="font-mono text-sm border-destructive/30 focus-visible:ring-destructive/30"
                  disabled={deleting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} onClick={() => setConfirmInput('')}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!isConfirmed || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
