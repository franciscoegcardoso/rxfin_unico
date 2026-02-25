import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ACCOUNT_TYPE_MAP: Record<string, string> = {
  CHECKING: 'Conta Digital',
  INVESTMENT: 'Conta Investimento',
  SAVINGS: 'Conta Poupança',
  CREDIT: 'Cartão de Crédito',
  BANK: 'Conta Corrente',
};

export interface SourceInfo {
  institution: string;
  accountType: string;
  imageUrl: string | null;
  primaryColor: string | null;
}

/**
 * Builds a lookup map: pluggy_transaction_id → { institution, accountType }
 */
export function useTransactionSourceMap() {
  const { user } = useAuth();
  const [sourceMap, setSourceMap] = useState<Record<string, SourceInfo>>({});

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('pluggy_transactions')
        .select('pluggy_transaction_id, account_id')
        .eq('user_id', user.id);

      if (error || !data || data.length === 0) return;

      const accountIds = [...new Set(data.map(t => t.account_id))];

      const { data: accounts } = await supabase
        .from('pluggy_accounts')
        .select('id, type, name, connection_id')
        .in('id', accountIds)
        .is('deleted_at', null);

      if (!accounts) return;

      const connectionIds = [...new Set(accounts.map(a => a.connection_id))];

      const { data: connections } = await supabase
        .from('pluggy_connections')
        .select('id, connector_name, connector_image_url, connector_primary_color')
        .in('id', connectionIds)
        .is('deleted_at', null);

      const connMap = new Map((connections || []).map(c => [c.id, c]));
      const acctMap = new Map(accounts.map(a => [a.id, a]));

      const map: Record<string, SourceInfo> = {};
      for (const tx of data) {
        const acct = acctMap.get(tx.account_id);
        if (!acct) continue;
        const conn = connMap.get(acct.connection_id);
        map[tx.pluggy_transaction_id] = {
          institution: conn?.connector_name || 'Desconhecida',
          accountType: ACCOUNT_TYPE_MAP[acct.type] || acct.name || acct.type,
          imageUrl: conn?.connector_image_url || null,
          primaryColor: conn?.connector_primary_color || null,
        };
      }
      setSourceMap(map);
    };

    load();
  }, [user]);

  const getSourceInfo = useMemo(() => {
    return (sourceId: string | null): SourceInfo | null => {
      if (!sourceId) return null;
      return sourceMap[sourceId] || null;
    };
  }, [sourceMap]);

  return { getSourceInfo, sourceMap };
}
// sync
