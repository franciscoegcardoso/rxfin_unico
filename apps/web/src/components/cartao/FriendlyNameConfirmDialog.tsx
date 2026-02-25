import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star } from 'lucide-react';

interface FriendlyNameConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  friendlyName: string;
  onApplyThisOnly: () => void;
  onApplyAll: () => Promise<void>;
  onCancel: () => void;
}

export function FriendlyNameConfirmDialog({
  open,
  onOpenChange,
  storeName,
  friendlyName,
  onApplyThisOnly,
  onApplyAll,
  onCancel,
}: FriendlyNameConfirmDialogProps) {
  const [applyingAll, setApplyingAll] = useState(false);

  const handleApplyAll = async () => {
    setApplyingAll(true);
    try {
      await onApplyAll();
    } finally {
      setApplyingAll(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Aplicar nome amigável</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Você renomeou o estabelecimento:
              </p>
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Na fatura:</span>
                  <span className="font-medium text-foreground/70">{storeName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Novo nome:</span>
                  <span className="font-semibold text-foreground">{friendlyName}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Deseja aplicar este nome apenas nesta transação ou em todas as transações deste estabelecimento?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleApplyAll}
            disabled={applyingAll}
            className="w-full relative"
          >
            {applyingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Star className="h-3.5 w-3.5 fill-current" />
                Aplicar para todos
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 bg-primary-foreground/20 text-primary-foreground border-0">
                  Recomendado
                </Badge>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onApplyThisOnly}
            disabled={applyingAll}
            className="w-full"
          >
            Somente esta fatura
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={applyingAll}
            className="w-full text-muted-foreground"
          >
            Cancelar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
