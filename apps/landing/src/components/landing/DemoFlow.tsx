import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: 'Conectar banco' },
  { label: 'IA categoriza' },
  { label: 'Orçamento' },
  { label: 'IR organizado' },
  { label: '30 anos' },
];

const BANKS = [
  { emoji: '🏦', nome: 'Itaú' },
  { emoji: '💜', nome: 'Nubank' },
  { emoji: '🟠', nome: 'XP' },
  { emoji: '🏛️', nome: 'Bradesco' },
  { emoji: '🟡', nome: 'Inter' },
  { emoji: '🔵', nome: 'C6 Bank' },
];

const TRANSACTIONS = [
  { desc: 'iFood — Pizzaria', val: '-R$ 78,90', neg: true, cat: '🍽️ Alimentação' },
  { desc: 'Salário — Empresa', val: '+R$ 8.400', neg: false, cat: '💼 Receita' },
  { desc: 'Uber — corrida', val: '-R$ 64,20', neg: true, cat: '🚌 Transporte' },
  { desc: 'Netflix', val: '-R$ 55,90', neg: true, cat: '🎮 Lazer' },
  { desc: 'Clínica Odontológica', val: '-R$ 480,00', neg: true, cat: '💊 Saúde' },
  { desc: 'Aluguel — Março 2026', val: '-R$ 1.800', neg: true, cat: '🏠 Moradia' },
  { desc: 'IPVA 2026', val: '-R$ 920,00', neg: true, cat: '🚗 Veículo' },
];

const STEP_CONTENT = [
  {
    label: 'Passo 01 — Open Finance',
    title: 'Conecte seus bancos em segundos',
    desc: 'Regulamentado pelo Banco Central. Sem armazenar senha — autenticação direto no app do banco.',
    bullets: ['+300 bancos e fintechs disponíveis', 'Auth direto no app do banco', 'Sem senha armazenada no RXFin', 'Sync automático a cada 24h'],
  },
  {
    label: 'Passo 02 — IA',
    title: 'Cibélia categoriza automaticamente',
    desc: 'A IA analisa cada transação e atribui a categoria. Você confirma tudo em lote.',
    bullets: ['95%+ categorizadas automaticamente', 'Aprende com seus ajustes', 'Detecta recorrências futuras', 'Confirmação individual ou em lote'],
  },
  {
    label: 'Passo 03 — Dashboard',
    title: 'Orçamento em tempo real',
    desc: 'Dashboard consolidado multibancos. Metas, faturas e fluxo de caixa em uma tela.',
    bullets: ['Dashboard multibancos consolidado', 'Projeção automática de faturas', 'Alertas de desvio de meta', 'Fluxo de caixa até fim do mês'],
  },
  {
    label: 'Passo 04 — Meu IR',
    title: 'Declaração de IR organizada o ano inteiro',
    desc: 'Cada lançamento categorizado alimenta o fiscal. Deduções calculadas em tempo real.',
    bullets: ['Potencial de dedução em tempo real', 'Comprovantes por categoria', 'Alerta no limite de dedução', 'Cibélia responde dúvidas fiscais'],
  },
  {
    label: 'Passo 05 — 30 anos',
    title: 'Veja seu patrimônio crescer até 2056',
    desc: 'Com ativos e receitas mapeados, o RXFin projeta 3 cenários e calcula o aporte mensal ideal.',
    bullets: ['Taxa real (inflação descontada)', 'Integra imóveis, ações e veículos', 'Simula impacto de aportes extras', 'Vinculado ao plano de aposentadoria'],
  },
];

export default function DemoFlow() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [bankIdx, setBankIdx] = useState<number | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [animated4, setAnimated4] = useState(false);
  const [milestoneVals, setMilestoneVals] = useState({ a: 0, b: 0, c: 0, d: 0 });
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) setStep(0);
  }, [isVisible]);

  useEffect(() => {
    if (paused || !isVisible) return;
    const t = setInterval(() => setStep((s) => (s >= 4 ? 0 : s + 1)), 9000);
    return () => clearInterval(t);
  }, [paused, isVisible]);

  useEffect(() => {
    if (step !== 1) return;
    setRevealed([]);
    TRANSACTIONS.forEach((_, i) => {
      setTimeout(() => setRevealed((r) => [...r, i]), 400 * (i + 1));
    });
  }, [step]);

  useEffect(() => {
    if (step !== 4) return;
    setAnimated4(true);
    const targets = { a: 218, b: 261, c: 780, d: 3.2 };
    const start = Date.now();
    const dur = 1200;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / dur, 1);
      const ease = 1 - (1 - t) * (1 - t);
      setMilestoneVals({
        a: Math.round(targets.a * ease),
        b: Math.round(targets.b * ease),
        c: Math.round(targets.c * ease),
        d: Math.round(targets.d * 100 * ease) / 100,
      });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [step]);

  useEffect(() => {
    if (step !== 0 || !authorized) return;
    setProgress(0);
    const start = Date.now();
    const dur = 2000;
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      setProgress(t * 100);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [step, authorized]);

  const content = STEP_CONTENT[step];

  return (
    <section ref={sectionRef} className="border-t border-border bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-foreground/70 text-xs px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Do banco conectado ao plano de 30 anos
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Do banco conectado ao{' '}
            <span className="text-primary">Plano de 30 anos</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Veja cada etapa acontecendo — da conexão Open Finance à projeção de aposentadoria.
          </p>
        </div>

        <div className="flex items-center justify-center gap-0 mb-12 max-w-2xl mx-auto flex-wrap">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => { setStep(i); setPaused(true); }}
                  className={cn(
                    'w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center flex-shrink-0',
                    i === step ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30' : i < step ? 'bg-primary/40 text-primary/90' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {i + 1}
                </button>
                <span className="text-[10px] text-muted-foreground mt-1 text-center w-16 hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mx-1 min-w-[12px]', i < step ? 'bg-primary/40' : 'bg-border')} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[420px]">
          <div>
            <p className="text-muted-foreground text-xs font-medium mb-2">{content.label}</p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3">{content.title}</h3>
            <p className="text-muted-foreground text-sm mb-4">{content.desc}</p>
            <ul className="space-y-2">
              {content.bullets.map((b, i) => (
                <li key={i} className="text-foreground/90 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center">
            {step === 0 && <Step0Visual bankIdx={bankIdx} setBankIdx={setBankIdx} authorized={authorized} setAuthorized={setAuthorized} progress={progress} />}
            {step === 1 && <Step1Visual revealed={revealed} />}
            {step === 2 && <Step2Visual />}
            {step === 3 && <Step3Visual />}
            {step === 4 && <Step4Visual animated={animated4} milestoneVals={milestoneVals} />}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-12">
          <button
            type="button"
            onClick={() => { setStep((s) => Math.max(0, s - 1)); setPaused(true); }}
            disabled={step === 0}
            className="p-2 rounded-lg bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-muted-foreground text-sm tabular-nums">{step + 1} / 5</span>
          {step === 4 ? (
            <a
              href="https://app.rxfin.com.br"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Começar grátis →
            </a>
          ) : (
            <button
              type="button"
              onClick={() => { setStep((s) => s + 1); setPaused(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Próximo
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Step0Visual({
  bankIdx,
  setBankIdx,
  authorized,
  setAuthorized,
  progress,
}: {
  bankIdx: number | null;
  setBankIdx: (n: number | null) => void;
  authorized: boolean;
  setAuthorized: (b: boolean) => void;
  progress: number;
}) {
  if (authorized) {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center w-full max-w-xs">
        <p className="font-bold text-foreground text-lg mb-1">✅ Conectado!</p>
        <p className="text-muted-foreground text-sm mb-3">Importando transações...</p>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        {progress >= 100 && <p className="text-primary text-sm font-semibold">87 transações importadas</p>}
      </div>
    );
  }
  if (bankIdx !== null) {
    const bank = BANKS[bankIdx];
    return (
      <div className="w-48 mx-auto">
        <div className="bg-white rounded-2xl border-4 border-gray-800 shadow-2xl overflow-hidden">
          <div className="w-12 h-2.5 bg-gray-800 rounded-b-xl mx-auto" />
          <div className="p-4 flex flex-col gap-3">
            <p className="text-4xl text-center">{bank.emoji}</p>
            <p className="font-bold text-center text-[#0d2b20] text-sm">{bank.nome}</p>
            <p className="text-xs text-gray-500 text-center">O RXFin solicita acesso:</p>
            <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600">
              ✓ Saldo e extratos | ✓ Transações 12 meses | ✓ Dados da conta
            </div>
            <button
              type="button"
              onClick={() => setAuthorized(true)}
              className="bg-primary text-primary-foreground text-xs rounded-lg py-2 w-full font-medium"
            >
              Autorizar
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 max-w-[240px] mx-auto">
        {BANKS.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setBankIdx(i)}
            className="bg-muted/50 border border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/10 transition-all"
          >
            <span className="text-2xl block mb-1">{b.emoji}</span>
            <span className="text-foreground text-sm">{b.nome}</span>
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-xs text-center mt-3">← Clique para simular conexão</p>
    </div>
  );
}

function Step1Visual({ revealed }: { revealed: number[] }) {
  return (
    <div className="w-full max-w-sm space-y-1.5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-muted-foreground text-xs">Cibélia analisando 87 transações</span>
      </div>
      {TRANSACTIONS.map((t, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all',
            revealed.includes(i) ? 'border-primary/20 bg-primary/5 border' : 'bg-muted/50 border border-border'
          )}
        >
          <div>
            <span className="text-foreground">{t.desc}</span>
            <span className={t.neg ? 'text-red-400 ml-2' : 'text-green-400 ml-2'}>{t.val}</span>
          </div>
          {revealed.includes(i) ? (
            <span className="bg-primary/20 text-primary text-[10px] rounded-full px-2 py-0.5">{t.cat}</span>
          ) : (
            <span className="bg-muted text-muted-foreground text-[10px] rounded-full px-2 py-0.5 animate-pulse">analisando...</span>
          )}
        </div>
      ))}
      {revealed.length === TRANSACTIONS.length && (
        <button type="button" className="w-full mt-3 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium">
          ✓ Confirmar todas →
        </button>
      )}
    </div>
  );
}

function Step2Visual() {
  return (
    <div className="max-w-sm mx-auto rounded-xl overflow-hidden shadow-2xl border border-white/10 -rotate-1 text-left">
      <div className="bg-red-600 py-1 px-3 text-white text-[8px] font-bold tracking-wide">
        ⚠ DADOS FICTÍCIOS • COMEÇAR RAIO-X →
      </div>
      <div className="bg-white px-4 py-2.5 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="rounded-full w-6 h-6 bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">F</div>
          <span className="text-[10px] font-semibold text-[#0d2b20]">Olá, Francisco! 👋</span>
        </div>
        <span className="text-[9px] text-gray-400">Março 2026</span>
      </div>
      <div className="grid grid-cols-4 gap-1 bg-white px-3 py-2 border-b border-gray-100">
        {[
          ['RECEITAS', 'R$8.400', 'text-green-600'],
          ['DESPESAS', 'R$5.230', 'text-red-500'],
          ['SALDO', 'R$3.170', 'text-green-600'],
          ['TRANSAÇÕES', '87', 'text-gray-700'],
        ].map(([label, val, color], i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded p-1.5 text-center">
            <div className="text-[6px] font-bold text-gray-400 uppercase">{label}</div>
            <div className={cn('text-[9px] font-bold', color)}>{val}</div>
          </div>
        ))}
      </div>
      <div className="bg-white px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-bold text-gray-600">Metas do Mês</span>
          <span className="text-[7px] px-1.5 py-0.5 rounded bg-amber-400/30 text-amber-700">LIVE</span>
        </div>
        {[
          ['🏠 Contas da Casa', 84, 'bg-amber-400'],
          ['🍽 Alimentação', 80, 'bg-primary'],
          ['🚌 Transporte', 63, 'bg-blue-400'],
          ['🎮 Lazer', 100, 'bg-red-500'],
        ].map(([label, pct, fill], i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <span className="text-[7px] text-gray-500 w-24">{label}</span>
            <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
              <div className={cn('h-full rounded-full', fill)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[7px] text-gray-400 w-6 text-right">{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step3Visual() {
  const bars = [
    { icon: '❤️', label: 'Saúde', sub: '4 docs · sem limite', valor: 'R$ 7.300', pct: 100, delay: 300, cor: 'bg-primary', alerta: false },
    { icon: '🎓', label: 'Educação', sub: 'limite R$ 3.561 ⚠', valor: 'R$ 8.400', pct: 100, delay: 600, cor: 'bg-amber-400', alerta: true },
    { icon: '🛡️', label: 'Previdência', sub: 'limite 12% renda', valor: 'R$ 6.000', pct: 72, delay: 900, cor: 'bg-primary', alerta: false },
  ];
  return (
    <div className="max-w-sm mx-auto flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: 'R$ 21.700', label: 'Potencial dedução' },
          { val: '6', label: 'Comprovantes 2026' },
          { val: 'R$ 0', label: 'Não dedutíveis' },
        ].map(({ val, label }, i) => (
          <div key={i} className="bg-muted/50 border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-primary">{val}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-muted/50 border border-border rounded-xl p-4">
        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-3">PROGRESSO DEDUÇÃO</p>
        {bars.map((b, i) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] text-foreground/80">{b.icon} {b.label}</span>
              <span className={cn('text-[9px]', b.alerta ? 'text-amber-400' : 'text-muted-foreground')}>{b.valor}</span>
            </div>
            <p className="text-[8px] text-muted-foreground mb-1">{b.sub}</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-1000', b.cor)} style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-muted/50 border border-border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] text-muted-foreground">Cibélia — Fiscal Organizer</span>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-[9px] text-primary-foreground font-bold">C</div>
          <div className="bg-primary/10 border border-primary/20 rounded-[2px_8px_8px_8px] px-3 py-2 text-[11px] text-foreground/90 leading-relaxed">
            Você foi ao dentista → guarde o comprovante. Despesas odontológicas são <strong className="text-foreground">dedutíveis sem limite</strong>. 🦷
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4Visual({ animated, milestoneVals }: { animated: boolean; milestoneVals: { a: number; b: number; c: number; d: number } }) {
  return (
    <div className="max-w-sm mx-auto flex flex-col gap-3">
      <div className="bg-muted/50 border border-border rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[9px] font-bold text-muted-foreground uppercase">PROJEÇÃO DE PATRIMÔNIO</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-primary/40 inline-block" />Conservador</span>
            <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Realista</span>
            <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Otimista</span>
          </div>
        </div>
        <svg viewBox="0 0 400 110" className="w-full">
          <defs>
            <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d7252" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d7252" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="40" y1="15" x2="390" y2="15" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          <line x1="40" y1="50" x2="390" y2="50" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          <line x1="40" y1="85" x2="390" y2="85" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          <text x="2" y="18" fontSize="7" fill="rgba(0,0,0,0.45)">R$5M</text>
          <text x="2" y="53" fontSize="7" fill="rgba(0,0,0,0.45)">R$3M</text>
          <text x="2" y="88" fontSize="7" fill="rgba(0,0,0,0.45)">R$1M</text>
          <text x="38" y="105" fontSize="7" fill="rgba(0,0,0,0.45)">Hoje</text>
          <text x="148" y="105" fontSize="7" fill="rgba(0,0,0,0.45)">2027</text>
          <text x="248" y="105" fontSize="7" fill="rgba(0,0,0,0.45)">2036</text>
          <text x="360" y="105" fontSize="7" fill="rgba(0,0,0,0.45)">2056</text>
          <polygon points="45,95 120,82 200,68 280,50 360,28 390,15 390,95" fill="url(#gradReal)" />
          <polyline points="45,95 120,88 200,80 280,70 360,58 390,52" stroke="rgba(45,184,122,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" style={{ strokeDasharray: 600, strokeDashoffset: animated ? 0 : 600, transition: 'stroke-dashoffset 0.8s ease-out' }} />
          <polyline points="45,95 120,82 200,68 280,50 360,28 390,15" stroke="#2db87a" strokeWidth="2" fill="none" strokeLinecap="round" style={{ strokeDasharray: 600, strokeDashoffset: animated ? 0 : 600, transition: 'stroke-dashoffset 0.8s ease-out' }} />
          <polyline points="45,95 120,76 200,58 280,36 360,14 390,5" stroke="#4ade80" strokeWidth="1.5" fill="none" strokeLinecap="round" style={{ strokeDasharray: 600, strokeDashoffset: animated ? 0 : 600, transition: 'stroke-dashoffset 0.8s ease-out' }} />
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { anos: '+1 ano', val: milestoneVals.a, suf: 'k', destaque: false },
          { anos: '+2 anos', val: milestoneVals.b, suf: 'k', destaque: false },
          { anos: '+10 anos', val: milestoneVals.c, suf: 'k', destaque: false },
          { anos: '+30 anos', val: milestoneVals.d, suf: 'M', destaque: true },
        ].map(({ anos, val, suf, destaque }, i) => (
          <div
            key={i}
            className={cn(
              'rounded-lg p-2.5 text-center border',
              destaque ? 'bg-primary/10 border-primary/40' : 'bg-muted/50 border-border'
            )}
          >
            <p className="text-[8px] font-bold text-primary uppercase tracking-wide">{anos}</p>
            <p className="text-[13px] font-bold text-foreground mt-0.5">
              {suf === 'M' ? `R$ ${val.toFixed(1)}M` : `R$ ${val}${suf}`}
            </p>
            {destaque && <p className="text-[7px] text-muted-foreground">cenário realista</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
