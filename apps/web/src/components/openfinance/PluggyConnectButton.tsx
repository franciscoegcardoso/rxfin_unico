import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Link2 } from 'lucide-react';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Pluggy Connect Widget script URL - using versioned URL for stability
const PLUGGY_CONNECT_SCRIPT = 'https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js';

// Chave do localStorage para retomada OAuth no Safari iOS
// Armazena { connectToken, cpf } para restaurar o CPF no widget após redirect do banco
const PLUGGY_PENDING_KEY = 'pluggy_pending_token';

interface PluggyPendingData {
  connectToken: string;
  cpf: string | null;
}

export interface PluggyConnectButtonProps {
  onSuccess?: (itemId?: string) => void;
  onSaving?: () => void;
  updateItemId?: string;
  selectedConnectorId?: number;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

declare global {
  interface Window {
    PluggyConnect?: new (options: {
      connectToken: string;
      includeSandbox?: boolean;
      updateItem?: string;
      selectedConnectorId?: number;
      openFinanceParameters?: { cpf?: string };
      forceAskForCredentials?: boolean;
      onSuccess: (data: { item: { id: string } }) => void;
      onError: (error: { message?: string } | unknown) => void;
      onClose: () => void;
    }) => { init: () => void | Promise<void> };
    __pluggyWidgetOpen?: boolean;
  }
}

function setWidgetOpen() { window.__pluggyWidgetOpen = true; }
function setWidgetClosed() { window.__pluggyWidgetOpen = false; }

export const PluggyConnectButton: React.FC<PluggyConnectButtonProps> = ({
  onSuccess,
  onSaving,
  updateItemId,
  selectedConnectorId,
  variant = 'default',
  size = 'default',
  className,
}) => {
  const { isLoading, getConnectToken, saveConnection, triggerSync } = usePluggyConnect();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const scriptLoadedRef = useRef(false);

  const isMobileSafari =
    typeof navigator !== 'undefined' &&
    /iP(hone|ad|od)/.test(navigator.userAgent) &&
    /WebKit/.test(navigator.userAgent) &&
    !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);

  const { toast } = useToast();

  useEffect(() => {
    if (scriptLoadedRef.current) { setScriptLoaded(true); return; }
    const existingScript = document.querySelector(`script[src="${PLUGGY_CONNECT_SCRIPT}"]`);
    if (existingScript) {
      scriptLoadedRef.current = true;
      setScriptLoaded(true);
      console.log('Pluggy Connect script already exists');
      return;
    }
    const script = document.createElement('script');
    script.src = PLUGGY_CONNECT_SCRIPT;
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      setScriptLoaded(true);
      console.log('Pluggy Connect script loaded successfully');
    };
    script.onerror = () => {
      console.error('Failed to load Pluggy Connect script');
      toast({ title: 'Erro', description: 'Não foi possível carregar o widget de conexão.', variant: 'destructive' });
    };
    document.body.appendChild(script);
    return () => { setWidgetClosed(); };
  }, [toast]);

  // Retomada do fluxo OAuth no Safari iOS após redirect do banco
  // Fix: salvar e restaurar o CPF junto com o connectToken para pré-preenchimento
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthReturn =
      urlParams.has('code') || urlParams.has('oauth_state_id') || urlParams.has('pluggy_oauth');
    if (!hasOAuthReturn) return;

    const pendingRaw = localStorage.getItem(PLUGGY_PENDING_KEY);
    if (!pendingRaw) return;

    localStorage.removeItem(PLUGGY_PENDING_KEY);
    window.history.replaceState({}, '', window.location.pathname);

    // Suportar formato antigo (string simples) e novo (JSON com cpf)
    let pendingToken: string;
    let pendingCpf: string | null = null;
    try {
      const parsed: PluggyPendingData = JSON.parse(pendingRaw);
      pendingToken = parsed.connectToken;
      pendingCpf = parsed.cpf ?? null;
    } catch {
      pendingToken = pendingRaw; // formato legado
    }
    if (!pendingToken) return;

    let attempts = 0;
    const waitForPluggyAndInit = () => {
      if (window.PluggyConnect) {
        setIsOpening(true);
        setWidgetOpen();
        const pluggyConnect = new window.PluggyConnect({
          connectToken: pendingToken,
          includeSandbox: false,
          ...(selectedConnectorId != null && { selectedConnectorId }),
          ...(pendingCpf && { openFinanceParameters: { cpf: pendingCpf } }),
          onSuccess: async (data) => {
            setWidgetClosed(); setIsOpening(false);
            if (onSaving) onSaving();
            setTimeout(async () => {
              const success = await saveConnection(data.item.id);
              if (success && onSuccess) onSuccess(data.item.id);
            }, 300);
          },
          onError: (err) => {
            setWidgetClosed(); setIsOpening(false);
            const message = typeof err === 'object' && err && 'message' in err
              ? String((err as any).message) : 'Ocorreu um erro ao conectar.';
            toast({ title: 'Erro na conexão', description: message, variant: 'destructive' });
          },
          onClose: () => { setWidgetClosed(); setIsOpening(false); },
        });
        pluggyConnect.init();
        return;
      }
      attempts++;
      if (attempts < 33) { setTimeout(waitForPluggyAndInit, 300); }
      else { toast({ title: 'Erro', description: 'Widget de conexão não disponível. Recarregue a página.', variant: 'destructive' }); }
    };
    waitForPluggyAndInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback(async () => {
    console.log('handleConnect called, scriptLoaded:', scriptLoaded, 'PluggyConnect:', !!window.PluggyConnect);
    if (!scriptLoaded) { toast({ title: 'Aguarde', description: 'Carregando widget de conexão...' }); return; }
    if (!window.PluggyConnect) {
      console.error('Pluggy Connect not available on window');
      toast({ title: 'Erro', description: 'Widget de conexão não disponível. Recarregue a página.', variant: 'destructive' });
      return;
    }

    setIsOpening(true);

    if (updateItemId) {
      void supabase.rpc('mark_pluggy_reconnection_started' as never, {
        p_item_id: updateItemId,
      } as never);
    }

    const redirectUrl = isMobileSafari ? window.location.href : undefined;

    const tokenResult = await getConnectToken(updateItemId, redirectUrl);
    const connectToken: string | null =
      tokenResult?.connectToken != null && typeof tokenResult.connectToken === 'string'
        ? tokenResult.connectToken : null;
    const cpf = tokenResult?.cpf ?? null;

    console.log('Got connect token:', !!connectToken, '| CPF prefill:', !!cpf);
    if (!connectToken) { setIsOpening(false); return; }

    try {
      console.log('Initializing Pluggy Connect widget...');
      const PluggyConnectCtor = window.PluggyConnect;
      if (!PluggyConnectCtor || typeof PluggyConnectCtor !== 'function') {
        throw new Error('Widget de conexão não disponível. Recarregue a página.');
      }

      // No mobile Safari, salvar token E CPF antes do redirect OAuth do banco
      if (isMobileSafari) {
        const pendingData: PluggyPendingData = { connectToken, cpf };
        localStorage.setItem(PLUGGY_PENDING_KEY, JSON.stringify(pendingData));
      }

      setWidgetOpen();
      const pluggyConnect = new PluggyConnectCtor({
        connectToken,
        includeSandbox: isMobileSafari ? false : import.meta.env.VITE_PLUGGY_SANDBOX === 'true',
        ...(updateItemId && { updateItem: updateItemId }),
        ...(selectedConnectorId != null && { selectedConnectorId }),
        ...(cpf && { openFinanceParameters: { cpf } }),
        onSuccess: async (data) => {
          console.log('Pluggy Connect success:', data);
          setWidgetClosed(); setIsOpening(false);
          if (onSaving) onSaving();
          setTimeout(async () => {
            if (updateItemId) {
              await triggerSync(data.item.id).catch(console.error);
              if (onSuccess) onSuccess(data.item.id);
            } else {
              const success = await saveConnection(data.item.id);
              if (success && onSuccess) onSuccess(data.item.id);
            }
          }, 300);
        },
        onError: (err) => {
          console.error('Pluggy Connect error:', err);
          setWidgetClosed(); setIsOpening(false);
          const message = typeof err === 'object' && err && 'message' in err
            ? String((err as any).message) : 'Ocorreu um erro ao conectar.';
          toast({ title: 'Erro na conexão', description: message, variant: 'destructive' });
        },
        onClose: () => {
          if (!isMobileSafari) { console.log('Pluggy Connect closed'); setWidgetClosed(); setIsOpening(false); }
        },
      });

      console.log('Opening Pluggy Connect widget...');
      await pluggyConnect.init();
    } catch (error) {
      console.error('Error initializing Pluggy Connect:', error);
      setWidgetClosed(); setIsOpening(false);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível abrir o widget de conexão.',
        variant: 'destructive',
      });
    }
  }, [scriptLoaded, getConnectToken, saveConnection, triggerSync, onSuccess, onSaving, updateItemId, selectedConnectorId, toast]);

  const buttonDisabled = isLoading || isOpening || !scriptLoaded;

  return (
    <Button
      type="button"
      data-pluggy-connect-btn
      data-pluggy-reconnect-btn={updateItemId ? 'true' : undefined}
      onClick={handleConnect}
      disabled={buttonDisabled}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading || isOpening ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isOpening ? 'Abrindo...' : 'Conectando...'}</>
      ) : !scriptLoaded ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</>
      ) : (
        <><Link2 className="mr-2 h-4 w-4" />{updateItemId ? 'Reconectar' : 'Conectar Banco'}</>
      )}
    </Button>
  );
};
