import { useState, useEffect, useRef, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Send, ThumbsDown, AlertTriangle, RefreshCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAIOnboarding } from '@/hooks/useAIOnboarding';
import { useAIModel } from '@/hooks/useAIModel';
import { RaioXResultCard } from './RaioXResultCard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import cibeliaAvatar from '@/assets/cibelia.png';

// Global event to open Cibelia chat from anywhere
export const openCibeliaChat = () => {
  window.dispatchEvent(new CustomEvent('open-cibelia-chat'));
};

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  reported?: boolean;
  raioXData?: {
    formato: 'concentracao' | 'top_ofensor' | 'frequencia' | 'sem_dados';
    dados: any;
  };
}

export function RaioXChat() {
  const { user } = useAuth();
  const { shouldStartAIOnboarding } = useAIOnboarding();
  const { model } = useAIModel();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Listen for global open event (from MoreMenuSheet)
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-cibelia-chat', handler);
    return () => window.removeEventListener('open-cibelia-chat', handler);
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tokenWarning, setTokenWarning] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<Message | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Auto-open for onboarding
  useEffect(() => {
    if (shouldStartAIOnboarding && !hasInitialized.current) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        hasInitialized.current = true;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [shouldStartAIOnboarding]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createSession = useCallback(async () => {
    if (!user?.id || sessionId) return sessionId;

    // Check onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    const sessionType = profile?.onboarding_completed ? 'consulta' : 'onboarding';

    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: user.id,
        session_type: sessionType,
        model_used: model.id,
        status: 'active',
        token_limit: model.tokenLimit,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create session:', error);
      return null;
    }

    setSessionId(data.id);
    return data.id;
  }, [user?.id, sessionId]);

  // Send onboarding greeting when chat opens for first time
  useEffect(() => {
    if (isOpen && shouldStartAIOnboarding && messages.length === 0 && user?.id) {
      const greet = async () => {
        const sid = await createSession();
        if (!sid) return;

        const greeting =
          'Olá! Eu sou a Cibelia, sua assistente pessoal dentro do RXFin 💼✨ Estou aqui para te ajudar a entender melhor suas finanças. Para começar, me conta: qual foi o seu maior gasto nos últimos 7 dias?';

        const { data: saved } = await supabase
          .from('ai_chat_messages')
          .insert({
            session_id: sid,
            user_id: user.id,
            role: 'assistant',
            content: greeting,
          })
          .select('id')
          .single();

        setMessages([{ id: saved?.id, role: 'assistant', content: greeting }]);
      };
      greet();
    }
  }, [isOpen, shouldStartAIOnboarding, messages.length, user?.id]);

  const sendMessage = async (text?: string) => {
    const msg = text || inputValue.trim();
    if (!msg || !user?.id) return;

    setInputValue('');
    setLastFailedMessage(null);
    const sid = sessionId || (await createSession());
    if (!sid) return;

    // Save user message
    const { data: savedUser } = await supabase
      .from('ai_chat_messages')
      .insert({ session_id: sid, user_id: user.id, role: 'user', content: msg })
      .select('id')
      .single();

    const userMsg: Message = { id: savedUser?.id, role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Call n8n webhook (or fallback — right now just simulate since n8n isn't configured yet)
      const webhookUrl = 'https://rxfin.app.n8n.cloud/webhook/rxfin-ai';

      let assistantContent = '';
      let raioXData: Message['raioXData'] = undefined;
      let tokensFromResponse = 0;

      if (webhookUrl) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const { data: { session } } = await supabase.auth.getSession();

        const secretValue = import.meta.env.VITE_RXFIN_WEBHOOK_SECRET || import.meta.env.VITE_WEBHOOK_SECRET || 'bru4qyw1CXK@ctu6cbe';
        console.log('Enviando Header X-RXFin-Secret com o valor:', secretValue);

        console.log('WEBHOOK DEBUG:', {
          url: webhookUrl,
          secret: secretValue,
          headers: { 'X-RXFin-Secret': secretValue }
        });

        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RXFin-Secret': secretValue,
          },
          body: JSON.stringify({
            user_id: user.id,
            session_id: sid,
            message: msg,
            user_token: session?.access_token,
            model: model.id,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const errorBody = await res.text().catch(() => 'Sem corpo de resposta');
          console.error(`Webhook falhou: status=${res.status}, body=${errorBody}`);
          alert(`Erro no Webhook: Status ${res.status}\n${errorBody}`);
          throw new Error(`Webhook error: ${res.status}`);
        }

        const json = await res.json();
        assistantContent = json.response || 'Sem resposta.';
        tokensFromResponse = json.tokens_used || 0;

        if (json.formato_raio_x && json.dados_raio_x) {
          raioXData = { formato: json.formato_raio_x, dados: json.dados_raio_x };
        }
      } else {
        // Fallback when n8n is not configured
        assistantContent =
          'O assistente Raio-X ainda está sendo configurado. Em breve você poderá conversar comigo sobre suas finanças! 🚀';
      }

      // Save assistant message with tokens and model
      const { data: savedAssistant } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sid,
          user_id: user.id,
          role: 'assistant',
          content: assistantContent,
          tokens_used: tokensFromResponse,
          model_used: model.id,
        })
        .select('id')
        .single();

      const assistantMsg: Message = {
        id: savedAssistant?.id,
        role: 'assistant',
        content: assistantContent,
        raioXData,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update session totals (messages + tokens)
      const { data: sess } = await supabase
        .from('ai_chat_sessions')
        .select('total_tokens, token_limit')
        .eq('id', sid)
        .single();

      const newTotalTokens = (sess?.total_tokens || 0) + tokensFromResponse;

      await supabase
        .from('ai_chat_sessions')
        .update({
          total_messages: messages.length + 2,
          total_tokens: newTotalTokens,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sid);

      // Check token limit (80% threshold)
      if (sess && newTotalTokens > sess.token_limit * 0.8) {
        setTokenWarning(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setLastFailedMessage(msg);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Estou com dificuldades técnicas agora. Tente novamente em alguns instantes.',
          },
        ]);
      } else {
        setLastFailedMessage(msg);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Estou com dificuldades técnicas agora. Tente novamente em alguns instantes.',
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackMessage?.id || !user?.id || !sessionId) return;

    await supabase.from('ai_feedback').insert({
      user_id: user.id,
      feedback_type: 'incorrect',
      message_id: feedbackMessage.id,
      session_id: sessionId,
      user_comment: feedbackComment || null,
      status: 'pending',
    });

    setMessages((prev) =>
      prev.map((m) => (m.id === feedbackMessage.id ? { ...m, reported: true } : m))
    );

    toast.success('Obrigado! Nossa equipe vai revisar essa resposta em até 48h.');
    setFeedbackMessage(null);
    setFeedbackComment('');
  };

  const registerEvent = async (evento: string) => {
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', user.id)
      .single();

    const daysSince = profile?.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
      : 0;

    await supabase.from('ai_onboarding_events').insert({
      user_id: user.id,
      event_type: evento,
      session_id: sessionId,
      days_since_signup: daysSince,
      metadata: { formato: 'from_chat' },
    });
  };

  return (
    <>
      {/* Floating button — Cibelia avatar (desktop only) */}
      {!isMobile && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen(true)}
              className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-lg border-2 border-primary overflow-hidden hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              style={{ backgroundColor: '#0e7051' }}
            >
              <img src={cibeliaAvatar} alt="Cibelia — Assistente IA" className="h-full w-full object-cover" />
            </button>
          </TooltipTrigger>
          {shouldStartAIOnboarding && (
            <TooltipContent side="left">Olá! Sou a Cibelia, sua assistente pessoal 💼</TooltipContent>
          )}
        </Tooltip>
      )}

      {/* Chat Panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-4 border-b flex-row items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-border shrink-0" style={{ backgroundColor: '#0e7051' }}>
              <img src={cibeliaAvatar} alt="Cibelia" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Cibelia</SheetTitle>
              <span className="text-xs text-muted-foreground">Sua assistente pessoal • {model.label}</span>
            </div>
            <Badge variant="secondary" className="text-xs">IA</Badge>
          </SheetHeader>

          {/* Token warning */}
          {tokenWarning && (
            <div className="mx-4 mt-2 p-2 bg-warning/10 border border-warning/30 rounded-md text-xs text-warning flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Você está próximo do limite de processamento desta sessão
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
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
                      'rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {msg.content}
                  </div>

                  {/* Raio-X result card */}
                  {msg.raioXData && (
                    <div className="mt-2 w-full">
                      <RaioXResultCard
                        formato={msg.raioXData.formato}
                        dados={msg.raioXData.dados}
                        onRegisterEvent={registerEvent}
                      />
                    </div>
                  )}

                  {/* Report button for assistant messages */}
                  {msg.role === 'assistant' && msg.id && (
                    <button
                      onClick={() => setFeedbackMessage(msg)}
                      className={cn(
                        'mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors',
                        msg.reported && 'text-warning'
                      )}
                    >
                      {msg.reported ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <ThumbsDown className="h-3 w-3" />
                      )}
                      {msg.reported ? 'Reportado' : 'Reportar erro'}
                    </button>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando...
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Retry button */}
          {lastFailedMessage && (
            <div className="px-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => sendMessage(lastFailedMessage)}
              >
                <RefreshCcw className="h-3 w-3 mr-2" /> Tentar novamente
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t flex gap-2">
            <Input
              placeholder="Pergunte sobre suas finanças..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
            />
            <Button size="icon" onClick={() => sendMessage()} disabled={isLoading || !inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Feedback Dialog */}
      <AlertDialog open={!!feedbackMessage} onOpenChange={() => setFeedbackMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reportar resposta incorreta</AlertDialogTitle>
            <AlertDialogDescription>
              Sua resposta será revisada pela nossa equipe em até 48 horas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Descreva o que está errado (opcional)"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={submitFeedback}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
