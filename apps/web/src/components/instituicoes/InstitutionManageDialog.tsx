import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '@/contexts/FinancialContext';
import { UserFinancialInstitution } from '@/types/financial';
import { financialInstitutions, creditCardBrands } from '@/data/defaultData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { InstitutionLogo } from '@/components/shared/InstitutionLogo';
import { CardBrandIcon } from '@/components/openfinance/CardBrandIcon';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Trash2, TrendingUp, ExternalLink, CreditCard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface InstitutionManageDialogProps {
  institution: UserFinancialInstitution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InstitutionManageDialog: React.FC<InstitutionManageDialogProps> = ({
  institution,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config, updateFinancialInstitution, removeFinancialInstitution } = useFinancial();
  
  const [hasCheckingAccount, setHasCheckingAccount] = useState(false);
  const [hasSavingsAccount, setHasSavingsAccount] = useState(false);
  const [hasCreditCard, setHasCreditCard] = useState(false);
  const [hasInvestments, setHasInvestments] = useState(false);
  const [creditCardBrand, setCreditCardBrand] = useState('');
  const [creditCardDueDay, setCreditCardDueDay] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockedDelete, setShowBlockedDelete] = useState(false);
  const [showBlockedToggle, setShowBlockedToggle] = useState(false);
  const [showLinkedDataWarning, setShowLinkedDataWarning] = useState(false);
  const [linkedInvestments, setLinkedInvestments] = useState<{ id: string; name: string }[]>([]);
  const [linkedDataCounts, setLinkedDataCounts] = useState({ transactions: 0, lancamentos: 0, bills: 0 });
  const [checkingLinkedData, setCheckingLinkedData] = useState(false);

  // Reset form when institution changes
  useEffect(() => {
    if (institution) {
      setHasCheckingAccount(institution.hasCheckingAccount);
      setHasSavingsAccount(institution.hasSavingsAccount);
      setHasCreditCard(institution.hasCreditCard);
      setHasInvestments(institution.hasInvestments);
      setCreditCardBrand(institution.creditCardBrand || '');
      setCreditCardDueDay(institution.creditCardDueDay || null);
      setNotes(institution.notes || '');
      setCustomName(institution.customName || '');
      setCustomCode(institution.customCode || '');
    }
  }, [institution]);

  if (!institution) return null;

  const isCustom = institution.institutionId.startsWith('custom_');
  const baseInstitution = financialInstitutions.find(i => i.id === institution.institutionId);
  const displayName = isCustom ? institution.customName : baseInstitution?.name;
  const displayCode = isCustom ? institution.customCode : baseInstitution?.code;

  // Find investments linked to this institution
  const getLinkedInvestments = () => {
    return config.assets.filter(
      asset => asset.type === 'investment' && asset.investmentInstitutionId === institution.id
    );
  };

  const handleSave = () => {
    // Validate credit card fields if enabled
    if (hasCreditCard && (!creditCardBrand || !creditCardDueDay)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a bandeira e o dia de vencimento do cartão",
        variant: "destructive",
      });
      return;
    }

    updateFinancialInstitution(institution.id, {
      hasCheckingAccount,
      hasSavingsAccount,
      hasCreditCard,
      hasInvestments,
      creditCardBrand: hasCreditCard ? creditCardBrand : undefined,
      creditCardDueDay: hasCreditCard ? creditCardDueDay : undefined,
      notes: notes.trim() || undefined,
      ...(isCustom && {
        customName: customName.trim(),
        customCode: customCode.trim() || undefined,
      }),
    });

    toast({
      title: "Instituição atualizada",
      description: "As alterações foram salvas com sucesso",
    });

    onOpenChange(false);
  };

  const handleDeleteClick = async () => {
    // Check investments first
    const investments = getLinkedInvestments();
    if (investments.length > 0) {
      setLinkedInvestments(investments.map(inv => ({ id: inv.id, name: inv.name })));
      setShowBlockedDelete(true);
      return;
    }

    // Check linked credit card data (transactions, bills, imports, lancamentos)
    if (user && institution) {
      setCheckingLinkedData(true);
      try {
        // Collect all possible card_ids: institution.id (manual) + pluggy credit accounts
        const cardIds: string[] = [institution.id];

        const { data: accounts } = await supabase
          .from('pluggy_accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'CREDIT')
          .is('deleted_at', null);

        if (accounts && accounts.length > 0) {
          cardIds.push(...accounts.map(a => a.id));
        }

        const [txResult, billsResult, lmResult] = await Promise.all([
          supabase
            .from('credit_card_transactions_v')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('card_id', cardIds),
          supabase
            .from('credit_card_bills')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('card_id', cardIds),
          supabase
            .from('contas_pagar_receber')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('vinculo_cartao_id', institution.id),
        ]);

        const txCount = txResult.count || 0;
        const billsCount = billsResult.count || 0;
        const lmCount = lmResult.count || 0;

        if (txCount > 0 || billsCount > 0 || lmCount > 0) {
          setLinkedDataCounts({ transactions: txCount, bills: billsCount, lancamentos: lmCount });
          setShowLinkedDataWarning(true);
          setCheckingLinkedData(false);
          return;
        }
      } catch (err) {
        console.error('Error checking linked data:', err);
      }
      setCheckingLinkedData(false);
    }

    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    // removeFinancialInstitution agora dispara cascadeDeleteCardData internamente
    removeFinancialInstitution(institution.id);
    toast({
      title: "Instituição removida",
      description: "A instituição e todos os dados vinculados foram removidos com sucesso",
    });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleGoToInvestments = () => {
    setShowBlockedDelete(false);
    onOpenChange(false);
    navigate('/bens-investimentos/investimentos');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <InstitutionLogo
                institutionId={institution.institutionId}
                institutionName={displayName}
                size="lg"
                primaryColor={isCustom ? '#6366f1' : baseInstitution?.color}
              />
              <div>
                <DialogTitle className="text-xl">{displayName}</DialogTitle>
                {displayCode && (
                  <DialogDescription>Código: {displayCode}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Custom institution name/code editing */}
            {isCustom && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
                <div className="space-y-2">
                  <Label>Nome da Instituição *</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código (opcional)</Label>
                  <Input
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="bg-background"
                    maxLength={10}
                  />
                </div>
              </div>
            )}

            {/* Products section */}
            <div className="space-y-3 border rounded-lg p-4">
              <Label className="text-base font-medium">Produtos</Label>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-checking" className="font-normal">Conta Corrente</Label>
                <Switch
                  id="edit-checking"
                  checked={hasCheckingAccount}
                  onCheckedChange={setHasCheckingAccount}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="edit-savings" className="font-normal">Conta Poupança</Label>
                <Switch
                  id="edit-savings"
                  checked={hasSavingsAccount}
                  onCheckedChange={setHasSavingsAccount}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="edit-creditCard" className="font-normal">Cartão de Crédito</Label>
                <Switch
                  id="edit-creditCard"
                  checked={hasCreditCard}
                  onCheckedChange={setHasCreditCard}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="edit-investments" className="font-normal">Investimentos</Label>
                <Switch
                  id="edit-investments"
                  checked={hasInvestments}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      const investments = getLinkedInvestments();
                      if (investments.length > 0) {
                        setLinkedInvestments(investments.map(inv => ({ id: inv.id, name: inv.name })));
                        setShowBlockedToggle(true);
                        return;
                      }
                    }
                    setHasInvestments(checked);
                  }}
                />
              </div>

              {hasCreditCard && (
                <div className="space-y-3 pt-2 p-3 rounded-lg bg-muted/30 border">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Bandeira do Cartão
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select value={creditCardBrand} onValueChange={setCreditCardBrand}>
                      <SelectTrigger className={cn("bg-background", !creditCardBrand && "border-destructive/50")}>
                        <SelectValue placeholder="Selecione a bandeira" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {creditCardBrands.map(brand => (
                          <SelectItem key={brand} value={brand}>
                            <div className="flex items-center gap-2">
                              <CardBrandIcon brand={brand} />
                              {brand}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Dia de Vencimento da Fatura
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={creditCardDueDay ? creditCardDueDay.toString() : ''} 
                      onValueChange={(v) => setCreditCardDueDay(parseInt(v))}
                    >
                      <SelectTrigger className={cn("bg-background", !creditCardDueDay && "border-destructive/50")}>
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover max-h-[200px]">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: Conta principal, cartão de milhas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isCustom && !customName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for deletion */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{displayName}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocked deletion dialog - investments linked */}
      <AlertDialog open={showBlockedDelete} onOpenChange={setShowBlockedDelete}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <AlertDialogTitle>Não é possível excluir</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Esta instituição possui <strong>{linkedInvestments.length} investimento(s)</strong> vinculado(s). 
                  Para excluir, você precisa primeiro remover ou transferir estes investimentos.
                </p>
                
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium text-foreground">Investimentos vinculados:</p>
                  <ul className="space-y-1">
                    {linkedInvestments.slice(0, 5).map(inv => (
                      <li key={inv.id} className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span>{inv.name}</span>
                      </li>
                    ))}
                    {linkedInvestments.length > 5 && (
                      <li className="text-sm text-muted-foreground">
                        e mais {linkedInvestments.length - 5} investimento(s)...
                      </li>
                    )}
                  </ul>
                </div>

                <p className="text-sm">
                  Acesse a página de <strong>Bens e Investimentos</strong> para gerenciar seus investimentos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGoToInvestments} className="gap-2">
              <ExternalLink className="h-4 w-4" />
               Ir para Bens e Investimentos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocked toggle dialog - investments linked */}
      <AlertDialog open={showBlockedToggle} onOpenChange={setShowBlockedToggle}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <AlertDialogTitle>Não é possível desativar</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Esta instituição possui <strong>{linkedInvestments.length} investimento(s)</strong> vinculado(s). 
                  Para desativar investimentos, você precisa primeiro remover ou transferir estes saldos.
                </p>
                
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium text-foreground">Investimentos vinculados:</p>
                  <ul className="space-y-1">
                    {linkedInvestments.slice(0, 5).map(inv => (
                      <li key={inv.id} className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span>{inv.name}</span>
                      </li>
                    ))}
                    {linkedInvestments.length > 5 && (
                      <li className="text-sm text-muted-foreground">
                        e mais {linkedInvestments.length - 5} investimento(s)...
                      </li>
                    )}
                  </ul>
                </div>

                <p className="text-sm">
                  Acesse a página de <strong>Bens e Investimentos</strong> para gerenciar seus investimentos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowBlockedToggle(false);
              onOpenChange(false);
              navigate('/bens-investimentos/investimentos');
            }} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Ir para Investimentos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Linked data warning dialog */}
      <AlertDialog open={showLinkedDataWarning} onOpenChange={setShowLinkedDataWarning}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <AlertDialogTitle>Dados vinculados encontrados</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Esta instituição possui registros financeiros vinculados que serão afetados:
                </p>
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  {linkedDataCounts.transactions > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <span><strong>{linkedDataCounts.transactions}</strong> transação(ões) de cartão</span>
                    </div>
                  )}
                  {linkedDataCounts.bills > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span><strong>{linkedDataCounts.bills}</strong> fatura(s) de cartão</span>
                    </div>
                  )}
                  {linkedDataCounts.lancamentos > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span><strong>{linkedDataCounts.lancamentos}</strong> conta(s) a pagar/receber</span>
                    </div>
                  )}
                </div>
                <p className="text-sm">
                  Recomendamos usar a página de <strong>Dados Financeiros</strong> para gerenciar esses registros antes de excluir a instituição.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLinkedDataWarning(false);
                onOpenChange(false);
                navigate('/dados-financeiros');
              }}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ir para Dados Financeiros
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setShowLinkedDataWarning(false);
                setShowDeleteConfirm(true);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
