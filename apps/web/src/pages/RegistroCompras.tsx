import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BackLink } from '@/components/shared/BackLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { 
  ShoppingCart, 
  Plus, 
  ExternalLink, 
  Check, 
  Trash2, 
  Edit2,
  Package,
  CheckCircle2,
  Clock,
  DollarSign,
  Receipt,
  Link as LinkIcon,
  Shield,
  ShieldCheck,
  BarChart3,
  CalendarDays,
  CreditCard,
  QrCode,
  Banknote,
  Wallet
} from 'lucide-react';
import { usePurchaseRegistry, PurchaseRegistryInput, PurchaseRegistryItem } from '@/hooks/usePurchaseRegistry';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useSeguros } from '@/hooks/useSeguros';
import { Insurance } from '@/types/seguro';
import { format, parseISO, addYears, startOfMonth, addMonths, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, ReferenceLine, Tooltip } from 'recharts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX', icon: QrCode },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard },
  { value: 'debit_card', label: 'Cartão de Débito', icon: Wallet },
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'boleto', label: 'Boleto', icon: Receipt },
];

const INSTALLMENT_OPTIONS = [
  { value: 1, label: 'À vista' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
  { value: 5, label: '5x' },
  { value: 6, label: '6x' },
  { value: 7, label: '7x' },
  { value: 8, label: '8x' },
  { value: 9, label: '9x' },
  { value: 10, label: '10x' },
  { value: 11, label: '11x' },
  { value: 12, label: '12x' },
];

const getPaymentMethodLabel = (method: string | null | undefined) => {
  if (!method) return null;
  return PAYMENT_METHODS.find(m => m.value === method)?.label ?? method;
};

const getPaymentMethodIcon = (method: string | null | undefined) => {
  if (!method) return null;
  return PAYMENT_METHODS.find(m => m.value === method)?.icon ?? null;
};

const RegistroCompras: React.FC = () => {
  const { 
    items, 
    loading, 
    addItem, 
    updateItem, 
    deleteItem, 
    markAsPurchased,
    getTotalEstimated,
    getTotalPurchased
  } = usePurchaseRegistry();
  
  const { lancamentos } = useLancamentosRealizados();
  const { seguros, addSeguro } = useSeguros();
  
  const saidasDisponiveis = useMemo(() => {
    return lancamentos.filter(l => l.tipo === 'despesa').sort((a, b) => 
      new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime()
    );
  }, [lancamentos]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseRegistryItem | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<PurchaseRegistryItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [estimatedValue, setEstimatedValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [installments, setInstallments] = useState(1);

  // Purchase form state
  const [actualValue, setActualValue] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLancamentoId, setSelectedLancamentoId] = useState<string>('');
  
  // Warranty form state
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [hasExtendedWarranty, setHasExtendedWarranty] = useState(false);
  const [extendedWarrantyMonths, setExtendedWarrantyMonths] = useState(12);
  const [warrantyStore, setWarrantyStore] = useState('');

  // Analytics state
  const [timelineView, setTimelineView] = useState<'caixa' | 'competencia'>('competencia');

  const pendingItems = useMemo(() => items.filter(i => i.status === 'pending'), [items]);
  const purchasedItems = useMemo(() => items.filter(i => i.status === 'purchased'), [items]);

  const resetForm = () => {
    setName('');
    setLink('');
    setEstimatedValue(0);
    setNotes('');
    setPlannedDate('');
    setPaymentMethod('');
    setInstallments(1);
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: PurchaseRegistryItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setLink(item.link || '');
      setEstimatedValue(item.estimated_value);
      setNotes(item.notes || '');
      setPlannedDate(item.planned_date || '');
      setPaymentMethod(item.payment_method || '');
      setInstallments(item.installments || 1);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const input: PurchaseRegistryInput = {
      name: name.trim(),
      link: link.trim() || null,
      estimated_value: estimatedValue,
      notes: notes.trim() || null,
      planned_date: plannedDate || null,
      payment_method: paymentMethod || null,
      installments: paymentMethod === 'credit_card' ? installments : 1,
    };

    if (editingItem) {
      await updateItem(editingItem.id, input);
    } else {
      await addItem(input);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleOpenPurchaseDialog = (item: PurchaseRegistryItem) => {
    setPurchaseTarget(item);
    setActualValue(item.estimated_value);
    const today = format(new Date(), 'yyyy-MM-dd');
    setPurchaseDate(today);
    setSelectedLancamentoId('');
    setHasWarranty(false);
    setWarrantyEndDate(format(addYears(new Date(), 1), 'yyyy-MM-dd'));
    setHasExtendedWarranty(false);
    setExtendedWarrantyMonths(12);
    setWarrantyStore('');
    setPurchaseDialogOpen(true);
  };
  
  const handleSelectLancamento = (lancamentoId: string) => {
    setSelectedLancamentoId(lancamentoId);
    if (lancamentoId && lancamentoId !== 'none') {
      const lancamento = saidasDisponiveis.find(l => l.id === lancamentoId);
      if (lancamento) {
        setActualValue(lancamento.valor_realizado);
        if (lancamento.data_pagamento) {
          setPurchaseDate(lancamento.data_pagamento);
        }
      }
    }
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseTarget) return;
    
    const lancamentoId = selectedLancamentoId && selectedLancamentoId !== 'none' ? selectedLancamentoId : undefined;
    await markAsPurchased(purchaseTarget.id, actualValue, purchaseDate, lancamentoId);
    
    if (hasWarranty) {
      try {
        await addSeguro.mutateAsync({
          nome: `Garantia - ${purchaseTarget.name}`,
          tipo: 'garantia_estendida',
          seguradora: warrantyStore || 'Fabricante',
          premio_mensal: 0,
          premio_anual: 0,
          valor_cobertura: actualValue,
          data_inicio: purchaseDate,
          data_fim: warrantyEndDate,
          is_warranty: true,
          warranty_extended: hasExtendedWarranty,
          warranty_extended_months: hasExtendedWarranty ? extendedWarrantyMonths : undefined,
          warranty_store: warrantyStore || undefined,
          observacoes: `Garantia do produto: ${purchaseTarget.name}`,
        });
      } catch (error) {
        console.error('Error creating warranty:', error);
      }
    }
    
    setPurchaseDialogOpen(false);
    setPurchaseTarget(null);
  };

  const getWarrantyForItem = (itemName: string) => {
    return seguros.find(s => 
      s.is_warranty && 
      s.nome.toLowerCase().includes(itemName.toLowerCase())
    );
  };

  const getWarrantyStatus = (warranty: Insurance) => {
    const today = new Date().toISOString().split('T')[0];
    if (warranty.data_fim < today) return 'expired';
    return 'active';
  };

  // ========== ANALYTICS DATA ==========
  const timelineData = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM');

    // Build month range: 6 months back to 6 months forward
    const months: string[] = [];
    for (let i = -6; i <= 6; i++) {
      const d = addMonths(startOfMonth(today), i);
      months.push(format(d, 'yyyy-MM'));
    }

    type MonthEntry = {
      month: string;
      label: string;
      realized: number;
      planned: number;
      realizedItems: string[];
      plannedItems: string[];
      isCurrent: boolean;
      isPast: boolean;
    };

    const monthMap = new Map<string, MonthEntry>();
    months.forEach(m => {
      const [y, mo] = m.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      monthMap.set(m, {
        month: m,
        label: `${monthNames[parseInt(mo) - 1]}/${y.slice(2)}`,
        realized: 0,
        planned: 0,
        realizedItems: [],
        plannedItems: [],
        isCurrent: m === todayStr,
        isPast: m < todayStr,
      });
    });

    if (timelineView === 'competencia') {
      // Competência: full value on the purchase/planned month
      purchasedItems.forEach(item => {
        if (!item.purchase_date) return;
        const m = item.purchase_date.substring(0, 7);
        const entry = monthMap.get(m);
        if (entry) {
          entry.realized += item.actual_value || item.estimated_value;
          entry.realizedItems.push(item.name);
        }
      });

      pendingItems.forEach(item => {
        if (!item.planned_date) return;
        const m = item.planned_date.substring(0, 7);
        const entry = monthMap.get(m);
        if (entry) {
          entry.planned += item.estimated_value;
          entry.plannedItems.push(item.name);
        }
      });
    } else {
      // Caixa: spread credit card installments across months
      const addCaixaEntries = (item: PurchaseRegistryItem, isPurchased: boolean) => {
        const baseDate = isPurchased ? item.purchase_date : item.planned_date;
        if (!baseDate) return;
        const value = isPurchased ? (item.actual_value || item.estimated_value) : item.estimated_value;
        const inst = (item.payment_method === 'credit_card' && (item.installments || 1) > 1)
          ? (item.installments || 1)
          : 1;
        const perMonth = value / inst;

        for (let i = 0; i < inst; i++) {
          const d = addMonths(new Date(baseDate + 'T12:00:00'), i);
          const m = format(d, 'yyyy-MM');
          const entry = monthMap.get(m);
          if (entry) {
            const label = inst > 1 ? `${item.name} ${i + 1}/${inst}` : item.name;
            if (isPurchased) {
              entry.realized += perMonth;
              entry.realizedItems.push(label);
            } else {
              entry.planned += perMonth;
              entry.plannedItems.push(label);
            }
          }
        }
      };

      purchasedItems.forEach(item => addCaixaEntries(item, true));
      pendingItems.forEach(item => addCaixaEntries(item, false));
    }

    return months.map(m => monthMap.get(m)!);
  }, [items, timelineView, purchasedItems, pendingItems]);

  const chartConfig = {
    realized: { label: 'Comprado', color: 'hsl(var(--primary))' },
    planned: { label: 'Planejado', color: 'hsl(var(--muted-foreground))' },
  };

  const ItemCard = ({ item, showPurchaseAction }: { item: PurchaseRegistryItem; showPurchaseAction?: boolean }) => {
    const warranty = item.status === 'purchased' ? getWarrantyForItem(item.name) : null;
    const warrantyStatus = warranty ? getWarrantyStatus(warranty) : null;
    const PaymentIcon = getPaymentMethodIcon(item.payment_method);
    
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{item.name}</span>
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {warranty && (
              <Badge 
                variant={warrantyStatus === 'active' ? 'default' : 'secondary'}
                className={cn(
                  "text-xs flex items-center gap-1",
                  warrantyStatus === 'active' 
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" 
                    : "bg-red-100 text-red-700 hover:bg-red-100"
                )}
              >
                {warrantyStatus === 'active' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                {warrantyStatus === 'active' ? 'Garantia ativa' : 'Garantia vencida'}
                {warranty.warranty_extended && <span className="ml-1 text-[10px] opacity-75">+ext</span>}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>{formatCurrency(item.status === 'purchased' ? (item.actual_value || item.estimated_value) : item.estimated_value)}</span>
            {item.payment_method && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {PaymentIcon && <PaymentIcon className="h-3 w-3" />}
                  {getPaymentMethodLabel(item.payment_method)}
                  {item.payment_method === 'credit_card' && (item.installments || 1) > 1 && (
                    <span className="text-xs">({item.installments}x)</span>
                  )}
                </span>
              </>
            )}
            {item.status === 'purchased' && item.purchase_date && (
              <>
                <span>•</span>
                <span>Comprado em {format(new Date(item.purchase_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </>
            )}
            {item.status === 'pending' && item.planned_date && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary">
                  <CalendarDays className="h-3 w-3" />
                  Planejado: {format(new Date(item.planned_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </>
            )}
            {warranty && warrantyStatus === 'active' && (
              <>
                <span>•</span>
                <span className="text-emerald-600">
                  Garantia até {format(new Date(warranty.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </>
            )}
          </div>
          {item.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{item.notes}</p>}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {showPurchaseAction && (
            <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10" onClick={() => handleOpenPurchaseDialog(item)}>
              <Check className="h-4 w-4 mr-1" />
              Comprar
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover item</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover "{item.name}" da lista?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteItem(item.id)}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  // Custom tooltip for the timeline chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md text-sm max-w-[250px]">
        <p className="font-semibold mb-1">{data.label}</p>
        {data.realized > 0 && (
          <div className="mb-1">
            <span className="text-primary font-medium">{formatCurrency(data.realized)}</span>
            <span className="text-muted-foreground ml-1">comprado</span>
            {data.realizedItems?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.realizedItems.join(', ')}</p>
            )}
          </div>
        )}
        {data.planned > 0 && (
          <div>
            <span className="text-muted-foreground font-medium">{formatCurrency(data.planned)}</span>
            <span className="text-muted-foreground ml-1">planejado</span>
            {data.plannedItems?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.plannedItems.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <BackLink to="/planejamento" label="Voltar ao Planejamento" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-primary" />
                Registro de Compras Anual
              </h1>
              <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.registroCompras} />
            </div>
            <p className="text-muted-foreground text-sm">
              Controle sua lista de desejos e acompanhe as aquisições do ano
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Item *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: iPhone 15 Pro" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link">Link (opcional)</Label>
                  <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valor Estimado</Label>
                  <CurrencyInput value={estimatedValue} onChange={setEstimatedValue} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plannedDate">Data Programada de Compra</Label>
                  <Input id="plannedDate" type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); if (v !== 'credit_card') setInstallments(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="flex items-center gap-2">
                            <m.icon className="h-4 w-4" />
                            {m.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === 'credit_card' && (
                  <div className="space-y-2">
                    <Label>Parcelamento</Label>
                    <Select value={installments.toString()} onValueChange={(v) => setInstallments(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTALLMENT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}{opt.value > 1 ? ` de ${formatCurrency(estimatedValue / opt.value)}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionais..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={!name.trim()}>{editingItem ? 'Salvar' : 'Adicionar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Desejados</p>
                  <p className="text-2xl font-bold">{pendingItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comprados</p>
                  <p className="text-2xl font-bold">{purchasedItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-bold">{formatCurrency(getTotalPurchased())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-auto p-0 bg-transparent gap-0">
            <TabsTrigger 
              value="pending" 
              className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-normal rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Lista de Desejos</span>
              <span className="sm:hidden">Desejos</span>
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{pendingItems.length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="purchased" 
              className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-normal rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Comprados</span>
              <span className="sm:hidden">Compras</span>
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{purchasedItems.length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-normal rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Análises</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : pendingItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhum item na lista de desejos</p>
                  <Button variant="link" className="mt-2" onClick={() => handleOpenDialog()}>
                    Adicionar primeiro item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pendingItems.map(item => <ItemCard key={item.id} item={item} showPurchaseAction />)}
                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Estimado</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(getTotalEstimated())}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchased" className="mt-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : purchasedItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhuma compra registrada ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {purchasedItems.map(item => <ItemCard key={item.id} item={item} />)}
                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Gasto</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(getTotalPurchased())}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-4 space-y-6">
            {/* Timeline Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Linha do Tempo de Compras
                  </CardTitle>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <Button
                      variant={timelineView === 'competencia' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => setTimelineView('competencia')}
                    >
                      Competência
                    </Button>
                    <Button
                      variant={timelineView === 'caixa' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => setTimelineView('caixa')}
                    >
                      Caixa
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {timelineView === 'competencia'
                    ? 'Valor total no mês da compra/planejamento'
                    : 'Fluxo de caixa real considerando parcelas do cartão'}
                </p>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <p>Adicione itens com datas para visualizar a linha do tempo</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={timelineData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={55} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="realized" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} name="Comprado" />
                      <Bar dataKey="planned" stackId="a" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} name="Planejado" />
                    </BarChart>
                  </ChartContainer>
                )}
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-primary" />
                    Compras realizadas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-muted-foreground/30" />
                    Compras planejadas
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Items by month detail */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detalhamento Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timelineData.filter(d => d.realized > 0 || d.planned > 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado para exibir</p>
                  ) : (
                    timelineData.filter(d => d.realized > 0 || d.planned > 0).map(d => (
                      <div key={d.month} className={cn(
                        "p-3 rounded-lg border",
                        d.isCurrent && "border-primary/50 bg-primary/5",
                        d.isPast && !d.isCurrent && "bg-muted/30"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{d.label}</span>
                          <div className="flex items-center gap-3 text-sm">
                            {d.realized > 0 && (
                              <span className="text-primary font-semibold">{formatCurrency(d.realized)}</span>
                            )}
                            {d.planned > 0 && (
                              <span className="text-muted-foreground">{formatCurrency(d.planned)} <span className="text-xs">(planejado)</span></span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {d.realizedItems.map((name, i) => (
                            <Badge key={`r-${i}`} variant="default" className="text-xs">{name}</Badge>
                          ))}
                          {d.plannedItems.map((name, i) => (
                            <Badge key={`p-${i}`} variant="outline" className="text-xs text-muted-foreground">{name}</Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Purchase Confirmation Dialog */}
        <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Compra</DialogTitle>
            </DialogHeader>
            {purchaseTarget && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{purchaseTarget.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Valor estimado: {formatCurrency(purchaseTarget.estimated_value)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lancamento" className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      Vincular a Lançamento
                    </Label>
                    {saidasDisponiveis.length > 0 && (
                      <Link to="/lancamentos" className="text-xs text-primary hover:underline flex items-center gap-1">
                        Ver lançamentos <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  <Select value={selectedLancamentoId || "none"} onValueChange={handleSelectLancamento}>
                    <SelectTrigger><SelectValue placeholder="Selecionar lançamento (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (cadastrar manualmente)</SelectItem>
                      {saidasDisponiveis.map((lancamento) => (
                        <SelectItem key={lancamento.id} value={lancamento.id}>
                          {lancamento.nome} - {formatCurrency(lancamento.valor_realizado)}
                          {lancamento.data_pagamento && (
                            <span className="text-muted-foreground ml-1">
                              ({format(parseISO(lancamento.data_pagamento), 'dd/MM/yy')})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {saidasDisponiveis.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum lançamento de despesa encontrado.{' '}
                      <Link to="/lancamentos" className="text-primary hover:underline">Registrar lançamento</Link>
                    </p>
                  )}
                  {selectedLancamentoId && selectedLancamentoId !== 'none' && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      Valores preenchidos automaticamente do lançamento selecionado
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="actualValue">Valor Real da Compra</Label>
                  <CurrencyInput value={actualValue} onChange={setActualValue} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Data da Compra</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => {
                      setPurchaseDate(e.target.value);
                      if (e.target.value) {
                        setWarrantyEndDate(format(addYears(new Date(e.target.value), 1), 'yyyy-MM-dd'));
                      }
                    }}
                  />
                </div>
                
                {/* Warranty Section */}
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hasWarranty" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Possui garantia?
                    </Label>
                    <Switch id="hasWarranty" checked={hasWarranty} onCheckedChange={setHasWarranty} />
                  </div>
                  
                  {hasWarranty && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="warrantyEndDate">Validade da Garantia</Label>
                        <Input id="warrantyEndDate" type="date" value={warrantyEndDate} onChange={(e) => setWarrantyEndDate(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Padrão: 1 ano após a compra</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="warrantyStore">Loja / Fabricante (opcional)</Label>
                        <Input id="warrantyStore" value={warrantyStore} onChange={(e) => setWarrantyStore(e.target.value)} placeholder="Ex: Amazon, Magazine Luiza..." />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="hasExtendedWarranty" className="flex items-center gap-2 cursor-pointer">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          Garantia estendida contratada?
                        </Label>
                        <Switch id="hasExtendedWarranty" checked={hasExtendedWarranty} onCheckedChange={setHasExtendedWarranty} />
                      </div>
                      {hasExtendedWarranty && (
                        <div className="space-y-2">
                          <Label htmlFor="extendedWarrantyMonths">Meses adicionais de garantia</Label>
                          <Select value={extendedWarrantyMonths.toString()} onValueChange={(v) => setExtendedWarrantyMonths(parseInt(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6">6 meses</SelectItem>
                              <SelectItem value="12">12 meses</SelectItem>
                              <SelectItem value="24">24 meses</SelectItem>
                              <SelectItem value="36">36 meses</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleConfirmPurchase}>
                <Check className="h-4 w-4 mr-2" />
                Confirmar Compra
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default RegistroCompras;
