import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface PluggyMultiConnectDialogProps {
  open: boolean;
  connectedCount: number;
  onConnectAnother: () => void;
  onFinish: () => void;
  onReviewCategories?: () => void;
}

export const PluggyMultiConnectDialog: React.FC<PluggyMultiConnectDialogProps> = ({
  open,
  connectedCount,
  onConnectAnother,
  onFinish,
  onReviewCategories,
}) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <AlertDialogTitle>Banco conectado com sucesso!</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {connectedCount} banco{connectedCount > 1 ? 's' : ''} conectado{connectedCount > 1 ? 's' : ''} nesta sessão. Deseja conectar outra instituição?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onFinish}>Finalizar</AlertDialogCancel>
          {onReviewCategories && (
            <AlertDialogAction onClick={onReviewCategories} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Revisar Categorias
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={onConnectAnother}>
            Conectar Outro Banco
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
