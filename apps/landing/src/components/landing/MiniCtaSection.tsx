import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackWaitlistClick } from '@/lib/tracking';

export const MiniCtaSection: React.FC = () => {
  const handleClick = () => {
    trackWaitlistClick('mid');
    window.location.href = 'https://app.rxfin.com.br/auth';
  };

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/75 text-white p-8 sm:p-10 text-center shadow-xl shadow-primary/15"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/8 rounded-full blur-3xl translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-x-12 translate-y-12" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-[11px] font-medium mb-4 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              Vagas limitadas
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mb-2 tracking-tight">
              Garanta sua vaga no lançamento do RXFin
            </h2>
            <p className="text-white/85 mb-6 max-w-md mx-auto text-sm leading-relaxed">
              Acesso antecipado, condição especial e simuladores gratuitos para sempre.
            </p>

            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/95 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 font-semibold w-full sm:w-auto"
              onClick={handleClick}
            >
              Garantir Minha Vaga
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <p className="mt-4 text-[11px] text-white/60">
              Sem spam • Sem cartão
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
