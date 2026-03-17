import React, { useState } from 'react';
import { ShieldCheck, Plus, Pencil, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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

const paymentMethodOptions = [
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cash', label: 'Dinheiro' },
];

const incomeMethodOptions = [
  { value: 'gross', label: 'Bruto' },
  { value: 'net', label: 'Líquido' },
];

// ─── Income Defaults ────────────────────────────────────────────────
export const AdminDefaultIncomeInline: React.FC = () => {
  const { data: incomeItems = [], isLoading } = useDefaultIncomeItems();
  const incomeMutations = useDefaultIncomeItemMutations();
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DefaultIncomeItem | null>(null);
  const [form, setForm] = useState({ id: '', name: '', method: 'net', enabled_by_default: true, is_stock_compensation: false, order_index: 0, is_active: true });

  const activeItems = incomeItems.filter(i => i.is_active);
  const inactiveItems = incomeItems.filter(i => !i.is_active);

  const openDialog = (item?: DefaultIncomeItem) => {
    if (item) {
      setEditingItem(item);
      setForm({ id: item.id, name: item.name, method: item.method, enabled_by_default: item.enabled_by_default, is_stock_compensation: item.is_stock_compensation ?? false, order_index: item.order_index, is_active: item.is_active });
    } else {
      setEditingItem(null);
      setForm({ id: `inc-${Date.now()}`, name: '', method: 'net', enabled_by_default: true, is_stock_compensation: false, order_index: incomeItems.length + 1, is_active: true });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingItem) {
      incomeMutations.update({ id: editingItem.id, updates: form });
    } else {
      incomeMutations.create(form as any);
    }
    setDialogOpen(false);
  };

  if (isLoading) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-foreground">Receitas Default</span>
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Admin</Badge>
              <span className="text-xs text-muted-foreground">{activeItems.length} ativas</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="border border-amber-200/50 dark:border-amber-800/50 rounded-lg overflow-hidden">
            <div className="flex justify-end p-2 bg-amber-50/30 dark:bg-amber-950/10 border-b border-amber-200/50 dark:border-amber-800/50">
              <Button size="sm" variant="outline" onClick={() => openDialog()} className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova
              </Button>
            </div>
            <div className="divide-y divide-border">
              {activeItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={item.enabled_by_default}
                      onCheckedChange={(checked) => incomeMutations.update({ id: item.id, updates: { enabled_by_default: checked } })}
                      className="scale-75"
                    />
                    <div>
                      <span className="text-sm font-medium">{item.name}</span>
                      <div className="flex gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] h-4">{item.method === 'gross' ? 'Bruto' : 'Líquido'}</Badge>
                        {item.is_stock_compensation && <Badge variant="outline" className="text-[10px] h-4">Stock</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDialog(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => incomeMutations.toggleActive({ id: item.id, is_active: false })}>
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {inactiveItems.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground h-8 text-xs rounded-none border-t border-border">
                    <span className="flex items-center gap-1"><EyeOff className="h-3 w-3" /> Desativadas ({inactiveItems.length})</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="divide-y divide-border">
                  {inactiveItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 opacity-60">
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => incomeMutations.toggleActive({ id: item.id, is_active: true })}>
                        <Eye className="h-3 w-3 mr-1" /> Ativar
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Receita Default' : 'Nova Receita Default'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da receita" />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={form.method} onValueChange={(v) => setForm(p => ({ ...p, method: v }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {incomeMethodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Habilitada por padrão</Label>
              <Switch checked={form.enabled_by_default} onCheckedChange={(v) => setForm(p => ({ ...p, enabled_by_default: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Stock Compensation</Label>
              <Switch checked={form.is_stock_compensation} onCheckedChange={(v) => setForm(p => ({ ...p, is_stock_compensation: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Expense Defaults ───────────────────────────────────────────────
export const AdminDefaultExpenseInline: React.FC = () => {
  const { data: expenseItems = [], isLoading } = useDefaultExpenseItems();
  const { data: categories = [] } = useExpenseCategories();
  const expenseMutations = useDefaultExpenseItemMutations();
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DefaultExpenseItem | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    id: '', category_id: '', category_name: '', name: '', expense_type: 'variable_non_essential',
    expense_nature: 'essential' as 'essential' | 'non_essential' | 'investment',
    recurrence_type: 'monthly' as 'monthly' | 'yearly',
    is_recurring: false,
    payment_method: 'credit_card', enabled_by_default: true, order_index: 0, is_active: true,
  });

  const activeItems = expenseItems.filter(i => i.is_active);
  const inactiveItems = expenseItems.filter(i => !i.is_active);
  
  // Group by category_name since category_id may not match expense_categories table
  const expensesByCategoryName = activeItems.reduce((acc, item) => {
    const key = item.category_name || 'Sem Categoria';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, DefaultExpenseItem[]>);
  const categoryNames = Object.keys(expensesByCategoryName).sort();

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDialog = (item?: DefaultExpenseItem) => {
    if (item) {
      setEditingItem(item);
      setForm({ id: item.id, category_id: item.category_id, category_name: item.category_name, name: item.name, expense_type: item.expense_type, expense_nature: (item.expense_nature === 'essential' || item.expense_nature === 'non_essential' || item.expense_nature === 'investment' ? item.expense_nature : 'essential'), recurrence_type: (item.recurrence_type === 'yearly' ? 'yearly' : 'monthly'), is_recurring: item.is_recurring, payment_method: item.payment_method, enabled_by_default: item.enabled_by_default, order_index: item.order_index, is_active: item.is_active });
    } else {
      setEditingItem(null);
      setForm({ id: `exp-${Date.now()}`, category_id: '', category_name: '', name: '', expense_type: 'variable_non_essential', expense_nature: 'essential', recurrence_type: 'monthly', is_recurring: false, payment_method: 'credit_card', enabled_by_default: true, order_index: expenseItems.length + 1, is_active: true });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.category_id) return;
    const category = categories.find(c => c.id === form.category_id);
    const formData = { ...form, category_name: category?.name || form.category_id };
    if (editingItem) {
      expenseMutations.update({ id: editingItem.id, updates: formData });
    } else {
      expenseMutations.create(formData as any);
    }
    setDialogOpen(false);
  };

  if (isLoading) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-foreground">Despesas Default</span>
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Admin</Badge>
              <span className="text-xs text-muted-foreground">{activeItems.length} ativas</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="border border-amber-200/50 dark:border-amber-800/50 rounded-lg overflow-hidden">
            <div className="flex justify-end p-2 bg-amber-50/30 dark:bg-amber-950/10 border-b border-amber-200/50 dark:border-amber-800/50">
              <Button size="sm" variant="outline" onClick={() => openDialog()} className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova
              </Button>
            </div>
            <div className="space-y-0">
              {categoryNames.map((catName) => {
                const items = expensesByCategoryName[catName] || [];
                const isExpanded = expandedCats.has(catName);
                return (
                  <div key={catName}>
                    <button onClick={() => toggleCat(catName)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/30 transition-colors border-b border-border">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium">{catName}</span>
                        <Badge variant="secondary" className="text-[10px] h-4">{items.length}</Badge>
                      </span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-border pl-4">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={item.enabled_by_default}
                                onCheckedChange={(checked) => expenseMutations.update({ id: item.id, updates: { enabled_by_default: checked } })}
                                className="scale-75"
                              />
                              <div>
                                <span className="text-sm font-medium">{item.name}</span>
                                <div className="flex gap-1.5 mt-0.5">
                                  <Badge variant="secondary" className="text-[10px] h-4">
                                    {paymentMethodOptions.find(m => m.value === item.payment_method)?.label || item.payment_method}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDialog(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => expenseMutations.toggleActive({ id: item.id, is_active: false })}>
                                <EyeOff className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {items.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2 px-3">Nenhum item</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {inactiveItems.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground h-8 text-xs rounded-none border-t border-border">
                    <span className="flex items-center gap-1"><EyeOff className="h-3 w-3" /> Desativadas ({inactiveItems.length})</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="divide-y divide-border">
                  {inactiveItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 opacity-60">
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => expenseMutations.toggleActive({ id: item.id, is_active: true })}>
                        <Eye className="h-3 w-3 mr-1" /> Ativar
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Despesa Default' : 'Nova Despesa Default'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da despesa" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm(p => ({ ...p, category_id: v }))}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {categories.filter(c => c.is_active).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {paymentMethodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Natureza</Label>
              <Select value={form.expense_nature} onValueChange={(v: 'essential' | 'non_essential' | 'investment') => setForm(p => ({ ...p, expense_nature: v }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="essential">Essencial</SelectItem>
                  <SelectItem value="non_essential">Não essencial</SelectItem>
                  <SelectItem value="investment">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Periodicidade</Label>
              <Select value={form.recurrence_type} onValueChange={(v: 'monthly' | 'yearly') => setForm(p => ({ ...p, recurrence_type: v }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Habilitada por padrão</Label>
              <Switch checked={form.enabled_by_default} onCheckedChange={(v) => setForm(p => ({ ...p, enabled_by_default: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
