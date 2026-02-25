import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  CheckCircle,
  Copy,
  Calendar,
  CreditCard,
  Hash,
  Link,
  Circle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { CreditCardBill } from '@/hooks/useCreditCardBills';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { normalizeForSibling, detectSiblingInstallment } from '@/utils/installmentGroupId';
import { parseLocalDate } from '@/utils/dateUtils';
import type { KnownInstallmentGroup } from '@/utils/installmentGroupId';

type DetectionSource = 'metadata' | 'regex' | 'sibling' | 'inferred' | 'none';

interface InstallmentDiagnosticDialogProps {
  transactions: CreditCardTransaction[];
  bills: CreditCardBill[];
  creditCards: Array<{ id: string; name: string }>;
}

interface InstallmentGroup {
  groupId: string | null;
  storeName: string;
  cardId: string | null;
  cardName: string;
  installmentTotal: number;
  purchaseDate: string;
  parcels: Array<{
    id: string;
    installmentCurrent: number;
    value: number;
    transactionDate: string;
    billId: string | null;
    billMonth: string | null;
    detectionSource: DetectionSource;
  }>;
  allInstallments: Array<{
    installmentNumber: number;
    isPaid: boolean;
    isInferredPaid: boolean;
    detectionSource: DetectionSource;
    billMonth: string | null;
    value: number;
    isDuplicate: boolean;
  }>;
  issues: string[];
  maxInstallment: number;
  isComplete: boolean;
  hasDuplicates: boolean;
}

/**
 * Determine detection source for a transaction based on its store_name pattern.
 */
function getDetectionSource(tx: CreditCardTransaction): DetectionSource {
  // Check if store_name contains installment pattern (regex source)
  const hasPattern = /\d{1,2}\s*[\/\\]\s*\d{1,2}/.test(tx.store_name);
  if (hasPattern) return 'regex';
  // If it has installment info but no pattern, it was from metadata or sibling
  if (tx.installment_total && tx.installment_total > 1) return 'metadata';
  return 'none';
}

export function InstallmentDiagnosticDialog({
  transactions,
  bills,
  creditCards,
}: InstallmentDiagnosticDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'complete' | 'issues' | 'duplicates' | 'legacy'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const billsById = useMemo(
    () => new Map(bills.map((b) => [b.id, b])),
    [bills]
  );

  const cardsById = useMemo(
    () => new Map(creditCards.map((c) => [c.id, c.name])),
    [creditCards]
  );

  const installmentGroups = useMemo(() => {
    const groups = new Map<string, InstallmentGroup>();

    // Filter installment transactions
    const installmentTxs = transactions.filter(
      (t) => t.installment_total && t.installment_total > 1
    );

    // Build known groups for sibling detection of orphans
    const knownGroupsMap = new Map<string, KnownInstallmentGroup & { anchorTxDate: string; anchorCurrent: number }>();
    for (const tx of installmentTxs) {
      const normName = normalizeForSibling(tx.store_name);
      const sibKey = `${tx.card_id || 'no-card'}::${normName}::${tx.installment_total}`;
      if (!knownGroupsMap.has(sibKey)) {
        knownGroupsMap.set(sibKey, {
          normalizedName: normName,
          cardId: tx.card_id,
          installmentTotal: tx.installment_total!,
          value: tx.value,
          purchaseDate: tx.transaction_date,
          groupId: tx.installment_group_id || sibKey,
          existingCurrentNumbers: new Set<number>(),
          existingPluggyIds: new Set<string>(),
          anchorTxDate: tx.transaction_date,
          anchorCurrent: tx.installment_current || 1,
        });
      }
      const g = knownGroupsMap.get(sibKey)!;
      if (tx.installment_current) g.existingCurrentNumbers.add(tx.installment_current);

      if (tx.installment_current === 1) {
        g.purchaseDate = tx.transaction_date;
        g.anchorTxDate = tx.transaction_date;
        g.anchorCurrent = 1;
      } else if (g.anchorCurrent !== 1 && tx.transaction_date < g.anchorTxDate) {
        g.anchorTxDate = tx.transaction_date;
        g.anchorCurrent = tx.installment_current || 1;
        const d = new Date(tx.transaction_date + 'T00:00:00');
        d.setMonth(d.getMonth() - ((tx.installment_current || 1) - 1));
        g.purchaseDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    const knownGroups = Array.from(knownGroupsMap.values());

    // Try to match orphan transactions (no installment info) to known groups
    const orphanTxs = transactions.filter(
      (t) => !t.installment_total && t.store_name
    );
    const siblingMatches = new Map<string, { current: number; total: number; groupId: string }>();

    for (const tx of orphanTxs) {
      const match = detectSiblingInstallment(
        { store_name: tx.store_name, card_id: tx.card_id, value: tx.value, transaction_date: tx.transaction_date },
        knownGroups
      );
      if (match) {
        siblingMatches.set(tx.id, match);
        // Update known group so subsequent orphans don't claim same slot
        const sibKey = `${tx.card_id || 'no-card'}::${normalizeForSibling(tx.store_name)}::${match.total}`;
        const g = knownGroupsMap.get(sibKey);
        if (g) g.existingCurrentNumbers.add(match.current);
      }
    }

    // Process all installment transactions into groups
    installmentTxs.forEach((tx) => {
      const groupKey =
        tx.installment_group_id ||
        `legacy::${tx.card_id || 'no-card'}::${tx.store_name.toUpperCase()}::${tx.installment_total}`;

      const bill = tx.credit_card_bill_id ? billsById.get(tx.credit_card_bill_id) : null;
      const billMonth = bill?.billing_month || bill?.due_date?.substring(0, 7) || null;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupId: tx.installment_group_id,
          storeName: tx.store_name,
          cardId: tx.card_id,
          cardName: tx.card_id ? cardsById.get(tx.card_id) || 'Cartão' : 'Sem cartão',
          installmentTotal: tx.installment_total!,
          purchaseDate: tx.transaction_date,
          parcels: [],
          allInstallments: [],
          issues: [],
          maxInstallment: 0,
          isComplete: false,
          hasDuplicates: false,
        });
      }

      const group = groups.get(groupKey)!;
      if (tx.transaction_date < group.purchaseDate) {
        group.purchaseDate = tx.transaction_date;
      }
      group.parcels.push({
        id: tx.id,
        installmentCurrent: tx.installment_current || 1,
        value: tx.value,
        transactionDate: tx.transaction_date,
        billId: tx.credit_card_bill_id,
        billMonth,
        detectionSource: getDetectionSource(tx),
      });
    });

    // Add sibling-matched orphans to their groups
    for (const tx of orphanTxs) {
      const match = siblingMatches.get(tx.id);
      if (!match) continue;

      const groupKey = match.groupId;
      const bill = tx.credit_card_bill_id ? billsById.get(tx.credit_card_bill_id) : null;
      const billMonth = bill?.billing_month || bill?.due_date?.substring(0, 7) || null;

      if (groups.has(groupKey)) {
        const group = groups.get(groupKey)!;
        group.parcels.push({
          id: tx.id,
          installmentCurrent: match.current,
          value: tx.value,
          transactionDate: tx.transaction_date,
          billId: tx.credit_card_bill_id,
          billMonth,
          detectionSource: 'sibling',
        });
      } else {
        // Try to find group by legacy key or any matching group
        for (const [, group] of groups) {
          if (
            normalizeForSibling(group.storeName) === normalizeForSibling(tx.store_name) &&
            group.cardId === tx.card_id &&
            group.installmentTotal === match.total
          ) {
            group.parcels.push({
              id: tx.id,
              installmentCurrent: match.current,
              value: tx.value,
              transactionDate: tx.transaction_date,
              billId: tx.credit_card_bill_id,
              billMonth,
              detectionSource: 'sibling',
            });
            break;
          }
        }
      }
    }

    // Analyze each group for issues
    groups.forEach((group) => {
      group.parcels.sort((a, b) => a.installmentCurrent - b.installmentCurrent);

      // Check for duplicates
      const parcelKeys = new Map<string, number>();
      group.parcels.forEach((p) => {
        const key = `${p.installmentCurrent}::${p.value}::${p.transactionDate}`;
        parcelKeys.set(key, (parcelKeys.get(key) || 0) + 1);
      });

      const duplicates = Array.from(parcelKeys.entries()).filter(([, count]) => count > 1);
      if (duplicates.length > 0) {
        group.hasDuplicates = true;
        duplicates.forEach(([key, count]) => {
          const num = key.split('::')[0];
          group.issues.push(`Parcela ${num}/${group.installmentTotal} duplicada (${count}x)`);
        });
      }

      group.maxInstallment = Math.max(...group.parcels.map((p) => p.installmentCurrent));
      group.isComplete = group.maxInstallment >= group.installmentTotal;

      if (!group.groupId) {
        group.issues.push('Sem installment_group_id (dados legados)');
      }

      // Build allInstallments with detectionSource
      const parcelByNumber = new Map<number, typeof group.parcels[0]>();
      group.parcels.forEach(p => {
        const existing = parcelByNumber.get(p.installmentCurrent);
        if (!existing || (p.billMonth && !existing.billMonth)) {
          parcelByNumber.set(p.installmentCurrent, p);
        }
      });

      const avgValue = group.parcels.length > 0
        ? group.parcels.reduce((s, p) => s + p.value, 0) / group.parcels.length
        : 0;

      const sortedBillMonths = group.parcels
        .filter(p => p.billMonth)
        .sort((a, b) => (a.billMonth! < b.billMonth! ? -1 : 1));

      const estimateBillMonth = (installNum: number): string | null => {
        if (sortedBillMonths.length === 0) return null;
        const ref = sortedBillMonths[0];
        const diff = installNum - ref.installmentCurrent;
        const [y, m] = ref.billMonth!.split('-').map(Number);
        const d = new Date(y, m - 1 + diff, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };

      const dupKeys = new Set<string>();
      const parcelKeyCount = new Map<string, number>();
      group.parcels.forEach(p => {
        const k = `${p.installmentCurrent}::${p.value}::${p.transactionDate}`;
        parcelKeyCount.set(k, (parcelKeyCount.get(k) || 0) + 1);
      });
      parcelKeyCount.forEach((count, k) => { if (count > 1) dupKeys.add(k); });

      group.allInstallments = [];
      for (let i = 1; i <= group.installmentTotal; i++) {
        const existing = parcelByNumber.get(i);
        if (existing) {
          const k = `${existing.installmentCurrent}::${existing.value}::${existing.transactionDate}`;
          group.allInstallments.push({
            installmentNumber: i,
            isPaid: !!existing.billId,
            isInferredPaid: false,
            detectionSource: existing.detectionSource,
            billMonth: existing.billMonth,
            value: existing.value,
            isDuplicate: dupKeys.has(k),
          });
        } else {
          group.allInstallments.push({
            installmentNumber: i,
            isPaid: false,
            isInferredPaid: false,
            detectionSource: 'none',
            billMonth: estimateBillMonth(i),
            value: avgValue,
            isDuplicate: false,
          });
        }
      }

      // Infer paid status - Rule 1: backward from first known paid
      const firstKnownIdx = group.allInstallments.findIndex(inst => parcelByNumber.has(inst.installmentNumber));
      if (firstKnownIdx > 0) {
        const firstKnown = group.allInstallments[firstKnownIdx];
        if (firstKnown.isPaid) {
          for (let i = 0; i < firstKnownIdx; i++) {
            group.allInstallments[i].isInferredPaid = true;
            group.allInstallments[i].isPaid = true;
            group.allInstallments[i].detectionSource = 'inferred';
          }
        }
      }

      // Infer paid status - Rule 2: projected installments in the past
      const hasAnyPaid = group.allInstallments.some(inst => inst.isPaid);
      if (hasAnyPaid) {
        const currentMonth = format(new Date(), 'yyyy-MM');
        for (const inst of group.allInstallments) {
          if (!inst.isPaid && inst.detectionSource === 'none' && inst.billMonth) {
            if (inst.billMonth <= currentMonth) {
              inst.isPaid = true;
              inst.isInferredPaid = true;
              inst.detectionSource = 'inferred';
            }
          }
        }
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.issues.length !== b.issues.length) return b.issues.length - a.issues.length;
      return a.storeName.localeCompare(b.storeName);
    });
  }, [transactions, billsById, cardsById]);

  const filteredGroups = useMemo(() => {
    let groups = installmentGroups;

    if (activeFilter === 'complete') groups = groups.filter(g => g.isComplete);
    else if (activeFilter === 'issues') groups = groups.filter(g => g.issues.length > 0);
    else if (activeFilter === 'duplicates') groups = groups.filter(g => g.hasDuplicates);
    else if (activeFilter === 'legacy') groups = groups.filter(g => !g.groupId);

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      groups = groups.filter(
        (g) =>
          g.storeName.toLowerCase().includes(searchLower) ||
          g.cardName.toLowerCase().includes(searchLower) ||
          g.groupId?.toLowerCase().includes(searchLower)
      );
    }
    return groups;
  }, [installmentGroups, search, activeFilter]);

  const stats = useMemo(() => {
    const total = installmentGroups.length;
    const withIssues = installmentGroups.filter((g) => g.issues.length > 0).length;
    const withDuplicates = installmentGroups.filter((g) => g.hasDuplicates).length;
    const complete = installmentGroups.filter((g) => g.isComplete).length;
    const legacy = installmentGroups.filter((g) => !g.groupId).length;
    return { total, withIssues, withDuplicates, complete, legacy };
  }, [installmentGroups]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyGroupId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado!');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  /** Render detection source icon with tooltip */
  const renderDetectionIcon = (source: DetectionSource, isPaid: boolean) => {
    switch (source) {
      case 'metadata':
      case 'regex':
        if (!isPaid) return null;
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                Confirmada por {source === 'metadata' ? 'metadados da Pluggy' : 'texto (regex)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'sibling':
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link className="h-3 w-3 text-blue-500 shrink-0 cursor-help" strokeWidth={2} />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs">
                Inferida por lógica: mesmo estabelecimento, valor e sequência mensal
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'inferred':
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle className="h-3 w-3 text-green-400/70 shrink-0 cursor-help" strokeWidth={1.5} />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                Pagamento inferido: sem registro no banco, mas parcelas posteriores já constam como pagas.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'none':
        return <Circle className="h-3 w-3 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Diagnóstico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Diagnóstico de Parcelamentos</DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-lg p-2 text-center transition-all cursor-pointer ${activeFilter === 'all' ? 'bg-muted ring-2 ring-primary/40' : 'bg-muted hover:bg-muted/80'}`}
          >
            <div className="font-semibold text-lg">{stats.total}</div>
            <div className="text-muted-foreground">Compras</div>
          </button>
          <button
            onClick={() => setActiveFilter(activeFilter === 'complete' ? 'all' : 'complete')}
            className={`rounded-lg p-2 text-center transition-all cursor-pointer ${activeFilter === 'complete' ? 'bg-green-500/20 ring-2 ring-green-500/40' : 'bg-green-500/10 hover:bg-green-500/15'}`}
          >
            <div className="font-semibold text-lg text-green-600">{stats.complete}</div>
            <div className="text-muted-foreground">Quitadas</div>
          </button>
          <button
            onClick={() => setActiveFilter(activeFilter === 'issues' ? 'all' : 'issues')}
            className={`rounded-lg p-2 text-center transition-all cursor-pointer ${activeFilter === 'issues' ? 'bg-amber-500/20 ring-2 ring-amber-500/40' : 'bg-amber-500/10 hover:bg-amber-500/15'}`}
          >
            <div className="font-semibold text-lg text-amber-600">{stats.withIssues}</div>
            <div className="text-muted-foreground">Com Alertas</div>
          </button>
          <button
            onClick={() => setActiveFilter(activeFilter === 'duplicates' ? 'all' : 'duplicates')}
            className={`rounded-lg p-2 text-center transition-all cursor-pointer ${activeFilter === 'duplicates' ? 'bg-red-500/20 ring-2 ring-red-500/40' : 'bg-red-500/10 hover:bg-red-500/15'}`}
          >
            <div className="font-semibold text-lg text-red-600">{stats.withDuplicates}</div>
            <div className="text-muted-foreground">Duplicadas</div>
          </button>
          <button
            onClick={() => setActiveFilter(activeFilter === 'legacy' ? 'all' : 'legacy')}
            className={`rounded-lg p-2 text-center transition-all cursor-pointer ${activeFilter === 'legacy' ? 'bg-blue-500/20 ring-2 ring-blue-500/40' : 'bg-blue-500/10 hover:bg-blue-500/15'}`}
          >
            <div className="font-semibold text-lg text-blue-600">{stats.legacy}</div>
            <div className="text-muted-foreground">Legado</div>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por loja, cartão ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground px-1">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Confirmada</span>
          <span className="flex items-center gap-1"><Link className="h-3 w-3 text-blue-500" /> Inferida por lógica</span>
          <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-400/70" strokeWidth={1.5} /> Pagamento inferido</span>
          <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.5} /> Pendente</span>
        </div>

        {/* Groups List */}
        <ScrollArea className="flex-1 -mx-6 px-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 260px)' }}>
          <div className="space-y-2 pb-4">
            {filteredGroups.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum parcelamento encontrado
              </div>
            ) : (
              filteredGroups.map((group, idx) => {
                const key = group.groupId || `legacy-${idx}`;
                const isExpanded = expandedGroups.has(key);

                return (
                  <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleGroup(key)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{group.storeName}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseLocalDate(group.purchaseDate), 'dd/MM/yy')}
                            </span>
                            {group.isComplete ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Quitada
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {group.maxInstallment}/{group.installmentTotal}
                              </Badge>
                            )}
                            {group.hasDuplicates && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Duplicada
                              </Badge>
                            )}
                            {!group.groupId && (
                              <Badge variant="outline" className="text-blue-600 border-blue-200">
                                Legado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {group.cardName}
                            </span>
                            <span>{group.parcels.length} parcelas registradas</span>
                          </div>
                        </div>

                        <div className="text-right text-sm font-medium shrink-0">
                          {formatCurrency(group.parcels.reduce((sum, p) => sum + p.value, 0))}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="ml-6 mt-2 space-y-2">
                        {/* Group ID */}
                        {group.groupId && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                            <Hash className="h-3 w-3" />
                            <code className="flex-1 truncate">{group.groupId}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyGroupId(group.groupId!)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {/* Issues */}
                        {group.issues.length > 0 && (
                          <div className="bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2 space-y-1">
                            {group.issues.map((issue, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {issue}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* All Installments Table */}
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left p-2">Parcela</th>
                                <th className="text-left p-2">Mês Fatura</th>
                                <th className="text-right p-2">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.allInstallments.map((inst, i) => (
                                <tr
                                  key={i}
                                  className={`border-t ${inst.isPaid ? 'bg-green-500/5' : ''} ${inst.detectionSource === 'sibling' ? 'bg-blue-500/5' : ''} ${inst.isDuplicate ? 'bg-red-500/10' : ''}`}
                                >
                                  <td className="p-2">
                                    <div className="flex items-center gap-1.5">
                                      {renderDetectionIcon(inst.detectionSource, inst.isPaid)}
                                      <span className={
                                        inst.isPaid
                                          ? 'text-green-700 dark:text-green-400'
                                          : inst.detectionSource === 'sibling'
                                          ? 'text-blue-700 dark:text-blue-400'
                                          : ''
                                      }>
                                        {inst.installmentNumber}/{group.installmentTotal}
                                      </span>
                                      {inst.isDuplicate && (
                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    {inst.billMonth ? (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <span className={inst.isPaid ? 'text-green-700 dark:text-green-400' : ''}>
                                          {format(new Date(inst.billMonth + '-01'), 'MMM/yy', { locale: ptBR })}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground italic">projeção</span>
                                    )}
                                  </td>
                                  <td className={`p-2 text-right font-medium ${inst.isPaid ? 'text-green-700 dark:text-green-400' : ''}`}>
                                    {formatCurrency(inst.value)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
