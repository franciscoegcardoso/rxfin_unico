import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Car, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trackCTAClick } from '@/lib/tracking';

const APP_URL = 'https://app.rxfin.com.br';

interface FeaturedSimulatorCTAProps {
  onOpenLeadGate: (url: string, simName: string) => void;
}

export const FeaturedSimulatorCTA: React.FC<FeaturedSimulatorCTAProps> = ({ onOpenLeadGate }) => (
  <section className="py-12 px-4 sm:px-6 lg:px-8 bg-background">
    <motion.div
      className="max-w-7xl mx-auto rounded-2xl border border-[hsl(161,40%,70%)] bg-[hsl(161,79%,25%)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 cursor-pointer"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -12px hsla(161,79%,15%,0.3)' }}
      transition={{ duration: 0.3 }}
      onClick={() => {
        trackCTAClick('featured_simular_agora', `${APP_URL}/simuladores`);
        onOpenLeadGate(`${APP_URL}/simuladores`, 'Custo Real do Seu Carro');
      }}
    >
      <motion.div
        className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0"
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Car className="h-7 w-7 text-white" />
      </motion.div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge className="bg-white text-[hsl(161,79%,20%)] border-0 text-xs px-2.5 py-0.5 font-semibold">
            <Sparkles className="h-3 w-3 mr-1" />
            Disponível Agora
          </Badge>
          <Badge variant="outline" className="text-xs border-white/40 text-white">
            Gratuito
          </Badge>
        </div>
        <h3 className="text-lg sm:text-xl font-bold mb-1 text-white">Simulador: Custo Real do Seu Carro</h3>
        <p className="text-sm text-white/80 leading-relaxed">
          Calcule todos os custos: IPVA, seguro, manutenção, combustível, depreciação e custo de oportunidade. Resultado detalhado em minutos.
        </p>
      </div>

      <Button
        size="lg"
        className="bg-white text-[hsl(161,79%,20%)] hover:bg-white/90 shrink-0 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
        onClick={(e) => {
          e.stopPropagation();
          trackCTAClick('featured_simular_agora', `${APP_URL}/simuladores`);
          onOpenLeadGate(`${APP_URL}/simuladores`, 'Custo Real do Seu Carro');
        }}
      >
        Simular Agora
        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
      </Button>
    </motion.div>
  </section>
);
