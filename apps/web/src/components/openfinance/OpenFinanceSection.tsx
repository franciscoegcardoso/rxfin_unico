import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { mapPluggyStatus } from '@/core/adapters/pluggy-adapter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FreshnessIndicator } from './FreshnessIndicator';
import { ConnectorLogo } from './ConnectorLogo';
import { CardBrandIcon } from './CardBrandIcon';
import { SyncProcessingBanner } from './SyncProcessingBanner';
import { SyncErrorState } from './SyncErrorState';
import {
  Building2,
  CreditCard,
  Wallet,
  RefreshCw,
  Trash2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link2,
} from 'lucide-react';
import { PluggyConnectButton } from './PluggyConnectButton';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const accountTypeLabels: Record<string, string> = {
  CHECKING: 'Conta Digital',
  SAVINGS: 'Conta Poupança',
  INVESTMENT: 'Conta Investimento',
  CREDIT: 'Cartão de Crédito',
};

export const OpenFinanceSection: React.FC = () => {
  const {
    isLoading,
    connections,
    accounts,
    transactions,
    fetchConnections,
    fetchAccounts,
    fetchTransactions,
    refreshConnection,
    deleteConnection,
  } = usePluggyConnect();

  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [reconnectItemId, setReconnectItemId] = useState<string | null>(null);
  const [justConnectedId, setJustConnectedId] = useState<string | null>(null);
  const [isSavingConnection, setIsSavingConnection] = useState(false);
  const [recentlyConnectedIds, setRecentlyConnectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchConnections();
    fetchAccounts();
    fetchTransactions();
  }, [fetchConnections, fetchAccounts, fetchTransactions]);

  const accountsByConnection = useMemo(() => {
    const map: Record<string, typeof accounts> = {};
    accounts.forEach((account) => {
      if (!map[account.connection_id]) {
        map[account.connection_id] = [];
      }
      map[account.connection_id].push(account);
    });
    return map;
  }, [accounts]);

  const transactionsByAccount = useMemo(() => {
    const map: Record<string, typeof transactions> = {};
    transactions.forEach((tx) => {
      if (!map[tx.account_id]) {
        map[tx.account_id] = [];
      }
      map[tx.account_id].push(tx);
    });
    return map;
  }, [transactions]);

  const totals = useMemo(() => {
    const bankBalance = accounts
      .filter((a) => a.type === 'BANK')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const creditUsed = accounts
      .filter((a) => a.type === 'CREDIT')
      .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);

    const creditLimit = accounts
      .filter((a) => a.type === 'CREDIT')
      .reduce((sum, a) => sum + (a.credit_limit || 0), 0);

    return { bankBalance, creditUsed, creditLimit };
  }, [accounts]);

  const handleRefresh = useCallback(async (itemId: string) => {
    setRefreshingItems((prev) => new Set(prev).add(itemId));
    try {
      await refreshConnection(itemId);
    } finally {
      setRefreshingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [refreshConnection]);

  const handleDelete = async (itemId: string, connectionId: string) => {
    // Check for linked credit card transactions/bills before deleting
    const connAccounts = accounts.filter(a => a.connection_id === connectionId);
    const accountIds = connAccounts.map(a => a.id);

    if (accountIds.length > 0) {
      const [{ count: txCount }, { count: billCount }] = await Promise.all([
        supabase
          .from('credit_card_transactions_v')
          .select('id', { count: 'exact', head: true })
          .in('card_id', accountIds),
        supabase
          .from('credit_card_bills')
          .select('id', { count: 'exact', head: true })
          .in('card_id', accountIds),
      ]);

      const totalLinked = (txCount || 0) + (billCount || 0);
      if (totalLinked > 0) {
        // Show warning but proceed with soft-delete (edge function now does soft-delete)
        console.log(`[OpenFinance] Soft-deleting connection with ${txCount} transactions and ${billCount} bills linked`);
      }
    }

    await deleteConnection(itemId);
  };

  // Detect newly-connected accounts (reconexões rastreadas localmente ou created_at recente)
  const isNewlyConnected = useCallback(
    (connection: typeof connections[0]) => {
      if (recentlyConnectedIds.has(connection.item_id)) return true;
      const connAccounts = accountsByConnection[connection.id] || [];
      const hasTx = connAccounts.some((a) => (transactionsByAccount[a.id] || []).length > 0);
      if (hasTx) return false;
      const ageMs = Date.now() - new Date(connection.created_at).getTime();
      return ageMs < 5 * 60 * 1000;
    },
    [accountsByConnection, transactionsByAccount, recentlyConnectedIds],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-6">
          {isSavingConnection && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 flex items-center gap-3 animate-in fade-in duration-300">
              <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Registrando conexão…
                </p>
                <p className="text-xs text-muted-foreground">
                  Aguarde enquanto configuramos seu banco.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Open Finance</h2>
                <p className="text-sm text-muted-foreground">
                  Conecte suas contas de forma segura via Open Finance Brasil
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connections.length === 0 ? (
                <PluggyConnectButton
                  onSaving={() => setIsSavingConnection(true)}
                  onSuccess={async (itemId) => {
                    setIsSavingConnection(false);
                    if (itemId) setRecentlyConnectedIds((prev) => new Set(prev).add(itemId));
                    await fetchConnections();
                    await fetchAccounts();
                    fetchTransactions();
                  }}
                />
              ) : (
                <PluggyConnectButton
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onSaving={() => setIsSavingConnection(true)}
                  onSuccess={async (itemId) => {
                    setIsSavingConnection(false);
                    if (itemId) setRecentlyConnectedIds((prev) => new Set(prev).add(itemId));
                    await fetchConnections();
                    await fetchAccounts();
                    fetchTransactions();
                  }}
                />
              )}
            </div>
          </div>

          {/* Institutions overview strip */}
          {connections.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {connections.map((conn) => {
                const connStatus = mapPluggyStatus(conn.status, conn.execution_status);
                const isConnError = connStatus === 'error' || connStatus === 'expired';
                return (
                  <Badge
                    key={conn.id}
                    variant={isConnError ? 'destructive' : 'outline'}
                    className="gap-1.5 py-1 px-2.5"
                  >
                    <ConnectorLogo
                      imageUrl={conn.connector_image_url}
                      primaryColor={conn.connector_primary_color}
                      connectorName={conn.connector_name}
                      className="!w-4 !h-4 !min-w-4 !min-h-4 [&]:rounded"
                    />
                    {conn.connector_name}
                    {isConnError ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : connStatus === 'syncing' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-income" />
                    )}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Security info */}
          <div className={cn("flex flex-wrap items-center gap-4 text-xs text-muted-foreground", connections.length > 0 ? "mt-3" : "mt-4")}>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Regulamentado pelo Banco Central
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Conformidade LGPD
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Criptografia de ponta a ponta
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo em Contas</p>
                  <p className="text-2xl font-bold text-income">
                    {formatCurrency(totals.bankBalance)}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-income/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fatura Atual</p>
                  <p className="text-2xl font-bold text-expense">
                    {formatCurrency(totals.creditUsed)}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-expense/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Limite Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.creditLimit)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connections */}
      {connections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              Nenhuma instituição conectada
            </h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              Conecte seus bancos e cartões para sincronizar automaticamente suas transações
            </p>
            <PluggyConnectButton
              className="mt-4"
              onSaving={() => setIsSavingConnection(true)}
              onSuccess={async (itemId) => {
                setIsSavingConnection(false);
                if (itemId) setRecentlyConnectedIds((prev) => new Set(prev).add(itemId));
                await fetchConnections();
                await fetchAccounts();
                fetchTransactions();
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => {
            const connAccounts = accountsByConnection[connection.id] || [];
            const isRefreshing = refreshingItems.has(connection.item_id);
            const normalizedStatus = mapPluggyStatus(connection.status, connection.execution_status);
            const hasError = normalizedStatus === 'error' || normalizedStatus === 'expired';
            const newlyConnected = isNewlyConnected(connection);
            const isProcessing = normalizedStatus === 'syncing' || (!hasError && newlyConnected);

            return (
              <Card key={connection.id} className={cn(isRefreshing && 'animate-pulse')}>
                <CardContent className="p-4 space-y-3">
                  {/* Header da conexão */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ConnectorLogo
                        imageUrl={connection.connector_image_url}
                        primaryColor={connection.connector_primary_color}
                        connectorName={connection.connector_name}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{connection.connector_name}</p>
                          {isProcessing && !hasError && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary animate-pulse">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Sincronizando…
                            </Badge>
                          )}
                          {hasError && (
                            <Badge variant="destructive" className="text-[10px]">Erro</Badge>
                          )}
                        </div>
                        <FreshnessIndicator
                          lastSyncAt={connection.last_sync_at}
                          status={connection.status}
                        />
                      </div>
                    </div>
                    {/* Ações */}
                    <div className="flex items-center gap-1">
                      {hasError ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs gap-1 px-2"
                          onClick={() => setReconnectItemId(connection.item_id)}
                        >
                          <Link2 className="h-3 w-3" />
                          Reconectar
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleRefresh(connection.item_id)}
                                disabled={isRefreshing || isProcessing}
                              >
                                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p className="text-xs">Sincronizar agora</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso irá remover a conexão com {connection.connector_name} e todas as
                              transações sincronizadas. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(connection.item_id, connection.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Alerta de consentimento expirando */}
                  {!hasError && connection.consent_expires_at && (() => {
                    const daysUntil = Math.ceil(
                      (new Date(connection.consent_expires_at).getTime() - Date.now()) / 86400000
                    );
                    if (daysUntil > 30) return null;
                    return (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          {daysUntil <= 0
                            ? 'Consentimento expirado — reconecte para renovar.'
                            : `Consentimento expira em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}.`}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Banner de processamento */}
                  {isProcessing && !hasError && (
                    <SyncProcessingBanner connectorName={connection.connector_name} />
                  )}

                  {/* Erro */}
                  {hasError && (
                    <SyncErrorState
                      connectorName={connection.connector_name}
                      status={connection.status}
                      onRetry={() => handleRefresh(connection.item_id)}
                      onReconnect={() => setReconnectItemId(connection.item_id)}
                      isRetrying={isRefreshing}
                    />
                  )}

                  {/* Lista de contas */}
                  {!hasError && connAccounts.length > 0 && (
                    <div className="space-y-2">
                      {connAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            {account.type === 'CREDIT' ? (
                              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div>
                              <p className="text-xs font-medium">
                                {accountTypeLabels[account.type] || account.name}
                              </p>
                              {account.type === 'CREDIT' && account.card_brand && (
                                <div className="flex items-center gap-1">
                                  <CardBrandIcon brand={account.card_brand} className="!w-3.5 !h-3.5" />
                                  {account.number && (
                                    <p className="text-[10px] text-muted-foreground">•••• {account.number}</p>
                                  )}
                                </div>
                              )}
                              {account.type !== 'CREDIT' && account.number && (
                                <p className="text-[10px] text-muted-foreground">•••• {account.number}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {account.type === 'CREDIT' ? (
                              <>
                                <p className="text-xs font-semibold text-expense">
                                  {formatCurrency(Math.abs(account.balance))}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Limite: {formatCurrency(account.credit_limit || 0)}
                                </p>
                              </>
                            ) : (
                              <p className={cn(
                                'text-xs font-semibold',
                                account.balance >= 0 ? 'text-income' : 'text-expense'
                              )}>
                                {formatCurrency(account.balance)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reconnect in update mode */}
      {reconnectItemId && (
        <PluggyConnectButton
          key={`reconnect-${reconnectItemId}`}
          updateItemId={reconnectItemId}
          onSaving={() => setIsSavingConnection(true)}
          onSuccess={(itemId) => {
            setReconnectItemId(null);
            setIsSavingConnection(false);
            if (itemId) setRecentlyConnectedIds((prev) => new Set(prev).add(itemId));
            fetchConnections();
            fetchAccounts();
            fetchTransactions();
          }}
          className="hidden"
          variant="default"
          size="lg"
        />
      )}
    </div>
  );
};
// sync