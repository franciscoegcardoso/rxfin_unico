import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Repeat, 
  CheckCircle2,
  Sparkles,
  Check,
  X,
  Loader2,
  Search,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  Shield,
  ShieldQuestion,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { toast } from 'sonner';
import { useVisibility } from '@/contexts/VisibilityContext';

interface RecurringPurchasesSectionProps {
  transactions: CreditCardTransaction[];
  onToggleRecurring: (id: string, isRecurring: boolean, confidenceLevel?: string) => Promise<boolean>;
  onDetectRecurring: () => Promise<unknown>;
  detecting: boolean;
}

interface RecurringGroup {
  name: string;
  normalizedName: string;
  averageValue: number;
  occurrences: number;
  isRecurring: boolean;
  confidenceLevel: string | null;
  transactions: CreditCardTransaction[];
  groupId: string | null;
}

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; badgeClass: string }> = {
  confirmed: { label: 'Confirmado', color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40' },
  very_high: { label: 'Muito Alta', color: 'text-emerald-600 dark:text-emerald-400', icon: ShieldCheck, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40' },
  high: { label: 'Alta', color: 'text-blue-600 dark:text-blue-400', icon: ShieldAlert, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40' },
  medium: { label: 'Média', color: 'text-amber-600 dark:text-amber-400', icon: Shield, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40' },
  low: { label: 'Baixa', color: 'text-muted-foreground', icon: ShieldQuestion, badgeClass: 'bg-muted/50 text-muted-foreground border-border/60' },
};

export function RecurringPurchasesSection({ transactions, onToggleRecurring, onDetectRecurring, detecting }: RecurringPurchasesSectionProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const { isHidden } = useVisibility();

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Group transactions by recurring_group_id or normalized name
  const { confirmedGroups, suggestionGroups } = useMemo(() => {
    const groups = new Map<string, RecurringGroup>();

    // Only consider non-installment transactions with a confidence_level or is_recurring
    const relevant = transactions.filter(t =>
      (t.confidence_level || t.is_recurring) &&
      t.confidence_level !== 'dismissed' &&
      (!t.installment_total || t.installment_total <= 1)
    );

    relevant.forEach(t => {
      const key = t.recurring_group_id || t.store_name.toLowerCase().trim();
      const existing = groups.get(key);
      if (existing) {
        existing.transactions.push(t);
        existing.occurrences += 1;
        existing.averageValue = existing.transactions.reduce((s, tx) => s + tx.value, 0) / existing.transactions.length;
        if (t.is_recurring) existing.isRecurring = true;
        // Use highest confidence in the group
        if (t.confidence_level === 'confirmed') existing.confidenceLevel = 'confirmed';
      } else {
        groups.set(key, {
          name: t.friendly_name || t.store_name,
          normalizedName: t.store_name.toLowerCase().trim(),
          averageValue: t.value,
          occurrences: 1,
          isRecurring: t.is_recurring || false,
          confidenceLevel: t.confidence_level,
          transactions: [t],
          groupId: t.recurring_group_id,
        });
      }
    });

    const all = Array.from(groups.values());

    const confirmed = all
      .filter(g => g.confidenceLevel === 'confirmed' || (g.isRecurring && !g.confidenceLevel))
      .sort((a, b) => b.averageValue - a.averageValue);

    const confidenceOrder = ['very_high', 'high', 'medium', 'low'];
    const suggestions = all
      .filter(g => g.confidenceLevel && g.confidenceLevel !== 'confirmed' && !(g.isRecurring && !g.confidenceLevel))
      .sort((a, b) => {
        const aIdx = confidenceOrder.indexOf(a.confidenceLevel || 'low');
        const bIdx = confidenceOrder.indexOf(b.confidenceLevel || 'low');
        if (aIdx !== bIdx) return aIdx - bIdx;
        return b.averageValue - a.averageValue;
      });

    return { confirmedGroups: confirmed, suggestionGroups: suggestions };
  }, [transactions]);

  const totals = useMemo(() => ({
    monthlyTotal: confirmedGroups.reduce((sum, g) => sum + g.averageValue, 0),
    confirmedCount: confirmedGroups.length,
    suggestionsCount: suggestionGroups.length,
  }), [confirmedGroups, suggestionGroups]);

  const handleConfirm = useCallback(async (group: RecurringGroup) => {
    const ids = group.transactions.map(t => t.id);
    setUpdatingIds(prev => new Set([...prev, ...ids]));
    try {
      const results = await Promise.all(ids.map(id => onToggleRecurring(id, true, 'confirmed')));
      if (results.every(r => r)) toast.success('Marcado como recorrente');
    } finally {
      setUpdatingIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
    }
  }, [onToggleRecurring]);

  const handleDismiss = useCallback(async (group: RecurringGroup) => {
    const ids = group.transactions.map(t => t.id);
    setUpdatingIds(prev => new Set([...prev, ...ids]));
    try {
      const results = await Promise.all(ids.map(id => onToggleRecurring(id, false, 'dismissed')));
      if (results.every(r => r)) toast.success('Sugestão descartada');
    } finally {
      setUpdatingIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
    }
  }, [onToggleRecurring]);

  const handleRemove = useCallback(async (group: RecurringGroup) => {
    const ids = group.transactions.map(t => t.id);
    setUpdatingIds(prev => new Set([...prev, ...ids]));
    try {
      const results = await Promise.all(ids.map(id => onToggleRecurring(id, false, 'dismissed')));
      if (results.every(r => r)) toast.success('Removido dos recorrentes');
    } finally {
      setUpdatingIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
    }
  }, [onToggleRecurring]);

  const isHighConfidence = (level: string | null) => level === 'very_high' || level === 'high';

  // Empty state
  if (confirmedGroups.length === 0 && suggestionGroups.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Repeat className="h-10 w-10 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
        <p className="font-medium text-sm">Nenhuma compra recorrente identificada</p>
        <p className="text-xs mt-1 text-muted-foreground/70">
          Clique em "Detectar" para analisar suas transações
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs mt-4"
          onClick={() => onDetectRecurring()}
          disabled={detecting}
        >
          {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Detectar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Detect button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => onDetectRecurring()}
          disabled={detecting}
        >
          {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Detectar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/40 bg-card p-5 flex items-center gap-3.5 hover:border-border/60 transition-all">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Confirmadas</p>
            <p className="text-lg font-bold text-foreground tabular-nums tracking-tight">{totals.confirmedCount}</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-border/40 bg-card p-5 flex items-center gap-3.5 hover:border-border/60 transition-all">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/8 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Sugestões</p>
            <p className="text-lg font-bold text-foreground tabular-nums tracking-tight">{totals.suggestionsCount}</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-border/40 bg-card p-5 flex items-center gap-3.5 hover:border-border/60 transition-all col-span-2 lg:col-span-1">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Mensal</p>
            <p className="text-lg font-bold font-mono text-foreground tabular-nums tracking-tight truncate">{formatCurrency(totals.monthlyTotal)}</p>
          </div>
        </div>
      </div>

      {/* Confirmed Recurring */}
      {confirmedGroups.length > 0 && (
        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Recorrências Confirmadas</CardTitle>
                <CardDescription className="text-xs">Assinaturas que você confirmou</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <ScrollArea className="h-[250px]">
              <div className="space-y-1.5">
                {confirmedGroups.map(group => {
                  const isUpdating = group.transactions.some(t => updatingIds.has(t.id));
                  return (
                    <div 
                      key={group.groupId || group.normalizedName}
                      className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 dark:border-emerald-800/20 dark:bg-emerald-950/5 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[13px] truncate tracking-tight">{group.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{group.occurrences}x</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-[13px] font-mono tabular-nums tracking-tight">{formatCurrency(group.averageValue)}</p>
                            <p className="text-[9px] text-muted-foreground hidden xs:block">mensal</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                            onClick={() => handleRemove(group)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {suggestionGroups.length > 0 && (
        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Sugestões de Recorrência</CardTitle>
                <CardDescription className="text-xs">Analise cada sugestão com base no nível de confiança</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1.5">
                {suggestionGroups.map(group => {
                  const isUpdating = group.transactions.some(t => updatingIds.has(t.id));
                  const config = CONFIDENCE_CONFIG[group.confidenceLevel || 'low'] || CONFIDENCE_CONFIG.low;
                  const ConfIcon = config.icon;
                  const highConf = isHighConfidence(group.confidenceLevel);

                  return (
                    <div 
                      key={group.groupId || group.normalizedName}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all",
                        highConf
                          ? "border-primary/15 bg-primary/3 hover:bg-primary/5 hover:border-primary/25"
                          : "border-border/30 bg-muted/5 hover:bg-muted/15"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                            highConf ? "bg-primary/8" : "bg-muted/40"
                          )}>
                            <ConfIcon className={cn("h-4 w-4", config.color)} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-[13px] truncate tracking-tight">{group.name}</p>
                              <Badge className={cn("text-[8px] shrink-0 px-1.5 h-4 gap-0.5", config.badgeClass)}>
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{group.occurrences}x</span>
                              {!highConf && (
                                <>
                                  <span className="text-border">·</span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center gap-0.5 cursor-help">
                                          <HelpCircle className="h-3 w-3" />
                                          Isso se repete?
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                                        Identificamos esse gasto mais de uma vez. Ele se repete todo mês?
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-[13px] font-mono tabular-nums tracking-tight whitespace-nowrap">{formatCurrency(group.averageValue)}</p>
                            <p className="text-[9px] text-muted-foreground hidden xs:block">mensal</p>
                          </div>
                          {highConf ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 border-emerald-200/80 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800/60 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all"
                                onClick={() => handleConfirm(group)}
                                disabled={isUpdating}
                              >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                                  <><Check className="h-3 w-3" strokeWidth={1.5} /><span className="hidden sm:inline">Confirmar</span></>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-1.5 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                onClick={() => handleDismiss(group)}
                                disabled={isUpdating}
                              >
                                <X className="h-3 w-3" strokeWidth={1.5} />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 border-emerald-200/80 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800/60 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all"
                                onClick={() => handleConfirm(group)}
                                disabled={isUpdating}
                              >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                                  <><Check className="h-3 w-3" strokeWidth={1.5} /><span className="hidden sm:inline">Sim</span></>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-1.5 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                onClick={() => handleDismiss(group)}
                                disabled={isUpdating}
                              >
                                <X className="h-3 w-3" strokeWidth={1.5} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
