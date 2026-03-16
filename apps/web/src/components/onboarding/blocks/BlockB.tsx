import React, { useState } from 'react';
import {
  ArrowRight, ArrowLeft, Building2, Upload, CheckCircle2, Loader2,
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
    onStepChange(3); // conquest
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
              onStepChange(3); // conquest
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
          onClick={() => onStepChange(2)}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Prefiro fazer upload de extrato
        </Button>
      </div>
    );
  }

  // ─── Step 1: Conectar via Open Finance ──────────────────────
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Conectar via Open Finance
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecte cada banco que você usa, um por vez
          </p>
        </div>

        {connectedBanks.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Bancos conectados ({connectedBanks.length})
            </p>

            {connectedBanks.map((bank) => {
              const isLast = bank.item_id === lastConnectedItemId;
              return (
                <div
                  key={bank.item_id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all duration-500',
                    isLast
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
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

            <div className="border-t border-border pt-1" />
          </div>
        )}

        <div
          className={cn(
            'rounded-xl border p-5 mb-5 transition-colors',
            connectedBanks.length > 0
              ? 'bg-muted/30 border-border/50'
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
                  .select('item_id, connector_name, connector_image_url, connector_primary_color')
                  .eq('item_id', itemId)
                  .eq('user_id', user.id)
                  .single();

                if (data) {
                  const newBank: ConnectedBank = {
                    item_id: data.item_id,
                    connector_name: data.connector_name,
                    connector_image_url: data.connector_image_url,
                    connector_primary_color: data.connector_primary_color,
                    connected_at: new Date().toISOString(),
                  };
                  setConnectedBanks((prev) => [...prev, newBank]);
                  setLastConnectedItemId(itemId);

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
          {connectedCount > 0 && (
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleFinishConnections}
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
            variant={connectedCount > 0 ? 'outline' : 'ghost'}
            className={connectedCount === 0 ? 'w-full text-muted-foreground' : 'shrink-0'}
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
    );
  }

  // ─── Step 2: Upload de extrato ──────────────────────────────
  if (step === 2) {
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
    );
  }

  // ─── Step 3: Conquest Card ────────────────────────────────
  if (step === 3) {
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
