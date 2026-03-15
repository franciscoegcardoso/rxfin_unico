import React, { useState } from 'react';
import {
  ArrowRight, ArrowLeft, Building2, Wifi, Upload,
  Clock, CheckCircle2, Search, X,
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
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

// Mapa banco_id → domínio para clearbit logo service
const BANK_LOGO_DOMAINS: Record<string, string> = {
  nubank:       'nubank.com.br',
  itau:         'itau.com.br',
  bradesco:     'bradesco.com.br',
  bb:           'bb.com.br',
  caixa:        'caixa.gov.br',
  santander:    'santander.com.br',
  inter:        'bancointer.com.br',
  c6:           'c6bank.com.br',
  xp:           'xpi.com.br',
  picpay:       'picpay.com',
  sicoob:       'sicoob.com.br',
  sicredi:      'sicredi.com.br',
  neon:         'neon.com.br',
  btg:          'btgpactual.com',
  safra:        'safra.com.br',
  mercadopago:  'mercadopago.com.br',
  pagbank:      'pagbank.com',
  stone:        'stone.com.br',
  rico:         'rico.com.vc',
  clear:        'clear.com.br',
  toro:         'toroinvestimentos.com.br',
  avenue:       'avenue.us',
  modal:        'modalmais.com.br',
  bmg:          'bmg.com.br',
  banrisul:     'banrisul.com.br',
  original:     'original.com.br',
  pan:          'bancopan.com.br',
  agibank:      'agibank.com.br',
  sofisa:       'sofisadireto.com.br',
  bs2:          'bs2.com',
  neon2:        'neon.com.br',
  ame:          'amedigital.com',
  genial:       'genialinvestimentos.com.br',
  daycoval:     'daycoval.com.br',
};

function getBankLogoUrl(bankId: string): string | null {
  const domain = BANK_LOGO_DOMAINS[bankId];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

// Bancos mais comuns — top 11 por relevância
const TOP_BANK_IDS = [
  'nubank', 'itau', 'bradesco', 'bb', 'caixa', 'santander',
  'inter', 'c6', 'xp', 'picpay', 'sicoob',
];

const TOP_BANKS_DATA = TOP_BANK_IDS
  .map(id => financialInstitutions.find(fi => fi.id === id))
  .filter(Boolean) as typeof financialInstitutions;

interface BlockBProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
}

type ConnectionMethod = 'open_finance' | 'upload' | 'later' | null;

interface BankCardProps {
  bank: { id: string; name: string; color: string };
  selected: boolean;
  onToggle: () => void;
}

const BankCard: React.FC<BankCardProps> = ({ bank, selected, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center relative',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-primary/40 bg-card',
      )}
    >
      <ConnectorLogo
        imageUrl={getBankLogoUrl(bank.id)}
        primaryColor={bank.color?.replace('#', '')}
        connectorName={bank.name}
        size="lg"
      />
      <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">
        {bank.name}
      </span>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
};

export const BlockB: React.FC<BlockBProps> = ({
  step,
  onStepChange,
  onComplete,
  onSaveDraft,
}) => {
  const { user } = useAuth();
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [method, setMethod] = useState<ConnectionMethod>('open_finance');
  const [connectedCount, setConnectedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [milestoneData, setMilestoneData] = useState<any>(null);
  const [showOtherDialog, setShowOtherDialog] = useState(false);
  const [otherSearch, setOtherSearch] = useState('');
  const [extraSelectedBanks, setExtraSelectedBanks] = useState<string[]>([]);

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
    setSelectedBanks(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
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
          Selecionar meus bancos
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

  // ─── Step 1: Selecionar bancos ────────────────────────────
  if (step === 1) {
    const extraCount = extraSelectedBanks.length;
    const filteredOtherBanks = OTHER_BANKS.filter(b =>
      b.name.toLowerCase().includes(otherSearch.toLowerCase())
    );

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button
            variant="hero"
            size="sm"
            disabled={selectedBanks.length === 0}
            onClick={() => {
              onSaveDraft('selected_banks', selectedBanks);
              onStepChange(2);
            }}
          >
            Continuar ({selectedBanks.length} selecionado{selectedBanks.length !== 1 ? 's' : ''})
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Quais bancos você usa?
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecione todos que usou nos últimos 12 meses
          </p>
        </div>

        {/* Grid de bancos principais */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
          {TOP_BANKS_DATA.map(bank => (
            <BankCard
              key={bank.id}
              bank={bank}
              selected={selectedBanks.includes(bank.id)}
              onToggle={() => toggleBank(bank.id)}
            />
          ))}

          {/* Botão "Outro banco" — abre modal */}
          <button
            type="button"
            onClick={() => setShowOtherDialog(true)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center relative',
              extraCount > 0
                ? 'border-primary bg-primary/5'
                : 'border-border border-dashed hover:border-primary/40 bg-card/50',
            )}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--muted))' }}
            >
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground leading-tight">
              Outro banco
            </span>
            {extraCount > 0 && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[9px] text-primary-foreground font-bold">{extraCount}</span>
              </div>
            )}
          </button>
        </div>

        {selectedBanks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Selecione pelo menos um banco para continuar.
          </p>
        )}

        {/* Bancos extras selecionados — chips */}
        {extraSelectedBanks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {extraSelectedBanks.map(id => {
              const bank = financialInstitutions.find(fi => fi.id === id);
              if (!bank) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
                >
                  <ConnectorLogo
                    imageUrl={getBankLogoUrl(bank.id)}
                    primaryColor={bank.color?.replace('#', '')}
                    connectorName={bank.name}
                    size="xs"
                  />
                  <span className="text-xs font-medium text-foreground">{bank.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleExtraBank(bank.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de busca de outros bancos */}
        <Dialog open={showOtherDialog} onOpenChange={setShowOtherDialog}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
            <DialogHeader className="px-4 pt-4 pb-0">
              <DialogTitle className="text-base">Buscar instituição financeira</DialogTitle>
            </DialogHeader>

            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome do banco ou corretora..."
                  value={otherSearch}
                  onChange={e => setOtherSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
                {otherSearch && (
                  <button
                    type="button"
                    onClick={() => setOtherSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
              {filteredOtherBanks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma instituição encontrada para &quot;{otherSearch}&quot;
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você pode continuar selecionando os bancos da lista acima.
                  </p>
                </div>
              ) : (
                filteredOtherBanks.map(bank => {
                  const selected = extraSelectedBanks.includes(bank.id);
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => toggleExtraBank(bank.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                        selected
                          ? 'bg-primary/5 border border-primary/20'
                          : 'hover:bg-muted/50',
                      )}
                    >
                      <ConnectorLogo
                        imageUrl={getBankLogoUrl(bank.id)}
                        primaryColor={bank.color?.replace('#', '')}
                        connectorName={bank.name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {bank.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bank.type === 'bank' ? 'Banco' :
                           bank.type === 'digital_bank' ? 'Banco Digital' :
                           bank.type === 'brokerage' ? 'Corretora' :
                           bank.type === 'credit_card' ? 'Cartão de Crédito' :
                           'Fintech'}
                          {bank.code && ` · Ag. ${bank.code}`}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {extraSelectedBanks.length > 0 && (
              <div className="px-4 py-3 border-t border-border bg-card">
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={() => setShowOtherDialog(false)}
                >
                  Confirmar ({extraSelectedBanks.length} selecionado{extraSelectedBanks.length !== 1 ? 's' : ''})
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
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
              onComplete(); // pula direto para próximo bloco
            } else {
              onSaveDraft('connection_method', method);
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
          /* Open Finance */
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-1">
                Conectar via Open Finance
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedBanks.length > 0
                  ? `Conecte os ${selectedBanks.length} banco${selectedBanks.length > 1 ? 's' : ''} selecionado${selectedBanks.length > 1 ? 's' : ''}, um por vez`
                  : 'Conecte cada banco que você usa'}
              </p>
            </div>

            {connectedCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-foreground">
                  {connectedCount} banco{connectedCount > 1 ? 's' : ''} conectado{connectedCount > 1 ? 's' : ''} com sucesso
                </p>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                🔒 Conexão criptografada · Regulada pelo Banco Central
              </p>
              <PluggyConnectButton
                variant="default"
                size="lg"
                className="w-full"
                onSuccess={handlePluggySuccess}
                onSaving={handlePluggySaving}
              />
              {connectedCount > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Tem mais bancos? Clique novamente para conectar o próximo.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              {connectedCount > 0 && (
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleFinishConnections}
                >
                  Finalizar conexões
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              <Button
                variant={connectedCount > 0 ? 'outline' : 'ghost'}
                className={connectedCount > 0 ? 'shrink-0' : 'w-full text-muted-foreground'}
                size="sm"
                onClick={() => {
                  onSaveDraft('connection_method', 'later');
                  onComplete();
                }}
              >
                {connectedCount > 0 ? 'Pular restantes' : 'Pular por agora'}
              </Button>
            </div>
          </div>
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
