import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/tracking';
import { useInView } from '@/hooks/useInView';

const APP_URL = 'https://app.rxfin.com.br';

const benefits = [
  'Usar todos os simuladores gratuitamente',
  'Salvar suas simulações',
  'Comparar decisões ao longo do tempo',
  'Acesso antecipado e atualizações',
  'Condição especial de lançamento',
  'Evoluir para o sistema completo em breve',
];

export const SignupBenefitsSection: React.FC = () => {
  const [sectionRef, isInView] = useInView(0.08);

  return (
    <section
      ref={sectionRef}
      className={`py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,25%)] transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-10 tracking-tight text-white">
          Ao se cadastrar você pode:
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {benefits.map((txt, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-left p-4 rounded-xl bg-white/10 border border-white/20"
            >
              <CheckCircle2 className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <span className="text-sm sm:text-base text-white/90">{txt}</span>
            </div>
          ))}
        </div>

        <p className="text-white/80 text-sm mb-6">
          🔥 847 pessoas já na lista de acesso antecipado
        </p>

        <a
          href={`${APP_URL}/signup`}
          onClick={() => trackCTAClick('signup_benefits_criar_conta', `${APP_URL}/signup`)}
          className="inline-block"
        >
          <Button
            size="lg"
            className="py-4 px-10 text-lg bg-white text-[hsl(161,79%,25%)] hover:bg-white/95 font-semibold shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-300 animate-pulse hover:animate-none group"
          >
            Criar conta gratuita
            <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </a>

        <p className="mt-4 text-sm text-white/60">
          Leva menos de 1 minuto.
        </p>
      </div>
    </section>
  );
};
