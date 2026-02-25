import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Zap, FileUp, CheckCircle2, Clock, AlertTriangle, Shield, Lock,
  Sparkles, RefreshCw, Building2, Keyboard, Eye, ArrowLeft, Plus, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financialInstitutions, creditCardBrands } from '@/data/defaultData';
import { UserFinancialInstitution } from '@/types/financial';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { CardBrandIcon } from '@/components/openfinance/CardBrandIcon';

type FlowStep = 'choose' | 'openfinance' | 'manual-form';

interface AddInstitutionFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOpenFinance: () => void;
  onAddManual: (data: {
    institutionId: string;
    customName?: string;
    customCode?: string;
    hasCheckingAccount: boolean;
    hasSavingsAccount: boolean;
    hasCreditCard: boolean;
    hasInvestments: boolean;
    creditCardBrand?: string;
    creditCardDueDay?: number | null;
    notes?: string;
  }) => void;
  existingInstitutionIds: string[];
}

export const AddInstitutionFlowDialog: React.FC<AddInstitutionFlowDialogProps> = ({
  open,
  onOpenChange,
  onSelectOpenFinance,
  onAddManual,
  existingInstitutionIds,
}) => {
  const [step, setStep] = useState<FlowStep>('choose');
  
  // Manual form state
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [hasCheckingAccount, setHasCheckingAccount] = useState(true);
  const [hasSavingsAccount, setHasSavingsAccount] = useState(true);
  const [hasCreditCard, setHasCreditCard] = useState(true);
  const [hasInvestments, setHasInvestments] = useState(true);
  const [creditCardBrand, setCreditCardBrand] = useState('');
  const [creditCardDueDay, setCreditCardDueDay] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setStep('choose');
    setSelectedInstitution('');
    setSearchFilter('');
    setIsManualEntry(false);
    setManualName('');
    setManualCode('');
    setHasCheckingAccount(true);
    setHasSavingsAccount(true);
    setHasCreditCard(true);
    setHasInvestments(true);
    setCreditCardBrand('');
    setCreditCardDueDay(null);
    setNotes('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const availableInstitutions = financialInstitutions
    .filter(inst => !existingInstitutionIds.includes(inst.id))
    .sort((a, b) => a.code.localeCompare(b.code));

  const filteredInstitutions = searchFilter
    ? availableInstitutions.filter(inst =>
        inst.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
        inst.name.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : availableInstitutions;

  const selectedInst = selectedInstitution
    ? financialInstitutions.find(i => i.id === selectedInstitution)
    : null;

  const handleSelectOpenFinance = () => {
    handleOpenChange(false);
    onSelectOpenFinance();
  };

  const handleAddManual = () => {
    if (isManualEntry) {
      if (!manualName.trim()) return;
      onAddManual({
        institutionId: `custom_${Date.now()}`,
        customName: manualName.trim(),
        customCode: manualCode.trim() || undefined,
        hasCheckingAccount,
        hasSavingsAccount,
        hasCreditCard,
        hasInvestments,
        creditCardBrand: hasCreditCard ? creditCardBrand : undefined,
        creditCardDueDay: hasCreditCard ? creditCardDueDay : undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      if (!selectedInstitution) return;
      onAddManual({
        institutionId: selectedInstitution,
        hasCheckingAccount,
        hasSavingsAccount,
        hasCreditCard,
        hasInvestments,
        creditCardBrand: hasCreditCard ? creditCardBrand : undefined,
        creditCardDueDay: hasCreditCard ? creditCardDueDay : undefined,
        notes: notes.trim() || undefined,
      });
    }
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== 'choose' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setStep('choose')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {step === 'choose' && 'Como deseja adicionar sua instituição?'}
              {step === 'openfinance' && 'Conectar via Open Finance'}
              {step === 'manual-form' && 'Adicionar Instituição Manualmente'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 py-2"
            >
              <p className="text-sm text-muted-foreground text-center">
                Escolha como deseja vincular sua instituição financeira
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Open Finance Option */}
                <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Card
                    className="relative border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/70 hover:shadow-lg transition-all cursor-pointer h-full"
                    onClick={handleSelectOpenFinance}
                  >
                    <div className="absolute -top-2.5 left-3">
                      <Badge className="bg-primary text-primary-foreground shadow-md gap-1 text-[10px]">
                        <Sparkles className="h-3 w-3" />
                        Recomendado
                      </Badge>
                    </div>
                    <CardContent className="p-4 pt-6 flex flex-col gap-3 h-full">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">Fluxo Automático</h3>
                          <p className="text-[11px] text-muted-foreground">Via Open Finance</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Benefícios</p>
                        <ul className="space-y-1 text-xs">
                          <li className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span>Dados sincronizam automaticamente</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span>Categorização inteligente por IA</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span>Visão consolidada de todos os bancos</span>
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Atenção</p>
                        <div className="space-y-1">
                          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 flex items-start gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-muted-foreground">Bancos levam <strong className="text-foreground">1-6 dias</strong> para enviar dados</p>
                          </div>
                          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 flex items-start gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-muted-foreground">Consentimento precisa ser <strong className="text-foreground">renovado</strong></p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Badge variant="outline" className="text-[9px] gap-0.5 text-muted-foreground py-0">
                          <Shield className="h-2.5 w-2.5" /> Bacen
                        </Badge>
                        <Badge variant="outline" className="text-[9px] gap-0.5 text-muted-foreground py-0">
                          <Lock className="h-2.5 w-2.5" /> LGPD
                        </Badge>
                      </div>

                      <Button size="sm" className="w-full mt-auto">
                        Conectar via Open Finance
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Manual Option */}
                <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Card
                    className="border hover:border-muted-foreground/30 hover:shadow-lg transition-all cursor-pointer h-full"
                    onClick={() => setStep('manual-form')}
                  >
                    <CardContent className="p-4 pt-6 flex flex-col gap-3 h-full">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                          <FileUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">Fluxo Manualmático</h3>
                          <p className="text-[11px] text-muted-foreground">Controle manual completo</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Benefícios</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>Controle total sobre cada lançamento</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>Importação via arquivo (CSV/OFX/PDF)</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>Sem compartilhar dados bancários</span>
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Atenção</p>
                        <div className="space-y-1">
                          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-muted-foreground">Requer <strong className="text-foreground">disciplina</strong> para manter atualizado</p>
                          </div>
                          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 flex items-start gap-1.5">
                            <Eye className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-muted-foreground">Categorização <strong className="text-foreground">manual</strong> (sem IA)</p>
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="w-full mt-auto">
                        Adicionar manualmente
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === 'manual-form' && (
            <motion.div
              key="manual-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 py-2"
            >
              {!isManualEntry ? (
                <div className="space-y-2">
                  <Label>Instituição</Label>
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={searchOpen} className="w-full justify-between bg-background">
                        {selectedInst ? (
                          <span className="flex items-center gap-2">
                            <ConnectorLogo connectorName={selectedInst.name} primaryColor={selectedInst.color} size="sm" />
                            {selectedInst.code} - {selectedInst.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Pesquisar instituição...</span>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-popover" align="start">
                      <Command>
                        <CommandInput placeholder="Digite código ou nome do banco..." value={searchFilter} onValueChange={setSearchFilter} />
                        <CommandList>
                          <CommandEmpty>
                            <div className="py-3 text-center">
                              <p className="text-sm text-muted-foreground mb-2">Nenhuma instituição encontrada.</p>
                              <Button variant="outline" size="sm" onClick={() => { setIsManualEntry(true); setSearchOpen(false); setManualName(searchFilter); }}>
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar manualmente
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredInstitutions.map(inst => (
                              <CommandItem key={inst.id} value={`${inst.code} ${inst.name}`} onSelect={() => { setSelectedInstitution(inst.id); setSearchOpen(false); setSearchFilter(''); }}>
                                <div className="flex items-center gap-2">
                                  <ConnectorLogo connectorName={inst.name} primaryColor={inst.color} size="sm" />
                                  <span className="font-mono text-muted-foreground">{inst.code}</span>
                                  <span>-</span>
                                  <span>{inst.name}</span>
                                </div>
                              </CommandItem>
                            ))}
                            <CommandItem value="adicionar-manualmente" onSelect={() => { setIsManualEntry(true); setSearchOpen(false); }} className="border-t mt-2 pt-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Plus className="h-4 w-4" />
                                <span>Instituição não encontrada - Adicionar manualmente</span>
                              </div>
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Adicionar Manualmente</Label>
                    <Button variant="ghost" size="sm" onClick={() => { setIsManualEntry(false); setManualName(''); setManualCode(''); }}>
                      Voltar à busca
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome da Instituição *</Label>
                    <Input placeholder="Ex: Banco XYZ, Cooperativa ABC..." value={manualName} onChange={(e) => setManualName(e.target.value)} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Código (opcional)</Label>
                    <Input placeholder="Ex: 001, 341..." value={manualCode} onChange={(e) => setManualCode(e.target.value)} className="bg-background" maxLength={10} />
                  </div>
                </div>
              )}

              <div className="space-y-3 border rounded-lg p-4">
                <Label className="text-base font-medium">Produtos</Label>
                <div className="flex items-center justify-between">
                  <Label htmlFor="flow-checking" className="font-normal">Conta Corrente</Label>
                  <Switch id="flow-checking" checked={hasCheckingAccount} onCheckedChange={setHasCheckingAccount} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="flow-savings" className="font-normal">Conta Poupança</Label>
                  <Switch id="flow-savings" checked={hasSavingsAccount} onCheckedChange={setHasSavingsAccount} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="flow-creditCard" className="font-normal">Cartão de Crédito</Label>
                  <Switch id="flow-creditCard" checked={hasCreditCard} onCheckedChange={setHasCreditCard} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="flow-investments" className="font-normal">Investimentos</Label>
                  <Switch id="flow-investments" checked={hasInvestments} onCheckedChange={setHasInvestments} />
                </div>

                {hasCreditCard && (
                  <div className="space-y-3 pt-2 p-3 rounded-lg bg-muted/30 border">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">Bandeira do Cartão <span className="text-destructive">*</span></Label>
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
                      {!creditCardBrand && <p className="text-xs text-destructive">Selecione a bandeira do cartão</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">Dia de Vencimento da Fatura <span className="text-destructive">*</span></Label>
                      <Select value={creditCardDueDay ? creditCardDueDay.toString() : ''} onValueChange={(v) => setCreditCardDueDay(parseInt(v))}>
                        <SelectTrigger className={cn("bg-background", !creditCardDueDay && "border-destructive/50")}>
                          <SelectValue placeholder="Selecione o dia" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover max-h-[200px]">
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>Dia {day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!creditCardDueDay && <p className="text-xs text-destructive">Selecione o dia de vencimento</p>}
                      <p className="text-xs text-muted-foreground">Uma conta recorrente será criada automaticamente em Contas a Pagar</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea placeholder="Ex: Conta principal, cartão de milhas..." value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-background" />
              </div>

              <Button onClick={handleAddManual} className="w-full" disabled={(isManualEntry ? !manualName.trim() : !selectedInstitution) || (hasCreditCard && (!creditCardBrand || !creditCardDueDay))}>
                Adicionar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
