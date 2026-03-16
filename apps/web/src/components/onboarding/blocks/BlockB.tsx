import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Building2, Upload, CheckCircle2, Loader2,
  TrendingUp, DollarSign, AlertCircle, ChevronRight, Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ConquestCard } from '../ConquestCard';
import { ReconciliationBanner } from '../ReconciliationBanner';
import { PluggyConnectButton } from '@/components/openfinance/PluggyConnectButton';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import type { OnboardingSnapshot } from '@/hooks/useOnboardingSnapshot';
import { invalidateOnboardingSnapshot } from '@/hooks/useOnboardingSnapshot';

interface ConnectedBank {
  item_id: string;
  connector_name: string;
  connector_image_url: string | null;
  connector_primary_color: string | null;
  connected_at: string;
}

interface IncomeValidationItem {
  id: string;
  name: string;
  method: string;
  enabled: boolean;
  estimatedValue: number | null;
  confirmed: boolean;
  source: 'pluggy' | 'manual';
}

interface BlockBProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: unknown) => void;
  snapshot?: OnboardingSnapshot | null;
}

export const BlockB: React.FC<BlockBProps> = ({
  step,
  onStepChange,
  onComplete,
  onSaveDraft,
  snapshot,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connectedCount, setConnectedCount] = useState(0);
  const [connectedBanks, setConnectedBanks] = useState<ConnectedBank[]>([]);
  const [lastConnectedItemId, setLastConnectedItemId] = useState<string | null>(null);
  const [reconciliationDone, setReconciliationDone] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [milestoneData, setMilestoneData] = useState<unknown>(null);
  const [incomeValidations, setIncomeValidations] = useState<IncomeValidationItem[]>([]);
  const [validationsLoaded, setValidationsLoaded] = useState(false);
  const [savingValidations, setSavingValidations] = useState(false);

  useEffect(() => {
    if (step === 1 && snapshot?.pluggy_connections && connectedBanks.length === 0) {
      const existing: ConnectedBank[] = snapshot.pluggy_connections.map((conn) => ({
        item_id: conn.item_id ?? `snapshot-${conn.connector_id}`,
        connector_id: conn.connector_id,
        connector_name: conn.connector_name,
        connector_image_url: conn.connector_image_url ?? null,
        connector_primary_color: conn.connector_primary_color ?? null,
        connected_at: conn.created_at,
        from_snapshot: true,
      }));
      if (existing.length > 0) {
        setConnectedBanks(existing);
        setConnectedCount(existing.length);
      }
    }
  }, [step, snapshot]);

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
    onStepChange(2); // validação de receitas
  };

  const loadIncomeValidations = async () => {
    if (validationsLoaded || !user?.id) return;
    try {
      const { data: incomeItems } = await supabase
        .from('user_income_items')
        .select('id, name, method, enabled')
        .eq('user_id', user.id)
        .eq('enabled', true)
        .order('order_index');

      if (!incomeItems || incomeItems.length === 0) {
        setValidationsLoaded(true);
        return;
      }

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const fromDate = threeMonthsAgo.toISOString().split('T')[0];

      const { data: txns } = await supabase
        .from('lancamentos_realizados_v')
        .select('nome, valor_realizado, mes_referencia')
        .eq('user_id', user.id)
        .eq('tipo', 'receita')
        .gte('data_lancamento', fromDate)
        .order('valor_realizado', { ascending: false })
        .limit(50);

      const validations: IncomeValidationItem[] = incomeItems.map(item => {
        const match = txns?.find(tx =>
          tx.nome?.toLowerCase().includes(item.name.toLowerCase().split(' ')[0].toLowerCase()) ||
          item.name.toLowerCase().includes(tx.nome?.toLowerCase().split(' ')[0] ?? '')
        );

        return {
          id: item.id,
          name: item.name,
          method: item.method,
          enabled: item.enabled,
          estimatedValue: match ? Math.round(match.valor_realizado) : null,
          confirmed: false,
          source: match ? 'pluggy' : 'manual',
        };
      });

      setIncomeValidations(validations);
    } catch (err) {
      console.warn('[BlockB] loadIncomeValidations erro:', err);
    } finally {
      setValidationsLoaded(true);
    }
  };

  // ─── Step 0: Intro ────────────────────────────────────────
  if (step === 0) {
    const hasExistingConnections =
      (snapshot?.pluggy_connections_count ?? 0) > 0 && !reconciliationDone;

    if (hasExistingConnections && snapshot?.pluggy_connections?.length) {
      const connections = snapshot.pluggy_connections;
      return (
        <div className="max-w-2xl mx-auto py-8 animate-slide-up">
          <ReconciliationBanner
            title="Você já tem bancos conectados"
            description="Detectamos conexões bancárias que você fez anteriormente."
            items={connections.map((conn) => ({
              label: conn.connector_name,
              detail: `Conectado em ${new Date(conn.created_at).toLocaleDateString('pt-BR')}`,
              icon: (
                <ConnectorLogo
                  imageUrl={conn.connector_image_url}
                  connectorName={conn.connector_name}
                  size="xs"
                />
              ),
            }))}
            onUseExisting={async () => {
              await supabase.rpc('record_onboarding_reconciliation', {
                p_block: 'block_b',
                p_data_found: { pluggy_connections: connections.length },
              });
              setReconciliationDone(true);
              setConnectedCount(connections.length);
              onStepChange(4); // conquest
            }}
            onReconfigure={() => {
              setReconciliationDone(true);
            }}
            useExistingLabel={`Usar ${connections.length} banco${connections.length > 1 ? 's' : ''} conectado${connections.length > 1 ? 's' : ''}`}
            reconfigureLabel="Conectar mais bancos"
          />
        </div>
      );
    }

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
                icon: Building2,
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
          className="w-full mt-2 text-muted-foreground text-xs"
          onClick={() => onStepChange(3)}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Prefiro fazer upload de extrato
        </Button>
      </div>
    );
  }

  // ─── Step 1: Conectar via Open Finance ──────────────────────
  if (step === 1) {
    const connectedConnectorIds = new Set(
      connectedBanks
        .map((b) => b.connector_id)
        .filter((id): id is number => id !== undefined)
    );
    const snapshotBanks = connectedBanks.filter((b) => b.from_snapshot);
    const newlyConnectedBanks = connectedBanks.filter((b) => !b.from_snapshot);

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="text-center mb-5">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Conectar via Open Finance
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecte cada banco que você usa, um por vez
          </p>
        </div>

        {snapshotBanks.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Já conectados anteriormente
            </p>
            <div className="space-y-2">
              {snapshotBanks.map((bank) => (
                <div
                  key={bank.item_id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                >
                  <ConnectorLogo
                    imageUrl={bank.connector_image_url}
                    primaryColor={bank.connector_primary_color?.replace('#', '') ?? undefined}
                    connectorName={bank.connector_name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {bank.connector_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Conectado em {new Date(bank.connected_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {newlyConnectedBanks.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Conectados agora
            </p>
            <div className="space-y-2">
              {newlyConnectedBanks.map((bank) => {
                const isLast = bank.item_id === lastConnectedItemId;
                return (
                  <div
                    key={bank.item_id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all duration-500',
                      isLast
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                        : 'border-border bg-card',
                    )}
                  >
                    <ConnectorLogo
                      imageUrl={bank.connector_image_url}
                      primaryColor={bank.connector_primary_color?.replace('#', '') ?? undefined}
                      connectorName={bank.connector_name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {bank.connector_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isLast ? '✨ Acabou de conectar' : 'Conectado com sucesso'}
                      </p>
                    </div>
                    <CheckCircle2
                      className={cn(
                        'h-5 w-5 shrink-0 transition-colors',
                        isLast ? 'text-primary' : 'text-muted-foreground/50',
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {connectedBanks.length > 0 && (
          <div className="border-t border-border mb-4" />
        )}

        <div
          className={cn(
            'rounded-xl border p-5 mb-5 transition-colors',
            connectedBanks.length > 0
              ? 'bg-muted/20 border-border/60'
              : 'bg-card border-border',
          )}
        >
          <p className="text-xs text-muted-foreground mb-3 text-center">
            {connectedBanks.length > 0
              ? '➕ Adicionar outro banco'
              : '🔒 Conexão criptografada · Regulada pelo Banco Central'}
          </p>
          <PluggyConnectButton
            variant="default"
            size="lg"
            className="w-full"
            onSuccess={async (itemId?: string) => {
              setConnectedCount((prev) => prev + 1);
              invalidateOnboardingSnapshot(queryClient, user?.id);

              if (itemId && user?.id) {
                const { data } = await supabase
                  .from('pluggy_connections')
                  .select('item_id, connector_id, connector_name, connector_image_url, connector_primary_color')
                  .eq('item_id', itemId)
                  .eq('user_id', user.id)
                  .single();

                if (data) {
                  const isDuplicate =
                    data.connector_id != null && connectedConnectorIds.has(data.connector_id);

                  if (isDuplicate) {
                    setConnectedBanks((prev) =>
                      prev.map((b) =>
                        b.connector_id === data.connector_id
                          ? {
                              ...b,
                              item_id: data.item_id,
                              from_snapshot: false,
                              connected_at: new Date().toISOString(),
                            }
                          : b,
                      ),
                    );
                  } else {
                    const newBank: ConnectedBank = {
                      item_id: data.item_id,
                      connector_id: data.connector_id ?? undefined,
                      connector_name: data.connector_name,
                      connector_image_url: data.connector_image_url ?? null,
                      connector_primary_color: data.connector_primary_color ?? null,
                      connected_at: new Date().toISOString(),
                      from_snapshot: false,
                    };
                    setConnectedBanks((prev) => [...prev, newBank]);
                  }

                  setLastConnectedItemId(data.item_id);
                  setTimeout(() => setLastConnectedItemId(null), 4000);
                }
              }
            }}
            onSaving={handlePluggySaving}
          />
          {connectedBanks.length > 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Cada banco é uma conexão separada
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {connectedBanks.length > 0 && (
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleFinishConnections}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {syncMessage}
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
          <Button
            variant={connectedBanks.length > 0 ? 'outline' : 'ghost'}
            className={connectedBanks.length === 0 ? 'w-full text-muted-foreground' : 'shrink-0'}
            size="sm"
            onClick={() => {
              onSaveDraft('connection_method', 'later');
              onComplete();
            }}
          >
            {connectedBanks.length > 0 ? 'Pular restantes' : 'Pular por agora'}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Validação de Receitas por IA ─────────────────
  if (step === 2) {
    if (!validationsLoaded) {
      loadIncomeValidations();
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <RXFinLoadingSpinner size={48} />
          <p className="text-sm text-muted-foreground text-center">
            IA analisando suas receitas...
          </p>
        </div>
      );
    }

    if (incomeValidations.length === 0) {
      return (
        <div className="max-w-2xl mx-auto py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhuma fonte de renda configurada ainda.
          </p>
          <Button variant="hero" onClick={() => onStepChange(4)}>
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    }

    const hasRealData = incomeValidations.some(v => v.source === 'pluggy');
    const confirmedCount = incomeValidations.filter(v => v.confirmed).length;

    const handleToggleConfirm = (id: string) => {
      setIncomeValidations(prev =>
        prev.map(v => v.id === id ? { ...v, confirmed: !v.confirmed } : v)
      );
    };

    const handleConfirmAll = () => {
      setIncomeValidations(prev => prev.map(v => ({ ...v, confirmed: true })));
    };

    const handleContinue = async () => {
      setSavingValidations(true);
      try {
        const confirmed = incomeValidations.filter(v => v.confirmed).length;
        await supabase.from('ai_onboarding_events').insert({
          user_id: user?.id,
          event_type: 'income_validation_confirmed',
          metadata: {
            total_items: incomeValidations.length,
            confirmed_count: confirmed,
            has_real_data: hasRealData,
            items: incomeValidations.map(v => ({
              name: v.name,
              confirmed: v.confirmed,
              source: v.source,
              estimated_value: v.estimatedValue,
            })),
          },
        });
      } catch (err) {
        console.warn('[BlockB] saveValidations erro (não crítico):', err);
      } finally {
        setSavingValidations(false);
      }
      onStepChange(4);
    };

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Validação por IA
            </p>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Confirme suas fontes de renda
          </h2>
          <p className="text-sm text-muted-foreground">
            {hasRealData
              ? 'A IA identificou entradas nos seus extratos. Confirme as que fazem parte da sua renda regular.'
              : 'Confirme as fontes de renda que você configurou. Os valores serão preenchidos após sincronizar seus bancos.'}
          </p>
        </div>

        {hasRealData && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">Dados reais detectados</span>
              {' '}— Baseado nos seus últimos 3 meses de extratos bancários
            </p>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {incomeValidations.map(item => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer',
                item.confirmed
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              )}
              onClick={() => handleToggleConfirm(item.id)}
            >
              <div className="shrink-0">
                {item.confirmed
                  ? <CheckCircle2 className="h-5 w-5 text-primary" />
                  : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {item.name}
                  </p>
                  {item.source === 'pluggy' && (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                      detectado
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.method}
                </p>
              </div>

              <div className="shrink-0 text-right">
                {item.estimatedValue != null ? (
                  <p className="text-sm font-semibold text-foreground">
                    R$ {item.estimatedValue.toLocaleString('pt-BR')}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    A sincronizar
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {confirmedCount < incomeValidations.length && (
          <button
            type="button"
            onClick={handleConfirmAll}
            className="w-full text-xs text-primary font-medium mb-4 py-2 hover:underline"
          >
            Confirmar todas as fontes de renda
          </button>
        )}

        {!hasRealData && (
          <div className="bg-muted/30 rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Conecte seus bancos via Open Finance para que a IA identifique
              automaticamente os valores reais de cada fonte de renda.
            </p>
          </div>
        )}

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          disabled={savingValidations}
          onClick={handleContinue}
        >
          {savingValidations
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
            : <>Continuar <ArrowRight className="ml-2 h-5 w-5" /></>
          }
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground"
          onClick={() => onStepChange(4)}
        >
          Pular por agora
        </Button>
      </div>
    );
  }

  // ─── Step 3: Upload de extrato ──────────────────────────────
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

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
              window.open('/dados-financeiros', '_blank');
            }}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Importar extrato
          </Button>
        </div>

        <div className="bg-muted/30 rounded-xl p-4 mb-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 <strong>Dica:</strong> No app do seu banco, vá em &quot;Extrato&quot; e exporte os últimos
            12 meses. Faça isso para cada banco que você usa.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="hero"
            className="flex-1"
            onClick={() => onStepChange(4)}
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
    );
  }

  // ─── Step 4: Conquest Card ────────────────────────────────
  if (step === 4) {
    const md = milestoneData as { actual_income?: number; actual_expenses?: number; count_transactions?: number } | null;
    const metrics = md
      ? [
          { label: 'Receita Identificada', value: md.actual_income != null && md.actual_income > 0 ? `R$ ${md.actual_income.toLocaleString('pt-BR')}` : 'Calculando...' },
          { label: 'Despesa Identificada', value: md.actual_expenses != null && md.actual_expenses > 0 ? `R$ ${md.actual_expenses.toLocaleString('pt-BR')}` : 'Calculando...' },
          { label: 'Bancos conectados', value: `${connectedCount || 1} banco${connectedCount !== 1 ? 's' : ''}` },
          { label: 'Lançamentos importados', value: md.count_transactions != null && md.count_transactions > 0 ? `${md.count_transactions} lançamentos` : 'Em processamento...' },
        ]
      : [
          { label: 'Bancos conectados', value: `${connectedCount} banco${connectedCount !== 1 ? 's' : ''}` },
          { label: 'Status', value: 'Dados em processamento' },
          { label: 'IA', value: 'Categorizando...' },
          { label: 'Próximo passo', value: 'Validar categorias' },
        ];

    return (
      <div className="py-8">
        <ConquestCard
          level={2}
          badge="silver"
          title="Bancos conectados!"
          metrics={metrics}
          nextLevelPreview="Nível 3 — Planejamento: orçamento e metas."
          onContinue={onComplete}
          continueLabel="Continuar para Nível 3: Planejamento"
        />
      </div>
    );
  }

  return null;
};
