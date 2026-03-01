import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/tracking';

const APP_URL = 'https://app.rxfin.com.br';

export const FreemiumSection: React.FC = () => (
  <section className="py-16 px-4 sm:px-6 lg:px-8">
    <div className="max-w-3xl mx-auto">
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/75 text-white p-8 sm:p-12 text-center shadow-xl shadow-primary/15"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/8 rounded-full blur-3xl translate-x-24 -translate-y-24" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-x-12 translate-y-12" />

        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">
            Comece gratuitamente
          </h2>
          <p className="text-white/85 mb-2 max-w-md mx-auto text-sm leading-relaxed">
            Use os simuladores agora.
          </p>
          <p className="text-white/70 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Em breve, desbloqueie o sistema completo de planejamento financeiro.
          </p>

          <a href={`${APP_URL}/auth`} onClick={() => trackCTAClick('freemium_criar_conta', `${APP_URL}/auth`)}>
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/95 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 font-semibold"
            >
              Criar conta gratuita
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </a>
        </div>
      </motion.div>
    </div>
  </section>
);
