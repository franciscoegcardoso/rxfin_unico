import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowRight, ArrowLeft, Users, User, Mail, Eye, EyeOff, Lock, Check, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ConquestCard } from '../ConquestCard';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { cn } from '@/lib/utils';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface BlockAProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
}

interface ProfileAnswers {
  incomeRange: 'ate2k' | 'de2ka5k' | 'de5ka10k' | 'de10ka20k' | 'acima20k' | null;
  dependents: 'nenhum' | 'um' | 'dois_ou_mais' | null;
  mainGoal: 'reserva' | 'dividas' | 'investir' | 'imovel' | 'outro' | null;
  controlLevel: 'nao_acompanho' | 'as_vezes' | 'controlo_bem' | null;
}

type IncomeItemRow = {
  id: string;
  name: string;
  method: string;
  enabled: boolean;
  default_item_id: string | null;
  order_index: number;
};

type ExpenseItemRow = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  enabled: boolean;
  payment_method: string;
  order_index: number;
};

function groupExpenseByCategory(items: ExpenseItemRow[]): Map<string, ExpenseItemRow[]> {
  const m = new Map<string, ExpenseItemRow[]>();
  for (const it of items) {
    const k = it.category_name?.trim() || 'Outros';
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  return m;
}

const PROFILE_QUESTIONS: Array<{
  key: keyof ProfileAnswers;
  question: string;
  hint: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    key: 'incomeRange',
    question: 'Qual é a sua renda mensal aproximada?',
    hint: 'Inclua salário, freelance, aluguéis — tudo que entra por mês.',
    options: [
      { value: 'ate2k', label: 'Até R$ 2.000' },
      { value: 'de2ka5k', label: 'R$ 2.000 – R$ 5.000' },
      { value: 'de5ka10k', label: 'R$ 5.000 – R$ 10.000' },
      { value: 'de10ka20k', label: 'R$ 10.000 – R$ 20.000' },
      { value: 'acima20k', label: 'Acima de R$ 20.000' },
    ],
  },
  {
    key: 'dependents',
    question: 'Você tem dependentes financeiros?',
    hint: 'Filhos, cônjuge sem renda, pais — quem depende do seu dinheiro.',
    options: [
      { value: 'nenhum', label: 'Não tenho dependentes' },
      { value: 'um', label: 'Sim, 1 dependente' },
      { value: 'dois_ou_mais', label: 'Sim, 2 ou mais' },
    ],
  },
  {
    key: 'mainGoal',
    question: 'Qual é seu principal objetivo financeiro agora?',
    hint: 'Escolha o que mais te move no momento.',
    options: [
      { value: 'reserva', label: 'Montar reserva de emergência' },
      { value: 'dividas', label: 'Quitar dívidas' },
      { value: 'investir', label: 'Investir e fazer o dinheiro crescer' },
      { value: 'imovel', label: 'Comprar imóvel ou veículo' },
      { value: 'outro', label: 'Organizar as finanças em geral' },
    ],
  },
  {
    key: 'controlLevel',
    question: 'Como você descreve seu controle financeiro hoje?',
    hint: 'Seja honesto — o RXFin vai te ajudar independente do nível.',
    options: [
      { value: 'nao_acompanho', label: 'Não acompanho direito' },
      { value: 'as_vezes', label: 'Acompanho de vez em quando' },
      { value: 'controlo_bem', label: 'Tenho bom controle' },
    ],
  },
];

export const BlockA: React.FC<BlockAProps> = ({
  step,
  onStepChange,
  onComplete,
  onSaveDraft,
}) => {
  const { config, setAccountType } = useFinancial();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileAnswers>({
    incomeRange: null,
    dependents: null,
    mainGoal: null,
    controlLevel: null,
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);

  type AccessLevel = 'full' | 'full_restricted' | 'owner_only';
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [hasRxfinAccess, setHasRxfinAccess] = useState<boolean | null>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('full');
  const [savingShared, setSavingShared] = useState(false);
  const [sharedError, setSharedError] = useState('');
  const [localAccountType, setLocalAccountType] = useState<'individual' | 'shared'>(() =>
    (config.accountType as 'individual' | 'shared') ?? 'individual'
  );
  const [savingBlockA, setSavingBlockA] = useState(false);

  // A3 – receitas (user_income_items)
  const [incomeItems, setIncomeItems] = useState<IncomeItemRow[]>([]);
  const [incomeItemsLoading, setIncomeItemsLoading] = useState(false);
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newIncomeMethod, setNewIncomeMethod] = useState('Transferência');

  // A4a / A4b – despesas (user_expense_items)
  const [expenseItems, setExpenseItems] = useState<ExpenseItemRow[]>([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [a4bGroupIndex, setA4bGroupIndex] = useState(0);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupCategory, setNewGroupCategory] = useState('');
  const [newGroupItemName, setNewGroupItemName] = useState('');
  const [addExpenseItemOpen, setAddExpenseItemOpen] = useState(false);
  const [a4bNewItemName, setA4bNewItemName] = useState('');

  const expenseByCategory = useMemo(() => groupExpenseByCategory(expenseItems), [expenseItems]);

  const selectedExpenseGroups = useMemo(() => {
    return [...expenseByCategory.entries()].filter(([, rows]) => rows.some((r) => r.enabled));
  }, [expenseByCategory]);

  const persistA4bIndex = useCallback(
    (idx: number) => {
      void supabase.rpc('save_onboarding_draft' as never, {
        p_key: 'a4b_current_group_index',
        p_value: idx,
      } as never);
      onSaveDraft('a4b_current_group_index', idx);
    },
    [onSaveDraft],
  );

  useEffect(() => {
    if (step !== 3 || !user?.id) return;
    let cancelled = false;
    (async () => {
      setIncomeItemsLoading(true);
      const [{ data: rows }, draftRpc] = await Promise.all([
        supabase
          .from('user_income_items')
          .select('id, name, method, enabled, default_item_id, order_index')
          .eq('user_id', user.id)
          .order('order_index'),
        supabase.rpc('get_onboarding_draft' as never),
      ]);
      if (cancelled) return;
      setIncomeItems((rows ?? []) as IncomeItemRow[]);

      const draft = draftRpc.data as Record<string, unknown> | null;
      const draftIds = draft?.a3_income_ids as string[] | undefined;
      if (draftIds?.length && rows?.length) {
        const allow = new Set(draftIds);
        for (const r of rows) {
          const want = allow.has(r.id);
          if (r.enabled !== want) {
            await supabase
              .from('user_income_items')
              .update({ enabled: want, updated_at: new Date().toISOString() })
              .eq('id', r.id)
              .eq('user_id', user.id);
          }
        }
        const refreshed = rows.map((r) => ({ ...r, enabled: allow.has(r.id) }));
        setIncomeItems(refreshed as IncomeItemRow[]);
      }
      setIncomeItemsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, user?.id]);

  useEffect(() => {
    if (step !== 4 && step !== 5) return;
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setExpenseLoading(true);
      const { data: rows } = await supabase
        .from('user_expense_items')
        .select('id, category_id, category_name, name, enabled, payment_method, order_index')
        .eq('user_id', user.id)
        .order('order_index');
      if (cancelled) return;
      setExpenseItems((rows ?? []) as ExpenseItemRow[]);

      if (step === 5) {
        const { data: draft } = await supabase.rpc('get_onboarding_draft' as never);
        const d = draft as Record<string, unknown> | null;
        const saved =
          typeof d?.a4b_current_group_index === 'number'
            ? d.a4b_current_group_index
            : typeof d?.a4b_current_group_index === 'string'
              ? parseInt(String(d.a4b_current_group_index), 10)
              : 0;
        const groups = [...groupExpenseByCategory((rows ?? []) as ExpenseItemRow[]).entries()].filter(
          ([, r]) => r.some((x) => x.enabled),
        );
        const idx = Number.isFinite(saved) ? Math.min(Math.max(0, saved), Math.max(0, groups.length - 1)) : 0;
        setA4bGroupIndex(idx);
      }
      setExpenseLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, user?.id]);

  useEffect(() => {
    if (step !== 6 || !user?.id) return;
    let cancelled = false;
    (async () => {
      const [{ data: inc }, { data: exp }] = await Promise.all([
        supabase
          .from('user_income_items')
          .select('id, name, method, enabled, default_item_id, order_index')
          .eq('user_id', user.id)
          .order('order_index'),
        supabase
          .from('user_expense_items')
          .select('id, category_id, category_name, name, enabled, payment_method, order_index')
          .eq('user_id', user.id)
          .order('order_index'),
      ]);
      if (cancelled) return;
      if (inc?.length) setIncomeItems(inc as IncomeItemRow[]);
      if (exp?.length) setExpenseItems(exp as ExpenseItemRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, user?.id]);

  const saveProfileAnswers = async (answers: ProfileAnswers) => {
    if (!user?.id) return;
    try {
      const { setUserKVValue } = await import('@/hooks/useUserKV');
      await setUserKVValue(user.id, 'onboarding_profile', answers);
    } catch (err) {
      console.warn('[BlockA] saveProfileAnswers falhou (não crítico):', err);
    }
  };

  // ─── Step 0: Boas-vindas ─────────────────────────────────────────
  if (step === 0) {
    const journeySteps = [
      { num: 1, label: 'Identidade Financeira', short: 'Receitas e despesas' },
      { num: 2, label: 'Patrimônio Mapeado', short: 'Bens, dívidas e proteções' },
      { num: 3, label: 'Fluxo e Projeção', short: 'Caixa e visão de 30 anos' },
    ];
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Construa seu Raio-X Financeiro
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Em poucos passos você substitui os dados fictícios pelos seus e passa a ter visão completa da sua saúde financeira.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 text-center">
            O que você vai montar nesta jornada
          </h2>
          <div className="flex items-stretch gap-2">
            {journeySteps.map((s, i) => (
              <div key={s.num} className="flex-1 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center mb-2">
                  {s.num}
                </div>
                <p className="text-xs font-medium text-foreground leading-tight">{s.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.short}</p>
                {i < journeySteps.length - 1 && (
                  <div className="hidden sm:block flex-1 min-h-[2px] w-full max-w-[20px] mx-auto mt-2 bg-border self-center" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mb-4">⏱️ Cerca de 8 minutos</p>

        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(1)}>
          Começar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 1: Tipo de conta ───────────────────────────────────────
  if (step === 1) {
    const isShared = localAccountType === 'shared';
    const canContinue = !isShared
      || (partnerName.trim().length >= 2 && hasRxfinAccess !== null && !savingShared);

    const handleContinue = async () => {
      if (localAccountType === 'individual') {
        onStepChange(2);
        return;
      }
      setSavingShared(true);
      setSharedError('');
      try {
        const { error } = await supabase.rpc('save_onboarding_shared_account', {
          p_partner_name: partnerName.trim(),
          p_partner_email: partnerEmail.trim() || null,
          p_access_level: accessLevel,
          p_has_rxfin_access: Boolean(hasRxfinAccess ?? false),
        });
        if (error) throw error;
        onSaveDraft('shared_account', { partnerName, partnerEmail, hasRxfinAccess, accessLevel });
        onStepChange(2);
      } catch (err: unknown) {
        console.error('[BlockA] save_onboarding_shared_account erro:', err);
        setSharedError('Erro ao salvar. Tente novamente.');
      } finally {
        setSavingShared(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <Button variant="ghost" size="sm" className="mb-4 -ml-1" onClick={() => onStepChange(0)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="bg-card rounded-2xl border border-border p-6 mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Como você gerencia suas contas?
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Escolha o perfil que melhor descreve sua situação.
          </p>

          {/* Seleção de tipo */}
          <div className="grid grid-cols-2 gap-3 mb-0">
            {[
              { value: 'individual', label: 'Individual', sub: 'Só minhas contas', icon: User },
              { value: 'shared', label: 'Compartilhado', sub: 'Divido com alguém', icon: Users },
            ].map(({ value, label, sub, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const v = value as 'individual' | 'shared';
                  setLocalAccountType(v);
                  setAccountType(v);
                  setSharedError('');
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                  config.accountType === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Icon className={cn('h-6 w-6', config.accountType === value ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </button>
            ))}
          </div>

          {/* Formulário do parceiro — expande inline ao escolher Compartilhado */}
          {isShared && (
            <div className="mt-6 pt-5 border-t border-border space-y-5">

              {/* Nome e e-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Nome do parceiro *
                  </p>
                  <Input
                    placeholder="Ex: Maria Silva"
                    value={partnerName}
                    onChange={e => setPartnerName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    E-mail (opcional)
                  </p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={partnerEmail}
                      onChange={e => setPartnerEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Se informado, um convite será enviado após o onboarding.
                  </p>
                </div>
              </div>

              {/* Acesso ao RXFin */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">
                  {partnerName.trim() || 'Seu parceiro'} terá acesso ao RXFin?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: true,  label: 'Sim, terá acesso', icon: Check },
                    { value: false, label: 'Não, só eu',       icon: Lock  },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setHasRxfinAccess(value)}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium',
                        hasRxfinAccess === value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40 text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nível de acesso — só aparece se hasRxfinAccess === true */}
              {hasRxfinAccess === true && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Qual nível de acesso {partnerName.trim() || 'seu parceiro'} terá?
                  </p>
                  <div className="space-y-2">
                    {([
                      {
                        value: 'full' as AccessLevel,
                        label: 'Acesso integral',
                        desc: 'Ambos veem tudo — lançamentos, faturas e relatórios.',
                        icon: Eye,
                      },
                      {
                        value: 'full_restricted' as AccessLevel,
                        label: 'Integral com restrição',
                        desc: 'Parceiro não vê detalhes de lançamentos em conta e fatura.',
                        icon: EyeOff,
                      },
                      {
                        value: 'owner_only' as AccessLevel,
                        label: 'Somente você vê tudo',
                        desc: 'Parceiro acessa o RXFin mas sem detalhamento financeiro.',
                        icon: Lock,
                      },
                    ] as const).map(({ value, label, desc, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAccessLevel(value)}
                        className={cn(
                          'w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3',
                          accessLevel === value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40 bg-card'
                        )}
                      >
                        <Icon className={cn(
                          'h-5 w-5 mt-0.5 shrink-0',
                          accessLevel === value ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        </div>
                        {accessLevel === value && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sharedError && (
                <p className="text-xs text-destructive">{sharedError}</p>
              )}
            </div>
          )}
        </div>

        <Button
          variant="hero"
          size="lg"
          className="w-full mt-4"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          {savingShared
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
            : <>Continuar para perfil financeiro <ArrowRight className="ml-2 h-5 w-5" /></>
          }
        </Button>

        {isShared && hasRxfinAccess && partnerEmail.trim() && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Um convite será enviado para {partnerEmail} após o onboarding.
          </p>
        )}
      </div>
    );
  }

  // ─── Step 2: Perfil financeiro (4 perguntas múltipla escolha) ─────
  if (step === 2) {
    const q = PROFILE_QUESTIONS[questionIndex];
    const currentAnswer = profile[q.key];
    const isLast = questionIndex === PROFILE_QUESTIONS.length - 1;

    const handleSelect = (value: string) => {
      const newProfile = { ...profile, [q.key]: value } as ProfileAnswers;
      setProfile(newProfile);

      setTimeout(async () => {
        if (isLast) {
          setSavingProfile(true);
          await saveProfileAnswers(newProfile);
          setSavingProfile(false);
          onStepChange(3);
        } else {
          setQuestionIndex((prev) => prev + 1);
        }
      }, 280);
    };

    if (savingProfile) {
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <RXFinLoadingSpinner size={56} />
          <p className="text-sm text-muted-foreground text-center">
            Identificando seu perfil financeiro...
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (questionIndex === 0) onStepChange(1);
              else setQuestionIndex((prev) => prev - 1);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex gap-1.5 ml-auto">
            {PROFILE_QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i < questionIndex
                    ? 'bg-primary'
                    : i === questionIndex
                      ? 'bg-primary w-5'
                      : 'bg-border'
                )}
              />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
            Pergunta {questionIndex + 1} de {PROFILE_QUESTIONS.length}
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-2">{q.question}</h2>
          {q.hint && (
            <p className="text-sm text-muted-foreground">{q.hint}</p>
          )}
        </div>

        <div className="space-y-2">
          {q.options.map((opt) => (
            <button
              key={opt.value as string}
              type="button"
              onClick={() => handleSelect(opt.value as string)}
              className={cn(
                'w-full text-left px-4 py-4 rounded-xl border-2 transition-all',
                'flex items-center justify-between',
                currentAnswer === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 bg-card'
              )}
            >
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
              {currentAnswer === opt.value && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Step 3: Linhas de receita (user_income_items) ────────────────
  if (step === 3) {
    if (incomeItemsLoading) {
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <RXFinLoadingSpinner size={48} />
          <p className="text-sm text-muted-foreground">Carregando suas receitas...</p>
        </div>
      );
    }

    const toggleIncomeItem = async (item: IncomeItemRow) => {
      if (!user?.id) return;
      const next = !item.enabled;
      const { error } = await supabase
        .from('user_income_items')
        .update({ enabled: next, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('user_id', user.id);
      if (error) {
        toast.error('Não foi possível atualizar a receita.');
        return;
      }
      const updated = incomeItems.map((x) => (x.id === item.id ? { ...x, enabled: next } : x));
      setIncomeItems(updated);
      const enabledIds = updated.filter((x) => x.enabled).map((x) => x.id);
      onSaveDraft('a3_income_ids', enabledIds);
    };

    const submitNewIncome = async () => {
      if (!user?.id || !newIncomeName.trim()) return;
      const { error } = await supabase.from('user_income_items').insert({
        user_id: user.id,
        name: newIncomeName.trim(),
        method: newIncomeMethod.trim() || 'Outros',
        enabled: true,
        order_index: 999,
      });
      if (error) {
        toast.error('Erro ao criar receita.');
        return;
      }
      const { data: rows } = await supabase
        .from('user_income_items')
        .select('id, name, method, enabled, default_item_id, order_index')
        .eq('user_id', user.id)
        .order('order_index');
      setIncomeItems((rows ?? []) as IncomeItemRow[]);
      setNewIncomeName('');
      setAddIncomeOpen(false);
      toast.success('Receita adicionada');
    };

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => onStepChange(2)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
            Suas receitas
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Quais entradas fazem parte da sua vida?
          </h2>
          <p className="text-sm text-muted-foreground">
            Ative as linhas que você usa. Valores reais virão do Open Finance no próximo nível.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {incomeItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void toggleIncomeItem(item)}
              className={cn(
                'text-left p-4 rounded-xl border-2 transition-all',
                item.enabled
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.method}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-2">
                {item.enabled ? 'Ativa · toque para desativar' : 'Inativa · toque para ativar'}
              </p>
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-4"
          onClick={() => setAddIncomeOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar receita
        </Button>

        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(4)}>
          Continuar <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <Dialog open={addIncomeOpen} onOpenChange={setAddIncomeOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova receita</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="inc-name">Nome</Label>
                <Input
                  id="inc-name"
                  value={newIncomeName}
                  onChange={(e) => setNewIncomeName(e.target.value)}
                  placeholder="Ex: Salário, Freelance..."
                />
              </div>
              <div>
                <Label htmlFor="inc-method">Método / forma</Label>
                <Input
                  id="inc-method"
                  value={newIncomeMethod}
                  onChange={(e) => setNewIncomeMethod(e.target.value)}
                  placeholder="Transferência, PIX..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddIncomeOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void submitNewIncome()} disabled={!newIncomeName.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Step 4: A4a grupos de despesa ────────────────────────────────
  if (step === 4) {
    if (expenseLoading) {
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <RXFinLoadingSpinner size={48} />
          <p className="text-sm text-muted-foreground">Carregando grupos de despesa...</p>
        </div>
      );
    }

    const allGroups = [...expenseByCategory.entries()];

    const toggleExpenseGroup = async (categoryName: string, rows: ExpenseItemRow[]) => {
      if (!user?.id) return;
      const anyOn = rows.some((r) => r.enabled);
      const next = !anyOn;
      for (const r of rows) {
        if (r.enabled === next) continue;
        await supabase
          .from('user_expense_items')
          .update({ enabled: next, updated_at: new Date().toISOString() })
          .eq('id', r.id)
          .eq('user_id', user.id);
      }
      setExpenseItems((prev) =>
        prev.map((e) => (e.category_name === categoryName ? { ...e, enabled: next } : e)),
      );
    };

    const submitNewGroup = async () => {
      if (!user?.id || !newGroupCategory.trim() || !newGroupItemName.trim()) return;
      const categoryId = crypto.randomUUID();
      const { error } = await supabase.from('user_expense_items').insert({
        user_id: user.id,
        category_id: categoryId,
        category_name: newGroupCategory.trim(),
        name: newGroupItemName.trim(),
        expense_type: 'variable_non_essential',
        expense_nature: 'variable',
        recurrence_type: 'monthly',
        is_recurring: true,
        payment_method: 'credit_card',
        enabled: true,
        order_index: 999,
      });
      if (error) {
        toast.error('Erro ao criar grupo.');
        return;
      }
      const { data: rows } = await supabase
        .from('user_expense_items')
        .select('id, category_id, category_name, name, enabled, payment_method, order_index')
        .eq('user_id', user.id)
        .order('order_index');
      setExpenseItems((rows ?? []) as ExpenseItemRow[]);
      setNewGroupCategory('');
      setNewGroupItemName('');
      setAddGroupOpen(false);
      toast.success('Grupo criado');
    };

    const goA4b = () => {
      const names = selectedExpenseGroups.map(([k]) => k);
      void supabase.rpc('save_onboarding_draft' as never, {
        p_key: 'a4a_groups',
        p_value: names,
      } as never);
      onSaveDraft('a4a_groups', names);
      persistA4bIndex(0);
      setA4bGroupIndex(0);
      onStepChange(5);
    };

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => onStepChange(3)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
            Grupos de despesa
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Onde você costuma gastar?
          </h2>
          <p className="text-sm text-muted-foreground">
            Toque no grupo para ativar ou desativar todos os itens daquela categoria. Depois você
            detalha cada um.
          </p>
        </div>

        {allGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum grupo encontrado. Adicione um grupo ou avance.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {allGroups.map(([categoryName, rows]) => {
              const on = rows.some((r) => r.enabled);
              return (
                <button
                  key={categoryName}
                  type="button"
                  onClick={() => void toggleExpenseGroup(categoryName, rows)}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all',
                    on ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-card opacity-80',
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{categoryName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rows.length} item(ns) · {on ? 'ativo' : 'inativo'}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <Button type="button" variant="outline" className="w-full mb-4" onClick={() => setAddGroupOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar grupo
        </Button>

        <Button variant="hero" size="lg" className="w-full" onClick={goA4b}>
          Próxima etapa: detalhar grupos <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo grupo de despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Nome da categoria</Label>
                <Input
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  placeholder="Ex: Moradia"
                />
              </div>
              <div>
                <Label>Primeiro item</Label>
                <Input
                  value={newGroupItemName}
                  onChange={(e) => setNewGroupItemName(e.target.value)}
                  placeholder="Ex: Aluguel"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddGroupOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void submitNewGroup()}
                disabled={!newGroupCategory.trim() || !newGroupItemName.trim()}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Step 5: A4b itens por grupo ──────────────────────────────────
  if (step === 5) {
    if (expenseLoading) {
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <RXFinLoadingSpinner size={48} />
          <p className="text-sm text-muted-foreground">Carregando itens...</p>
        </div>
      );
    }

    const groups = selectedExpenseGroups;

    if (groups.length === 0) {
      return (
        <div className="max-w-2xl mx-auto py-8 text-center space-y-4">
          <p className="text-muted-foreground">Nenhum grupo ativo. Volte e selecione categorias.</p>
          <Button variant="hero" onClick={() => onStepChange(4)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos grupos
          </Button>
        </div>
      );
    }

    const safeIdx = Math.min(Math.max(0, a4bGroupIndex), groups.length - 1);
    const current = groups[safeIdx];
    const categoryName = current[0];
    const rows = current[1];
    const template = rows[0];

    const toggleExpenseRow = async (row: ExpenseItemRow) => {
      if (!user?.id) return;
      const next = !row.enabled;
      const { error } = await supabase
        .from('user_expense_items')
        .update({ enabled: next, updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('user_id', user.id);
      if (error) {
        toast.error('Erro ao atualizar item.');
        return;
      }
      setExpenseItems((prev) => prev.map((e) => (e.id === row.id ? { ...e, enabled: next } : e)));
    };

    const addItemInGroup = async () => {
      if (!user?.id || !template || !a4bNewItemName.trim()) return;
      const { error } = await supabase.from('user_expense_items').insert({
        user_id: user.id,
        category_id: template.category_id,
        category_name: template.category_name,
        name: a4bNewItemName.trim(),
        expense_type: 'variable_non_essential',
        expense_nature: 'variable',
        recurrence_type: 'monthly',
        is_recurring: true,
        payment_method: template.payment_method || 'credit_card',
        enabled: true,
        order_index: 999,
      });
      if (error) {
        toast.error('Erro ao adicionar item.');
        return;
      }
      const { data: refreshed } = await supabase
        .from('user_expense_items')
        .select('id, category_id, category_name, name, enabled, payment_method, order_index')
        .eq('user_id', user.id)
        .order('order_index');
      setExpenseItems((refreshed ?? []) as ExpenseItemRow[]);
      setA4bNewItemName('');
      setAddExpenseItemOpen(false);
      toast.success('Item adicionado');
    };

    const goPrevGroup = () => {
      if (safeIdx <= 0) {
        onStepChange(4);
        return;
      }
      const n = safeIdx - 1;
      setA4bGroupIndex(n);
      persistA4bIndex(n);
    };

    const goNextGroup = () => {
      if (safeIdx >= groups.length - 1) {
        onStepChange(6);
        return;
      }
      const n = safeIdx + 1;
      setA4bGroupIndex(n);
      persistA4bIndex(n);
    };

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={goPrevGroup}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <p className="text-xs font-medium text-muted-foreground">
            Grupo {safeIdx + 1} de {groups.length}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
            Detalhar despesas
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-1">{categoryName}</h2>
          <p className="text-sm text-muted-foreground">
            Ative os itens que aplicam e ajuste conforme sua rotina.
          </p>
        </div>

        <div className="space-y-2 mb-4">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => void toggleExpenseRow(row)}
              className={cn(
                'w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-2',
                row.enabled
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-border bg-card opacity-80',
              )}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.payment_method}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {row.enabled ? 'Ativo' : 'Inativo'}
              </span>
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-4"
          onClick={() => setAddExpenseItemOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo item neste grupo
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={goPrevGroup}>
            ← Grupo anterior
          </Button>
          <Button variant="hero" className="flex-1" onClick={goNextGroup}>
            {safeIdx >= groups.length - 1 ? (
              <>Concluir <ArrowRight className="ml-2 h-4 w-4" /></>
            ) : (
              <>Próximo grupo <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>

        <Dialog open={addExpenseItemOpen} onOpenChange={setAddExpenseItemOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo item em {categoryName}</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label>Nome do item</Label>
              <Input
                value={a4bNewItemName}
                onChange={(e) => setA4bNewItemName(e.target.value)}
                placeholder="Ex: Internet, Condomínio..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddExpenseItemOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void addItemInGroup()} disabled={!a4bNewItemName.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Step 6: Conquest + save_onboarding_block_a ─────────────────
  if (step === 6) {
    const goalLabels: Record<string, string> = {
      reserva: 'Montar reserva de emergência',
      dividas: 'Quitar dívidas',
      investir: 'Fazer o dinheiro crescer',
      imovel: 'Comprar imóvel ou veículo',
      outro: 'Organizar as finanças em geral',
    };

    const dependentsLabel =
      profile.dependents === 'nenhum'
        ? 'Nenhum'
        : profile.dependents === 'um'
          ? '1 dependente'
          : '2 ou mais';

    const incomeActive = incomeItems.filter((i) => i.enabled).length;
    const expenseActive = expenseItems.filter((i) => i.enabled).length;

    const metrics = [
      { label: 'Linhas de receita ativas', value: String(incomeActive) },
      { label: 'Linhas de despesa ativas', value: String(expenseActive) },
      { label: 'Seu principal objetivo', value: goalLabels[profile.mainGoal ?? 'outro'] ?? '—' },
      { label: 'Dependentes', value: dependentsLabel },
    ];

    const insight =
      'Seu perfil e estrutura de receitas/despesas estão registrados. No próximo nível você conecta bancos para dados reais.';

    const handleVerRaioX = async () => {
      if (!user?.id) {
        toast.error('Sessão inválida. Faça login novamente.');
        return;
      }
      setSavingBlockA(true);
      try {
        const { error } = await supabase.rpc('save_onboarding_block_a', {
          p_income_data: [] as never,
          p_expense_data: [] as never,
        });
        if (error) throw error;

        const { error: trackErr } = await supabase.rpc('track_onboarding_event', {
          p_event_name: 'block_a_completed',
          p_step: 6,
          p_metadata: {
            income_lines_active: incomeActive,
            expense_lines_active: expenseActive,
          },
        } as never);
        if (trackErr) console.warn('[BlockA] track_onboarding_event', trackErr);

        onComplete();
      } catch (e) {
        console.error('[BlockA] save_onboarding_block_a', e);
        toast.error('Erro ao salvar dados. Tente novamente.');
      } finally {
        setSavingBlockA(false);
      }
    };

    return (
      <div className="py-8">
        <ConquestCard
          level={1}
          badge="bronze"
          title="Perfil identificado!"
          metrics={metrics}
          insight={insight}
          nextLevelPreview="Próximo: conectar suas instituições financeiras para o diagnóstico real."
          onContinue={() => void handleVerRaioX()}
          continueLabel="Conectar meus bancos"
          continueLoading={savingBlockA}
        />
      </div>
    );
  }

  return null;
};
