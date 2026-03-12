import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/tracking';
import { useInView } from '@/hooks/useInView';

const APP_URL = 'https://app.rxfin.com.br';

const benefits = [
  'Simule antes de assinar, financiar ou investir — de graça',
  'Guarde e compare cenários ao longo do tempo',
  'Veja onde seu dinheiro vai antes que ele suma',
  'Entre antes do lançamento com condição especial',
  'Conecte seus bancos e pare de adivinhar seu saldo real',
  'Tenha o mesmo nível de controle financeiro das empresas',
];

export const SignupBenefitsSection: React.FC = () => {
  const [sectionRef, isInView] = useInView(0.08);

  return (
    <section
      ref={sectionRef}
      className={`py-20 px-4 sm:px-6 lg:px-8 bg-[#0d2b20] transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
          Pare de chegar no fim do mês sem entender o que aconteceu.
        </h2>
        <p className="text-sm sm:text-base text-white/70 mt-2 text-center">
          Cadastro gratuito. Sem cartão. Você sai quando quiser.
        </p>

        <p className="flex items-center justify-center gap-1.5 text-sm text-white/60 mt-3 mb-6">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          847 pessoas já garantiram acesso antecipado
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {benefits.map((txt, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-left p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <CheckCircle2 className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <span className="text-sm sm:text-base text-white/90">{txt}</span>
            </div>
          ))}
        </div>

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
          Leva menos de 1 minuto. Sem cartão de crédito.
        </p>
      </div>
    </section>
  );
};
