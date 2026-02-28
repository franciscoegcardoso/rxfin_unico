import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
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
import { Pencil, RotateCcw, Save, X, ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface EditValueSectionProps {
  label: string;
  description: string;
  originalValueA: number;
  originalValueB: number;
  currentValueA: number | undefined;
  currentValueB: number | undefined;
  onChangeA: (value: number | undefined) => void;
  onChangeB: (value: number | undefined) => void;
  onClose: () => void;
  isAnnualValue?: boolean;
}

export const EditValueSection: React.FC<EditValueSectionProps> = ({
  label,
  description,
  originalValueA,
  originalValueB,
  currentValueA,
  currentValueB,
  onChangeA,
  onChangeB,
  onClose,
  isAnnualValue = true,
}) => {
  const [pendingValueA, setPendingValueA] = useState<number | undefined>(currentValueA);
  const [pendingValueB, setPendingValueB] = useState<number | undefined>(currentValueB);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const hasChangesA = pendingValueA !== currentValueA;
  const hasChangesB = pendingValueB !== currentValueB;
  const hasAnyChanges = hasChangesA || hasChangesB;

  const isEditedA = pendingValueA !== undefined;
  const isEditedB = pendingValueB !== undefined;

  const handleSaveAndClose = useCallback(() => {
    if (hasAnyChanges) {
      setShowConfirmation(true);
    } else {
      onClose();
    }
  }, [hasAnyChanges, onClose]);

  const confirmChanges = useCallback(() => {
    if (hasChangesA) onChangeA(pendingValueA);
    if (hasChangesB) onChangeB(pendingValueB);
    setShowConfirmation(false);
    onClose();
  }, [hasChangesA, hasChangesB, pendingValueA, pendingValueB, onChangeA, onChangeB, onClose]);

  const handleRestoreA = useCallback(() => {
    setPendingValueA(undefined);
  }, []);

  const handleRestoreB = useCallback(() => {
    setPendingValueB(undefined);
  }, []);

  return (
    <>
      <div className="border-2 border-primary/30 rounded-xl p-4 bg-primary/5 space-y-4 mt-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold flex items-center gap-2 text-primary">
            <Pencil className="h-4 w-4" />
            Editar Valores
          </h4>
          {(isEditedA || isEditedB) && (
            <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
              {isEditedA && isEditedB ? '2 valores editados' : '1 valor editado'}
            </Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">{description}</p>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Carro A */}
          <div className="space-y-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <label className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
              Carro A
              {isEditedA && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-500/20 text-blue-700 border-blue-500/30">
                  Personalizado
                </Badge>
              )}
            </label>
            <CurrencyInput
              value={pendingValueA ?? originalValueA}
              onChange={(v) => setPendingValueA(v)}
              className={cn(
                "h-10 text-sm font-medium",
                isEditedA && "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-950"
              )}
              placeholder="0,00"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Original: {formatMoney(originalValueA)}{isAnnualValue ? '/ano' : '/mês'}
              </span>
              {isEditedA && (
                <button
                  onClick={handleRestoreA}
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurar
                </button>
              )}
            </div>
          </div>

          {/* Carro B */}
          <div className="space-y-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <label className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
              Carro B
              {isEditedB && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/20 text-amber-700 border-amber-500/30">
                  Personalizado
                </Badge>
              )}
            </label>
            <CurrencyInput
              value={pendingValueB ?? originalValueB}
              onChange={(v) => setPendingValueB(v)}
              className={cn(
                "h-10 text-sm font-medium",
                isEditedB && "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50 dark:bg-amber-950"
              )}
              placeholder="0,00"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Original: {formatMoney(originalValueB)}{isAnnualValue ? '/ano' : '/mês'}
              </span>
              {isEditedB && (
                <button
                  onClick={handleRestoreB}
                  className="text-[10px] text-amber-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAndClose}
            className={cn(
              hasAnyChanges && "bg-primary hover:bg-primary/90"
            )}
          >
            <Save className="h-4 w-4 mr-1" />
            Salvar e Fechar
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Confirmar Ajuste Manual
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Você está alterando o valor de <strong className="text-foreground">{label}</strong>. 
                  Confirme as alterações abaixo:
                </p>
                
                <div className="space-y-3">
                  {hasChangesA && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs font-semibold text-blue-600 mb-2">Carro A</p>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Antes (calculado)</p>
                          <p className="font-medium">{formatMoney(currentValueA ?? originalValueA)}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Depois (manual)</p>
                          <p className="font-bold text-blue-600">{formatMoney(pendingValueA ?? originalValueA)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {hasChangesB && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs font-semibold text-amber-600 mb-2">Carro B</p>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Antes (calculado)</p>
                          <p className="font-medium">{formatMoney(currentValueB ?? originalValueB)}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Depois (manual)</p>
                          <p className="font-bold text-amber-600">{formatMoney(pendingValueB ?? originalValueB)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChanges}>
              Confirmar Alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Component for calculated parameters that can't be directly edited
interface CalculatedParameterGuidanceProps {
  parameterName: string;
  adjustmentSteps: Array<{ step: string; description: string }>;
}

export const CalculatedParameterGuidance: React.FC<CalculatedParameterGuidanceProps> = ({
  parameterName,
  adjustmentSteps,
}) => {
  return (
    <div className="border-2 border-amber-500/30 rounded-xl p-4 bg-amber-500/5 space-y-3 mt-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <h4 className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
          Como ajustar {parameterName}
        </h4>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Este valor é calculado automaticamente. Para alterá-lo, ajuste os parâmetros na configuração do veículo:
      </p>
      
      <div className="space-y-2">
        {adjustmentSteps.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">
              {idx + 1}
            </span>
            <div>
              <p className="font-medium text-foreground">{item.step}</p>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
