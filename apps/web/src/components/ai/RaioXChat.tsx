import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Send, ThumbsUp, ThumbsDown, AlertTriangle, RefreshCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { useAIOnboarding } from '@/hooks/useAIOnboarding';
import { useLocation } from 'react-router-dom';
import { getPageContext, createClientSessionId, buildAiChatBody } from '@/lib/aiChat';
import { useAIModel } from '@/hooks/useAIModel';
import { RaioXResultCard } from './RaioXResultCard';
import { CibeliaStructuredMessage, parseCTAOptions, CibeliaOptionButtons } from '@/components/cibelia/CibeliaStructuredMessage';
import { parseCibeliaResponse } from '@/lib/parseCibeliaResponse';
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
  /** Mensagem local de boas-vindas (não vem do backend, sem feedback 👍/👎) */
  isWelcome?: boolean;
  /** Fase retornada pela Edge Function ai-chat (financial | sales | access | onboarding) */
  phase?: string;
  /** true = content é JSON estruturado (fase financial) */
  structured?: boolean;
  raioXData?: {
    formato: 'concentracao' | 'top_ofensor' | 'frequencia' | 'sem_dados';
    dados: any;
  };
}

const getWelcomeMessage = (firstName: string): Message => ({
  role: 'assistant',
  content: `Olá, ${firstName}! 😊\nComo eu posso te ajudar hoje?`,
  isWelcome: true,
});

/** Quick replies iniciais para evitar dupla saudação (usuário não precisa digitar "oi"). */
const INITIAL_QUICK_REPLIES = ['Meus gastos', 'Cartão', 'Metas', 'Simuladores'];

export function RaioXChat() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { shouldStartAIOnboarding } = useAIOnboarding();
  const { model } = useAIModel();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const clientSessionIdRef = useRef<string | null>(null);

  // Listen for global open event (from MoreMenuSheet)
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-cibelia-chat', handler);
    return () => window.removeEventListener('open-cibelia-chat', handler);
  }, []);

  // session_id estável por sessão de chat (UUID no cliente), gerado ao abrir o chat
  useEffect(() => {
    if (isOpen && !clientSessionIdRef.current) {
      clientSessionIdRef.current = createClientSessionId();
    }
  }, [isOpen]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Nome do usuário para a mensagem de boas-vindas (só carrega quando o chat abre)
  const { data: profile } = useQuery({
    queryKey: ['profile-name', user?.id, isOpen],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      return data as { full_name: string | null } | null;
    },
    enabled: isOpen && !!user?.id,
  });
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || (user?.user_metadata?.full_name as string)?.trim().split(/\s+/)[0] || 'você';
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tokenWarning, setTokenWarning] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<Message | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Map<number, 'helpful' | 'incorrect'>>(new Map());
  const [feedbackLoading, setFeedbackLoading] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);
  const hasRegisteredOnboardingRef = useRef(false);
  /** No mobile: padding-bottom aplicado ao Sheet quando o teclado virtual está aberto, para manter o campo de digitação visível. */
  const [keyboardPaddingBottom, setKeyboardPaddingBottom] = useState(0);

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

  // Register onboarding_started event once per session
  useEffect(() => {
    if (!user?.id || !sessionId || hasRegisteredOnboardingRef.current) return;
    hasRegisteredOnboardingRef.current = true;

    supabase.from('ai_onboarding_events').insert({
      user_id: user.id,
      session_id: sessionId,
      event_type: 'onboarding_started',
      metadata: { source: 'raio_x_chat', timestamp: new Date().toISOString() },
    });
  }, [user?.id, sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ao fechar o chat, reseta mensagens para que ao reabrir apareça de novo a boas-vindas
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setKeyboardPaddingBottom(0);
    }
  }, [isOpen]);

  // Mobile: manter campo de digitação visível quando o teclado virtual abre (visualViewport)
  useEffect(() => {
    if (!isOpen || !isMobile || typeof window === 'undefined' || !window.visualViewport) return;
    const updatePadding = () => {
      const heightDiff = window.innerHeight - window.visualViewport.height;
      setKeyboardPaddingBottom(heightDiff > 80 ? heightDiff : 0);
    };
    updatePadding();
    window.visualViewport.addEventListener('resize', updatePadding);
    window.visualViewport.addEventListener('scroll', updatePadding);
    return () => {
      window.visualViewport.removeEventListener('resize', updatePadding);
      window.visualViewport.removeEventListener('scroll', updatePadding);
    };
  }, [isOpen, isMobile]);

  // Mensagem de boas-vindas local (apenas visual, não enviada ao backend) quando não está em onboarding
  useEffect(() => {
    if (!isOpen || shouldStartAIOnboarding) return;
    if (messages.length === 0 && firstName) {
      setMessages([getWelcomeMessage(firstName)]);
    } else if (messages.length === 1 && messages[0].isWelcome && firstName) {
      setMessages([getWelcomeMessage(firstName)]);
    }
  }, [isOpen, shouldStartAIOnboarding, firstName, messages.length]);

  const createSession = useCallback(async (): Promise<{ sessionId: string; onboardingCompleted: boolean } | null> => {
    if (!user?.id) return null;
    if (sessionId) {
      return { sessionId, onboardingCompleted: onboardingCompleted ?? false };
    }

    // Check onboarding status (source of truth: get_user_profile_settings / onboarding_state)
    const { data: settings } = await supabase.rpc('get_user_profile_settings');
    const profile = (settings as { profile?: { onboarding_completed?: boolean | null } | null })?.profile;
    const completed = profile?.onboarding_completed ?? false;
    setOnboardingCompleted(completed);

    const sessionType = completed ? 'consulta' : 'onboarding';

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

    const newSessionId = data.id;
    setSessionId(newSessionId);

    // Register onboarding_started event (idempotent — only if not already registered)
    try {
      const { count } = await supabase
        .from('ai_onboarding_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('event_type', 'onboarding_started');

      if ((count ?? 0) === 0) {
        const daysSinceSignup = profile?.created_at
          ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
          : 0;

        await supabase.from('ai_onboarding_events').insert({
          user_id: user.id,
          session_id: newSessionId,
          event_type: 'onboarding_started',
          days_since_signup: daysSinceSignup,
          metadata: { triggered_from: 'session_creation' },
        });
      }
    } catch (e) {
      console.error('Failed to register onboarding_started:', e);
    }

    return { sessionId: newSessionId, onboardingCompleted: completed };
  }, [user?.id, sessionId, onboardingCompleted]);

  // Send onboarding greeting when chat opens for first time
  useEffect(() => {
    if (isOpen && shouldStartAIOnboarding && messages.length === 0 && user?.id) {
      const greet = async () => {
        const result = await createSession();
        if (!result) return;
        const sid = result.sessionId;

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
    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Sessão expirada. Faça login novamente.');
      setIsLoading(false);
      return;
    }

    const result = await createSession();
    if (!result) {
      setIsLoading(false);
      return;
    }
    const sid = result.sessionId;
    const completed = result.onboardingCompleted;

    // Save user message
    const { data: savedUser } = await supabase
      .from('ai_chat_messages')
      .insert({ session_id: sid, user_id: user.id, role: 'user', content: msg })
      .select('id')
      .single();

    const userMsg: Message = { id: savedUser?.id, role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Histórico para a API: só mensagens reais (exclui boas-vindas local)
      const apiMessages = messages.filter(m => m.role === 'user' || (m.role === 'assistant' && m.id != null));
      const conversationHistory = [
        ...apiMessages.slice(-9).map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: msg },
      ];

      let assistantContent = '';
      let raioXData: Message['raioXData'] = undefined;
      let tokensFromResponse = 0;

      if (!clientSessionIdRef.current) {
        clientSessionIdRef.current = createClientSessionId();
      }
      const pageContext = getPageContext(pathname, true, completed);
      const body = buildAiChatBody({
        messages: conversationHistory,
        clientSessionId: clientSessionIdRef.current,
        pageContext,
      });

      const { data, error: fnError } = await supabase.functions.invoke('ai-chat', {
        body,
      });

      if (fnError) {
        const status = (fnError as any)?.status;
        if (status === 429) {
          toast.error('Você atingiu o limite de perguntas. Tente novamente em alguns minutos.');
          throw new Error('rate_limit');
        }
        if (status === 401) {
          toast.error('Sessão expirada. Faça login novamente.');
          throw new Error('unauthorized');
        }
        // Extrai mensagem do body da resposta quando a Edge Function retorna non-2xx
        let userMessage =
          'A Cibélia está temporariamente indisponível. Use «Tentar novamente» em alguns instantes.';
        if (fnError instanceof FunctionsHttpError && fnError.context && typeof (fnError.context as Response).json === 'function') {
          try {
            const resBody = await (fnError.context as Response).json();
            if (typeof resBody?.error === 'string' && resBody.error.trim()) {
              userMessage = resBody.error;
            } else if (typeof resBody?.message === 'string' && resBody.message.trim()) {
              userMessage = resBody.message;
            }
          } catch {
            // mantém userMessage padrão
          }
        }
        setLastFailedMessage(msg);
        toast.error(userMessage);
        return;
      }

      if (data?.code === 'MISSING_AUTH' || data?.code === 'INVALID_TOKEN') {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }
      if (data?.code === 'RATE_LIMIT') {
        toast.error('Muitas mensagens. Aguarde alguns segundos.');
        return;
      }
      if (data?.error && !data?.content) {
        toast.error(data.error || 'Erro ao conectar com a Cibélia. Tente novamente.');
        return;
      }

      const rawContent = (data?.content ?? '').trim();
      const noResponsePlaceholders = ['Sem retorno', 'Sem resposta', 'Sem resposta.'];
      const isPlaceholder = !rawContent || noResponsePlaceholders.includes(rawContent);
      assistantContent = isPlaceholder
        ? 'Não recebi uma resposta desta vez. Use «Tentar novamente» abaixo para reenviar sua mensagem.'
        : rawContent;
      if (isPlaceholder) {
        setLastFailedMessage(msg);
      }
      tokensFromResponse = data?.tokens_used || 0;

      if (data?.formato_raio_x && data?.dados_raio_x) {
        raioXData = { formato: data.formato_raio_x, dados: data.dados_raio_x };
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
          model_used: data?.model || model.id,
        })
        .select('id')
        .single();

      const assistantMsg: Message = {
        id: savedAssistant?.id,
        role: 'assistant',
        content: assistantContent,
        phase: data?.phase,
        structured: data?.structured ?? false,
        raioXData,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update session totals — always SET real counted values (never increment)
      const { count: realMessageCount } = await supabase
        .from('ai_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sid);

      const { data: tokenRows } = await supabase
        .from('ai_chat_messages')
        .select('tokens_used')
        .eq('session_id', sid);

      const realTotalTokens = tokenRows?.reduce((sum, m) => sum + (m.tokens_used || 0), 0) || 0;

      await supabase
        .from('ai_chat_sessions')
        .update({
          total_messages: realMessageCount || 0,
          total_tokens: realTotalTokens,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sid);

      // Check token limit (80% threshold)
      const { data: sess } = await supabase
        .from('ai_chat_sessions')
        .select('token_limit')
        .eq('id', sid)
        .single();

      if (sess && realTotalTokens > sess.token_limit * 0.8) {
        setTokenWarning(true);
      }
    } catch (err: any) {
      if (err.message !== 'rate_limit' && err.message !== 'unauthorized') {
        setLastFailedMessage(msg);
        toast.error(err?.message || 'Erro ao conectar com a Cibélia. Tente novamente.');
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

    // Dedup: skip if same event was registered in last 60 seconds
    const sixtySecsAgo = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabase
      .from('ai_onboarding_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .eq('event_type', evento)
      .gte('created_at', sixtySecsAgo);

    if ((count ?? 0) > 0) return;

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

  const handleFeedback = async (messageIndex: number, rating: 'helpful' | 'incorrect') => {
    if (feedbackMap.has(messageIndex)) return;
    if (feedbackLoading.has(messageIndex)) return;

    setFeedbackLoading((prev) => new Set([...prev, messageIndex]));

    try {
      const phase = getPageContext(pathname, true, onboardingCompleted ?? false).phase;
      const { error } = await supabase.rpc('save_cibelia_feedback', {
        p_rating: rating,
        p_session_id: clientSessionIdRef.current,
        p_message_index: messageIndex,
        p_phase: phase,
      });

      if (!error) {
        setFeedbackMap((prev) => new Map(prev).set(messageIndex, rating));
      }
    } catch (err) {
      console.warn('[RaioXChat] feedback error:', err);
    } finally {
      setFeedbackLoading((prev) => {
        const next = new Set(prev);
        next.delete(messageIndex);
        return next;
      });
    }
  };

  // Evitar duplicata no mobile: só exibir botão flutuante quando logado (em auth pages só CibeliaAuthWidget)
  if (!user) return null;

  return (
    <>
      {/* Floating button — Cibélia (benchmark: CibeliaWidget da landing) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed right-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isMobile ? 'bottom-20 z-40' : 'bottom-6 z-50',
              'h-16 w-16 sm:h-[72px] sm:w-[72px]'
            )}
            style={{ backgroundColor: '#0e7051' }}
            aria-label="Abrir chat com Cibélia"
          >
            <img
              src={cibeliaAvatar}
              alt="Cibélia — Assistente IA"
              className="h-[60px] w-[60px] sm:h-[66px] sm:w-[66px] rounded-full object-cover"
            />
            <span
              className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-400 animate-pulse ring-2 ring-background"
              title="Online"
              aria-hidden
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          Oá! Sou a Cibélia, sua assistente pessoal 💼
        </TooltipContent>
      </Tooltip>

      {/* Chat Panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          className="w-full sm:max-w-md flex flex-col p-0"
          style={isMobile ? { paddingBottom: keyboardPaddingBottom } : undefined}
        >
          <SheetHeader className="p-4 border-b flex-row items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-border shrink-0 relative" style={{ backgroundColor: '#0e7051' }}>
              <img src={cibeliaAvatar} alt="Cibélia" className="h-full w-full object-cover" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" title="Online" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base">Cibélia</SheetTitle>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                Sua assistente RXfin
                <span className="inline-flex items-center gap-1 shrink-0" title="Responde na hora">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                  Online
                </span>
              </span>
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
                  {/* Balão de texto: oculto para mensagem isWelcome (exibe apenas chips abaixo) */}
                  {!msg.isWelcome && (
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {msg.role === 'assistant' && msg.phase === 'financial' && msg.structured ? (
                        <CibeliaStructuredMessage
                          content={msg.content}
                          structured={msg.structured}
                          onOptionSelect={(value) => sendMessage(value)}
                          renderOptionsInParent
                        />
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                  )}

                  {/* Opções CTA fora do balão — apenas na última mensagem da assistente */}
                  {msg.role === 'assistant' &&
                    msg.structured &&
                    i === messages.length - 1 &&
                    !msg.isWelcome && (() => {
                      const data = parseCibeliaResponse(msg.content, true) as { cta?: string };
                      const options = data?.cta ? parseCTAOptions(data.cta) : null;
                      if (!options?.length) return null;
                      return (
                        <div className="mt-2 w-full flex flex-col items-start">
                          <CibeliaOptionButtons options={options} onSelect={(v) => sendMessage(v)} />
                        </div>
                      );
                    })()}

                  {/* Quick replies iniciais (só na mensagem isWelcome, quando é a única no chat) */}
                  {msg.role === 'assistant' && msg.isWelcome && messages.length === 1 && (
                    <div className="mt-2 w-full flex flex-col items-start">
                      <CibeliaOptionButtons options={INITIAL_QUICK_REPLIES} onSelect={(v) => sendMessage(v)} />
                    </div>
                  )}

                  {/* Raio-X result card */}
                  {msg.raioXData && (
                    <div className="mt-2 w-full">
                      <RaioXResultCard
                        formato={msg.raioXData.formato}
                        dados={msg.raioXData.dados}
                        userId={user?.id}
                        sessionId={sessionId}
                        onRegisterEvent={registerEvent}
                        onSendMessage={sendMessage}
                      />
                    </div>
                  )}

                  {/* Feedback 👍/👎 só em mensagens da IA (não na boas-vindas local) */}
                  {msg.role === 'assistant' && msg.id != null && !msg.isWelcome && (!isLoading || i < messages.length - 1) && (
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {feedbackMap.has(i) ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {feedbackMap.get(i) === 'helpful' ? (
                            <>
                              <ThumbsUp className="w-3 h-3 text-green-500" aria-hidden />
                              Obrigado!
                            </>
                          ) : (
                            <>
                              <ThumbsDown className="w-3 h-3 text-red-400" aria-hidden />
                              Anotado
                            </>
                          )}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleFeedback(i, 'helpful')}
                            disabled={feedbackLoading.has(i)}
                            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-green-500 disabled:opacity-40"
                            title="Resposta útil"
                            aria-label="Resposta útil"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(i, 'incorrect')}
                            disabled={feedbackLoading.has(i)}
                            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-400 disabled:opacity-40"
                            title="Resposta incorreta ou imprecisa"
                            aria-label="Resposta incorreta ou imprecisa"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" aria-hidden />
                          </button>
                        </>
                      )}
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

          {/* Input — no mobile: área fixa no rodapé; padding dinâmico (keyboardPaddingBottom) mantém o campo visível quando o teclado abre */}
          <div className="p-4 border-t flex gap-2 bg-background shrink-0">
            <Input
              ref={inputRef}
              placeholder="Pergunte sobre suas finanças..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              onFocus={() => {
                if (isMobile && inputRef.current) {
                  requestAnimationFrame(() => {
                    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  });
                }
              }}
              disabled={isLoading}
            />
            <Button size="icon" onClick={() => sendMessage()} disabled={isLoading || !inputValue.trim()} aria-label="Enviar mensagem">
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
