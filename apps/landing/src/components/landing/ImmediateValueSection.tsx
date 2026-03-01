import React from 'react';
import { motion } from 'framer-motion';
import { Car, Scale, Percent, CreditCard, TrendingUp } from 'lucide-react';

const bullets = [
  { icon: Car, text: 'Descobrir o custo real de ter um carro' },
  { icon: Scale, text: 'Comparar financiamento vs consórcio' },
  { icon: Percent, text: 'Saber se um desconto à vista vale a pena' },
  { icon: CreditCard, text: 'Priorizar dívidas e reduzir juros' },
  { icon: TrendingUp, text: 'Entender o impacto financeiro das suas decisões' },
];

export const ImmediateValueSection: React.FC = () => (
  <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/50">
    <div className="max-w-3xl mx-auto">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
          O que você pode resolver <span className="text-primary">hoje</span> com o RXFin
        </h2>
      </motion.div>

      <div className="space-y-3 mb-8">
        {bullets.map((b, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200"
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <b.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm sm:text-base font-medium">{b.text}</span>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
      >
        Sem planilhas. Sem achismo. Sem complexidade.
      </motion.p>
    </div>
  </section>
);
