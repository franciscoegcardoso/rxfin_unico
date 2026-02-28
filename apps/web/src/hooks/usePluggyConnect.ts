import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PluggyConnection {
  id: string;
  user_id: string;
  item_id: string;
  connector_id: number;
  connector_name: string;
  connector_image_url: string | null;
  connector_primary_color: string | null;
  status: string;
  execution_status: string | null;
  last_error_code: string | null;
  consent_expires_at: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PluggyAccount {
  id: string;
  user_id: string;
  connection_id: string;
  pluggy_account_id: string;
  type: string;
  subtype: string | null;
  name: string;
  number: string | null;
  balance: number;
  currency_code: string;
  credit_limit: number | null;
  available_credit_limit: number | null;
  card_brand: string | null;
  created_at: string;
  updated_at: string;
}

interface PluggyTransaction {
  id: string;
  user_id: string;
  account_id: string;
  pluggy_transaction_id: string;
  description: string;
  description_raw: string | null;
  amount: number;
  date: string;
  category: string | null;
  type: string;
  status: string;
  payment_data: object | null;
  created_at: string;
}

export function usePluggyConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const [connections, setConnections] = useState<PluggyConnection[]>([]);
  const [accounts, setAccounts] = useState<PluggyAccount[]>([]);
  const [transactions, setTransactions] = useState<PluggyTransaction[]>([]);
  const { toast } = useToast();

  const fetchConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pluggy_connections')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections((data as PluggyConnection[]) || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pluggy_accounts')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setAccounts((data as PluggyAccount[]) || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async (accountId?: string, fromDate?: string) => {
    try {
      let query = supabase
        .from('pluggy_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      if (fromDate) {
        query = query.gte('date', fromDate);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setTransactions((data as PluggyTransaction[]) || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, []);

  const getConnectToken = useCallback(async (itemId?: string): Promise<{ connectToken: string; cpf: string | null } | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-connect', {
        body: itemId ? { itemId } : undefined,
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to get connect token');
      }

      return { connectToken: data.connectToken, cpf: data.cpf || null };
    } catch (error) {
      console.error('Error getting connect token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a conexão. Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const saveCpf = useCallback(async (cpf: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('save-user-cpf', {
        body: { cpf },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to save CPF');

      return true;
    } catch (error) {
      console.error('Error saving CPF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o CPF.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const triggerSync = useCallback(async (itemId: string) => {
    const { data, error } = await supabase.functions.invoke('pluggy-trigger-sync', {
      body: { itemId },
    });

    if (error) {
      // Parse the response body for cooldown errors (429)
      let parsed: any = null;
      try {
        const body = error?.context?.body;
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
      } catch { /* ignore */ }

      if (parsed?.cooldown) {
        const err: any = new Error(parsed.error || 'Rate limited');
        err.cooldown = true;
        err.retryAfterMs = parsed.retryAfterMs;
        throw err;
      }
      console.error('Error triggering sync:', error);
      throw error;
    }

    if (data?.alreadyRunning) {
      console.log('[pluggy-trigger-sync] Already running:', data.jobId);
    } else {
      console.log('[pluggy-trigger-sync] Job queued:', data?.jobId);
    }
  }, []);

  const saveConnection = useCallback(async (itemId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        body: { action: 'save-connection', itemId },
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to save connection');
      }

      if (data.queued) {
        toast({
          title: 'Conexão estabelecida!',
          description: 'Seus dados serão sincronizados em instantes.',
        });
        // Fire-and-forget: trigger pluggy-worker immediately
        triggerSync(itemId);
        // Delay refresh to give backend time to register the connection
        setTimeout(() => {
          fetchConnections();
          fetchAccounts();
        }, 3000);
      } else {
        toast({
          title: 'Conexão estabelecida',
          description: `${data.accountsCount} conta(s) sincronizada(s) com sucesso.`,
        });
        await Promise.all([fetchConnections(), fetchAccounts(), fetchTransactions()]);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error saving connection:', error);
      const message = error?.context?.body
        ? (typeof error.context.body === 'string' ? (() => { try { return JSON.parse(error.context.body).error; } catch { return null; } })() : error.context.body?.error)
        : (error instanceof Error ? error.message : null);
      toast({
        title: 'Erro',
        description: message || 'Não foi possível salvar a conexão.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchConnections, fetchAccounts, fetchTransactions, triggerSync]);

  const refreshConnection = useCallback(async (itemId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        body: { action: 'refresh', itemId },
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to refresh connection');
      }

      toast({
        title: 'Dados atualizados',
        description: 'Transações sincronizadas com sucesso.',
      });

      await Promise.all([fetchConnections(), fetchAccounts(), fetchTransactions()]);
      
      return true;
    } catch (error) {
      console.error('Error refreshing connection:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchConnections, fetchAccounts, fetchTransactions]);

  const deleteConnection = useCallback(async (itemId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        body: { action: 'delete', itemId },
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete connection');
      }

      toast({
        title: 'Conexão removida',
        description: 'A instituição foi desconectada.',
      });

      await Promise.all([fetchConnections(), fetchAccounts(), fetchTransactions()]);
      
      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a conexão.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchConnections, fetchAccounts, fetchTransactions]);

  return {
    isLoading,
    connections,
    accounts,
    transactions,
    fetchConnections,
    fetchAccounts,
    fetchTransactions,
    getConnectToken,
    saveCpf,
    saveConnection,
    refreshConnection,
    deleteConnection,
    triggerSync,
  };
}