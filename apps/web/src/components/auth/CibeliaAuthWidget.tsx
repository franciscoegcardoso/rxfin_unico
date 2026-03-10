import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import cibeliaImg from '@/assets/cibelia.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CibeliaMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE: CibeliaMessage = {
  role: 'assistant',
  content:
    'Oi! Sou a Cibélia 😊 Posso te ajudar aqui na entrada. Com o que você precisa?',
};

const ERROR_MESSAGE: CibeliaMessage = {
  role: 'assistant',
  content: 'Ops, tive um probleminha. Tenta de novo daqui a pouco? 🙏',
};

function createSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

async function sendToCibelia(
  messages: CibeliaMessage[],
  sessionId: string
): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      messages,
      session_id: sessionId,
      page_context: {
        phase: 'access',
        path: typeof window !== 'undefined' ? window.location.pathname : '/',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status}`);
  }

  const data = await response.json();
  return data.content as string;
}

export const CibeliaAuthWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [messages, setMessages] = useState<CibeliaMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>(createSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
      if (messages.length === 0) {
        setMessages([WELCOME_MESSAGE]);
      }
    }
  }, [isOpen, hasBeenOpened, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: CibeliaMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMessage];
      const content = await sendToCibelia(history, sessionIdRef.current);
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch {
      setMessages((prev) => [...prev, ERROR_MESSAGE]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Painel aberto */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-24 z-50 flex flex-col max-h-[480px] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden',
            'w-[calc(100vw-24px)] right-3 sm:w-[340px] sm:right-6'
          )}
        >
          <div className="flex-shrink-0 flex items-center justify-between gap-2 p-3 bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                <img src={cibeliaImg} alt="Cibélia" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[13px] leading-tight">Cibélia</p>
                <p className="text-[11px] text-white/70 leading-tight">
                  Assistente RXFin
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-white hover:bg-white/20 rounded-full"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div
            className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto min-h-0"
            style={{ maxHeight: 480 - 56 - 60 }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex flex-col max-w-[85%]',
                  msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div
                  className={cn(
                    'px-3.5 py-2.5 text-sm rounded-2xl',
                    msg.role === 'assistant'
                      ? 'bg-muted text-foreground rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex mr-auto">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-muted text-foreground flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex-shrink-0 border-t border-border flex gap-2 p-3 bg-background">
            <Input
              placeholder="Como posso ajudar?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="border-0 focus-visible:ring-0 flex-1 min-w-0"
            />
            <Button
              size="icon"
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 h-[52px] w-[52px] rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110"
        aria-label={isOpen ? 'Fechar chat' : 'Abrir chat com Cibélia'}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <img src={cibeliaImg} alt="Cibélia" className="h-8 w-8 rounded-full object-cover" />
        )}
        {!hasBeenOpened && (
          <span
            className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 animate-pulse ring-2 ring-background"
            aria-hidden
          />
        )}
      </button>
    </>
  );
};
