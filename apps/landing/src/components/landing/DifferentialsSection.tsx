import React from 'react';
import { motion } from 'framer-motion';
import { Plug, Building2, FileText, LineChart, Brain, Zap } from 'lucide-react';

const differentials = [
  { icon: Plug, text: 'Integração automática via Open Finance' },
  { icon: Building2, text: 'Dados consolidados de múltiplos bancos' },
  { icon: FileText, text: 'Conexão com Imposto de Renda' },
  { icon: LineChart, text: 'Projeção de patrimônio de longo prazo' },
  { icon: Brain, text: 'Uso de IA para insights financeiros' },
  { icon: Zap, text: 'Menos digitação, mais inteligência' },
];

export const DifferentialsSection: React.FC = () => (
  <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/50">
    <div className="max-w-4xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-tight">
          Por que o RXFin é <span className="text-primary">diferente</span>?
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {differentials.map((d, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200"
            initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <d.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">{d.text}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="text-center space-y-1"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-muted-foreground text-sm">Não é planilha digital.</p>
        <p className="text-muted-foreground text-sm">Não é apenas controle de gastos.</p>
        <p className="text-foreground font-semibold text-sm">É um ecossistema financeiro pessoal.</p>
      </motion.div>
    </div>
  </section>
);
