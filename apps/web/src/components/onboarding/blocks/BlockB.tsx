import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Building2, Wifi, Upload,
  Clock, CheckCircle2, Search, X, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConquestCard } from '../ConquestCard';
import { PluggyConnectButton } from '@/components/openfinance/PluggyConnectButton';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { financialInstitutions } from '@/data/defaultData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

// Mapa banco_id (RXFin) → Pluggy connectorId
const PLUGGY_CONNECTOR_IDS: Record<string, number> = {
  nubank:      612,
  bradesco:    603,
  itau:        601,
  bb:          604,
  caixa:       605,
  santander:   602,
  inter:       610,
  c6:          614,
  xp:          618,
  picpay:      620,
  sicoob:      622,
  sicredi:     623,
  btg:         616,
  safra:       617,
  mercadopago: 619,
  pagbank:     621,
  neon:        615,
};

const TOP_BANK_IDS = [
  'nubank', 'itau', 'bradesco', 'bb', 'caixa', 'santander',
  'inter', 'c6', 'xp', 'picpay', 'sicoob',
];

const TOP_BANKS_DATA = TOP_BANK_IDS
  .map(id => financialInstitutions.find(fi => fi.id === id))
  .filter(Boolean) as typeof financialInstitutions;

interface BankCardProps {
  bank: { id: string; name: string; color: string };
  selected: boolean;
  onToggle: () => void;
}

const BankCard: React.FC<BankCardProps> = ({ bank, selected, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={cn(
      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center relative',
      selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40 bg-card',
    )}
  >
    <ConnectorLogo primaryColor={bank.color?.replace('#', '')} connectorName={bank.name} size="lg" />
    <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">{bank.name}</span>
    {selected && (
      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
      </div>
    )}
  </button>
);

interface BlockBProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
}

type ConnectionMethod = 'open_finance' | 'upload' | 'later' | null;

export const BlockB: React.FC<BlockBProps> = ({
  step,
  onStepChange,
  onComplete,
  onSaveDraft,
}) => {
  const { user } = useAuth();
  const { saveCpf } = usePluggyConnect();
  const [method, setMethod] = useState<ConnectionMethod>('open_finance');
  const [connectedCount, setConnectedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [milestoneData, setMilestoneData] = useState<any>(null);

  const [cpfSaved, setCpfSaved] = useState<boolean | null>(null);
  const [cpfInput, setCpfInput] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [savingCpf, setSavingCpf] = useState(false);

  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [showOtherDialog, setShowOtherDialog] = useState(false);
  const [otherSearch, setOtherSearch] = useState('');
  const [extraSelectedBanks, setExtraSelectedBanks] = useState<string[]>([]);

  const [connectionQueue, setConnectionQueue] = useState<string[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [queueCompleted, setQueueCompleted] = useState<string[]>([]);
  const [queueFailed, setQueueFailed] = useState<string[]>([]);

  const OTHER_BANKS = financialInstitutions.filter(
    fi => !TOP_BANK_IDS.includes(fi.id)
  );
  const toggleBank = (id: string) => {
    setSelectedBanks(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };
  const toggleExtraBank = (id: string) => {
    setExtraSelectedBanks(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (step !== 3 || method !== 'open_finance') {
      setCpfSaved(null);
      return;
    }
    if (cpfSaved !== null) return;

    const checkCpf = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase.rpc('get_user_cpf', { p_user_id: user.id });
        setCpfSaved(!!data);
      } catch {
        setCpfSaved(false);
      }
    };
    checkCpf();
  }, [step, method, user?.id, cpfSaved]);

  const formatCpfDisplay = (value: string): string => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  };

  const isValidCpf = (cpf: string): boolean => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i);
    let rem = (sum * 10) % 11;
    if (rem === 10) rem = 0;
    if (rem !== parseInt(clean[9], 10)) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i);
    rem = (sum * 10) % 11;
    if (rem === 10) rem = 0;
    return rem === parseInt(clean[10], 10);
  };

  const handleSaveCpf = async (): Promise<boolean> => {
    const clean = cpfInput.replace(/\D/g, '');
    if (!isValidCpf(clean)) {
      setCpfError('CPF inválido. Verifique os dígitos.');
      return false;
    }
    setCpfError('');
    setSavingCpf(true);
    try {
      const ok = await saveCpf(clean);
      if (ok) {
        setCpfSaved(true);
        return true;
      }
      setCpfError('Erro ao salvar CPF. Tente novamente.');
      return false;
    } catch {
      setCpfError('Erro ao salvar CPF. Tente novamente.');
      return false;
    } finally {
      setSavingCpf(false);
    }
  };

  const handlePluggySuccess = async (itemId?: string) => {
    setConnectedCount(prev => prev + 1);
  };

  const handlePluggySaving = () => {
    setSyncMessage('Salvando conexão...');
  };

  const handleFinishConnections = async () => {
    setIsSyncing(true);
    setSyncMessage('Importando seus lançamentos...');
    await new Promise(r => setTimeout(r, 1200));
    setSyncMessage('IA categorizando automaticamente...');
    await new Promise(r => setTimeout(r, 1400));
    setSyncMessage('Calculando seu Raio-X...');
    await new Promise(r => setTimeout(r, 1000));
    setIsSyncing(false);

    if (user?.id) {
      const { data } = await supabase.rpc('calculate_milestone_cashflow', {
        p_user_id: user.id,
      });
      setMilestoneData(data);
    }
    onStepChange(4); // conquest
  };

  // ─── Step 0: Intro ────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Conectar suas instituições
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Vamos buscar seus dados reais diretamente nos seus bancos.
            A IA vai categorizar tudo automaticamente — você só confirma.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            O que acontece nesta etapa:
          </h2>
          <div className="space-y-3">
            {[
              {
                icon: Wifi,
                label: 'Conexão segura via Open Finance',
                desc: 'Padrão regulado pelo Banco Central',
              },
              {
                icon: Building2,
                label: 'Importação dos últimos 12 meses',
                desc: 'Contas, cartões e investimentos',
              },
              {
                icon: CheckCircle2,
                label: 'IA categoriza automaticamente',
                desc: 'Você só confirma ou ajusta',
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mb-4">
          ⏱️ ~3 min | 🔒 Seus dados são criptografados
        </p>
        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={() => onStepChange(1)}
        >
          Conectar meus bancos
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground"
          onClick={() => {
            onSaveDraft('banks_skipped', true);
            onComplete();
          }}
        >
          Pular e configurar depois
        </Button>
      </div>
    );
  }

  // ─── Step 1: Seleção de bancos ────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Quais bancos você usa?
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecione para conectar em seguida (um por vez)
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {TOP_BANKS_DATA.map((bank) => (
            <BankCard
              key={bank.id}
              bank={bank}
              selected={selectedBanks.includes(bank.id)}
              onToggle={() => toggleBank(bank.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {extraSelectedBanks.map((id) => {
            const bank = financialInstitutions.find(fi => fi.id === id);
            return bank ? (
              <div
                key={id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
              >
                <ConnectorLogo
                  primaryColor={bank.color?.replace('#', '')}
                  connectorName={bank.name}
                  size="xs"
                />
                <span>{bank.name}</span>
                <button
                  type="button"
                  onClick={() => toggleExtraBank(id)}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                  aria-label="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null;
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-6"
          onClick={() => setShowOtherDialog(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          Outro banco
        </Button>
        <Dialog open={showOtherDialog} onOpenChange={setShowOtherDialog}>
          <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Buscar banco</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Nome do banco..."
              value={otherSearch}
              onChange={(e) => setOtherSearch(e.target.value)}
              className="mb-3"
            />
            <div className="flex-1 overflow-auto space-y-1">
              {OTHER_BANKS.filter((fi) =>
                fi.name.toLowerCase().includes(otherSearch.toLowerCase())
              ).map((fi) => (
                <button
                  key={fi.id}
                  type="button"
                  onClick={() => {
                    const wasSelected = extraSelectedBanks.includes(fi.id);
                    toggleExtraBank(fi.id);
                    if (wasSelected) {
                      setSelectedBanks((prev) => prev.filter((b) => b !== fi.id));
                    } else {
                      setSelectedBanks((prev) => [...prev, fi.id]);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                    extraSelectedBanks.includes(fi.id) ? 'bg-primary/10' : 'hover:bg-muted'
                  )}
                >
                  <ConnectorLogo
                    primaryColor={fi.color?.replace('#', '')}
                    connectorName={fi.name}
                    size="sm"
                  />
                  <span className="text-sm font-medium">{fi.name}</span>
                  {extraSelectedBanks.includes(fi.id) && (
                    <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex gap-3">
          <Button
            variant="hero"
            className="flex-1"
            onClick={() => {
              const allSelected = [...new Set([...selectedBanks, ...extraSelectedBanks])];
              setSelectedBanks(allSelected);
              onStepChange(2);
            }}
          >
            Continuar
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Escolher método de conexão ───────────────────
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Como prefere conectar?
          </h2>
          <p className="text-sm text-muted-foreground">
            Escolha o método mais conveniente para você
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {/* Open Finance */}
          <button
            type="button"
            onClick={() => setMethod('open_finance')}
            className={cn(
              'w-full text-left p-4 rounded-xl border-2 transition-all',
              'border-primary bg-primary',
              method === 'open_finance'
                ? 'shadow-md ring-2 ring-primary ring-offset-2'
                : 'opacity-90 hover:opacity-100',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">
                    Open Finance (recomendado)
                  </p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 text-white font-medium">
                    Automático
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-0.5">
                  Conexão direta e segura. Dados sempre atualizados.
                  Regulado pelo Banco Central.
                </p>
                <p className="text-xs text-white/60 mt-1.5 flex items-center gap-1">
                  <span>→</span>
                  <span>Uma tela de seleção do seu banco vai abrir</span>
                </p>
              </div>
              <CheckCircle2
                className={cn(
                  'h-5 w-5 shrink-0 transition-opacity',
                  method === 'open_finance' ? 'text-white opacity-100' : 'text-white/40 opacity-60'
                )}
              />
            </div>
          </button>

          {/* Upload de extrato */}
          <button
            type="button"
            onClick={() => setMethod('upload')}
            className={cn(
              'w-full text-left p-4 rounded-xl border-2 transition-all',
              method === 'upload'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 bg-card',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Upload de extrato (PDF/CSV)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Exporte o extrato do seu banco e importe aqui.
                  Você pode atualizar manualmente quando quiser.
                </p>
              </div>
              {method === 'upload' && (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
          </button>

          {/* Configurar depois */}
          <button
            type="button"
            onClick={() => setMethod('later')}
            className={cn(
              'w-full text-left p-4 rounded-xl border-2 transition-all',
              method === 'later'
                ? 'border-border bg-muted/40'
                : 'border-border/50 hover:border-border bg-card/50',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-muted-foreground">
                  Configurar depois
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Continue o onboarding sem conectar agora.
                  Um banner lembrará você de configurar.
                </p>
              </div>
              {method === 'later' && (
                <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>
          </button>
        </div>

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          disabled={!method}
          onClick={() => {
            if (method === 'later') {
              onSaveDraft('connection_method', 'later');
              onComplete();
            } else {
              onSaveDraft('connection_method', method);
              if (method === 'open_finance' && selectedBanks.length > 0) {
                setConnectionQueue(selectedBanks);
                setCurrentQueueIndex(0);
                setQueueCompleted([]);
                setQueueFailed([]);
              }
              onStepChange(3);
            }
          }}
        >
          {method === 'later'
            ? 'Continuar sem conectar'
            : method === 'open_finance'
            ? 'Conectar via Open Finance'
            : method === 'upload'
            ? 'Fazer upload de extrato'
            : 'Continuar'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 3: Conexão (Open Finance ou Upload) ─────────────
  if (step === 3) {
    const isOpenFinance = method === 'open_finance';

    const currentBank = connectionQueue[currentQueueIndex];
    const currentBankData = currentBank
      ? financialInstitutions.find(fi => fi.id === currentBank)
      : null;
    const totalBanks = connectionQueue.length;
    const hasQueue = totalBanks > 0;

    const handlePluggySuccessInQueue = async (itemId?: string) => {
      const completedBank = connectionQueue[currentQueueIndex];
      setQueueCompleted(prev => [...prev, completedBank]);
      setConnectedCount(prev => prev + 1);
      const nextIndex = currentQueueIndex + 1;
      if (nextIndex < connectionQueue.length) {
        setCurrentQueueIndex(nextIndex);
        await new Promise(r => setTimeout(r, 600));
      }
    };

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => onStepChange(2)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        {/* Sincronizando... overlay */}
        {isSyncing ? (
          <div className="flex flex-col items-center py-16 gap-6">
            <RXFinLoadingSpinner size={64} />
            <div className="text-center">
              <p className="text-base font-semibold text-foreground mb-1">
                Processando seus dados
              </p>
              <p className="text-sm text-muted-foreground animate-pulse">
                {syncMessage}
              </p>
            </div>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        ) : isOpenFinance ? (
          cpfSaved === null ? (
            <div className="flex flex-col items-center py-16 gap-4">
              <RXFinLoadingSpinner size={48} />
              <p className="text-sm text-muted-foreground">Verificando seus dados...</p>
            </div>
          ) : cpfSaved === false ? (
            <div className="max-w-sm mx-auto">
              <div className="text-center mb-6">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Informe seu CPF
                </h2>
                <p className="text-sm text-muted-foreground">
                  Necessário para conectar via Open Finance.
                  Salvo com criptografia — você não precisará informar novamente.
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border p-5 mb-4">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  CPF
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpfInput}
                  onChange={(e) => {
                    setCpfError('');
                    setCpfInput(formatCpfDisplay(e.target.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCpf();
                  }}
                  className={cn(
                    'w-full h-12 px-4 rounded-lg border bg-background text-foreground text-base tracking-widest',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    cpfError ? 'border-destructive' : 'border-border',
                  )}
                  maxLength={14}
                  autoComplete="off"
                  autoFocus
                />
                {cpfError && (
                  <p className="text-xs text-destructive mt-1.5">{cpfError}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span>🔒</span>
                  <span>Criptografado e armazenado com segurança</span>
                </p>
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                disabled={cpfInput.replace(/\D/g, '').length !== 11 || savingCpf}
                onClick={async () => {
                  const ok = await handleSaveCpf();
                  if (ok) {
                    // CPF salvo — fluxo segue para o Pluggy (cpfSaved já é true)
                  }
                }}
              >
                {savingCpf ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Salvar e continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground"
                onClick={() => onStepChange(2)}
              >
                Voltar
              </Button>
            </div>
          ) : (
          /* Open Finance — fluxo em série (CPF já salvo) */
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-1">
                Conectar via Open Finance
              </h2>
              {hasQueue ? (
                <p className="text-sm text-muted-foreground">
                  Banco {currentQueueIndex + 1} de {totalBanks}
                  {currentBankData ? ` — ${currentBankData.name}` : ''}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Conecte cada banco que você usa, um por vez
                </p>
              )}
            </div>

            {hasQueue && (
              <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                {connectionQueue.map((bankId, idx) => {
                  const bank = financialInstitutions.find(fi => fi.id === bankId);
                  const isCompleted = queueCompleted.includes(bankId);
                  const isCurrent = idx === currentQueueIndex && !isCompleted;
                  return (
                    <div key={bankId} className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all',
                          isCompleted
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : isCurrent
                            ? 'bg-primary text-white border border-primary shadow-sm'
                            : 'bg-muted text-muted-foreground border border-border',
                        )}
                      >
                        <ConnectorLogo
                          primaryColor={bank?.color?.replace('#', '')}
                          connectorName={bank?.name ?? bankId}
                          size="xs"
                        />
                        <span>{bank?.name ?? bankId}</span>
                        {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      {idx < connectionQueue.length - 1 && (
                        <div
                          className={cn(
                            'w-4 h-px',
                            isCompleted ? 'bg-primary/40' : 'bg-border',
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(connectedCount < totalBanks || !hasQueue) ? (
              <div className="bg-card rounded-xl border border-border p-5 mb-5">
                {currentBankData && (
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                    <ConnectorLogo
                      primaryColor={currentBankData.color?.replace('#', '')}
                      connectorName={currentBankData.name}
                      size="md"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {currentBankData.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Clique abaixo para iniciar a conexão
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  🔒 Conexão criptografada · Regulada pelo Banco Central
                </p>
                <PluggyConnectButton
                  variant="default"
                  size="lg"
                  className="w-full"
                  selectedConnectorId={
                    currentBankData && PLUGGY_CONNECTOR_IDS[currentBankData.id] != null
                      ? PLUGGY_CONNECTOR_IDS[currentBankData.id]
                      : undefined
                  }
                  onSuccess={hasQueue ? handlePluggySuccessInQueue : handlePluggySuccess}
                  onSaving={handlePluggySaving}
                />
              </div>
            ) : null}

            {(queueCompleted.length > 0 || connectedCount > 0) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-foreground">
                  {queueCompleted.length > 0
                    ? `${queueCompleted.length} de ${totalBanks || connectedCount} banco${queueCompleted.length !== 1 ? 's' : ''} conectado${queueCompleted.length !== 1 ? 's' : ''}`
                    : `${connectedCount} banco${connectedCount !== 1 ? 's' : ''} conectado${connectedCount !== 1 ? 's' : ''} com sucesso`}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {(connectedCount >= totalBanks && totalBanks > 0) || connectedCount > 0 ? (
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleFinishConnections}
                >
                  {connectedCount >= totalBanks && totalBanks > 0
                    ? 'Todos conectados — Continuar'
                    : 'Finalizar conexões'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : null}

              <Button
                variant={connectedCount > 0 ? 'outline' : 'ghost'}
                className={connectedCount > 0 ? 'shrink-0' : 'w-full text-muted-foreground'}
                size="sm"
                onClick={() => {
                  if (connectedCount > 0) {
                    handleFinishConnections();
                  } else {
                    onSaveDraft('connection_method', 'later');
                    onComplete();
                  }
                }}
              >
                {connectedCount > 0 ? 'Pular restantes' : 'Pular por agora'}
              </Button>
            </div>
          </div>
          )
        ) : (
          /* Upload de extrato */
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-1">
                Upload de extrato
              </h2>
              <p className="text-sm text-muted-foreground">
                Exporte o extrato do seu banco (PDF ou CSV) e importe aqui
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border border-dashed p-8 mb-6 text-center">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Arraste o arquivo aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Formatos aceitos: PDF, CSV, OFX · Máx. 10MB
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Redirecionar para a página de dados financeiros onde o upload já existe
                  window.open('/dados-financeiros', '_blank');
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Importar extrato
              </Button>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 mb-6">
              <p className="text-xs text-muted-foreground leading-relaxed">
                💡 <strong>Dica:</strong> No app do seu banco, vá em "Extrato" e exporte os últimos
                12 meses. Faça isso para cada banco que você usa.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleFinishConnections}
              >
                Concluir importação
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  onSaveDraft('connection_method', 'later');
                  onComplete();
                }}
              >
                Pular
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Step 4: Conquest Card ────────────────────────────────
  if (step === 4) {
    const md = milestoneData as any;
    const metrics = md
      ? [
          { label: 'Receita Identificada', value: md.actual_income > 0 ? `R$ ${md.actual_income.toLocaleString('pt-BR')}` : 'Calculando...' },
          { label: 'Despesa Identificada', value: md.actual_expenses > 0 ? `R$ ${md.actual_expenses.toLocaleString('pt-BR')}` : 'Calculando...' },
          { label: 'Bancos conectados', value: `${connectedCount || (method === 'later' ? 0 : 1)} banco${connectedCount !== 1 ? 's' : ''}` },
          { label: 'Lançamentos importados', value: md.count_transactions > 0 ? `${md.count_transactions} lançamentos` : 'Em processamento...' },
        ]
      : [
          { label: 'Bancos conectados', value: `${connectedCount} banco${connectedCount !== 1 ? 's' : ''}` },
          { label: 'Status', value: 'Dados em processamento' },
          { label: 'IA', value: 'Categorizando...' },
          { label: 'Próximo passo', value: 'Validar categorias' },
        ];

    const insight =
      method === 'later'
        ? 'Você pulou a conexão bancária. Conecte suas instituições depois em Configurações → Instituições Financeiras para ver seu diagnóstico completo.'
        : connectedCount > 0
        ? `${connectedCount} banco${connectedCount > 1 ? 's conectados' : ' conectado'}. A IA está processando seus lançamentos em background.`
        : 'Seus dados foram importados. A IA está processando em background.';

    return (
      <div className="py-8">
        <ConquestCard
          level={2}
          badge="silver"
          title={method === 'later' ? 'Etapa registrada!' : 'Bancos conectados!'}
          metrics={metrics}
          insight={insight}
          nextLevelPreview="Nível 3 — Validação: confirme o que a IA categorizou nos seus lançamentos."
          onContinue={onComplete}
          continueLabel="Avançar para Nível 3"
        />
      </div>
    );
  }

  return null;
};
