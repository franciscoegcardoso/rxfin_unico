import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, History, ArrowRightLeft, Users } from 'lucide-react';
import { SharedPerson } from '@/types/financial';

export type MigrationOption = 'keep_history' | 'transfer_to_me';

interface AccountTypeMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affectedPeople: SharedPerson[];
  affectedRecordsCount: {
    incomeItems: number;
    expenseItems: number;
    monthlyEntries: number;
  };
  onConfirm: (option: MigrationOption) => void;
  onCancel: () => void;
}

export const AccountTypeMigrationDialog: React.FC<AccountTypeMigrationDialogProps> = ({
  open,
  onOpenChange,
  affectedPeople,
  affectedRecordsCount,
  onConfirm,
  onCancel,
}) => {
  const [selectedOption, setSelectedOption] = React.useState<MigrationOption>('keep_history');

  const totalRecords = 
    affectedRecordsCount.incomeItems + 
    affectedRecordsCount.expenseItems + 
    affectedRecordsCount.monthlyEntries;

  const handleConfirm = () => {
    onConfirm(selectedOption);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Migrar para Conta Individual
          </DialogTitle>
          <DialogDescription>
            Existem registros vinculados a outras pessoas. Como deseja proceder?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary of affected data */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              Pessoas afetadas:
            </div>
            <div className="flex flex-wrap gap-2 ml-6">
              {affectedPeople.map(person => (
                <span key={person.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {person.name}
                </span>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              {affectedRecordsCount.incomeItems > 0 && (
                <p>• {affectedRecordsCount.incomeItems} fonte(s) de receita vinculada(s)</p>
              )}
              {affectedRecordsCount.expenseItems > 0 && (
                <p>• {affectedRecordsCount.expenseItems} despesa(s) vinculada(s)</p>
              )}
              {affectedRecordsCount.monthlyEntries > 0 && (
                <p>• {affectedRecordsCount.monthlyEntries} lançamento(s) mensal(is)</p>
              )}
            </div>
          </div>

          {/* Migration options */}
          <RadioGroup 
            value={selectedOption} 
            onValueChange={(value) => setSelectedOption(value as MigrationOption)}
            className="space-y-3"
          >
            <div 
              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                selectedOption === 'keep_history' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedOption('keep_history')}
            >
              <RadioGroupItem value="keep_history" id="keep_history" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="keep_history" className="flex items-center gap-2 cursor-pointer font-medium">
                  <History className="h-4 w-4 text-primary" />
                  Manter dados históricos
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Os registros existentes permanecem vinculados às pessoas originais para consulta. 
                  Apenas novos registros serão individuais. Ideal para manter histórico de divisões passadas.
                </p>
              </div>
            </div>

            <div 
              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                selectedOption === 'transfer_to_me' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedOption('transfer_to_me')}
            >
              <RadioGroupItem value="transfer_to_me" id="transfer_to_me" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="transfer_to_me" className="flex items-center gap-2 cursor-pointer font-medium">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  Transferir todos para mim
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Todos os registros vinculados a outras pessoas serão transferidos para você. 
                  Os vínculos com outras pessoas serão removidos. Use com cautela.
                </p>
              </div>
            </div>
          </RadioGroup>

          {selectedOption === 'transfer_to_me' && totalRecords > 0 && (
            <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
              <p className="text-xs text-warning flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> Esta ação irá modificar {totalRecords} registro(s). 
                  Os vínculos com outras pessoas serão permanentemente removidos.
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            Confirmar Migração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
