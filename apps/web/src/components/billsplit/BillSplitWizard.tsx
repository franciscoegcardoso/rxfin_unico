import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Plus, Trash2, ChevronRight, ChevronLeft, Users, Receipt,
  Scissors, Share2, Download, Percent, Check,
  Calculator, SplitSquareVertical, Camera, Loader2, ImageIcon, Wallet,
  MessageCircle, Contact
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseReceiptWithAuth } from '@/lib/parseReceipt';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateBillSplit } from '@/hooks/useRXSplit';
import { toPng } from 'html-to-image';

// Types
interface BillItem {
  id: number;
  description: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  lastEdited: ('qty' | 'unitPrice' | 'totalPrice')[];
  autoCalculated?: boolean;
}

interface Person {
  id: number;
  name: string;
  phone?: string;
}

type SplitMode = 'equal' | 'remove-and-split' | 'individual' | 'percentage' | 'custom';

interface PersonSplit {
  personId: number;
  amount: number;
  items?: number[];
  percentage?: number;
}

type Step = 'items' | 'people-count' | 'people-names' | 'split-mode' | 'split-config' | 'results';

const STEPS: Step[] = ['items', 'people-count', 'people-names', 'split-mode', 'split-config', 'results'];
const STEP_LABELS: Record<Step, string> = {
  'items': 'Conta',
  'people-count': 'Pessoas',
  'people-names': 'Nomes',
  'split-mode': 'Divisão',
  'split-config': 'Ajustar',
  'results': 'Resultado',
};

interface BillSplitWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
}

function autoCalcItem(item: BillItem): BillItem {
  const q = parseFloat(item.qty) || 0;
  const u = parseFloat(item.unitPrice) || 0;
  const t = parseFloat(item.totalPrice) || 0;
  const edited = item.lastEdited;
  if (edited.length < 2) return item;
  const last2 = edited.slice(-2);
  const updated = { ...item };
  if (!last2.includes('totalPrice') && q > 0 && u > 0) updated.totalPrice = (q * u).toFixed(2);
  else if (!last2.includes('unitPrice') && q > 0 && t > 0) updated.unitPrice = (t / q).toFixed(2);
  else if (!last2.includes('qty') && u > 0 && t > 0) {
    const calc = t / u;
    updated.qty = Number.isInteger(calc) ? calc.toString() : calc.toFixed(2);
  }
  return updated;
}

function parseNum(v: string): number { return parseFloat(v) || 0; }

export const BillSplitWizard: React.FC<BillSplitWizardProps> = ({ isOpen, onClose, currentUserName }) => {
  const { user } = useAuth();
  const createBillSplit = useCreateBillSplit();
  const [splitId] = useState(() => crypto.randomUUID());
  const [currentStep, setCurrentStep] = useState<Step>('items');
  const [visitedSteps, setVisitedSteps] = useState<Set<Step>>(new Set(['items']));
  const [items, setItems] = useState<BillItem[]>([
    { id: 1, description: '', qty: '1', unitPrice: '', totalPrice: '', lastEdited: [] }
  ]);
  const [peopleCount, setPeopleCount] = useState(2);
  const [people, setPeople] = useState<Person[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [serviceChargePercent, setServiceChargePercent] = useState(10);
  const [includeServiceCharge, setIncludeServiceCharge] = useState(true);
  const [personSplits, setPersonSplits] = useState<PersonSplit[]>([]);
  const [excludedItems, setExcludedItems] = useState<Record<number, number[]>>({});
  const [itemAssignments, setItemAssignments] = useState<Record<number, number[]>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<number, number>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
  const [partialPayments, setPartialPayments] = useState<Record<number, string>>({});
  const [showPartialInput, setShowPartialInput] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Travar scroll da página atrás do modal (evita touch/scroll vazar para o fundo no mobile)
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [isOpen]);

  const validItems = items.filter(i => i.description.trim() && (parseNum(i.totalPrice) > 0 || (parseNum(i.qty) > 0 && parseNum(i.unitPrice) > 0)));
  const subtotal = validItems.reduce((sum, item) => {
    const t = parseNum(item.totalPrice);
    if (t > 0) return sum + t;
    return sum + parseNum(item.qty) * parseNum(item.unitPrice);
  }, 0);
  const serviceCharge = includeServiceCharge ? subtotal * (serviceChargePercent / 100) : 0;
  const grandTotal = subtotal + serviceCharge;
  const stepIndex = STEPS.indexOf(currentStep);
  const userName = currentUserName || 'Você';

  // Save to Supabase when reaching results
  const [historySaved, setHistorySaved] = useState(false);
  useEffect(() => {
    if (currentStep === 'results' && personSplits.length > 0 && !historySaved && user) {
      createBillSplit.mutate({
        user_id: user.id,
        items: validItems.map(i => ({
          description: i.description,
          qty: parseNum(i.qty),
          unitPrice: parseNum(i.unitPrice),
          totalPrice: parseNum(i.totalPrice) || parseNum(i.qty) * parseNum(i.unitPrice),
        })),
        people: people.map(p => ({ id: p.id, name: p.name, phone: p.phone })),
        splits: personSplits.map(s => {
          const person = people.find(p => p.id === s.personId);
          return {
            personId: s.personId,
            name: person?.name || '',
            amount: s.amount,
            paid: parseFloat(partialPayments[s.personId] || '0') || 0,
            phone: person?.phone,
          };
        }),
        subtotal,
        service_charge: serviceCharge,
        grand_total: grandTotal,
        split_mode: splitMode,
      });
      setHistorySaved(true);
    }
  }, [currentStep, personSplits, historySaved]);

  const resetWizard = () => {
    setCurrentStep('items');
    setVisitedSteps(new Set(['items']));
    setItems([{ id: 1, description: '', qty: '1', unitPrice: '', totalPrice: '', lastEdited: [] }]);
    setPeopleCount(2);
    setPeople([]);
    setSplitMode('equal');
    setServiceChargePercent(10);
    setIncludeServiceCharge(true);
    setPersonSplits([]);
    setExcludedItems({});
    setItemAssignments({});
    setCustomPercentages({});
    setCustomAmounts({});
    setPartialPayments({});
    setShowPartialInput(null);
    setHistorySaved(false);
    setScanError(null);
    setPreviewImage(null);
  };

  // Camera scan
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    setIsScanning(true);
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { data, error } = await parseReceiptWithAuth({ imageBase64: base64, mode: 'bill' });
      if (error) {
        throw new Error((data as any)?.error || error.message || 'Erro ao processar.');
      }
      if (!data?.success) {
        setScanError((data as any)?.error || 'Nenhum item encontrado. Tente outra foto.');
        return;
      }
      // A nova Edge Function retorna os itens em data.data.items (não data.items)
      const itemsPayload = data?.data?.items;
      if (itemsPayload?.length > 0) {
        const parsed: BillItem[] = itemsPayload.map((item: any, i: number) => {
          const q = Number(item.qty) || 1;
          const u = Number(item.unitPrice) || 0;
          return {
            id: Date.now() + i,
            description: String(item.name || item.description || '').trim() || 'Item',
            qty: q.toString(),
            unitPrice: u.toFixed(2),
            totalPrice: (q * u).toFixed(2),
            lastEdited: ['qty', 'unitPrice'] as ('qty' | 'unitPrice')[],
            autoCalculated: true,
          };
        });
        setItems(parsed);
        // Usar o percentual pré-calculado pela Edge Function (baseado no subtotalCupom real)
        const taxaServicoPercent = data?.data?.taxaServicoPercent;
        if (taxaServicoPercent && taxaServicoPercent > 0) {
          setServiceChargePercent(taxaServicoPercent);
          setIncludeServiceCharge(true);
        }
      } else {
        setScanError((data as any)?.data?.error || 'Nenhum item encontrado. Tente outra foto.');
      }
    } catch (err: any) {
      setScanError(err?.message || 'Erro ao processar a imagem.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClose = () => { resetWizard(); onClose(); };

  const addItem = () => setItems([...items, { id: Date.now(), description: '', qty: '1', unitPrice: '', totalPrice: '', lastEdited: [] }]);
  const removeItem = (id: number) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const updateItemField = (id: number, field: 'qty' | 'unitPrice' | 'totalPrice', value: string) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const edited = [...i.lastEdited.filter(f => f !== field), field];
      return autoCalcItem({ ...i, [field]: value, lastEdited: edited });
    }));
  };
  const updateItemDescription = (id: number, value: string) => setItems(items.map(i => i.id === id ? { ...i, description: value } : i));

  const parseBillText = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const parsed: BillItem[] = [];
    for (const line of lines) {
      const match = line.match(/^(.+?)\s+(\d+)\s*[xX×]\s*R?\$?\s*([\d.,]+)\s*$/);
      const matchSimple = line.match(/^(.+?)\s+R?\$?\s*([\d.,]+)\s*$/);
      if (match) {
        const q = parseInt(match[2]), u = parseFloat(match[3].replace(',', '.'));
        parsed.push({ id: Date.now() + parsed.length, description: match[1].trim(), qty: q.toString(), unitPrice: u.toFixed(2), totalPrice: (q * u).toFixed(2), lastEdited: ['qty', 'unitPrice'] });
      } else if (matchSimple) {
        const u = parseFloat(matchSimple[2].replace(',', '.'));
        parsed.push({ id: Date.now() + parsed.length, description: matchSimple[1].trim(), qty: '1', unitPrice: u.toFixed(2), totalPrice: u.toFixed(2), lastEdited: ['qty', 'unitPrice'], autoCalculated: true });
      }
    }
    if (parsed.length > 0) setItems(parsed);
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'items': return validItems.length > 0;
      case 'people-count': return peopleCount >= 2;
      case 'people-names': return people.length === peopleCount;
      case 'split-mode': return !!splitMode;
      case 'split-config': return true;
      default: return false;
    }
  };

  const navigateToStep = (step: Step) => {
    const targetIdx = STEPS.indexOf(step);
    if (targetIdx <= stepIndex && visitedSteps.has(step)) setCurrentStep(step);
  };

  const calculateSplits = () => {
    const serviceMultiplier = includeServiceCharge ? 1 + (serviceChargePercent / 100) : 1;
    const getItemTotal = (item: BillItem) => { const t = parseNum(item.totalPrice); return t > 0 ? t : parseNum(item.qty) * parseNum(item.unitPrice); };

    switch (splitMode) {
      case 'equal': setPersonSplits(people.map(p => ({ personId: p.id, amount: grandTotal / people.length }))); break;
      case 'remove-and-split': {
        const itemSplits: Record<number, number> = {};
        for (const item of validItems) {
          const included = people.filter(p => !(excludedItems[p.id] || []).includes(item.id));
          if (included.length > 0) {
            const perPerson = (getItemTotal(item) * serviceMultiplier) / included.length;
            included.forEach(p => { itemSplits[p.id] = (itemSplits[p.id] || 0) + perPerson; });
          }
        }
        setPersonSplits(people.map(p => ({ personId: p.id, amount: itemSplits[p.id] || 0 }))); break;
      }
      case 'individual': {
        const totals: Record<number, number> = {};
        people.forEach(p => (totals[p.id] = 0));
        for (const item of validItems) {
          const assigned = itemAssignments[item.id] || people.map(p => p.id);
          if (assigned.length > 0) {
            const perPerson = (getItemTotal(item) * serviceMultiplier) / assigned.length;
            assigned.forEach(pid => { totals[pid] = (totals[pid] || 0) + perPerson; });
          }
        }
        setPersonSplits(people.map(p => ({ personId: p.id, amount: totals[p.id] || 0 }))); break;
      }
      case 'percentage': setPersonSplits(people.map(p => ({ personId: p.id, amount: grandTotal * ((customPercentages[p.id] || 0) / 100), percentage: customPercentages[p.id] || 0 }))); break;
      case 'custom': setPersonSplits(people.map(p => ({ personId: p.id, amount: parseFloat(customAmounts[p.id] || '0') }))); break;
    }
  };

  const goNext = () => {
    if (currentStep === 'people-count') {
      setPeople(Array.from({ length: peopleCount }, (_, i) => ({ id: i + 1, name: i === 0 ? userName : `Pessoa ${i + 1}` })));
    }
    if (currentStep === 'split-mode' || currentStep === 'split-config') calculateSplits();
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      if (STEPS[nextIndex] === 'split-config' && splitMode === 'equal') {
        calculateSplits();
        setVisitedSteps(prev => new Set([...prev, 'split-config', 'results']));
        setCurrentStep('results');
      } else {
        const next = STEPS[nextIndex];
        setVisitedSteps(prev => new Set([...prev, next]));
        setCurrentStep(next);
      }
    }
  };

  const goBack = () => {
    const prev = stepIndex - 1;
    if (prev >= 0) {
      if (STEPS[prev] === 'split-config' && splitMode === 'equal') setCurrentStep('split-mode');
      else setCurrentStep(STEPS[prev]);
    }
  };

  const nextStepButtonLabel = (): string => {
    if (currentStep === 'results') return 'Continuar';
    const next = STEPS[stepIndex + 1];
    if (currentStep === 'split-config' || (currentStep === 'split-mode' && splitMode === 'equal')) return 'Ver Resultado';
    if (next === 'people-count') return 'Avançar para Pessoas';
    if (next === 'people-names') return 'Avançar para Nomes';
    if (next === 'split-mode') return 'Avançar para Divisão';
    if (next === 'split-config') return 'Avançar para Ajustar';
    return 'Continuar';
  };

  // Share via html-to-image
  const shareAsImage = async () => {
    try {
      if (!resultRef.current) return;
      const dataUrl = await toPng(resultRef.current, { quality: 1, pixelRatio: 3 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'divisao-conta.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Divisão de Conta', text: 'Veja como ficou a divisão!', files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'divisao-conta.png';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error('Error generating image:', err); }
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const getItemDisplayTotal = (item: BillItem) => { const t = parseNum(item.totalPrice); return t > 0 ? t : parseNum(item.qty) * parseNum(item.unitPrice); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 md:bg-black/50 animate-fade-in overscroll-none touch-pan-y" style={{ overscrollBehavior: 'contain' }}>
      <div className="bg-background w-full h-full md:max-w-xl md:max-h-[calc(100vh-2rem)] md:h-auto md:min-h-0 md:rounded-xl md:shadow-xl flex flex-col overflow-hidden isolate">
        {/* Header — fundo verde; respeita safe-area no mobile para não cortar sob a status bar */}
        <div
          className="bg-gradient-to-br from-primary via-primary to-primary/90 text-white px-4 pb-2 shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-white">Dividir Conta</h1>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Timeline */}
          <div className="flex items-center gap-0.5 px-1 pb-2 overflow-x-auto">
            {STEPS.map((step, i) => {
              const isActive = i === stepIndex;
              const isPast = i < stepIndex;
              const isClickable = visitedSteps.has(step) && i <= stepIndex;
              return (
                <React.Fragment key={step}>
                  <button onClick={() => isClickable && navigateToStep(step)} disabled={!isClickable} className={cn('flex flex-col items-center gap-1 min-w-0 transition-all', isClickable && 'cursor-pointer')}>
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 text-white', isActive && 'bg-white text-primary border-white scale-110', isPast && !isActive && 'bg-white/80 text-primary border-white/80', !isPast && !isActive && 'bg-transparent text-white/40 border-white/30')}>
                      {isPast && !isActive ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={cn('text-[10px] leading-tight whitespace-nowrap', isActive ? 'text-white font-semibold' : 'text-white/70')}>{STEP_LABELS[step]}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className={cn('flex-1 h-0.5 min-w-3 mt-[-12px]', i < stepIndex ? 'bg-white/70' : 'bg-white/20')} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content — overscroll-behavior evita que o scroll “vaze” para a página ao fundo no mobile */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0 overscroll-contain touch-pan-y" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        {/* Step: Items */}
        {currentStep === 'items' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Adicione itens, cole texto ou tire uma foto.</p>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="flex-1 gap-2 h-12 border-dashed border-2">
                {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" />Lendo...</> : <><Camera className="w-4 h-4" />Tirar Foto</>}
              </Button>
              <Button variant="outline" disabled={isScanning} className="gap-2 h-12 border-dashed border-2" onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (e) => handlePhotoCapture(e as any); inp.click(); }}>
                <ImageIcon className="w-4 h-4" />Galeria
              </Button>
            </div>
            {previewImage && (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={previewImage} alt="Conta" className="w-full max-h-40 object-cover" />
                {isScanning && <div className="absolute inset-0 bg-background/70 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
              </div>
            )}
            {scanError && <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">{scanError}</div>}
            <textarea className="w-full p-3 rounded-xl border border-input bg-background text-sm resize-none h-16 focus:ring-2 focus:ring-ring focus:outline-none" placeholder="Cole o texto da conta (ex: Hambúrguer 2 x 35,00)" onPaste={(e) => { const text = e.clipboardData.getData('text'); if (text) parseBillText(text); }} onChange={(e) => { if (e.target.value.includes('\n')) parseBillText(e.target.value); }} />
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_52px_72px_72px_28px] gap-1.5 text-[11px] font-semibold text-muted-foreground px-0.5">
                <span>Item</span><span className="text-center">Qtde</span><span className="text-right">V. Unit.</span><span className="text-right">V. Total</span><span></span>
              </div>
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-[1fr_52px_72px_72px_28px] gap-1.5 items-center">
                  <Input value={item.description} onChange={e => updateItemDescription(item.id, e.target.value)} placeholder="Descrição" className="h-9 text-sm rounded-lg" />
                  <Input type="number" min={1} value={item.qty} onChange={e => updateItemField(item.id, 'qty', e.target.value)} className="h-9 text-sm text-center rounded-lg px-1" />
                  <Input type="number" min={0} step={0.01} value={item.unitPrice} onChange={e => updateItemField(item.id, 'unitPrice', e.target.value)} placeholder="0,00" className="h-9 text-sm text-right rounded-lg px-1" />
                  <Input type="number" min={0} step={0.01} value={item.totalPrice} onChange={e => updateItemField(item.id, 'totalPrice', e.target.value)} placeholder="0,00" className="h-9 text-sm text-right rounded-lg px-1" />
                  <button onClick={() => removeItem(item.id)} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors" disabled={items.length <= 1}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addItem} className="w-full gap-2 h-10"><Plus className="w-4 h-4" /> Adicionar Item</Button>
            <div className="bg-card rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Taxa de serviço</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeServiceCharge} onChange={e => setIncludeServiceCharge(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm">Incluir</span>
                </label>
              </div>
              {includeServiceCharge && (
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} value={serviceChargePercent} onChange={e => setServiceChargePercent(parseFloat(e.target.value) || 0)} className="w-20 h-8 text-sm text-center rounded-lg" />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm text-muted-foreground ml-auto">{formatCurrency(serviceCharge)}</span>
                </div>
              )}
            </div>
            <div className="bg-primary/5 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              {includeServiceCharge && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Serviço ({serviceChargePercent}%)</span><span className="font-medium">{formatCurrency(serviceCharge)}</span></div>}
              <div className="flex justify-between text-base font-bold pt-1 border-t border-border"><span>Total</span><span className="text-primary">{formatCurrency(grandTotal)}</span></div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/60">
              <Button onClick={goNext} disabled={!canGoNext()} className="w-full gap-2 h-12 text-base font-semibold bg-primary text-white hover:bg-primary/90 rounded-xl">
                {nextStepButtonLabel()}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: People Count */}
        {currentStep === 'people-count' && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <Users className="w-14 h-14 mx-auto text-primary/30 mb-3" />
              <h2 className="text-2xl font-bold mb-1">Quantas pessoas?</h2>
              <p className="text-muted-foreground text-sm">Incluindo você</p>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setPeopleCount(Math.max(2, peopleCount - 1))} className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground font-bold text-xl">−</button>
              <span className="text-5xl font-bold text-primary w-16 text-center">{peopleCount}</span>
              <button onClick={() => setPeopleCount(Math.min(20, peopleCount + 1))} className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground font-bold text-xl">+</button>
            </div>
            <div className="bg-primary/5 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Divisão igual seria</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(grandTotal / peopleCount)}</p>
              <p className="text-xs text-muted-foreground">por pessoa</p>
            </div>
            <div className="mt-8 pt-6 border-t border-border/60">
              <Button onClick={goNext} disabled={!canGoNext()} className="w-full gap-2 h-12 text-base font-semibold bg-primary text-white hover:bg-primary/90 rounded-xl">
                {nextStepButtonLabel()}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: People Names */}
        {currentStep === 'people-names' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Personalize os nomes e adicione telefone para WhatsApp.</p>
            {'contacts' in navigator && (
              <Button variant="outline" className="w-full gap-2 h-10 border-dashed border-2" onClick={async () => {
                try {
                  const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
                  if (contacts?.length) {
                    const updated = [...people];
                    contacts.forEach((c: any, idx: number) => {
                      const targetIdx = idx + 1;
                      if (targetIdx < updated.length) {
                        updated[targetIdx] = { ...updated[targetIdx], name: c.name?.[0] || updated[targetIdx].name, phone: c.tel?.[0] || '' };
                      }
                    });
                    setPeople(updated);
                  }
                } catch (err) { /* cancelled */ }
              }}>
                <Contact className="w-4 h-4" /> Importar da Agenda
              </Button>
            )}
            <div className="space-y-3">
              {people.map((person, i) => (
                <div key={person.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-primary-foreground shrink-0', i === 0 ? 'bg-primary' : 'bg-accent')}>
                      {person.name.charAt(0).toUpperCase() || (i + 1)}
                    </div>
                    <Input value={person.name} onChange={e => setPeople(people.map(p => p.id === person.id ? { ...p, name: e.target.value } : p))} placeholder={`Pessoa ${i + 1}`} className="h-10 rounded-xl" />
                    {i === 0 && <span className="text-xs text-primary font-semibold shrink-0">(você)</span>}
                  </div>
                  {i > 0 && (
                    <div className="flex items-center gap-2 pl-12">
                      <MessageCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Input value={person.phone || ''} onChange={e => setPeople(people.map(p => p.id === person.id ? { ...p, phone: e.target.value } : p))} placeholder="Telefone (WhatsApp)" className="h-8 rounded-lg text-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-border/60">
              <Button onClick={goNext} disabled={!canGoNext()} className="w-full gap-2 h-12 text-base font-semibold bg-primary text-white hover:bg-primary/90 rounded-xl">
                {nextStepButtonLabel()}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Split Mode */}
        {currentStep === 'split-mode' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">Como dividir {formatCurrency(grandTotal)}?</p>
            {[
              { id: 'equal' as SplitMode, icon: SplitSquareVertical, title: 'Dividir igualmente', desc: `${formatCurrency(grandTotal / people.length)} por pessoa` },
              { id: 'remove-and-split' as SplitMode, icon: Scissors, title: 'Retirar itens e dividir', desc: 'Exclua itens e divida o resto' },
              { id: 'individual' as SplitMode, icon: Receipt, title: 'Cada um paga o seu', desc: 'Atribua itens a cada pessoa' },
              { id: 'percentage' as SplitMode, icon: Percent, title: 'Por porcentagem', desc: 'Defina a % de cada um' },
              { id: 'custom' as SplitMode, icon: Calculator, title: 'Valores personalizados', desc: 'Defina o valor exato' },
            ].map(mode => (
              <button key={mode.id} onClick={() => setSplitMode(mode.id)} className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left', splitMode === mode.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', splitMode === mode.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}><mode.icon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{mode.title}</p><p className="text-xs text-muted-foreground">{mode.desc}</p></div>
                {splitMode === mode.id && <Check className="w-5 h-5 text-primary shrink-0" />}
              </button>
            ))}
            <div className="mt-8 pt-6 border-t border-border/60">
              <Button onClick={goNext} disabled={!canGoNext()} className="w-full gap-2 h-12 text-base font-semibold bg-primary text-white hover:bg-primary/90 rounded-xl">
                {nextStepButtonLabel()}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Split Config */}
        {currentStep === 'split-config' && (
          <div className="space-y-4">
            {splitMode === 'remove-and-split' && (
              <>
                <p className="text-sm text-muted-foreground">Marque os itens que cada pessoa <strong>NÃO</strong> consumiu.</p>
                {people.map(person => (
                  <div key={person.id} className="bg-card rounded-xl border border-border p-3 space-y-1.5">
                    <p className="font-semibold text-sm">{person.name}</p>
                    {validItems.map(item => {
                      const isExcluded = (excludedItems[person.id] || []).includes(item.id);
                      return (
                        <button key={item.id} onClick={() => {
                          const current = excludedItems[person.id] || [];
                          setExcludedItems({ ...excludedItems, [person.id]: isExcluded ? current.filter(id => id !== item.id) : [...current, item.id] });
                        }} className={cn('w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors', isExcluded ? 'bg-destructive/10 text-destructive line-through' : 'bg-muted/30 hover:bg-muted/50')}>
                          <span>{item.description}</span><span className="font-medium">{formatCurrency(getItemDisplayTotal(item))}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
            {splitMode === 'individual' && (
              <>
                <p className="text-sm text-muted-foreground">Selecione quem consumiu cada item.</p>
                {validItems.map(item => {
                  const assigned = itemAssignments[item.id] || people.map(p => p.id);
                  return (
                    <div key={item.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                      <div className="flex justify-between items-center"><p className="font-semibold text-sm">{item.description}</p><p className="text-sm text-primary font-medium">{formatCurrency(getItemDisplayTotal(item))}</p></div>
                      <div className="flex flex-wrap gap-2">
                        {people.map(person => {
                          const isAssigned = assigned.includes(person.id);
                          return (
                            <button key={person.id} onClick={() => {
                              const newAssigned = isAssigned ? assigned.filter(id => id !== person.id) : [...assigned, person.id];
                              setItemAssignments({ ...itemAssignments, [item.id]: newAssigned });
                            }} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all', isAssigned ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                              {person.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {splitMode === 'percentage' && (
              <>
                <p className="text-sm text-muted-foreground">Defina a porcentagem de cada pessoa.</p>
                {people.map(person => (
                  <div key={person.id} className="flex items-center gap-2 bg-card rounded-xl border border-border p-3">
                    <span className="text-sm font-medium flex-1">{person.name}</span>
                    <Input type="number" min={0} max={100} value={customPercentages[person.id] || ''} onChange={e => setCustomPercentages({ ...customPercentages, [person.id]: parseFloat(e.target.value) || 0 })} className="w-16 h-8 text-sm text-center rounded-lg" placeholder="0" />
                    <span className="text-xs text-muted-foreground">%</span>
                    <span className="text-xs font-medium text-primary w-20 text-right">{formatCurrency(grandTotal * ((customPercentages[person.id] || 0) / 100))}</span>
                  </div>
                ))}
              </>
            )}
            {splitMode === 'custom' && (
              <>
                <p className="text-sm text-muted-foreground">Defina o valor de cada pessoa.</p>
                {people.map(person => (
                  <div key={person.id} className="flex items-center gap-2 bg-card rounded-xl border border-border p-3">
                    <span className="text-sm font-medium flex-1">{person.name}</span>
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input type="number" min={0} step={0.01} value={customAmounts[person.id] || ''} onChange={e => setCustomAmounts({ ...customAmounts, [person.id]: e.target.value })} className="w-24 h-8 text-sm text-right rounded-lg" placeholder="0,00" />
                  </div>
                ))}
              </>
            )}
            <div className="mt-8 pt-6 border-t border-border/60">
              <Button onClick={goNext} disabled={!canGoNext()} className="w-full gap-2 h-12 text-base font-semibold bg-primary text-white hover:bg-primary/90 rounded-xl">
                {nextStepButtonLabel()}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Results */}
        {currentStep === 'results' && (
          <div className="space-y-4">
            <div ref={resultRef} className="space-y-4 bg-background p-1">
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 text-center">
                  <Scissors className="w-7 h-7 mx-auto mb-1 opacity-80" />
                  <h2 className="text-lg font-bold">Divisão da Conta</h2>
                  <p className="text-primary-foreground/70 text-xs font-mono">#{splitId.slice(0, 8)} • {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="p-4 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itens</p>
                  {validItems.map(item => (
                    <div key={item.id} className="flex justify-between text-sm py-0.5">
                      <span>{parseNum(item.qty)}x {item.description}</span>
                      <span className="font-medium">{formatCurrency(getItemDisplayTotal(item))}</span>
                    </div>
                  ))}
                  <div className="border-t border-border mt-2 pt-2 space-y-0.5">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    {includeServiceCharge && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Serviço ({serviceChargePercent}%)</span><span>{formatCurrency(serviceCharge)}</span></div>}
                    <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatCurrency(grandTotal)}</span></div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Por pessoa</p>
                  <div className="space-y-2">
                    {personSplits.map(split => {
                      const person = people.find(p => p.id === split.personId);
                      const paid = parseFloat(partialPayments[split.personId] || '0') || 0;
                      const remaining = Math.max(0, split.amount - paid);
                      const isFullyPaid = paid >= split.amount && split.amount > 0;
                      return (
                        <div key={split.personId} className="space-y-1">
                          <div className={cn('flex items-center justify-between rounded-xl p-3 transition-all', isFullyPaid ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30')}>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{person?.name.charAt(0).toUpperCase()}</div>
                              <div>
                                <p className="font-semibold text-sm">{person?.name}{person?.id === 1 ? ' (você)' : ''}</p>
                                {paid > 0 && <p className="text-xs text-primary">Pagou {formatCurrency(paid)} {isFullyPaid ? '✓' : `• Resta ${formatCurrency(remaining)}`}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-lg font-bold', isFullyPaid ? 'text-primary/50' : 'text-primary')}>
                                {isFullyPaid ? 'Pago' : formatCurrency(remaining)}
                              </span>
                              <button onClick={() => setShowPartialInput(showPartialInput === split.personId ? null : split.personId)} className={cn('p-1.5 rounded-lg transition-colors', showPartialInput === split.personId ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                                <Wallet className="w-4 h-4" />
                              </button>
                              {person?.phone && person.id !== 1 && (
                                <button onClick={() => {
                                  const cleanPhone = (person.phone || '').replace(/\D/g, '');
                                  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                                  const msg = encodeURIComponent(`Oi ${person.name}! 🧾\n\nSua parte da conta ficou *${formatCurrency(remaining)}*.\n\nID: #${splitId.slice(0, 8)}\n\n— RXFin Split`);
                                  window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
                                }} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {showPartialInput === split.personId && (
                            <div className="flex items-center gap-2 px-3 pb-1 animate-fade-in">
                              <span className="text-xs text-muted-foreground shrink-0">Já pagou:</span>
                              <span className="text-xs text-muted-foreground">R$</span>
                              <Input type="number" min={0} step={0.01} value={partialPayments[split.personId] || ''} onChange={e => setPartialPayments({ ...partialPayments, [split.personId]: e.target.value })} placeholder="0,00" className="h-8 text-sm text-right rounded-lg w-24" autoFocus />
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setPartialPayments({ ...partialPayments, [split.personId]: split.amount.toFixed(2) }); setShowPartialInput(null); }}>Total</Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-4 pb-3"><p className="text-[10px] text-muted-foreground text-center">RXFin Split • {new Date().toLocaleString('pt-BR')}</p></div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setHistorySaved(false); navigateToStep('items'); setVisitedSteps(new Set(['items'])); }} variant="outline" className="flex-1 gap-2"><ChevronLeft className="w-4 h-4" /> Editar</Button>
              <Button onClick={shareAsImage} className="flex-1 gap-2"><Download className="w-4 h-4" /> Salvar Imagem</Button>
            </div>
            <div className="flex gap-3">
              <Button onClick={shareAsImage} variant="secondary" className="flex-1 gap-2"><Share2 className="w-4 h-4" /> Compartilhar</Button>
              <Button variant="secondary" onClick={handleClose} className="flex-1">Nova Divisão</Button>
            </div>
          </div>
        )}
      </div>

        {/* Footer Navigation */}
        {currentStep !== 'results' && (
          <div className="p-4 border-t border-border bg-card/95 backdrop-blur-xl shrink-0 safe-area-pb">
            <div className="flex gap-3">
              {stepIndex > 0 && <Button variant="outline" onClick={goBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Voltar</Button>}
              <Button onClick={goNext} disabled={!canGoNext()} className="flex-1 gap-2 bg-primary text-white hover:bg-primary/90 min-h-11">
                {nextStepButtonLabel()}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {currentStep === 'items' && !canGoNext() && (
              <p className="text-xs text-muted-foreground text-center mt-2">Adicione ao menos um item com descrição e valor para continuar.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
