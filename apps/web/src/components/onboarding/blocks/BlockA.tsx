import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Users, User, Mail, Eye, EyeOff, Lock, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ConquestCard } from '../ConquestCard';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { cn } from '@/lib/utils';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';

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

interface RpcCategoryRow {
  key: string;
  name: string;
  icon?: string;
}

function parseCategories(data: unknown): { income: RpcCategoryRow[]; expense: RpcCategoryRow[] } {
  const p = data as Record<string, unknown> | null;
  if (!p) return { income: [], expense: [] };
  const inc = Array.isArray(p.income) ? p.income : [];
  const exp = Array.isArray(p.expense) ? p.expense : [];
  const mapRow = (c: Record<string, unknown>): RpcCategoryRow | null => {
    const key = String(c.key ?? c.id ?? c.category_id ?? '').trim();
    if (!key) return null;
    const name = String(c.name ?? c.category_name ?? 'Categoria');
    const icon = typeof c.icon === 'string' ? c.icon : undefined;
    return { key, name, icon };
  };
  return {
    income: inc
      .map((x) => mapRow(x as Record<string, unknown>))
      .filter((r): r is RpcCategoryRow => r != null),
    expense: exp
      .map((x) => mapRow(x as Record<string, unknown>))
      .filter((r): r is RpcCategoryRow => r != null),
  };
}

function formatBRLInput(n: number) {
  if (n <= 0) return '';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function CategoryAmountRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      onChange(0);
      return;
    }
    onChange(Number(digits) / 100);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <span className="text-xl shrink-0 w-9 text-center">{icon || '•'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <div className="w-[140px] shrink-0">
        <Input
          inputMode="numeric"
          placeholder="R$ 0,00"
          className="text-right tabular-nums text-sm h-9"
          value={formatBRLInput(value)}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  );
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
  const [categoriesBundle, setCategoriesBundle] = useState<{
    income: RpcCategoryRow[];
    expense: RpcCategoryRow[];
  } | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [incomeValues, setIncomeValues] = useState<Record<string, number>>({});
  const [expenseValues, setExpenseValues] = useState<Record<string, number>>({});
  const [savingBlockA, setSavingBlockA] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const { data, error } = await supabase.rpc('get_onboarding_categories');
      if (cancelled) return;
      if (error) {
        console.error('[BlockA] get_onboarding_categories', error);
        setCategoriesError('Não foi possível carregar categorias. Tente novamente.');
        setCategoriesBundle({ income: [], expense: [] });
      } else {
        setCategoriesBundle(parseCategories(data));
      }
      setCategoriesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // ─── Step 3: Receitas (valores por categoria) ─────────────────────
  if (step === 3) {
    if (categoriesLoading || !categoriesBundle) {
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <RXFinLoadingSpinner size={48} />
          <p className="text-sm text-muted-foreground">Carregando categorias de receita...</p>
        </div>
      );
    }

    const incomeRows = categoriesBundle.income;
    const hasIncomePositive = Object.values(incomeValues).some((v) => v > 0);

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
            Quanto entra por mês?
          </h2>
          <p className="text-sm text-muted-foreground">
            Informe valores aproximados em reais. Você poderá refinar depois com Open Finance ou extratos.
          </p>
        </div>

        {categoriesError && (
          <p className="text-sm text-destructive mb-4">{categoriesError}</p>
        )}

        {incomeRows.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">
            Nenhuma categoria de receita disponível. Avance para continuar — os dados poderão ser
            ajustados depois.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {incomeRows.map((row) => (
              <CategoryAmountRow
                key={row.key}
                icon={row.icon ?? '💰'}
                label={row.name}
                value={incomeValues[row.key] ?? 0}
                onChange={(v) =>
                  setIncomeValues((prev) => ({
                    ...prev,
                    [row.key]: v,
                  }))
                }
              />
            ))}
          </div>
        )}

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          disabled={incomeRows.length > 0 && !hasIncomePositive}
          onClick={() => onStepChange(4)}
        >
          Continuar <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 4: Despesas (valores por categoria) ───────────────────────
  if (step === 4) {
    if (categoriesLoading || !categoriesBundle) {
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <RXFinLoadingSpinner size={48} />
          <p className="text-sm text-muted-foreground">Carregando categorias de despesa...</p>
        </div>
      );
    }

    const expenseRows = categoriesBundle.expense;
    const hasExpensePositive = Object.values(expenseValues).some((v) => v > 0);

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => onStepChange(3)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
            Suas despesas
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Quanto sai por mês?
          </h2>
          <p className="text-sm text-muted-foreground">
            Use totais por categoria (aluguel, alimentação, etc.). Estimativas já ajudam o Raio-X.
          </p>
        </div>

        {categoriesError && (
          <p className="text-sm text-destructive mb-4">{categoriesError}</p>
        )}

        {expenseRows.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">
            Nenhuma categoria de despesa disponível. Avance para o resumo.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {expenseRows.map((row) => (
              <CategoryAmountRow
                key={row.key}
                icon={row.icon ?? '📦'}
                label={row.name}
                value={expenseValues[row.key] ?? 0}
                onChange={(v) =>
                  setExpenseValues((prev) => ({
                    ...prev,
                    [row.key]: v,
                  }))
                }
              />
            ))}
          </div>
        )}

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          disabled={expenseRows.length > 0 && !hasExpensePositive}
          onClick={() => onStepChange(5)}
        >
          Continuar <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 5: Conquest Card + persistir Block A ─────────────────────
  if (step === 5) {
    const incomeSum = Object.values(incomeValues).reduce((a, b) => a + b, 0);
    const expenseSum = Object.values(expenseValues).reduce((a, b) => a + b, 0);
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

    const fmtMoney = (n: number) =>
      n > 0
        ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês`
        : '—';

    const metrics = [
      { label: 'Receitas informadas', value: fmtMoney(incomeSum) },
      { label: 'Despesas informadas', value: fmtMoney(expenseSum) },
      { label: 'Seu principal objetivo', value: goalLabels[profile.mainGoal ?? 'outro'] ?? '—' },
      { label: 'Dependentes', value: dependentsLabel },
    ];

    const insight =
      'Seu perfil e seus números iniciais estão registrados. Na próxima etapa você pode conectar seus bancos para refinar tudo com dados reais.';

    const handleVerRaioX = async () => {
      if (!user?.id) {
        toast.error('Sessão inválida. Faça login novamente.');
        return;
      }
      setSavingBlockA(true);
      try {
        const incomeData = Object.entries(incomeValues)
          .filter(([, v]) => v > 0)
          .map(([key, value]) => ({ key, value }));
        const expenseData = Object.entries(expenseValues)
          .filter(([, v]) => v > 0)
          .map(([key, value]) => ({ key, value }));

        const { error } = await supabase.rpc('save_onboarding_block_a', {
          p_income_data: incomeData as never,
          p_expense_data: expenseData as never,
        });
        if (error) throw error;

        const { error: trackErr } = await supabase.rpc('track_onboarding_event', {
          p_event_name: 'block_a_completed',
          p_step: 5,
          p_metadata: {
            income_count: incomeData.length,
            expense_count: expenseData.length,
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
