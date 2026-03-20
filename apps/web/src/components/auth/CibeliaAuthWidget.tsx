import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import cibeliaImg from '@/assets/cibelia.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CibeliaMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QuickReply {
  label: string;
  value: string;
}

const INITIAL_QUICK_REPLIES: QuickReply[] = [
  { label: 'Esqueci minha senha', value: 'Esqueci minha senha' },
  { label: 'Não consigo entrar', value: 'Não consigo entrar' },
  { label: 'Outro problema', value: 'Tenho outro problema de acesso' },
];

const WELCOME_MESSAGE: CibeliaMessage = {
  role: 'assistant',
  content: 'Oi! Sou a Cibélia 😊 Como posso te ajudar aqui na entrada?',
};

function isAbortLikeError(err: unknown): boolean {
  if (err == null) return false;
  if (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'AbortError') {
    return true;
  }
  const msg = String((err as { message?: string })?.message ?? err ?? '').toLowerCase();
  return msg.includes('abort') || msg.includes('aborted');
}

// Extrai quick replies da resposta do assistente (formato "👉 [ Op1 ] [ Op2 ]")
function extractQuickReplies(content: string): QuickReply[] {
  const match = content.match(/👉\s*((?:\[[^\]]+\]\s*)+)/);
  if (!match) return [];
  const options = [...match[1].matchAll(/\[([^\]]+)\]/g)];
  return options.map((m) => ({ label: m[1].trim(), value: m[1].trim() }));
}

// Remove a linha de quick replies do texto visível da mensagem
function stripQuickRepliesLine(content: string): string {
  return content.replace(/\n?👉\s*(?:\[[^\]]+\]\s*)+/g, '').trim();
}

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 28000);
  try {
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
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }
    const data = (await response.json()) as { content?: string; session_id?: string | null };
    const serverSessionId = data.session_id;
    if (serverSessionId) {
      supabase.rpc('update_chat_session_source', {
        p_session_id: serverSessionId,
        p_source_page: window.location.pathname,
        p_session_type: window.location.pathname === '/cibelia' ? 'standalone' : 'widget',
      }).then(() => {}).catch(() => {});
    }
    return data.content as string;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const CibeliaAuthWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [messages, setMessages] = useState<CibeliaMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(INITIAL_QUICK_REPLIES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>(createSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
      if (messages.length === 0) {
        setMessages([WELCOME_MESSAGE]);
        // Mantém os quick replies iniciais ao abrir
      }
    }
  }, [isOpen, hasBeenOpened, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, quickReplies]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: CibeliaMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setQuickReplies([]); // limpa quick replies ao enviar
    setIsLoading(true);

    try {
      const history = [...messages, userMessage];
      const content = await sendToCibelia(history, sessionIdRef.current);

      // Extrai quick replies da resposta antes de exibir
      const extracted = extractQuickReplies(content);
      const displayContent = stripQuickRepliesLine(content);

      setMessages((prev) => [...prev, { role: 'assistant', content: displayContent }]);
      if (extracted.length > 0) {
        setQuickReplies(extracted);
      }
    } catch (err: unknown) {
      const fallbackMsg = isAbortLikeError(err)
        ? 'Estou demorando mais que o normal para responder. Tente novamente em alguns instantes — seus dados estão seguros.'
        : 'Encontrei uma instabilidade técnica agora. Tente novamente em alguns segundos.';
      setMessages((prev) => [...prev, { role: 'assistant', content: fallbackMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (value: string) => {
    setQuickReplies([]);
    handleSend(value);
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
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between gap-2 p-3 bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                <img src={cibeliaImg} alt="Cibélia" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[13px] leading-tight">Cibélia</p>
                <p className="text-[11px] text-white/70 leading-tight flex items-center gap-1.5">
                  Sua assistente RXfin
                  <span className="inline-flex items-center gap-1 shrink-0" title="Responde na hora">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" aria-hidden />
                    <span>Online</span>
                  </span>
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

          {/* Mensagens */}
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

            {/* Loading dots */}
            {isLoading && (
              <div className="flex mr-auto">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-muted text-foreground flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {/* Quick Replies */}
            {quickReplies.length > 0 && !isLoading && (
              <div className="flex flex-col gap-1.5 mt-1 mr-auto w-full max-w-[85%]">
                {quickReplies.map((qr) => (
                  <button
                    key={qr.value}
                    type="button"
                    onClick={() => handleQuickReply(qr.value)}
                    className="text-left text-sm px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted active:scale-[0.98] transition-all text-foreground"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-border flex gap-2 p-3 bg-background">
            <Input
              placeholder="Ou escreva sua dúvida..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Limpa quick replies se o usuário começa a digitar manualmente
                if (quickReplies.length > 0) setQuickReplies([]);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="border-0 focus-visible:ring-0 flex-1 min-w-0"
            />
            <Button
              size="icon"
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => handleSend()}
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
