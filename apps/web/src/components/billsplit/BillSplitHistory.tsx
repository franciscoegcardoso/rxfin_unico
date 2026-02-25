import React, { useState } from 'react';
import { History, Trash2, ChevronDown, ChevronUp, Users, MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBillSplitHistory, useDeleteBillSplit } from '@/hooks/useRXSplit';
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
import type { BillSplit } from '@/core/types/rxsplit';

interface BillSplitHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const sendWhatsApp = (phone: string, name: string, amount: number, splitId: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const message = encodeURIComponent(
    `Oi ${name}! 🧾\n\nSua parte da conta ficou *${formatCurrency(amount)}*.\n\nID: #${splitId.slice(0, 8)}\n\n— RXFin Split`
  );
  window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank');
};

export const BillSplitHistory: React.FC<BillSplitHistoryProps> = ({ isOpen, onClose }) => {
  const { data: entries = [], isLoading } = useBillSplitHistory();
  const deleteBillSplit = useDeleteBillSplit();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col animate-fade-in">
      <div className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-primary-foreground/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5" /> Histórico de Divisões
            </h1>
          </div>
          <span className="text-sm text-primary-foreground/70">{entries.length} registro(s)</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma divisão salva</p>
            <p className="text-sm mt-1">Suas divisões aparecerão aqui</p>
          </div>
        ) : (
          entries.map((entry: BillSplit) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : entry.id)} className="w-full p-4 flex items-center justify-between text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">#{entry.id.slice(0, 8)}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-bold text-primary">{formatCurrency(entry.grand_total)}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{entry.people.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(entry.id); }} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3 animate-fade-in">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Itens</p>
                      {entry.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm py-0.5">
                          <span>{item.qty}x {item.description}</span>
                          <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-2 space-y-0.5">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(entry.subtotal)}</span></div>
                      {entry.service_charge > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Serviço</span><span>{formatCurrency(entry.service_charge)}</span></div>}
                      <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatCurrency(entry.grand_total)}</span></div>
                    </div>
                    <div className="border-t border-border pt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Por pessoa</p>
                      {entry.splits.map(split => (
                        <div key={split.personId} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{split.name.charAt(0).toUpperCase()}</div>
                            <span className="text-sm font-medium">{split.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm font-bold', split.paid >= split.amount ? 'text-primary/50' : 'text-primary')}>
                              {split.paid >= split.amount ? 'Pago' : formatCurrency(split.amount - split.paid)}
                            </span>
                            {split.phone && (
                              <button onClick={() => sendWhatsApp(split.phone!, split.name, split.amount - split.paid, entry.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este registro do histórico?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDeleteId) deleteBillSplit.mutate(confirmDeleteId); setConfirmDeleteId(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
