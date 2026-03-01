import React from 'react';
import { motion } from 'framer-motion';
import { Plug, Building2, CreditCard, LineChart } from 'lucide-react';

const features = [
  { icon: Plug, text: 'Contas bancárias via Open Finance' },
  { icon: CreditCard, text: 'Gastos, cartões e patrimônio' },
  { icon: LineChart, text: 'Projeção de fluxo de caixa' },
  { icon: Building2, text: 'Planejamento de longo prazo' },
];

export const SystemOverviewSection: React.FC = () => (
  <section id="sistema" className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/50">
    <div className="max-w-3xl mx-auto">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
          O RXFin vai além dos <span className="text-primary">simuladores</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          O RXFin é um sistema completo de planejamento financeiro pessoal que integra:
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {features.map((f, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200"
            initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">{f.text}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="text-center space-y-1"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-sm text-muted-foreground">Os simuladores são o primeiro passo.</p>
        <p className="text-sm font-semibold text-foreground">O sistema completo conecta passado, presente e futuro financeiro.</p>
      </motion.div>
    </div>
  </section>
);
