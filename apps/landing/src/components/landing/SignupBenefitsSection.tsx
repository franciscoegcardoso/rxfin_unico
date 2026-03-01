import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/tracking';

const APP_URL = 'https://app.rxfin.com.br';

const benefits = [
  'Usar todos os simuladores gratuitamente',
  'Salvar suas simulações',
  'Comparar decisões ao longo do tempo',
  'Acesso antecipado e atualizações',
  'Condição especial de lançamento',
  'Evoluir para o sistema completo em breve',
];

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const listItem = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export const SignupBenefitsSection: React.FC = () => (
  <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,25%)]">
    <div className="max-w-7xl mx-auto">
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(161,40%,88%)] to-[hsl(161,35%,78%)] border border-[hsl(161,30%,70%)]/50 p-8 sm:p-10 lg:p-12 text-center shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-8 tracking-tight text-[hsl(161,40%,12%)]">
          Ao se cadastrar você pode:
        </h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-8 max-w-lg mx-auto sm:max-w-xl"
          variants={listContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {benefits.map((txt, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2.5 group"
              variants={listItem}
            >
              <CheckCircle2 className="h-4 w-4 text-[hsl(161,79%,25%)] shrink-0 group-hover:scale-110 transition-all duration-200" />
              <span className="text-sm text-[hsl(161,30%,20%)] text-left group-hover:text-[hsl(161,40%,12%)] transition-colors duration-200">{txt}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <a href={`${APP_URL}/signup`} onClick={() => trackCTAClick('signup_benefits_criar_conta', `${APP_URL}/signup`)}>
            <Button
              size="lg"
              className="bg-[hsl(161,79%,25%)] text-white hover:bg-[hsl(161,79%,20%)] shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 font-semibold group"
            >
              Criar conta gratuita
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </motion.div>

        <p className="mt-4 text-[11px] text-[hsl(161,25%,35%)]">
          Leva menos de 1 minuto.
        </p>
      </motion.div>
    </div>
  </section>
);
