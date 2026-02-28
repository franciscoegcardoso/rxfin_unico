import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calendar } from 'lucide-react';
import { expenseCategories } from '@/data/defaultData';
import { BudgetPackage, PackageInput } from '@/hooks/useBudgetPackages';

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: PackageInput) => Promise<boolean | BudgetPackage | null>;
  editingPackage?: BudgetPackage | null;
}

export const PackageDialog: React.FC<PackageDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  editingPackage,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [budgetGoal, setBudgetGoal] = useState(0);
  const [hasBudgetGoal, setHasBudgetGoal] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingPackage) {
      setName(editingPackage.name);
      setDescription(editingPackage.description || '');
      setStartDate(editingPackage.start_date);
      setEndDate(editingPackage.end_date);
      setBudgetGoal(editingPackage.budget_goal ? Number(editingPackage.budget_goal) : 0);
      setHasBudgetGoal(editingPackage.has_budget_goal);
      setCategoryId(editingPackage.category_id);
    } else {
      setName('');
      setDescription('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setBudgetGoal(0);
      setHasBudgetGoal(true);
      setCategoryId('');
    }
  }, [editingPackage, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!startDate || !endDate) return;
    if (!categoryId) return;

    const category = expenseCategories.find(c => c.id === categoryId);
    if (!category) return;

    setLoading(true);
    const result = await onSave({
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate,
      end_date: endDate,
      budget_goal: hasBudgetGoal ? budgetGoal : null,
      has_budget_goal: hasBudgetGoal,
      category_id: categoryId,
      category_name: category.name,
    });
    setLoading(false);

    if (result) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingPackage ? 'Editar Pacote' : 'Novo Pacote de Orçamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Pacote *</Label>
            <Input
              id="name"
              placeholder="Ex: Viagem para Europa, Reforma da Casa..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Detalhes sobre este pacote..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria de Despesa *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Fim *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                  min={startDate}
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Definir Meta de Orçamento</Label>
                <p className="text-xs text-muted-foreground">
                  Acompanhe quanto você pretende gastar
                </p>
              </div>
              <Switch
                checked={hasBudgetGoal}
                onCheckedChange={setHasBudgetGoal}
              />
            </div>

            {hasBudgetGoal && (
              <div className="space-y-2">
                <Label>Valor da Meta</Label>
                <CurrencyInput
                  value={budgetGoal}
                  onChange={setBudgetGoal}
                  placeholder="R$ 0,00"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !name.trim() || !startDate || !endDate || !categoryId}
              className="flex-1"
            >
              {loading ? 'Salvando...' : editingPackage ? 'Atualizar' : 'Criar Pacote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
