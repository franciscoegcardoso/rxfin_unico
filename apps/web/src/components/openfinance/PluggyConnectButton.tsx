import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Link2 } from 'lucide-react';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { useToast } from '@/hooks/use-toast';

// Pluggy Connect Widget script URL - using versioned URL for stability
const PLUGGY_CONNECT_SCRIPT = 'https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js';

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
    
    // Get connect token from our edge function (must be JWT string, not boolean)
    const tokenResult = await getConnectToken(updateItemId);
    const connectToken: string | null =
      tokenResult?.connectToken != null && typeof tokenResult.connectToken === 'string'
        ? tokenResult.connectToken
        : null;
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

      setWidgetOpen();

      const pluggyConnect = new PluggyConnectCtor({
        connectToken,
        includeSandbox: import.meta.env.VITE_PLUGGY_SANDBOX === 'true',
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
          console.log('Pluggy Connect closed');
          setWidgetClosed();
          setIsOpening(false);
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
