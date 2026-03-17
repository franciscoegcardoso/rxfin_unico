import React, { useState } from 'react';
import { ShieldCheck, TrendingUp, Wallet, Plus, Pencil, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useDefaultIncomeItems,
  useDefaultExpenseItems,
  useExpenseCategories,
  useDefaultIncomeItemMutations,
  useDefaultExpenseItemMutations,
  DefaultIncomeItem,
  DefaultExpenseItem,
} from '@/hooks/useDefaultParameters';

// Payment method options
const paymentMethodOptions = [
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cash', label: 'Dinheiro' },
];

// Income method options
const incomeMethodOptions = [
  { value: 'gross', label: 'Bruto' },
  { value: 'net', label: 'Líquido' },
];

export const AdminParametersSection: React.FC = () => {
  const { data: incomeItems = [], isLoading: loadingIncome } = useDefaultIncomeItems();
  const { data: expenseItems = [], isLoading: loadingExpense } = useDefaultExpenseItems();
  const { data: categories = [] } = useExpenseCategories();
  
  const incomeMutations = useDefaultIncomeItemMutations();
  const expenseMutations = useDefaultExpenseItemMutations();

  // Dialog states
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<DefaultIncomeItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<DefaultExpenseItem | null>(null);
  
  // Form states
  const [incomeForm, setIncomeForm] = useState({
    id: '',
    name: '',
    method: 'net',
    enabled_by_default: true,
    is_stock_compensation: false,
    order_index: 0,
    is_active: true,
  });
  
  const [expenseForm, setExpenseForm] = useState({
    id: '',
    category_id: '',
    category_name: '',
    name: '',
    expense_type: 'variable_non_essential',
    expense_nature: 'essential' as 'essential' | 'non_essential' | 'investment',
    recurrence_type: 'monthly' as 'monthly' | 'yearly',
    is_recurring: false,
    payment_method: 'credit_card',
    enabled_by_default: true,
    order_index: 0,
    is_active: true,
  });

  // Collapsed categories state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['home', 'food']));

  const activeIncomeItems = incomeItems.filter(i => i.is_active);
  const inactiveIncomeItems = incomeItems.filter(i => !i.is_active);
  const activeExpenseItems = expenseItems.filter(i => i.is_active);
  const inactiveExpenseItems = expenseItems.filter(i => !i.is_active);

  // Group expenses by category
  const expensesByCategory = activeExpenseItems.reduce((acc, item) => {
    if (!acc[item.category_id]) acc[item.category_id] = [];
    acc[item.category_id].push(item);
    return acc;
  }, {} as Record<string, DefaultExpenseItem[]>);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const openIncomeDialog = (item?: DefaultIncomeItem) => {
    if (item) {
      setEditingIncome(item);
      setIncomeForm({
        id: item.id,
        name: item.name,
        method: item.method,
        enabled_by_default: item.enabled_by_default,
        is_stock_compensation: item.is_stock_compensation ?? false,
        order_index: item.order_index,
        is_active: item.is_active,
      });
    } else {
      setEditingIncome(null);
      setIncomeForm({
        id: `inc-${Date.now()}`,
        name: '',
        method: 'net',
        enabled_by_default: true,
        is_stock_compensation: false,
        order_index: incomeItems.length + 1,
        is_active: true,
      });
    }
    setIncomeDialogOpen(true);
  };

  const openExpenseDialog = (item?: DefaultExpenseItem) => {
    if (item) {
      setEditingExpense(item);
      setExpenseForm({
        id: item.id,
        category_id: item.category_id,
        category_name: item.category_name,
        name: item.name,
        expense_type: item.expense_type,
        expense_nature: (item.expense_nature === 'essential' || item.expense_nature === 'non_essential' || item.expense_nature === 'investment' ? item.expense_nature : 'essential'),
        recurrence_type: (item.recurrence_type === 'yearly' ? 'yearly' : 'monthly'),
        is_recurring: item.is_recurring,
        payment_method: item.payment_method,
        enabled_by_default: item.enabled_by_default,
        order_index: item.order_index,
        is_active: item.is_active,
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        id: `exp-${Date.now()}`,
        category_id: '',
        category_name: '',
        name: '',
        expense_type: 'variable_non_essential',
        expense_nature: 'essential',
        recurrence_type: 'monthly',
        is_recurring: false,
        payment_method: 'credit_card',
        enabled_by_default: true,
        order_index: expenseItems.length + 1,
        is_active: true,
      });
    }
    setExpenseDialogOpen(true);
  };

  const handleSaveIncome = () => {
    if (!incomeForm.name.trim()) return;
    
    if (editingIncome) {
      incomeMutations.update({ id: editingIncome.id, updates: incomeForm });
    } else {
      incomeMutations.create(incomeForm as any);
    }
    setIncomeDialogOpen(false);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.name.trim() || !expenseForm.category_id) return;
    
    const category = categories.find(c => c.id === expenseForm.category_id);
    const formData = {
      ...expenseForm,
      category_name: category?.name || expenseForm.category_id,
    };
    
    try {
      if (editingExpense) {
        await expenseMutations.updateAsync({ id: editingExpense.id, updates: formData });
      } else {
        await expenseMutations.createAsync(formData as any);
      }
      setExpenseDialogOpen(false);
    } catch (err) {
      console.error('[AdminParametersSection] Erro ao salvar despesa default:', err);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  if (loadingIncome || loadingExpense) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando parâmetros...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          Gerenciar Parâmetros Default
          <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300">
            Admin
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Configure os parâmetros que serão oferecidos a todos os novos usuários durante o onboarding
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="income" className="space-y-4">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="income" className="gap-1.5 text-sm">
              <TrendingUp className="h-3.5 w-3.5" />
              Receitas ({activeIncomeItems.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5 text-sm">
              <Wallet className="h-3.5 w-3.5" />
              Despesas ({activeExpenseItems.length})
            </TabsTrigger>
          </TabsList>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => openIncomeDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Receita
              </Button>
            </div>

            {/* Active Income Items */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-500" />
                Ativas ({activeIncomeItems.length})
              </h4>
              <div className="grid gap-2">
                {activeIncomeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={item.enabled_by_default}
                        onCheckedChange={(checked) =>
                          incomeMutations.update({ id: item.id, updates: { enabled_by_default: checked } })
                        }
                      />
                      <div>
                        <span className="font-medium text-sm">{item.name}</span>
                        <div className="flex gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {item.method === 'gross' ? 'Bruto' : 'Líquido'}
                          </Badge>
                          {item.is_stock_compensation && (
                            <Badge variant="outline" className="text-[10px]">
                              Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openIncomeDialog(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => incomeMutations.toggleActive({ id: item.id, is_active: false })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inactive Income Items */}
            {inactiveIncomeItems.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Desativadas ({inactiveIncomeItems.length})
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {inactiveIncomeItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30 opacity-60"
                    >
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => incomeMutations.toggleActive({ id: item.id, is_active: true })}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ativar
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => openExpenseDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Despesa
              </Button>
            </div>

            {/* Active Expense Items by Category */}
            <div className="space-y-3">
              {categories.filter(c => c.is_active).map((category) => {
                const items = expensesByCategory[category.id] || [];
                const isExpanded = expandedCategories.has(category.id);
                
                return (
                  <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between hover:bg-accent/50"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {items.length}
                          </Badge>
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2 pl-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={item.enabled_by_default}
                              onCheckedChange={(checked) =>
                                expenseMutations.update({ id: item.id, updates: { enabled_by_default: checked } })
                              }
                            />
                            <div>
                              <span className="font-medium text-sm">{item.name}</span>
                              <div className="flex gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px]">
                                  {paymentMethodOptions.find(m => m.value === item.payment_method)?.label || item.payment_method}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openExpenseDialog(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => expenseMutations.toggleActive({ id: item.id, is_active: false })}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">
                          Nenhum item nesta categoria
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>

            {/* Inactive Expense Items */}
            {inactiveExpenseItems.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Desativadas ({inactiveExpenseItems.length})
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {inactiveExpenseItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30 opacity-60"
                    >
                      <div>
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({getCategoryName(item.category_id)})
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => expenseMutations.toggleActive({ id: item.id, is_active: true })}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ativar
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </TabsContent>
        </Tabs>

        {/* Income Dialog */}
        <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>
                {editingIncome ? 'Editar Receita Default' : 'Nova Receita Default'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={incomeForm.name}
                  onChange={(e) => setIncomeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Salário, Bônus..."
                />
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select
                  value={incomeForm.method}
                  onValueChange={(value) => setIncomeForm(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeMethodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={incomeForm.enabled_by_default}
                  onCheckedChange={(checked) => setIncomeForm(prev => ({ ...prev, enabled_by_default: checked }))}
                />
                <Label>Habilitado por padrão para novos usuários</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={incomeForm.is_stock_compensation}
                  onCheckedChange={(checked) => setIncomeForm(prev => ({ ...prev, is_stock_compensation: checked }))}
                />
                <Label>Stock Compensation (RSU/Options)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIncomeDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveIncome} disabled={!incomeForm.name.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expense Dialog */}
        <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Editar Despesa Default' : 'Nova Despesa Default'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={expenseForm.name}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Aluguel, Netflix..."
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={expenseForm.category_id}
                  onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.is_active).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento Padrão</Label>
                <Select
                  value={expenseForm.payment_method}
                  onValueChange={(value) => setExpenseForm(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Natureza</Label>
                <Select
                  value={expenseForm.expense_nature}
                  onValueChange={(value: 'essential' | 'non_essential' | 'investment') => setExpenseForm(prev => ({ ...prev, expense_nature: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essential">Essencial</SelectItem>
                    <SelectItem value="non_essential">Não essencial</SelectItem>
                    <SelectItem value="investment">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periodicidade</Label>
                <Select
                  value={expenseForm.recurrence_type}
                  onValueChange={(value: 'monthly' | 'yearly') => setExpenseForm(prev => ({ ...prev, recurrence_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={expenseForm.is_recurring}
                  onCheckedChange={(checked) => setExpenseForm(prev => ({ ...prev, is_recurring: checked }))}
                />
                <Label>Despesa recorrente</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={expenseForm.enabled_by_default}
                  onCheckedChange={(checked) => setExpenseForm(prev => ({ ...prev, enabled_by_default: checked }))}
                />
                <Label>Habilitado por padrão para novos usuários</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveExpense} disabled={!expenseForm.name.trim() || !expenseForm.category_id}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
