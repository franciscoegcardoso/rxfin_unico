import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, Telescope, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AUTO_ADVANCE_MS = 4000;

const blocks = [
  {
    step: '01',
    tabLabel: 'Passado',
    label: 'Entenda o passado',
    icon: Search,
    title: 'Diagnóstico Real',
    bullets: [
      'Consolidação automática de contas bancárias',
      'Categorização inteligente de gastos',
      'Diagnóstico real do seu padrão financeiro',
    ],
  },
  {
    step: '02',
    tabLabel: 'Presente',
    label: 'Controle o presente',
    icon: Shield,
    title: 'Gestão de Alto Nível',
    bullets: [
      'Dashboard multibancos',
      'Projeção automática de faturas',
      'Fluxo de caixa previsto',
      'Indicadores de saúde financeira',
    ],
  },
  {
    step: '03',
    tabLabel: 'Futuro',
    label: 'Projete o futuro',
    icon: Telescope,
    title: 'Visão de Longo Prazo',
    bullets: [
      'Simulação de patrimônio em 10, 20 e 30 anos',
      'Planejamento de metas e sonhos',
      'Gestão de ativos (imóveis, veículos, investimentos)',
      'Apoio estratégico ao Imposto de Renda',
    ],
  },
];

export const TimelineSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isPaused) {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
      return;
    }
    startTimeRef.current = performance.now();
    setProgress(0);

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const p = Math.min((elapsed / AUTO_ADVANCE_MS) * 100, 100);
      setProgress(p);
      if (p >= 100) {
        setActiveIndex((i) => (i + 1) % blocks.length);
        startTimeRef.current = performance.now();
        setProgress(0);
      }
      progressRef.current = requestAnimationFrame(tick);
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [activeIndex, isPaused]);

  return (
    <section
      id="sistema"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,25%)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-5 bg-white/20 text-white border-white/30 hover:bg-white/25 text-xs px-3 py-1 font-medium">
            <Sparkles className="h-3 w-3 mr-1.5" />
            Baseado em Gestão Financeira Corporativa
          </Badge>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-tight text-white">
            Um Sistema que <span className="text-white/90 underline decoration-white/30 underline-offset-4">Funciona</span>
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto text-sm sm:text-base">
            Três pilares para transformar sua relação com o dinheiro de forma definitiva
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {blocks.map((item, i) => (
            <button
              key={item.step}
              type="button"
              onClick={() => {
                setActiveIndex(i);
                setProgress(0);
                startTimeRef.current = performance.now();
              }}
              className={`relative overflow-hidden px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                i === activeIndex
                  ? 'bg-white text-[hsl(161,79%,25%)] shadow-md'
                  : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
              }`}
            >
              <span className="font-mono mr-1.5 opacity-80">{item.step}</span>
              {item.tabLabel}
              {i === activeIndex && (
                <span
                  className="absolute bottom-0 left-0 h-0.5 bg-[hsl(161,79%,25%)] rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo da tab ativa */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl bg-gradient-to-br from-[hsl(161,40%,88%)] to-[hsl(161,35%,78%)] border border-[hsl(161,30%,70%)]/50 p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto"
          >
            <p className="text-xs font-medium text-[hsl(161,40%,25%)] uppercase tracking-wider mb-4">
              <span className="font-bold text-[hsl(161,79%,25%)] mr-1.5">{blocks[activeIndex].step}</span>
              {blocks[activeIndex].label}
            </p>

            <div className="w-14 h-14 mb-5 rounded-2xl bg-[hsl(161,79%,25%)] flex items-center justify-center">
                {React.createElement(blocks[activeIndex].icon, { className: 'h-7 w-7 text-white' })}
            </div>

            <h3 className="text-xl sm:text-2xl font-bold mb-4 text-[hsl(161,40%,12%)]">
              {blocks[activeIndex].title}
            </h3>

            <ul className="space-y-2">
              {blocks[activeIndex].bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-[hsl(161,30%,20%)] leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[hsl(161,79%,25%)] shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
