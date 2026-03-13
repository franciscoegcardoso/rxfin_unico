import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { useOnboardingV2Store } from '@/store/onboardingV2Store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, Link2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const PLUGGY_CONNECT_SCRIPT = 'https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js';

declare global {
  interface Window {
    PluggyConnect?: new (options: {
      connectToken: string;
      includeSandbox?: boolean;
      onSuccess: (data: { item: { id: string } }) => void;
      onError: (error: { message?: string } | unknown) => void;
      onClose: () => void;
    }) => { init: () => void | Promise<void> };
  }
}

async function trackOnboardingEvent(
  eventName: string,
  step: number,
  metadata: Record<string, unknown> = {}
) {
  try {
    await (supabase as any).rpc('track_onboarding_event', {
      p_event_name: eventName,
      p_step: step,
      p_metadata: metadata,
    });
  } catch {
    // best-effort
  }
}

export interface Step2ConexaoProps {
  onContinue: () => void;
}

export function Step2Conexao({ onContinue }: Step2ConexaoProps) {
  const { toast } = useToast();
  const { getConnectToken, saveConnection } = usePluggyConnect();
  const { setOpenFinanceConnected, advanceStep, isSaving } = useOnboardingV2Store();

  const [moment, setMoment] = useState<'A' | 'B'>('A');
  const [connectedAccountLabel, setConnectedAccountLabel] = useState<string>('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const scriptLoadedRef = useRef(false);

  // When store says already connected (e.g. user came back to this step), show Moment B
  const openFinanceConnected = useOnboardingV2Store((s) => s.openFinanceConnected);
  useEffect(() => {
    if (openFinanceConnected && moment === 'A') {
      setMoment('B');
      fetchFirstConnectionLabel();
    }
  }, [openFinanceConnected, moment, fetchFirstConnectionLabel]);

  const fetchFirstConnectionLabel = useCallback(async () => {
    try {
      const { data: conns } = await supabase
        .from('pluggy_connections')
        .select('id, connector_name')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
      if (conns?.[0]) {
        const conn = conns[0] as { id: string; connector_name: string };
        const { data: accounts } = await supabase
          .from('pluggy_accounts')
          .select('name, number')
          .eq('connection_id', conn.id)
          .is('deleted_at', null)
          .limit(1);
        const acc = accounts?.[0] as { name?: string; number?: string } | undefined;
        const name = acc?.name || conn.connector_name || 'Banco';
        const num = acc?.number ? `••••${acc.number.slice(-4)}` : '';
        setConnectedAccountLabel(num ? `${name} ${num}` : name);
      } else {
        setConnectedAccountLabel('Banco conectado');
      }
    } catch {
      setConnectedAccountLabel('Banco conectado');
    }
  }, []);

  useEffect(() => {
    if (scriptLoadedRef.current) {
      setScriptLoaded(true);
      return;
    }
    const existing = document.querySelector(`script[src="${PLUGGY_CONNECT_SCRIPT}"]`);
    if (existing) {
      scriptLoadedRef.current = true;
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = PLUGGY_CONNECT_SCRIPT;
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      setScriptLoaded(true);
    };
    script.onerror = () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o widget de conexão.',
        variant: 'destructive',
      });
    };
    document.body.appendChild(script);
  }, [toast]);

  const handleConnectBank = useCallback(async () => {
    if (!scriptLoaded || !window.PluggyConnect) {
      toast({
        title: scriptLoaded ? 'Erro' : 'Aguarde',
        description: scriptLoaded
          ? 'Widget não disponível. Recarregue a página.'
          : 'Carregando widget de conexão...',
        variant: 'destructive',
      });
      return;
    }
    setIsOpening(true);
    const tokenResult = await getConnectToken();
    if (!tokenResult?.connectToken) {
      setIsOpening(false);
      return;
    }
    try {
      const PluggyConnectCtor = window.PluggyConnect;
      const pluggyConnect = new PluggyConnectCtor({
        connectToken: tokenResult.connectToken,
        includeSandbox: import.meta.env.VITE_PLUGGY_SANDBOX === 'true',
        onSuccess: async (data) => {
          setIsOpening(false);
          const success = await saveConnection(data.item.id);
          if (success) {
            await setOpenFinanceConnected(true);
            await trackOnboardingEvent('bank_connected', 2, {});
            setMoment('B');
            fetchFirstConnectionLabel();
          }
        },
        onError: (err) => {
          setIsOpening(false);
          const msg =
            typeof err === 'object' && err && 'message' in err
              ? String((err as { message?: string }).message)
              : 'Ocorreu um erro ao conectar.';
          toast({
            title: 'Erro na conexão',
            description: 'Não foi possível conectar. Tente novamente ou insira manualmente.',
            variant: 'destructive',
          });
          trackOnboardingEvent('bank_failed', 2, {});
        },
        onClose: () => {
          setIsOpening(false);
        },
      });
      await pluggyConnect.init();
    } catch (error) {
      setIsOpening(false);
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar. Tente novamente ou insira manualmente.',
        variant: 'destructive',
      });
      trackOnboardingEvent('bank_failed', 2, {});
    }
  }, [scriptLoaded, getConnectToken, saveConnection, setOpenFinanceConnected, toast, fetchFirstConnectionLabel]);

  const handleManual = useCallback(async () => {
    await trackOnboardingEvent('bank_skipped', 2, {});
    await advanceStep(2);
    onContinue();
  }, [advanceStep, onContinue]);

  const handleContinueFromB = useCallback(async () => {
    await advanceStep(2);
    onContinue();
  }, [advanceStep, onContinue]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <AnimatePresence mode="wait">
        {moment === 'A' && (
          <motion.div
            key="A"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-3xl block mb-2" aria-hidden>🔗</span>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Conecte seus dados financeiros
              </h2>
              <p className="text-muted-foreground text-sm">
                Veja tudo em um lugar. Sem digitação manual.
              </p>
            </div>

            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                Saldo e extrato automáticos
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                Categorização inteligente
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                Dados protegidos (Open Finance)
              </li>
            </ul>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleConnectBank}
                disabled={!scriptLoaded || isOpening}
                className="w-full bg-[hsl(var(--primary))] text-primary-foreground hover:opacity-90"
              >
                {isOpening ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Abrindo...
                  </>
                ) : !scriptLoaded ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Conectar banco automaticamente →
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">ou</p>

              <Button
                variant="outline"
                className="w-full border-[hsl(var(--color-border-default))]"
                onClick={handleManual}
                disabled={isSaving}
              >
                Prefiro inserir manualmente
              </Button>
            </div>
          </motion.div>
        )}

        {moment === 'B' && (
          <motion.div
            key="B"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <motion.span
                className="text-4xl block mb-2"
                aria-hidden
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                🎉
              </motion.span>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                Banco conectado!
              </h2>
              <p className="text-muted-foreground text-sm">
                {connectedAccountLabel || 'Conta sincronizada'}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full border-[hsl(var(--color-border-default))]"
                onClick={handleConnectBank}
                disabled={!scriptLoaded || isOpening}
              >
                {isOpening ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                + Conectar outro banco
              </Button>
              <Button
                onClick={handleContinueFromB}
                disabled={isSaving}
                className="w-full bg-[hsl(var(--primary))] text-primary-foreground hover:opacity-90"
              >
                Continuar →
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
