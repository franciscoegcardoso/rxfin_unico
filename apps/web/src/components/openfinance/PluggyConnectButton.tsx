import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Link2 } from 'lucide-react';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { useToast } from '@/hooks/use-toast';

// Pluggy Connect Widget script URL - using versioned URL for stability
const PLUGGY_CONNECT_SCRIPT = 'https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js';

const SESSION_STORAGE_PENDING_TOKEN = 'pluggy_pending_token';

/** Detecta Safari iOS (não Chrome/Firefox/Opera no iOS) para usar redirect flow em vez de popup. */
function isMobileSafari(): boolean {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
}

export interface PluggyConnectButtonProps {
  onSuccess?: () => void;
  updateItemId?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

declare global {
  interface Window {
    PluggyConnect?: new (options: {
      connectToken: string;
      includeSandbox?: boolean;
      onSuccess: (data: { item: { id: string } }) => void;
      onError: (error: { message?: string } | unknown) => void;
      onClose: () => void;
    }) => { init: () => void | Promise<void> };
    __pluggyWidgetOpen?: boolean;
  }
}

/** Signal that the Pluggy widget is open (used by failsafe to skip checks). */
function setWidgetOpen() {
  window.__pluggyWidgetOpen = true;
}

/** Signal that the Pluggy widget has closed. */
function setWidgetClosed() {
  window.__pluggyWidgetOpen = false;
}

export const PluggyConnectButton: React.FC<PluggyConnectButtonProps> = ({
  onSuccess,
  updateItemId,
  variant = 'default',
  size = 'default',
  className,
}) => {
  const { isLoading, getConnectToken, saveConnection } = usePluggyConnect();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const scriptLoadedRef = useRef(false);
  const hasHandledOAuthReturnRef = useRef(false);
  const { toast } = useToast();

  // Retorno OAuth (mobile Safari): URL contém code ou oauth_state_id e temos token em sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCode = urlParams.get('code') ?? urlParams.get('oauth_state_id');
    const pendingToken =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_PENDING_TOKEN) : null;
    if (!oauthCode || !pendingToken || hasHandledOAuthReturnRef.current) return;

    const cleanup = () => {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_PENDING_TOKEN);
      } catch {}
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('oauth_state_id');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.pathname + url.search);
      hasHandledOAuthReturnRef.current = true;
    };

    if (!scriptLoadedRef.current || !window.PluggyConnect) return;

    hasHandledOAuthReturnRef.current = true;
    setWidgetOpen();
    const PluggyConnectCtor = window.PluggyConnect;
    const pluggyConnect = new PluggyConnectCtor({
      connectToken: pendingToken,
      includeSandbox: import.meta.env.VITE_PLUGGY_SANDBOX === 'true',
      onSuccess: async (data: { item: { id: string } }) => {
        setWidgetClosed();
        const success = await saveConnection(data.item.id);
        if (success && onSuccess) onSuccess();
        cleanup();
      },
      onError: () => {
        setWidgetClosed();
        toast({
          title: 'Erro na conexão',
          description: 'Ocorreu um erro ao concluir a conexão.',
          variant: 'destructive',
        });
        cleanup();
      },
      onClose: () => {
        setWidgetClosed();
        cleanup();
      },
    });
    pluggyConnect.init();
  }, [scriptLoaded, saveConnection, onSuccess, toast]);

  useEffect(() => {
    // Load Pluggy Connect script
    if (scriptLoadedRef.current) {
      setScriptLoaded(true);
      return;
    }

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
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o widget de conexão.',
        variant: 'destructive',
      });
    };
    document.body.appendChild(script);

    return () => {
      setWidgetClosed();
    };
  }, [toast]);

  const handleConnect = useCallback(async () => {
    console.log('handleConnect called, scriptLoaded:', scriptLoaded, 'PluggyConnect:', !!window.PluggyConnect);
    
    if (!scriptLoaded) {
      toast({
        title: 'Aguarde',
        description: 'Carregando widget de conexão...',
      });
      return;
    }

    if (!window.PluggyConnect) {
      console.error('Pluggy Connect not available on window');
      toast({
        title: 'Erro',
        description: 'Widget de conexão não disponível. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }

    setIsOpening(true);

    const mobileSafari = isMobileSafari();
    const redirectUrl = mobileSafari ? window.location.href : undefined;

    // Get connect token from our edge function (must be JWT string, not boolean)
    const tokenResult = await getConnectToken(updateItemId, redirectUrl);
    const connectToken: string | null =
      tokenResult?.connectToken != null && typeof tokenResult.connectToken === 'string'
        ? tokenResult.connectToken
        : null;
    console.log('Got connect token:', !!connectToken);

    if (!connectToken) {
      setIsOpening(false);
      return;
    }

    // Mobile Safari redirect flow: salvar token para recuperar ao voltar do banco
    if (mobileSafari) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_PENDING_TOKEN, connectToken);
      } catch {}
    }

    try {
      console.log('Initializing Pluggy Connect widget...');

      const PluggyConnectCtor = window.PluggyConnect;
      if (!PluggyConnectCtor || typeof PluggyConnectCtor !== 'function') {
        throw new Error('Widget de conexão não disponível. Recarregue a página.');
      }

      setWidgetOpen();

      const pluggyConnect = new PluggyConnectCtor({
        connectToken,
        includeSandbox: mobileSafari ? false : import.meta.env.VITE_PLUGGY_SANDBOX === 'true',
        onSuccess: async (data) => {
          console.log('Pluggy Connect success:', data);
          setWidgetClosed();
          setIsOpening(false);
          const success = await saveConnection(data.item.id);
          if (success && onSuccess) onSuccess();
        },
        onError: (err) => {
          console.error('Pluggy Connect error:', err);
          setWidgetClosed();
          setIsOpening(false);
          const message =
            typeof err === 'object' && err && 'message' in err
              ? String((err as any).message)
              : 'Ocorreu um erro ao conectar.';
          toast({
            title: 'Erro na conexão',
            description: message,
            variant: 'destructive',
          });
        },
        onClose: () => {
          if (!mobileSafari) {
            console.log('Pluggy Connect closed');
            setWidgetClosed();
            setIsOpening(false);
          }
        },
      });

      console.log('Opening Pluggy Connect widget...');
      await pluggyConnect.init();
    } catch (error) {
      console.error('Error initializing Pluggy Connect:', error);
      setWidgetClosed();
      setIsOpening(false);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível abrir o widget de conexão.',
        variant: 'destructive',
      });
    }
  }, [scriptLoaded, getConnectToken, saveConnection, onSuccess, updateItemId, toast]);

  const buttonDisabled = isLoading || isOpening || !scriptLoaded;

  return (
    <Button
      type="button"
      data-pluggy-connect-btn
      onClick={handleConnect}
      disabled={buttonDisabled}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading || isOpening ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isOpening ? 'Abrindo...' : 'Conectando...'}
        </>
      ) : !scriptLoaded ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando...
        </>
      ) : (
        <>
          <Link2 className="mr-2 h-4 w-4" />
          {updateItemId ? 'Reconectar' : 'Conectar Banco'}
        </>
      )}
    </Button>
  );
};
// sync
