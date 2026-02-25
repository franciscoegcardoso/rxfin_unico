import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, RotateCcw, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type GroupingVariable = 'paymentMethod' | 'category' | 'responsible' | 'none';

interface GroupingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupLevel1: GroupingVariable;
  groupLevel2: GroupingVariable;
  onGroupLevel1Change: (value: GroupingVariable) => void;
  onGroupLevel2Change: (value: GroupingVariable) => void;
}

const groupingOptions: { value: GroupingVariable; label: string; description: string }[] = [
  { value: 'paymentMethod', label: 'Forma de Pagamento', description: 'PIX, Cartão, Boleto...' },
  { value: 'category', label: 'Categoria', description: 'Moradia, Transporte, Alimentação...' },
  { value: 'responsible', label: 'Responsável', description: 'Pessoa responsável pelo gasto' },
  { value: 'none', label: 'Nenhum', description: 'Sem agrupamento neste nível' },
];

export const GroupingDialog: React.FC<GroupingDialogProps> = ({
  open,
  onOpenChange,
  groupLevel1,
  groupLevel2,
  onGroupLevel1Change,
  onGroupLevel2Change,
}) => {
  const hasCustomGrouping = groupLevel1 !== 'paymentMethod' || groupLevel2 !== 'category';

  const handleResetGrouping = () => {
    onGroupLevel1Change('paymentMethod');
    onGroupLevel2Change('category');
  };

  const getGroupingLabel = (value: GroupingVariable) => {
    return groupingOptions.find(opt => opt.value === value)?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Agrupar Linhas
            {hasCustomGrouping && (
              <Badge variant="secondary" className="ml-2">Personalizado</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Configure como as linhas de despesas são organizadas na tabela. O agrupamento hierárquico permite visualizar dados de diferentes perspectivas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visual hierarchy preview */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Visualização</span>
            <div className="space-y-1">
              <div className={cn(
                "flex items-center gap-2 text-sm font-medium",
                groupLevel1 !== 'none' ? "text-foreground" : "text-muted-foreground"
              )}>
                <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
                {groupLevel1 !== 'none' ? getGroupingLabel(groupLevel1) : '(Sem agrupamento)'}
              </div>
              {groupLevel1 !== 'none' && (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground ml-1.5">
                    <ArrowDown className="h-3 w-3" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 text-sm ml-4",
                    groupLevel2 !== 'none' ? "text-foreground" : "text-muted-foreground"
                  )}>
                    <div className="w-2.5 h-2.5 rounded bg-secondary/40 border border-secondary/50" />
                    {groupLevel2 !== 'none' ? getGroupingLabel(groupLevel2) : '(Sem sub-agrupamento)'}
                  </div>
                  {groupLevel2 !== 'none' && (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground ml-5">
                        <ArrowDown className="h-3 w-3" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground ml-8">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        Itens individuais
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Level 1 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Nível 1 - Agrupamento Principal
            </Label>
            <Select value={groupLevel1} onValueChange={(v) => onGroupLevel1Change(v as GroupingVariable)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupingOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Level 2 */}
          <div className={cn(
            "space-y-3 transition-opacity",
            groupLevel1 === 'none' && "opacity-50 pointer-events-none"
          )}>
            <Label className="text-sm font-medium">
              Nível 2 - Sub-agrupamento
            </Label>
            <Select 
              value={groupLevel2} 
              onValueChange={(v) => onGroupLevel2Change(v as GroupingVariable)}
              disabled={groupLevel1 === 'none'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupingOptions.map(option => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    disabled={option.value === groupLevel1 && option.value !== 'none'}
                  >
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groupLevel1 === 'none' && (
              <p className="text-xs text-muted-foreground">
                Defina um agrupamento principal para habilitar o sub-agrupamento.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasCustomGrouping && (
            <Button
              variant="ghost"
              onClick={handleResetGrouping}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar padrão
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
