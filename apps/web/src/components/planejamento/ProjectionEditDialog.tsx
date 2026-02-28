import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Copy, Calculator } from 'lucide-react';

export type ProjectionEditAction = 'replicate' | 'keep_default';

interface ProjectionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (action: ProjectionEditAction) => void;
  editedCellsCount: number;
}

export const ProjectionEditDialog: React.FC<ProjectionEditDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  editedCellsCount,
}) => {
  const [selectedAction, setSelectedAction] = React.useState<ProjectionEditAction>('replicate');

  const handleConfirm = () => {
    onConfirm(selectedAction);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edição em intervalo de projeção</DialogTitle>
          <DialogDescription>
            Você editou {editedCellsCount} {editedCellsCount === 1 ? 'célula' : 'células'} dentro do intervalo de projeção (M+1 em diante).
            O que deseja fazer com os meses subsequentes?
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedAction}
          onValueChange={(value) => setSelectedAction(value as ProjectionEditAction)}
          className="space-y-3 py-4"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="replicate" id="replicate" className="mt-1" />
            <Label htmlFor="replicate" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <Copy className="h-4 w-4 text-primary" />
                Replicar novo valor
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                O valor editado será aplicado a todos os meses subsequentes, substituindo as projeções automáticas.
              </p>
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="keep_default" id="keep_default" className="mt-1" />
            <Label htmlFor="keep_default" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <Calculator className="h-4 w-4 text-primary" />
                Manter método de cálculo padrão
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Apenas a célula editada será alterada. Os meses subsequentes continuarão usando o método de cálculo configurado.
              </p>
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
