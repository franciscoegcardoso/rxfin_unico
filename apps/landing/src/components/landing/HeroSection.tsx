import React from 'react';
import { ShieldCheck, Lock, Server, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/tracking';

const APP_URL = 'https://app.rxfin.com.br';

interface HeroSectionProps {
  onScrollToSystem: () => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToSystem }) => {
  return (
    <section className="relative pt-20 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(161,30%,96%)] via-[hsl(161,20%,97%)] to-background dark:from-[hsl(161,20%,8%)] dark:via-[hsl(161,15%,6%)] dark:to-background" />
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/4 rounded-full blur-[80px]" />

      <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
        {/* Esquerda: conteúdo textual */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex-1 min-w-0 text-center lg:text-left"
        >
          <motion.div variants={fadeUp} className="flex justify-center lg:justify-start mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Zap className="h-3 w-3 animate-pulse" />
              Beta aberto · Simuladores 100% gratuitos
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-2xl sm:text-4xl lg:text-[3.25rem] font-bold text-foreground leading-[1.15] tracking-tight"
          >
            <span className="block sm:inline">Decida melhor.</span>{' '}
            <span className="block sm:inline">Evite erros caros.</span>
          </motion.h1>

          <motion.div variants={fadeUp} className="mt-1 sm:mt-2 lg:mt-3 mb-5">
            <span className="relative inline-block text-2xl sm:text-4xl lg:text-[3.25rem] font-bold text-primary leading-[1.15] tracking-tight pb-2 sm:pb-3">
              Simule antes de decidir.
              <motion.svg
                className="absolute left-0 w-full"
                style={{ bottom: 0 }}
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                height="8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <motion.path
                  d="M2 8 Q75 2 150 6 Q225 10 298 4"
                  stroke="hsl(161,79%,25%)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                />
                <motion.path
                  d="M2 10 Q75 4 150 8 Q225 12 298 6"
                  stroke="hsl(161,79%,25%)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.35"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.9, duration: 0.8, ease: 'easeOut' }}
                />
              </motion.svg>
            </span>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
          >
            Simuladores financeiros gratuitos + sistema completo com Open Finance. Conecte seus bancos, simule decisões e entenda seu dinheiro de verdade.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
            <a
              href={`${APP_URL}/auth`}
              onClick={() => trackCTAClick('hero_comece_gratis', `${APP_URL}/auth`)}
            >
              <Button
                size="lg"
                className="gradient-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-base px-8 h-12 group font-semibold"
              >
                Comece grátis
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="lg"
              className="text-muted-foreground hover:text-foreground h-12 group"
              onClick={onScrollToSystem}
            >
              Conheça o RXFin completo
              <ChevronDown className="h-4 w-4 ml-1 group-hover:translate-y-0.5 transition-transform" />
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-6 inline-flex flex-col items-center lg:items-start gap-1.5 px-5 py-2.5"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Segurança de Nível Bancário</span>
              <Lock className="h-3 w-3 text-muted-foreground/50" />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
              <Server className="h-2.5 w-2.5" />
              <span>AWS + Supabase</span>
              <span className="text-muted-foreground/30">|</span>
              <span>LGPD</span>
              <span className="text-muted-foreground/30">|</span>
              <span>Cadastro rápido, sem cartão</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Direita: mockup do dashboard */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex-1 min-w-0 flex justify-center mt-10 lg:mt-0"
        >
          <div
            className="hero-mockup w-full max-w-md lg:max-w-lg xl:max-w-xl -rotate-[2deg] rounded-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15),0_12px_24px_-8px_rgba(0,0,0,0.08)]"
          >
            <img
              src="/mockup-dashboard.png"
              alt="Dashboard RXFin"
              className="w-full h-auto rounded-lg object-contain block"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
