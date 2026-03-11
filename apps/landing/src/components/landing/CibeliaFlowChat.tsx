import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// ─── Save lead to Supabase ───────────────────────────────────────────────────
async function saveLead(data: { name: string; email: string; phone: string | null }) {
  try {
    await supabase.from('leads').insert({
      email: data.email,
      phone: data.phone ?? null,
      source: 'landing_page_cibelia',
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Flow types ──────────────────────────────────────────────────────────────
interface StepOption {
  label: string;
  value: string;
}

interface StepData {
  messages: (string | null)[];
  options?: StepOption[];
  inputType?: 'text' | 'email' | 'tel';
  inputPlaceholder?: string;
  skipLabel?: string;
  validate?: (v: string) => true | string;
  nextStep: (answer?: string) => string;
  showPreviewCard?: boolean;
  ctaButton?: { label: string; url: string };
  isEnd?: boolean;
}

interface FlowContext {
  name?: string;
  email?: string;
  phone?: string;
  pain?: 'gastos' | 'bancos' | 'investimentos' | 'dividas';
  featureInterest?: string;
}

type FlowStep = StepData | ((ctx: FlowContext) => StepData);

// ─── Flow definition ──────────────────────────────────────────────────────────
const FLOW: Record<string, FlowStep> = {
  start: {
    messages: [
      'Olá! Sou a **Cibélia**, assistente do RXFin 👋',
      'Antes de tudo — como posso te chamar?',
    ],
    inputType: 'text',
    inputPlaceholder: 'Seu nome...',
    validate: (v) => (v.trim().length >= 2 ? true : 'Digite pelo menos 2 caracteres.'),
    nextStep: () => 'pain_question',
  },

  pain_question: (ctx: FlowContext) => ({
    messages: [
      `Que bom, ${ctx.name}! 😊`,
      'Qual é o maior desafio que você enfrenta hoje com suas finanças?',
    ],
    options: [
      { label: '💸 Perco o controle dos gastos no fim do mês', value: 'gastos' },
      { label: '🏦 Tenho contas em vários bancos e não enxergo tudo', value: 'bancos' },
      { label: '📈 Quero investir mas não sei por onde começar', value: 'investimentos' },
      { label: '😰 Estou endividado e não consigo sair do buraco', value: 'dividas' },
    ],
    nextStep: () => 'pain_deepen',
  }),

  pain_deepen: (ctx: FlowContext) => {
    const deepens: Record<string, { msg: string[]; options: StepOption[] }> = {
      gastos: {
        msg: [
          `Entendo muito bem essa sensação, ${ctx.name}. 😔`,
          'Você chega no dia 20 e já não sabe onde foi parar o dinheiro, né? A maioria das pessoas só percebe o problema *depois* que o estrago está feito.',
          'Isso já te impediu de realizar algo importante — uma viagem, uma reserva de emergência?',
        ],
        options: [
          { label: 'Sim, várias vezes 😞', value: 'sim_varios' },
          { label: 'Uma ou duas vezes', value: 'sim_algumas' },
          { label: 'Ainda não, mas me preocupa', value: 'preocupa' },
        ],
      },
      bancos: {
        msg: [
          `Isso é mais comum do que parece, ${ctx.name}. 🏦`,
          'Ter dinheiro espalhado em Nubank, Itaú, Inter, XP... é quase impossível enxergar o quadro completo. Você acaba tomando decisões com informação incompleta.',
          'Isso já fez você perder dinheiro ou oportunidade por falta de visão clara?',
        ],
        options: [
          { label: 'Sim, já deixei rendimento melhor passar', value: 'perdeu_oportunidade' },
          { label: 'Já paguei juros desnecessários por isso', value: 'pagou_juros' },
          { label: 'Ainda não, mas é muito trabalhoso controlar', value: 'trabalhoso' },
        ],
      },
      investimentos: {
        msg: [
          `Querer investir e não saber por onde começar é paralisante, ${ctx.name}. 📊`,
          'Com tantas opções — CDB, Tesouro, FIIs, ações — é fácil ficar no "vou estudar mais um pouco" e nunca agir.',
          'Há quanto tempo você está nesse impasse?',
        ],
        options: [
          { label: 'Mais de 1 ano tentando começar', value: 'mais_1ano' },
          { label: 'Alguns meses', value: 'alguns_meses' },
          { label: 'Acabei de decidir que quero mudar isso', value: 'agora' },
        ],
      },
      dividas: {
        msg: [
          `Isso pesa demais, ${ctx.name}. E você não está sozinho nessa. 💙`,
          'Dívida sem controle é como buraco negro: quanto mais tempo passa, maior fica. O primeiro passo é enxergar exatamente o tamanho do problema.',
          'Você tem clareza de quanto deve hoje somando todas as dívidas?',
        ],
        options: [
          { label: 'Sim, sei exatamente o valor', value: 'sabe_valor' },
          { label: 'Tenho uma ideia aproximada', value: 'ideia' },
          { label: 'Não, tenho medo de calcular', value: 'medo_calcular' },
        ],
      },
    };
    const d = deepens[ctx.pain ?? 'gastos'] ?? deepens.gastos;
    return {
      messages: d.msg,
      options: d.options,
      nextStep: () => 'solution_teaser',
    };
  },

  solution_teaser: (ctx: FlowContext) => ({
    messages: [
      `Faz sentido, ${ctx.name}. E é exatamente para isso que o **RXFin** foi criado. 🚀`,
      'Imagine ter **todos os seus bancos em um só lugar**, seus gastos organizados automaticamente e um painel que mostra, em segundos, onde seu dinheiro está indo.',
      'Tudo isso usando o **Open Finance** — a tecnologia do Banco Central que conecta suas contas com total segurança, sem senha nenhuma.',
    ],
    options: [
      { label: 'Interessante, quero saber mais 👀', value: 'quer_mais' },
      { label: 'Como funciona na prática?', value: 'como_funciona' },
      { label: 'É seguro mesmo?', value: 'seguranca' },
    ],
    nextStep: (answer) => (answer === 'seguranca' ? 'security_answer' : 'solution_preview'),
  }),

  security_answer: () => ({
    messages: [
      'Ótima pergunta! 🔒',
      'O Open Finance é regulado pelo **Banco Central do Brasil**. O RXFin só lê seus dados — nunca movimenta dinheiro. É como dar acesso de *visualização*, não de *operação*.',
      'Agora, quer ver como fica na prática?',
    ],
    options: [
      { label: 'Sim, quero ver! 🙌', value: 'sim' },
      { label: 'Pode explicar mais', value: 'mais' },
    ],
    nextStep: () => 'solution_preview',
  }),

  solution_preview: (ctx: FlowContext) => ({
    messages: [
      'Com o RXFin você terá:',
      null,
      'E o melhor: **começa de graça**. Sem cartão de crédito.',
      `${ctx.name}, posso te enviar um acesso para você testar pessoalmente?`,
    ],
    showPreviewCard: true,
    options: [
      { label: 'Sim! Quero testar 🎯', value: 'sim_testar' },
      { label: 'Quanto custa depois do trial?', value: 'preco' },
    ],
    nextStep: (answer) => (answer === 'preco' ? 'pricing_answer' : 'collect_contact'),
  }),

  pricing_answer: () => ({
    messages: [
      'Transparência total! 💚',
      'Após o período gratuito, o RXFin custa menos que **1 cafezinho por dia**. E você cancela quando quiser, sem multa.',
      'Vale testar, não?',
    ],
    options: [
      { label: 'Vale sim! Quero o acesso 🚀', value: 'sim' },
      { label: 'Ainda tenho dúvidas', value: 'duvida' },
    ],
    nextStep: () => 'collect_contact',
  }),

  collect_contact: (ctx: FlowContext) => ({
    messages: [
      `Ótimo, ${ctx.name}! Vou preparar seu acesso. 🎉`,
      'Qual é o seu **e-mail** para eu enviar o convite?',
    ],
    inputType: 'email',
    inputPlaceholder: 'seu@email.com',
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : 'Digite um e-mail válido.'),
    nextStep: () => 'collect_phone',
  }),

  collect_phone: (ctx: FlowContext) => ({
    messages: [
      'Perfeito! E seu **WhatsApp**? (opcional — para eu te avisar quando estiver pronto)',
    ],
    inputType: 'tel',
    inputPlaceholder: '(11) 99999-9999',
    skipLabel: 'Prefiro não informar',
    validate: (v) => {
      if (!v.trim()) return true;
      return v.replace(/\D/g, '').length >= 10 ? true : 'Digite um telefone válido.';
    },
    nextStep: () => 'lead_saved',
  }),

  lead_saved: (ctx: FlowContext) => ({
    messages: [
      `Tudo certo, ${ctx.name}! ✅ Seu acesso está sendo preparado.`,
      'Enquanto isso — o que mais te interessa explorar no RXFin?',
    ],
    options: [
      { label: '📊 Como ver todos meus bancos juntos', value: 'bancos_unificados' },
      { label: '🎯 Como categorizar gastos automaticamente', value: 'categorias' },
      { label: '📅 Como planejar meu orçamento mensal', value: 'orcamento' },
      { label: '🤖 Como a Cibélia me ajuda no dia a dia', value: 'cibelia_ia' },
    ],
    nextStep: () => 'feature_detail',
  }),

  feature_detail: (ctx: FlowContext) => {
    const details: Record<string, string[]> = {
      bancos_unificados: [
        'Com o Open Finance, você conecta Nubank, Itaú, Inter, Bradesco e mais de 100 instituições 🏦',
        'Tudo aparece em **um único painel**, atualizado automaticamente. Saldo total, extrato consolidado, investimentos — sem precisar abrir app nenhum.',
      ],
      categorias: [
        'O RXFin categoriza cada transação automaticamente usando IA 🤖',
        'Alimentação, transporte, lazer, saúde... você vê no gráfico onde o dinheiro foi e pode criar regras personalizadas.',
      ],
      orcamento: [
        'Você define um orçamento por categoria e o RXFin te avisa quando estiver se aproximando do limite 🔔',
        'Nada de surpresas no fim do mês. Você fica no controle em tempo real.',
      ],
      cibelia_ia: [
        'Sou a Cibélia, sua assistente financeira pessoal dentro do RXFin 💬',
        'Posso responder perguntas como "quanto gastei com delivery em julho?" ou "qual banco está me cobrando mais tarifas?" — em segundos.',
      ],
    };
    const msgs = details[ctx.featureInterest ?? 'bancos_unificados'] ?? details.bancos_unificados;
    return {
      messages: [...msgs, 'Ficou com vontade de testar? 😄'],
      options: [
        { label: 'Sim! Quando recebo o acesso?', value: 'quando' },
        { label: 'Quero saber sobre outra funcionalidade', value: 'outra' },
        { label: 'Já estou convencido! 🚀', value: 'convencido' },
      ],
      nextStep: (answer) => (answer === 'outra' ? 'lead_saved' : 'trial_offer'),
    };
  },

  trial_offer: (ctx: FlowContext) => ({
    messages: [
      `${ctx.name}, seu acesso gratuito ao RXFin está a um clique de distância! 🎁`,
      '**14 dias grátis**, sem cartão, sem compromisso. Conecta seus bancos, vê o painel, me pergunta o que quiser.',
      'Pronto para começar?',
    ],
    options: [
      { label: '🚀 Quero começar agora!', value: 'comecar' },
      { label: '📅 Prefiro começar depois', value: 'depois' },
    ],
    nextStep: (answer) => (answer === 'depois' ? 'followup_later' : 'final'),
  }),

  followup_later: () => ({
    messages: [
      'Sem problema! Vou guardar seu contato e te mandar um lembrete. 💌',
      'Quando você sentir que é a hora, é só me chamar aqui. Boa sorte com as finanças! 💚',
    ],
    isEnd: true,
  }),

  final: (ctx: FlowContext) => ({
    messages: [
      `Excelente escolha, ${ctx.name}! 🎉`,
      'Acabei de registrar seu acesso. Você receberá um e-mail em instantes com o link para entrar no RXFin.',
      'Qualquer dúvida, é só me chamar aqui. A gente vai juntos nessa! 💚',
    ],
    ctaButton: { label: 'Acessar o RXFin agora →', url: 'https://app.rxfin.com.br' },
    isEnd: true,
  }),
};

function resolveStep(key: string, ctx: FlowContext): StepData | null {
  const step = FLOW[key];
  if (!step) return null;
  return typeof step === 'function' ? step(ctx) : step;
}

function formatMessage(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// ─── Preview card ─────────────────────────────────────────────────────────────
function PreviewCard() {
  const features = [
    { icon: '🏦', text: 'Todos os bancos em um lugar' },
    { icon: '📊', text: 'Gastos categorizados automaticamente' },
    { icon: '🎯', text: 'Metas e orçamento inteligente' },
    { icon: '🤖', text: 'IA que responde suas dúvidas financeiras' },
  ];
  return (
    <div
      className="rounded-xl p-3.5 my-1 border border-white/10"
      style={{
        background: 'linear-gradient(135deg, #0f4c3a 0%, #166534 100%)',
      }}
    >
      <div className="text-green-300 text-[11px] font-bold tracking-wider uppercase mb-2.5">
        ✨ RXFin — Visão Geral
      </div>
      {features.map((f, i) => (
        <div key={i} className="flex items-center gap-2 mb-1.5 text-slate-200 text-[13px]">
          <span className="text-base">{f.icon}</span>
          <span>{f.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component (content only; panel wrapper is in CibeliaWidget) ──────────
export function CibeliaFlowChat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [currentStep, setCurrentStep] = useState('start');
  const [ctx, setCtx] = useState<FlowContext>({});
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stepData, setStepData] = useState<StepData | null>(null);
  const [leadSaved, setLeadSaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pushBotMessages = async (msgs: (string | null)[], step: StepData) => {
    for (const msg of msgs) {
      if (msg === null) continue;
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 600 + msg.length * 8));
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'bot', text: msg }]);
      await new Promise((r) => setTimeout(r, 120));
    }
    setStepData(step);
    if (step?.inputType) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    const step = resolveStep('start', {});
    if (step) pushBotMessages(step.messages, step);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, stepData]);

  const handleOption = async (opt: StepOption) => {
    setMessages((prev) => [...prev, { role: 'user', text: opt.label }]);
    const currentData = stepData;
    setStepData(null);

    let newCtx = { ...ctx };
    if (currentStep === 'pain_question') newCtx.pain = opt.value as FlowContext['pain'];
    if (currentStep === 'lead_saved') newCtx.featureInterest = opt.value;
    setCtx(newCtx);

    const nextKey = currentData?.nextStep(opt.value) ?? 'start';
    setCurrentStep(nextKey);
    const next = resolveStep(nextKey, newCtx);
    if (!next) return;

    const msgsToSend: string[] = [];
    let hasPreviewCard = false;
    for (const m of next.messages) {
      if (m === null) {
        hasPreviewCard = true;
        continue;
      }
      msgsToSend.push(m);
    }
    if (hasPreviewCard) {
      setMessages((prev) => [...prev, { role: 'bot', text: '__PREVIEW_CARD__' }]);
    }
    await pushBotMessages(msgsToSend, next);
    if (next.isEnd) setStepData({ ...next, isEnd: true });
  };

  const handleInput = async (overrideValue?: string) => {
    const val = (overrideValue !== undefined ? overrideValue : inputValue).trim();
    const validation = stepData?.validate ? stepData.validate(val) : true;
    if (validation !== true) {
      setInputError(validation);
      return;
    }
    setInputError('');
    setInputValue('');

    const displayVal = val || '(não informado)';
    setMessages((prev) => [...prev, { role: 'user', text: displayVal }]);
    const currentData = stepData;
    setStepData(null);

    let newCtx = { ...ctx };
    if (currentStep === 'start') newCtx.name = val;
    if (currentStep === 'collect_contact') newCtx.email = val;
    if (currentStep === 'collect_phone') newCtx.phone = val || null;
    setCtx(newCtx);

    if (currentStep === 'collect_phone' && !leadSaved) {
      setLeadSaved(true);
      saveLead({
        name: newCtx.name ?? '',
        email: newCtx.email ?? '',
        phone: val || null,
      });
    }

    const nextKey = currentData?.nextStep(val) ?? 'start';
    setCurrentStep(nextKey);
    const next = resolveStep(nextKey, newCtx);
    if (!next) return;

    await pushBotMessages(next.messages, next);
    if (next.isEnd) setStepData({ ...next, isEnd: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInput();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-col max-w-[85%]',
              msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            )}
          >
            {msg.text === '__PREVIEW_CARD__' ? (
              <div className="max-w-[88%]">
                <PreviewCard />
              </div>
            ) : (
              <div
                className={cn(
                  'px-3.5 py-2.5 text-sm rounded-2xl',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                )}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
              />
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-muted flex gap-1">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce"
                  style={{ animationDelay: `${d * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {stepData?.options && !stepData?.isEnd && (
          <div className="flex flex-col gap-1.5 mt-1">
            {stepData.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleOption(opt)}
                className="w-full text-left rounded-lg py-2.5 px-3 text-sm font-medium border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {stepData?.ctaButton && (
          <a
            href={stepData.ctaButton.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm text-center hover:opacity-90 transition-opacity"
          >
            {stepData.ctaButton.label}
          </a>
        )}

        <div ref={bottomRef} />
      </div>

      {stepData?.inputType && !stepData?.isEnd && (
        <div className="flex-shrink-0 border-t border-border p-3 bg-background">
          {inputError && (
            <p className="text-destructive text-[11px] mb-1 px-0.5">⚠️ {inputError}</p>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type={stepData.inputType}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={stepData.inputPlaceholder ?? 'Digite aqui...'}
              className={cn(
                'flex-1 min-w-0 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                inputError ? 'border-destructive' : 'border-border'
              )}
            />
            <button
              type="button"
              onClick={() => handleInput()}
              className="shrink-0 h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold hover:opacity-90"
            >
              ↑
            </button>
          </div>
          {stepData?.skipLabel && (
            <button
              type="button"
              onClick={() => handleInput('')}
              className="mt-1.5 text-muted-foreground text-xs underline hover:text-foreground"
            >
              {stepData.skipLabel}
            </button>
          )}
        </div>
      )}

      {stepData?.isEnd && !stepData?.ctaButton && (
        <div className="flex-shrink-0 border-t border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-3 text-center text-sm text-green-700 dark:text-green-300">
          💚 Obrigada pelo seu interesse no RXFin!
        </div>
      )}
    </div>
  );
}
