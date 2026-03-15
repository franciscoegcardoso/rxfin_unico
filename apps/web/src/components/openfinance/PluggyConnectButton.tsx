import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Link2 } from 'lucide-react';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { useToast } from '@/hooks/use-toast';

// Pluggy Connect Widget script URL - using versioned URL for stability
const PLUGGY_CONNECT_SCRIPT = 'https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js';

const SESSION_STORAGE_PENDING_TOKEN = 'pluggy_pending_token';

export interface PluggyConnectButtonProps {
  onSuccess?: (itemId?: string) => void;
  onSaving?: () => void;
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
      openFinanceParameters?: { cpf?: string };
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
  onSaving,
  updateItemId,
  variant = 'default',
  size = 'default',
  className,
}) => {
  const { isLoading, getConnectToken, saveConnection } = usePluggyConnect();
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

  // Retomada do fluxo OAuth no Safari iOS após redirect do banco
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthReturn =
      urlParams.has('code') ||
      urlParams.has('oauth_state_id') ||
      urlParams.has('pluggy_oauth');

    if (!hasOAuthReturn) return;

    const pendingToken = localStorage.getItem(SESSION_STORAGE_PENDING_TOKEN);
    if (!pendingToken) return;

    // Limpar imediatamente para evitar re-execução em recargas
    localStorage.removeItem(SESSION_STORAGE_PENDING_TOKEN);
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    let attempts = 0;

    // Aguardar o script da Pluggy carregar (máx 10s) antes de inicializar
    const waitForPluggyAndInit = () => {
      if (window.PluggyConnect) {
        setIsOpening(true);
        setWidgetOpen();

        const pluggyConnect = new window.PluggyConnect({
          connectToken: pendingToken,
          includeSandbox: false,
          onSuccess: async (data) => {
            setWidgetClosed();
            setIsOpening(false);
            if (onSaving) onSaving();
            setTimeout(async () => {
              const success = await saveConnection(data.item.id);
              if (success && onSuccess) onSuccess(data.item.id);
            }, 300);
          },
          onError: (err) => {
            setWidgetClosed();
            setIsOpening(false);
            const message =
              typeof err === 'object' && err && 'message' in err
                ? String((err as any).message)
                : 'Ocorreu um erro ao conectar.';
            toast({ title: 'Erro na conexão', description: message, variant: 'destructive' });
          },
          onClose: () => {
            setWidgetClosed();
            setIsOpening(false);
          },
        });
        pluggyConnect.init();
        return;
      }
      // Script ainda não carregou — tentar de novo em 300ms (máx 10s = ~33 tentativas)
      attempts++;
      if (attempts < 33) {
        setTimeout(waitForPluggyAndInit, 300);
      } else {
        toast({
          title: 'Erro',
          description: 'Widget de conexão não disponível. Recarregue a página.',
          variant: 'destructive',
        });
      }
    };

    waitForPluggyAndInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const redirectUrl = isMobileSafari ? window.location.href : undefined;

    // Get connect token from our edge function (must be JWT string, not boolean)
    const tokenResult = await getConnectToken(updateItemId, redirectUrl);
    const connectToken: string | null =
      tokenResult?.connectToken != null && typeof tokenResult.connectToken === 'string'
        ? tokenResult.connectToken
        : null;
    const cpf = tokenResult?.cpf ?? null;
    console.log('Got connect token:', !!connectToken);

    if (!connectToken) {
      setIsOpening(false);
      return;
    }

    try {
      console.log('Initializing Pluggy Connect widget...');

      const PluggyConnectCtor = window.PluggyConnect;
      if (!PluggyConnectCtor || typeof PluggyConnectCtor !== 'function') {
        throw new Error('Widget de conexão não disponível. Recarregue a página.');
      }

      // No mobile Safari, salvar token antes do redirect OAuth do banco (localStorage: compartilhado entre abas)
      if (isMobileSafari) {
        localStorage.setItem(SESSION_STORAGE_PENDING_TOKEN, connectToken);
      }
      setWidgetOpen();
      const pluggyConnect = new PluggyConnectCtor({
        connectToken,
        includeSandbox: isMobileSafari ? false : import.meta.env.VITE_PLUGGY_SANDBOX === 'true',
        ...(cpf && { openFinanceParameters: { cpf } }),
        onSuccess: async (data) => {
          console.log('Pluggy Connect success:', data);
          setWidgetClosed();
          setIsOpening(false);
          if (onSaving) onSaving();
          setTimeout(async () => {
            const success = await saveConnection(data.item.id);
            if (success && onSuccess) onSuccess(data.item.id);
          }, 300);
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
          if (!isMobileSafari) {
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
