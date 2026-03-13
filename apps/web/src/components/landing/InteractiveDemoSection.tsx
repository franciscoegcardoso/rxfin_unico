// build-trigger: InteractiveDemoSection frame fix v1
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BANKS = [
  { id: 'itau', name: 'Itaú', color: '#EC7000', initial: 'I', cdnLogo: 'https://logo.clearbit.com/itau.com.br' },
  { id: 'nubank', name: 'Nubank', color: '#8A05BE', initial: 'N', cdnLogo: 'https://logo.clearbit.com/nubank.com.br' },
  { id: 'bradesco', name: 'Bradesco', color: '#CC092F', initial: 'B', cdnLogo: 'https://logo.clearbit.com/bradesco.com.br' },
  { id: 'bb', name: 'Banco do Brasil', color: '#F9D000', initial: 'BB', cdnLogo: 'https://logo.clearbit.com/bb.com.br' },
  { id: 'inter', name: 'Inter', color: '#FF7A00', initial: 'I', cdnLogo: 'https://logo.clearbit.com/bancointer.com.br' },
  { id: 'c6', name: 'C6 Bank', color: '#232323', initial: 'C6', cdnLogo: 'https://logo.clearbit.com/c6bank.com.br' },
  { id: 'xp', name: 'XP', color: '#FF6B00', initial: 'XP', cdnLogo: 'https://logo.clearbit.com/xp.com.br' },
  { id: 'caixa', name: 'Caixa', color: '#006DB7', initial: 'CEF', cdnLogo: 'https://logo.clearbit.com/caixa.gov.br' },
  { id: 'santander', name: 'Santander', color: '#EC0000', initial: 'S', cdnLogo: 'https://logo.clearbit.com/santander.com.br' },
  { id: 'picpay', name: 'PicPay', color: '#21C25E', initial: 'PP', cdnLogo: 'https://logo.clearbit.com/picpay.com' },
  { id: 'sicredi', name: 'Sicredi', color: '#009944', initial: 'SC', cdnLogo: 'https://logo.clearbit.com/sicredi.com.br' },
  { id: 'neon', name: 'Neon', color: '#2CF5D7', initial: 'N', cdnLogo: 'https://logo.clearbit.com/neon.com.br' },
];

const CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Moradia', 'Educação', 'Receita', 'Vestuário', 'Veículos', 'Outros'];

const TRANSACTIONS = [
  { id: 1, desc: 'iFood — Pizzaria', value: -78.9, category: 'Alimentação', color: '#F97316' },
  { id: 2, desc: 'Salário — Empresa', value: 8400, category: 'Receita', color: '#22C55E' },
  { id: 3, desc: 'Uber — corrida', value: -64.2, category: 'Transporte', color: '#3B82F6' },
  { id: 4, desc: 'Netflix', value: -55.9, category: 'Lazer', color: '#A855F7' },
  { id: 5, desc: 'Clínica Odontológica', value: -480, category: 'Saúde', color: '#EF4444' },
  { id: 6, desc: 'Aluguel — Março 2026', value: -1800, category: 'Moradia', color: '#6366F1' },
  { id: 7, desc: 'IPVA 2026', value: -920, category: 'Veículos', color: '#F59E0B' },
];

const TREEMAP_MACRO = [
  { id: 'moradia', label: 'Moradia', value: 2800, pct: 34, color: '#6366F1' },
  { id: 'alimentacao', label: 'Alimentação', value: 1600, pct: 19, color: '#F97316' },
  { id: 'transporte', label: 'Transporte', value: 980, pct: 12, color: '#3B82F6' },
  { id: 'lazer', label: 'Lazer', value: 820, pct: 10, color: '#A855F7' },
  { id: 'saude', label: 'Saúde', value: 680, pct: 8, color: '#EF4444' },
  { id: 'outros', label: 'Outros', value: 1400, pct: 17, color: '#64748B' },
];

const TREEMAP_MICRO: Record<string, { label: string; value: number }[]> = {
  moradia: [
    { label: 'Aluguel', value: 1800 },
    { label: 'Condomínio', value: 600 },
    { label: 'IPTU', value: 400 },
  ],
  alimentacao: [
    { label: 'iFood', value: 380 },
    { label: 'Supermercado', value: 820 },
    { label: 'Restaurantes', value: 400 },
  ],
  transporte: [
    { label: 'Uber', value: 320 },
    { label: 'Combustível', value: 400 },
    { label: 'Estacionamento', value: 260 },
  ],
  lazer: [
    { label: 'Netflix', value: 56 },
    { label: 'Streaming', value: 120 },
    { label: 'Outros', value: 644 },
  ],
  saude: [
    { label: 'Clínica', value: 480 },
    { label: 'Farmácia', value: 200 },
  ],
  outros: [
    { label: 'Diversos', value: 1400 },
  ],
};

const STEP_HINTS = [
  '👆 Toque em um banco para simular a conexão Open Finance',
  '✏️ Edite ou confirme as categorias sugeridas pela IA',
  '🔍 Clique em uma categoria para ver o detalhamento',
  '📄 Seu IR se organiza automaticamente ao longo do ano',
  '📈 Projeção baseada nos seus ativos e padrão de gastos',
];

const STEP_LABELS = ['Conectar banco', 'IA categoriza', 'Orçamento', 'IR organizado', '30 anos'];

function IPhoneFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[320px] overflow-visible ${className}`}
      style={{ aspectRatio: '320/620' }}
    >
      {/* Corpo do iPhone — bordas e sombra via style para garantir em produção */}
      <div
        className="absolute inset-0 bg-[#1a1a1a] shadow-2xl shadow-black/60"
        style={{ borderRadius: 44, border: '3px solid #3a3a3a' }}
      />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-7 bg-black rounded-full z-10" />
      <div
        className="absolute flex flex-col overflow-hidden bg-[#0f1a14]"
        style={{ top: 12, left: 8, right: 8, bottom: 10, borderRadius: 36 }}
      >
        <div className="flex shrink-0 justify-between items-center px-6 py-2 text-[10px] text-white/60">
          <span>9:41</span>
          <div className="flex gap-1 items-center">
            <span>●●●</span>
            <span>WiFi</span>
            <span>🔋</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
      <div className="absolute right-[-5px] top-[120px] w-1 h-[60px] bg-[#3a3a3a] rounded-r-md" />
      <div className="absolute left-[-5px] top-[100px] w-1 h-9 bg-[#3a3a3a] rounded-l-md" />
      <div className="absolute left-[-5px] top-[145px] w-1 h-9 bg-[#3a3a3a] rounded-l-md" />
    </div>
  );
}

function formatCurrency(value: number) {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  return `${sign} R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export const InteractiveDemoSection: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [bankSearch, setBankSearch] = useState('');
  const [connectedBanks, setConnectedBanks] = useState<string[]>([]);
  const [bankStatus, setBankStatus] = useState<Record<string, 'idle' | 'connecting' | 'connected'>>({});
  const [txCategories, setTxCategories] = useState<Record<number, string>>(
    () => Object.fromEntries(TRANSACTIONS.map((t) => [t.id, t.category]))
  );
  const [txConfirmed, setTxConfirmed] = useState<Record<number, boolean>>({});
  const [txEditingId, setTxEditingId] = useState<number | null>(null);
  const [allCategoriesConfirmed, setAllCategoriesConfirmed] = useState(false);
  const [treemapDrill, setTreemapDrill] = useState<string | null>(null);

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return BANKS;
    return BANKS.filter((b) => b.name.toLowerCase().includes(q) || b.id.includes(q));
  }, [bankSearch]);

  const handleBankClick = (id: string) => {
    if (bankStatus[id] === 'connected' || bankStatus[id] === 'connecting') return;
    setBankStatus((prev) => ({ ...prev, [id]: 'connecting' }));
    setTimeout(() => {
      setBankStatus((prev) => ({ ...prev, [id]: 'connected' }));
      setConnectedBanks((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, 1500);
  };

  const handleNextStep1 = () => {
    if (connectedBanks.length === 0) return;
    setCurrentStep(2);
    setMaxUnlockedStep((prev) => Math.max(prev, 2));
  };

  const handleConfirmAllStep2 = () => {
    setAllCategoriesConfirmed(true);
    setTimeout(() => {
      setCurrentStep(3);
      setMaxUnlockedStep((prev) => Math.max(prev, 3));
    }, 2000);
  };

  const allTxConfirmed = TRANSACTIONS.every((t) => txConfirmed[t.id]);

  useEffect(() => {
    if (allCategoriesConfirmed) setAllCategoriesConfirmed(false);
  }, [currentStep]);

  return (
    <section className="bg-[#0d2b20] py-16 px-4 sm:px-6 lg:px-8 overflow-visible">
      <div className="max-w-4xl mx-auto overflow-visible">
        <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-1.5 rounded-full mb-6 block text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Simulador interativo — explore cada etapa
        </span>

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Do banco conectado ao Plano de 30 anos
          </h2>
          <p className="text-white/70 text-sm">
            Veja como o RXFin organiza sua vida financeira em poucos passos
          </p>
        </motion.div>

        {/* Stepper */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
          {STEP_LABELS.map((label, i) => {
            const step = i + 1;
            const isActive = currentStep === step;
            const isUnlocked = step <= maxUnlockedStep;
            const isPast = currentStep > step;
            return (
              <button
                key={step}
                type="button"
                onClick={() => isUnlocked && setCurrentStep(step)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  !isUnlocked
                    ? 'opacity-30 cursor-not-allowed text-white/50'
                    : isActive
                    ? 'bg-emerald-500 text-white scale-110 shadow-lg'
                    : isPast
                    ? 'bg-emerald-500/60 text-white'
                    : 'bg-white/10 text-white/90 hover:bg-white/20'
                }`}
              >
                {isPast && <Check className="h-3.5 w-3.5" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-center text-sm text-white/40 mb-8 min-h-[20px]">
          {STEP_HINTS[currentStep - 1]}
        </p>

        <div className="flex flex-col items-center gap-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <IPhoneFrame>
                  <div className="p-4 space-y-3">
                    <p className="text-center py-2 px-3 text-[11px] text-emerald-400 font-medium animate-pulse">
                      👆 Toque em um banco para simular a conexão
                    </p>
                    <input
                      type="text"
                      placeholder="Buscar banco ou fintech..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/40"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {filteredBanks.map((bank) => {
                        const status = bankStatus[bank.id] || 'idle';
                        return (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => handleBankClick(bank.id)}
                            disabled={status === 'connecting'}
                            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all disabled:opacity-70"
                          >
                            {status === 'connecting' ? (
                              <>
                                <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mb-1" />
                                <span className="text-[10px] text-emerald-400">Autenticando...</span>
                              </>
                            ) : status === 'connected' ? (
                              <>
                                <Check className="h-6 w-6 text-emerald-400 mb-1" />
                                <span className="text-[10px] text-emerald-400">Conectado</span>
                              </>
                            ) : (
                              <>
                                <img
                                  src={bank.cdnLogo}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover bg-white"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                                <div
                                  className="w-8 h-8 rounded-full items-center justify-center text-white text-xs font-bold hidden"
                                  style={{ backgroundColor: bank.color }}
                                >
                                  {bank.initial}
                                </div>
                                <span className="text-[10px] text-white/80 mt-0.5 truncate w-full text-center">
                                  {bank.name}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </IPhoneFrame>
                <Button
                  size="sm"
                  onClick={handleNextStep1}
                  disabled={connectedBanks.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                >
                  Avançar <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <IPhoneFrame>
                  <div className="p-3 space-y-2">
                    {TRANSACTIONS.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-lg bg-white/5 border border-white/10 p-2 flex flex-wrap items-center justify-between gap-1"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white truncate">{tx.desc}</p>
                          <p className={`text-[11px] ${tx.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(tx.value)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {txEditingId === tx.id ? (
                            <select
                              value={txCategories[tx.id]}
                              onChange={(e) => {
                                setTxCategories((prev) => ({ ...prev, [tx.id]: e.target.value }));
                                setTxEditingId(null);
                              }}
                              className="rounded bg-white/10 border border-white/20 text-white text-[10px] px-2 py-1"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c} className="bg-[#0f1a14]">{c}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded"
                              style={{ backgroundColor: `${tx.color}40`, color: tx.color }}
                            >
                              {txCategories[tx.id]}
                            </span>
                          )}
                          {!txConfirmed[tx.id] && (
                            <>
                              <button
                                type="button"
                                onClick={() => setTxEditingId(tx.id)}
                                className="text-[10px] text-white/70 hover:text-white"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => setTxConfirmed((prev) => ({ ...prev, [tx.id]: true }))}
                                className="text-[10px] text-emerald-400"
                              >
                                ✓
                              </button>
                            </>
                          )}
                          {txConfirmed[tx.id] && (
                            <span className="text-[10px] text-emerald-400">✓ Confirmado</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                      onClick={handleConfirmAllStep2}
                      disabled={allCategoriesConfirmed || !allTxConfirmed}
                    >
                      {allCategoriesConfirmed ? '✅ Categorias confirmadas!' : 'Confirmar todas →'}
                    </Button>
                  </div>
                </IPhoneFrame>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <IPhoneFrame>
                  <div className="p-3 space-y-3">
                    <div className="text-center py-1.5 px-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                      Saldo do mês: +R$ 6.000
                    </div>
                    {treemapDrill ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setTreemapDrill(null)}
                          className="text-[11px] text-emerald-400"
                        >
                          ← Voltar
                        </button>
                        <div className="space-y-2">
                          {(TREEMAP_MICRO[treemapDrill] ?? []).map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center rounded-lg px-3 py-2 text-xs text-white"
                              style={{
                                backgroundColor: `${TREEMAP_MACRO.find((m) => m.id === treemapDrill)?.color ?? '#64748B'}40`,
                              }}
                            >
                              <span>{item.label}</span>
                              <span>R$ {item.value.toLocaleString('pt-BR')}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {TREEMAP_MACRO.map((cell) => (
                          <button
                            key={cell.id}
                            type="button"
                            onClick={() => setTreemapDrill(cell.id)}
                            className="rounded-lg p-3 text-left text-xs text-white flex flex-col justify-end min-h-[72px] hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: cell.color }}
                          >
                            <span className="font-medium">{cell.label}</span>
                            <span>R$ {cell.value.toLocaleString('pt-BR')} · {cell.pct}%</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </IPhoneFrame>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <IPhoneFrame>
                  <div className="p-4 space-y-4">
                    <p className="text-sm font-medium text-white">IR organizado</p>
                    <p className="text-xs text-white/70">Potencial dedução</p>
                    <p className="text-lg font-bold text-emerald-400">R$ 21.700</p>
                    <div className="space-y-2">
                      {['Saúde', 'Educação', 'Previdência'].map((label, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-white/80">
                          <span>{label}</span>
                          <span>{[4200, 3500, 14000][i]?.toLocaleString('pt-BR')} (R$)</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: '75%' }} />
                    </div>
                  </div>
                </IPhoneFrame>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <IPhoneFrame>
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-medium text-white">Projeção 30 anos</p>
                    <p className="text-[11px] text-white/60">3 cenários baseados nos seus dados</p>
                    <div className="h-32 rounded-lg bg-white/5 border border-white/10 flex items-end justify-around gap-1 px-2 pb-2">
                      {[40, 65, 85].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t transition-all"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i === 0 ? '#22C55E' : i === 1 ? '#3B82F6' : '#A855F7',
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>Conservador</span>
                      <span>Moderado</span>
                      <span>Otimista</span>
                    </div>
                  </div>
                </IPhoneFrame>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
