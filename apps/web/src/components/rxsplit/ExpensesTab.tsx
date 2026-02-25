import React, { useState, useRef, useEffect } from 'react';
import { Receipt, Save, Trash2, Loader2, Camera } from 'lucide-react';
import { RXSplitAvatar } from './RXSplitAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useRXSplitGroups, useRXSplitContacts, useRXSplitExpenses, useCreateExpense, useDeleteExpense,
  useGroupMembers,
} from '@/hooks/useRXSplit';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const ExpensesTab: React.FC = () => {
  const { user } = useAuth();
  const { data: groups = [] } = useRXSplitGroups();
  const { data: contacts = [] } = useRXSplitContacts();

  // Default to first favorite group
  const favoriteGroups = groups.filter(g => g.is_favorite);
  const defaultGroupId = favoriteGroups[0]?.id || '';

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const { data: expenses = [], isLoading } = useRXSplitExpenses(selectedGroupId || undefined);
  const { data: groupMembers = [] } = useGroupMembers(selectedGroupId || null);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  // Set default group when groups load
  useEffect(() => {
    if (!selectedGroupId && defaultGroupId) {
      setSelectedGroupId(defaultGroupId);
    }
  }, [defaultGroupId, selectedGroupId]);

  const [establishmentName, setEstablishmentName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get members of selected group for payer selection
  const memberContacts = groupMembers.length > 0
    ? contacts.filter(c => groupMembers.some(m => m.contact_id === c.id))
    : contacts;

  const handleSave = () => {
    if (!establishmentName || !amount || !payerId || !selectedGroupId || !user) return;
    const amt = parseFloat(amount);
    const debtors = memberContacts.map(c => ({ contact_id: c.id, amount: amt / memberContacts.length }));
    createExpense.mutate({
      expense: {
        user_id: user.id,
        group_id: selectedGroupId,
        description: description || establishmentName,
        amount: amt,
        payer_contact_id: payerId,
        split_mode: 'EQUAL',
        payment_date: new Date().toISOString(),
        bill_split_id: null,
        establishment_name: establishmentName,
        receipt_url: null,
      },
      debtors,
    });
    setEstablishmentName('');
    setDescription('');
    setAmount('');
    setPayerId('');
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingReceipt(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const { data, error } = await supabase.functions.invoke('parse-receipt', {
          body: { imageBase64: base64 },
        });

        if (error || !data?.success) {
          toast.error(data?.error || 'Erro ao ler comprovante');
          setIsParsingReceipt(false);
          return;
        }

        const parsed = data.data;
        if (parsed.estabelecimento) setEstablishmentName(parsed.estabelecimento);
        if (parsed.valor) setAmount(parsed.valor.toString());
        toast.success(`Comprovante lido com ${parsed.confianca}% de confiança`);
        setIsParsingReceipt(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Erro ao processar imagem');
      setIsParsingReceipt(false);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <div className="bg-card p-4 rounded-2xl shadow-sm border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" />
          Nova Despesa
        </h3>

        <div className="space-y-3">
          {/* Receipt photo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={isParsingReceipt}
            onClick={() => fileInputRef.current?.click()}
          >
            {isParsingReceipt ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Lendo comprovante...</>
            ) : (
              <><Camera className="w-4 h-4" /> Fotografar comprovante</>
            )}
          </Button>

          <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl">
            <label className="text-xs text-primary font-semibold mb-1.5 block">Grupo *</label>
            <select
              className="w-full bg-card border border-primary/20 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
            >
              <option value="" disabled>Selecione...</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.is_favorite ? '⭐' : ''} {g.is_main ? '👑' : ''}
                </option>
              ))}
            </select>
          </div>

          <Input
            placeholder="Nome do estabelecimento *"
            value={establishmentName}
            onChange={e => setEstablishmentName(e.target.value)}
          />

          <Textarea
            placeholder="Descrição (opcional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="min-h-[60px]"
          />

          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground font-medium text-sm">R$</span>
            <Input type="number" placeholder="0.00 *" className="pl-10" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-semibold ml-1">Quem pagou?</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {memberContacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setPayerId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-full border text-sm whitespace-nowrap transition-all ${
                    payerId === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <RXSplitAvatar name={c.name} color={c.avatar_color} size="sm" />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!establishmentName || !amount || !payerId || !selectedGroupId || createExpense.isPending}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
          Histórico ({expenses.length})
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma despesa registrada</div>
        ) : (
          expenses.map(e => {
            const payer = contacts.find(c => c.id === e.payer_contact_id);
            const group = groups.find(g => g.id === e.group_id);
            return (
              <div key={e.id} className="bg-card p-3 rounded-xl border border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {payer && <RXSplitAvatar name={payer.name} color={payer.avatar_color} size="md" />}
                  <div>
                    <p className="font-medium text-foreground text-sm">{(e as any).establishment_name || e.description}</p>
                    {(e as any).establishment_name && e.description !== (e as any).establishment_name && (
                      <p className="text-[10px] text-muted-foreground">{e.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{group?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{formatCurrency(e.amount)}</span>
                  <button onClick={() => setConfirmDeleteId(e.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDeleteId) deleteExpense.mutate(confirmDeleteId); setConfirmDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
