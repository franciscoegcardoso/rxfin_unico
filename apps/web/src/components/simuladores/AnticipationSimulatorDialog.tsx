import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import AnticipationWizard from './AnticipationWizard';

interface AnticipationSimulatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseValue?: number;
  installments?: number;
  mdr?: number;
}

export const AnticipationSimulatorDialog: React.FC<AnticipationSimulatorDialogProps> = ({
  open,
  onOpenChange,
  purchaseValue = 1000,
  installments = 12,
  mdr = 2.5,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden p-0">
        <AnticipationWizard onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};
