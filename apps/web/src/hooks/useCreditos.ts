import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Consorcio, ConsorcioInsert, Financiamento, FinanciamentoInsert } from '@/types/credito';
import { toast } from 'sonner';

type CreditosListResponse = {
  consorcios: Consorcio[];
  financiamentos: Financiamento[];
};

type ItemResponse<T> = {
  item: T;
};

export const useCreditos = () => {
  const { user } = useAuth();
  const [consorcios, setConsorcios] = useState<Consorcio[]>([]);
  const [financiamentos, setFinanciamentos] = useState<Financiamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const LOAD_TIMEOUT_MS = 12_000;
  const DEFAULT_LOAD_ERROR =
    'Não foi possível carregar consórcios/financiamentos. Verifique sua conexão (VPN/AdBlock/antivírus) e tente novamente.';

  const markLoadError = () => setLoadError((prev) => prev ?? DEFAULT_LOAD_ERROR);

  const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const invokeCreditos = async <T,>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body?: unknown,
  ): Promise<T> => {
    const { data, error } = await supabase.functions.invoke<T>('creditos', {
      method,
      body,
      timeout: LOAD_TIMEOUT_MS,
    });

    if (error) throw error;
    return data as T;
  };

  // Fallback (caso alguma rede/extensão bloqueie o endpoint REST no navegador)
  const fetchConsorciosDirect = async () => {
    if (!user) return;

    try {
      const { data, error } = await withTimeout(
        supabase.from('consorcios').select('*').order('created_at', { ascending: false }),
        LOAD_TIMEOUT_MS,
      );

      if (error) {
        console.error('Erro ao carregar consórcios (REST):', error);
        markLoadError();
        return;
      }

      setConsorcios(((data ?? []) as unknown) as Consorcio[]);
    } catch (err) {
      console.error('Erro de rede ao carregar consórcios (REST):', err);
      markLoadError();
    }
  };

  const fetchFinanciamentosDirect = async () => {
    if (!user) return;

    try {
      const { data, error } = await withTimeout(
        supabase.from('financiamentos').select('*').order('created_at', { ascending: false }),
        LOAD_TIMEOUT_MS,
      );

      if (error) {
        console.error('Erro ao carregar financiamentos (REST):', error);
        markLoadError();
        return;
      }

      setFinanciamentos(((data ?? []) as unknown) as Financiamento[]);
    } catch (err) {
      console.error('Erro de rede ao carregar financiamentos (REST):', err);
      markLoadError();
    }
  };

  const fetchAll = async () => {
    if (!user) return;

    // 1) Preferir a função (evita muitos bloqueios de /rest/v1 em algumas redes/extensões)
    try {
      const data = await invokeCreditos<CreditosListResponse>('GET');
      setConsorcios(((data?.consorcios ?? []) as unknown) as Consorcio[]);
      setFinanciamentos(((data?.financiamentos ?? []) as unknown) as Financiamento[]);
      return;
    } catch (err) {
      console.error('Erro ao carregar créditos (função):', err);
    }

    // 2) Fallback para REST
    await Promise.all([fetchConsorciosDirect(), fetchFinanciamentosDirect()]);
  };

  const addConsorcio = async (consorcio: Omit<ConsorcioInsert, 'user_id'>) => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    try {
      const res = await invokeCreditos<ItemResponse<Consorcio>>('POST', {
        type: 'consorcio',
        payload: consorcio,
      });

      setConsorcios((prev) => [res.item, ...prev]);
      toast.success('Consórcio adicionado com sucesso!');
      return { data: res.item };
    } catch (err) {
      console.error('Erro ao adicionar consórcio (função):', err);

      const { data, error } = await supabase
        .from('consorcios')
        .insert({ ...consorcio, user_id: user.id })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar consórcio');
        return { error };
      }

      setConsorcios((prev) => [data as Consorcio, ...prev]);
      toast.success('Consórcio adicionado com sucesso!');
      return { data };
    }
  };

  const updateConsorcio = async (id: string, updates: Partial<ConsorcioInsert>) => {
    try {
      const res = await invokeCreditos<ItemResponse<Consorcio>>('PATCH', {
        type: 'consorcio',
        id,
        updates,
      });

      setConsorcios((prev) => prev.map((c) => (c.id === id ? res.item : c)));
      toast.success('Consórcio atualizado!');
      return { data: res.item };
    } catch (err) {
      console.error('Erro ao atualizar consórcio (função):', err);

      const { data, error } = await supabase.from('consorcios').update(updates).eq('id', id).select().single();

      if (error) {
        toast.error('Erro ao atualizar consórcio');
        return { error };
      }

      setConsorcios((prev) => prev.map((c) => (c.id === id ? (data as Consorcio) : c)));
      toast.success('Consórcio atualizado!');
      return { data };
    }
  };

  const deleteConsorcio = async (id: string) => {
    try {
      await invokeCreditos<{ ok: true }>('DELETE', { type: 'consorcio', id });
      setConsorcios((prev) => prev.filter((c) => c.id !== id));
      toast.success('Consórcio excluído!');
      return {};
    } catch (err) {
      console.error('Erro ao excluir consórcio (função):', err);

      const { error } = await supabase.from('consorcios').delete().eq('id', id);

      if (error) {
        toast.error('Erro ao excluir consórcio');
        return { error };
      }

      setConsorcios((prev) => prev.filter((c) => c.id !== id));
      toast.success('Consórcio excluído!');
      return {};
    }
  };

  const addFinanciamento = async (financiamento: Omit<FinanciamentoInsert, 'user_id'>) => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    try {
      const res = await invokeCreditos<ItemResponse<Financiamento>>('POST', {
        type: 'financiamento',
        payload: financiamento,
      });

      setFinanciamentos((prev) => [res.item, ...prev]);
      toast.success('Financiamento adicionado com sucesso!');
      return { data: res.item };
    } catch (err) {
      console.error('Erro ao adicionar financiamento (função):', err);

      const { data, error } = await supabase
        .from('financiamentos')
        .insert({ ...financiamento, user_id: user.id })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar financiamento');
        return { error };
      }

      setFinanciamentos((prev) => [data as Financiamento, ...prev]);
      toast.success('Financiamento adicionado com sucesso!');
      return { data };
    }
  };

  const updateFinanciamento = async (id: string, updates: Partial<FinanciamentoInsert>) => {
    try {
      const res = await invokeCreditos<ItemResponse<Financiamento>>('PATCH', {
        type: 'financiamento',
        id,
        updates,
      });

      setFinanciamentos((prev) => prev.map((f) => (f.id === id ? res.item : f)));
      toast.success('Financiamento atualizado!');
      return { data: res.item };
    } catch (err) {
      console.error('Erro ao atualizar financiamento (função):', err);

      const { data, error } = await supabase
        .from('financiamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast.error('Erro ao atualizar financiamento');
        return { error };
      }

      setFinanciamentos((prev) => prev.map((f) => (f.id === id ? (data as Financiamento) : f)));
      toast.success('Financiamento atualizado!');
      return { data };
    }
  };

  const deleteFinanciamento = async (id: string) => {
    try {
      await invokeCreditos<{ ok: true }>('DELETE', { type: 'financiamento', id });
      setFinanciamentos((prev) => prev.filter((f) => f.id !== id));
      toast.success('Financiamento excluído!');
      return {};
    } catch (err) {
      console.error('Erro ao excluir financiamento (função):', err);

      const { error } = await supabase.from('financiamentos').delete().eq('id', id);

      if (error) {
        toast.error('Erro ao excluir financiamento');
        return { error };
      }

      setFinanciamentos((prev) => prev.filter((f) => f.id !== id));
      toast.success('Financiamento excluído!');
      return {};
    }
  };

  const refetch = async () => {
    if (!user) return;

    setLoadError(null);
    setLoading(true);
    await fetchAll();
    setLoading(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadError(null);
      setLoading(true);
      await fetchAll();
      setLoading(false);
    };

    if (user) {
      loadData();
    } else {
      setConsorcios([]);
      setFinanciamentos([]);
      setLoadError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    consorcios,
    financiamentos,
    loading,
    loadError,
    addConsorcio,
    updateConsorcio,
    deleteConsorcio,
    addFinanciamento,
    updateFinanciamento,
    deleteFinanciamento,
    refetch,
  };
};
