import React from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, Telescope, Sparkles, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const blocks = [
  {
    step: '01',
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

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.1,
    },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const TimelineSection: React.FC = () => {
  return (
    <section
      id="sistema"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,25%)]"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-14"
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

        {/* Grid: 3 cards lado a lado no desktop, com setas animadas de interligação */}
        <motion.div
          className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {blocks.map((item, i) => (
            <motion.div
              key={item.step}
              variants={cardItem}
              className="group relative"
            >
              <motion.div
                className="relative h-full p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[hsl(161,40%,88%)] to-[hsl(161,35%,78%)] border border-[hsl(161,30%,70%)]/50 transition-all duration-300"
                whileHover={{
                  y: -6,
                  boxShadow: '0 20px 40px -12px hsla(161,79%,15%,0.35)',
                  borderColor: 'hsl(161,30%,70%)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {/* Seta de interligação à direita (desktop) */}
                {i < blocks.length - 1 && (
                  <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-[hsl(161,79%,25%)]/90 text-white">
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </div>
                )}

                <p className="text-xs font-medium text-[hsl(161,40%,25%)] uppercase tracking-wider mb-4">
                  <span className="font-bold text-[hsl(161,79%,25%)] mr-1.5">{item.step}</span>
                  {item.label}
                </p>

                <motion.div
                  className="w-14 h-14 mb-5 rounded-2xl bg-[hsl(161,79%,25%)] flex items-center justify-center"
                  whileHover={{ scale: 1.05, rotate: -3 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {React.createElement(item.icon, { className: 'h-7 w-7 text-white' })}
                </motion.div>

                <h3 className="text-xl font-bold mb-4 text-[hsl(161,40%,12%)]">
                  {item.title}
                </h3>

                <ul className="space-y-2">
                  {item.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[hsl(161,30%,20%)] leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[hsl(161,79%,25%)] shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Barra de fluxo contínua abaixo dos cards: reforça a ideia de fases interligadas */}
        <motion.div
          className="mt-8 flex justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <div className="h-1 w-full max-w-2xl rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-white/0 via-white/40 to-white/0"
              style={{ width: '40%' }}
              animate={{ x: ['-100%', '350%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
