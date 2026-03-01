import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Plus } from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { SharedPerson } from '@/types/financial';
import { Input } from '@/components/ui/input';

interface PersonIncomeDialogProps {
  person: SharedPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PersonIncomeDialog: React.FC<PersonIncomeDialogProps> = ({
  person,
  open,
  onOpenChange,
}) => {
  const { config, updateSharedPerson, addIncomeItem } = useFinancial();
  const [selectedIncomes, setSelectedIncomes] = useState<string[]>(
    person?.incomeItemIds || []
  );
  const [newIncomeName, setNewIncomeName] = useState('');

  React.useEffect(() => {
    if (person) {
      setSelectedIncomes(person.incomeItemIds || []);
    }
  }, [person]);

  const handleToggleIncome = (incomeId: string) => {
    setSelectedIncomes(prev =>
      prev.includes(incomeId)
        ? prev.filter(id => id !== incomeId)
        : [...prev, incomeId]
    );
  };

  const handleSave = () => {
    if (person) {
      updateSharedPerson(person.id, { incomeItemIds: selectedIncomes });
      onOpenChange(false);
    }
  };

  const handleAddIncome = () => {
    if (newIncomeName.trim()) {
      const newId = `custom-${Date.now()}`;
      addIncomeItem({
        name: newIncomeName.trim(),
        enabled: true,
        method: 'net',
        responsiblePersonId: person?.id,
      });
      setSelectedIncomes(prev => [...prev, newId]);
      setNewIncomeName('');
    }
  };

  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-income flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            Receitas de {person.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione as fontes de receita vinculadas a {person.name}:
          </p>

          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-3">
              {config.incomeItems.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={income.id}
                    checked={selectedIncomes.includes(income.id)}
                    onCheckedChange={() => handleToggleIncome(income.id)}
                  />
                  <Label
                    htmlFor={income.id}
                    className="flex-1 cursor-pointer text-sm font-medium"
                  >
                    {income.name}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Add new income */}
          <div className="pt-2 border-t border-border">
            <Label className="text-sm font-medium mb-2 block">Adicionar nova receita</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Freelance, Dividendos..."
                value={newIncomeName}
                onChange={(e) => setNewIncomeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddIncome()}
                className="flex-1"
              />
              <Button
                onClick={handleAddIncome}
                size="sm"
                variant="outline"
                disabled={!newIncomeName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
