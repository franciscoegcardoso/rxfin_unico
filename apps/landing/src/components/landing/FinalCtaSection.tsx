import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/tracking';

const APP_URL = 'https://app.rxfin.com.br';

export const FinalCtaSection: React.FC = () => (
  <section className="py-20 px-4 sm:px-6 lg:px-8">
    <div className="max-w-lg mx-auto">
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-b from-card to-primary/[0.03] px-6 py-10 sm:px-10 sm:py-12 text-center shadow-sm"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-full" />

        <h2 className="text-xl sm:text-2xl font-bold mb-4 tracking-tight">
          Tomar boas decisões financeiras começa com bons números.
        </h2>

        <a href={`${APP_URL}/auth`} onClick={() => trackCTAClick('final_criar_conta', `${APP_URL}/auth`)}>
          <Button
            size="lg"
            className="gradient-primary text-white w-full sm:w-auto px-10 h-12 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
          >
            Comece grátis
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </a>

        <p className="mt-4 text-[11px] text-muted-foreground/60">
          Cadastro rápido · Sem cartão de crédito
        </p>
      </motion.div>
    </div>
  </section>
);
