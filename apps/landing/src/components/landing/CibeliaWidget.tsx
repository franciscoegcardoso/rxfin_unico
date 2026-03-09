import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createSessionId,
  sendToCibelia,
  type CibeliaMessage,
} from '@/lib/cibeliaChat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WELCOME_MESSAGE: CibeliaMessage = {
  role: 'assistant',
  content: 'Oi! Que bom que você chegou até aqui 😊 Antes de tudo — como posso te chamar?',
};

export const CibeliaWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [messages, setMessages] = useState<CibeliaMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>(createSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ao abrir pela primeira vez: marcar e inserir mensagem inicial local
  useEffect(() => {
    if (isOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
      if (messages.length === 0) {
        setMessages([WELCOME_MESSAGE]);
      }
    }
  }, [isOpen, hasBeenOpened, messages.length]);

  // Auto-scroll para o final quando novas mensagens
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
    } catch (err) {
      toast.error('Não foi possível enviar. Tente novamente.');
      setMessages((prev) => prev.slice(0, -1));
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
    <TooltipProvider>
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-0">
        {/* Painel de chat */}
        {isOpen && (
          <div
            className="fixed bottom-44 right-6 z-50 w-[360px] max-h-[520px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
            style={{ maxHeight: 520 }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight">Cibélia</p>
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

            {/* Área de mensagens */}
            <div
              className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto min-h-0"
              style={{ maxHeight: 520 - 56 - 60 }}
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

            {/* Input fixo no fundo */}
            <div className="flex-shrink-0 border-t border-border flex gap-2 p-3 bg-background">
              <Input
                placeholder="Digite sua mensagem..."
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen((o) => !o)}
              className={cn(
                'relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110',
                isOpen ? 'rotate-0' : ''
              )}
              aria-label={isOpen ? 'Fechar chat' : 'Abrir chat com Cibélia'}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Sparkles className="h-6 w-6" />
              )}
              {/* Badge pulsante: só antes da primeira abertura */}
              {!hasBeenOpened && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 animate-pulse ring-2 ring-background"
                  title="Oi! 👋"
                />
              )}
            </button>
          </TooltipTrigger>
          {!hasBeenOpened && (
            <TooltipContent side="left">
              <p>Oi! 👋</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
