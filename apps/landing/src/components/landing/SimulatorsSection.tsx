import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import { ArrowRight, Search, Scale, Target, BarChart3, HandCoins, Clock, Percent, LineChart, Info, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { trackCTAClick, trackFeaturePreview } from '@/lib/tracking';
import { SimuladorInline } from '@/components/landing/SimuladorInline';

const APP_URL = 'https://app.rxfin.com.br';

interface SimulatorItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  available: boolean;
  category: 'veiculos' | 'dividas' | 'decisoes';
}

const simulators: SimulatorItem[] = [
  { id: 'custo-carro', icon: Search, title: 'Simulador FIPE', description: 'Descubra quanto custa manter seu veículo por mês', path: '/simulador-custo-oportunidade-carro', available: true, category: 'veiculos' },
  { id: 'comparativo-carros', icon: Scale, title: 'Carro A vs Carro B', description: 'Consulte valores e projete a depreciação', path: '/simulador-carro-ab', available: false, category: 'veiculos' },
  { id: 'carro-vs-alternativas', icon: Target, title: 'Carro próprio vs Alternativas', description: 'Compare com Uber, aluguel e transporte público', path: '/simulador-carro-alternativas', available: false, category: 'veiculos' },
  { id: 'consorcio-vs-financiamento', icon: BarChart3, title: 'Financiamento vs Consórcio', description: 'Simule e entenda o custo total da operação', path: '/simulador-consorcio-financiamento', available: false, category: 'dividas' },
  { id: 'renegociacao-dividas', icon: HandCoins, title: 'Renegociação de dívidas', description: 'Calcule o desconto real considerando inflação', path: '/simulador-renegociacao', available: false, category: 'dividas' },
  { id: 'custo-hora', icon: Clock, title: 'Custo da sua hora', description: 'Descubra quanto vale seu tempo de trabalho', path: '/simulador-custo-hora', available: false, category: 'decisoes' },
  { id: 'desconto-justo', icon: Percent, title: 'Desconto justo', description: 'Calcule se o desconto à vista compensa', path: '/simulador-desconto-justo', available: false, category: 'decisoes' },
  { id: 'econograph', icon: LineChart, title: 'EconoGraph', description: 'Indicadores econômicos que afetam seu dinheiro', path: '/simulador-econograph', available: false, category: 'decisoes' },
];

const categories = [
  { key: 'veiculos' as const, emoji: '🚗', label: 'Veículos', cta: 'Usar simuladores de veículos' },
  { key: 'dividas' as const, emoji: '💳', label: 'Dívidas e financiamentos', cta: 'Usar simuladores de dívidas' },
  { key: 'decisoes' as const, emoji: '📈', label: 'Decisões financeiras do dia a dia', cta: 'Usar simuladores financeiros' },
];

interface SimulatorsSectionProps {
  onSimulatorClick: (simId: string) => void;
  onOpenLeadGate: (url: string, simName: string) => void;
}

export const SimulatorsSection: React.FC<SimulatorsSectionProps> = ({ onSimulatorClick, onOpenLeadGate }) => {
  const [sectionRef, isInView] = useInView(0.08);
  return (
    <section
      id="simuladores"
      ref={sectionRef}
      className={`py-10 px-4 sm:px-6 lg:px-8 w-full transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 tracking-tight">
            <span className="text-primary">Simuladores</span> financeiros
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
            Ferramentas práticas para tomar decisões melhores com seus dados reais.
          </p>
        </motion.div>

        <SimuladorInline />

        {categories.map((cat) => {
          const items = simulators.filter((s) => s.category === cat.key);
          return (
            <div key={cat.key} className="mb-5 last:mb-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>{cat.emoji}</span> {cat.label}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {items.map((sim, i) => (
                  <motion.div
                    key={sim.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className={`h-full cursor-pointer transition-all duration-200 group relative overflow-hidden ${
                        sim.available
                          ? 'border-2 border-primary/30 bg-primary/[0.03] hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/60'
                          : 'border-2 border-border hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/30'
                      }`}
                      onClick={() => {
                        if (sim.available) {
                          onOpenLeadGate(`${APP_URL}/simuladores`, sim.title);
                        } else {
                          trackFeaturePreview(sim.id);
                          onSimulatorClick(sim.id);
                        }
                      }}
                    >
                      {/* Overlay "Em breve" no hover (apenas cards não disponíveis) */}
                      {!sim.available && (
                        <div
                          className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                          aria-hidden
                        >
                          <span className="text-sm font-medium text-muted-foreground">Em breve</span>
                        </div>
                      )}
                      <CardContent className="p-5 min-h-[140px] flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            sim.available ? 'bg-primary/15' : 'bg-primary/[0.08] group-hover:bg-primary/10'
                          }`}>
                            <sim.icon className={`h-5 w-5 ${sim.available ? 'text-primary' : 'text-primary/60 group-hover:text-primary'} transition-colors`} />
                          </div>
                          {sim.available ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 text-xs">
                              Disponível
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 text-xs">
                              🔜 Em breve
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold mb-2 group-hover:text-primary transition-colors text-sm sm:text-base leading-tight flex-1">
                          {sim.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 leading-snug">{sim.description}</p>
                        {sim.available ? (
                          <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                            <Info className="h-3 w-3 mr-1" />
                            Saiba mais
                          </div>
                        ) : (
                          <div className="flex items-center text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="flex items-center gap-1 rounded p-1 -m-1 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                  aria-label="Notifique-me"
                                >
                                  <Bell className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Notifique-me
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="mt-3 text-center sm:text-left">
                <a href={`${APP_URL}/auth`} onClick={() => trackCTAClick(`simuladores_${cat.key}`, `${APP_URL}/auth`)}>
                  <Button variant="outline" size="sm" className="text-primary border-primary/30 hover:bg-primary/5 group">
                    {cat.cta}
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </a>
              </div>
            </div>
          );
        })}

        <motion.p
          className="text-center mt-6 text-xs text-muted-foreground/70"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Novos simuladores são liberados mensalmente. Cadastre-se para ser notificado.
        </motion.p>
      </div>
    </section>
  );
};
