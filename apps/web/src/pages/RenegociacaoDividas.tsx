import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SimulatorLayout } from '@/components/simulators/SimulatorLayout';
import { BackLink } from '@/components/shared/BackLink';
import { PageContainer } from '@/components/shared/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, ArrowRightLeft, Layers, Percent } from 'lucide-react';

const simulators = [
  {
    id: 'quitacao',
    title: 'Quitação com Desconto',
    description: 'Avalie se vale a pena aceitar uma proposta de quitação à vista com desconto sobre o saldo devedor.',
    icon: Receipt,
    path: '/renegociacao-dividas/quitacao-desconto',
    color: { bg: 'bg-emerald-500/15', text: 'text-emerald-500' },
  },
  {
    id: 'parcelamento',
    title: 'Parcelamento de Dívida',
    description: 'Compare sua dívida atual com uma nova proposta de parcelamento (taxa, prazo, entrada).',
    icon: Percent,
    path: '/renegociacao-dividas/parcelamento',
    color: { bg: 'bg-blue-500/15', text: 'text-blue-500' },
  },
  {
    id: 'portabilidade',
    title: 'Portabilidade de Crédito',
    description: 'Simule a transferência da dívida para outra instituição com taxa menor.',
    icon: ArrowRightLeft,
    path: '/renegociacao-dividas/portabilidade',
    color: { bg: 'bg-violet-500/15', text: 'text-violet-500' },
  },
  {
    id: 'consolidacao',
    title: 'Consolidação de Dívidas',
    description: 'Junte múltiplas dívidas em um único contrato e compare o custo total.',
    icon: Layers,
    path: '/renegociacao-dividas/consolidacao',
    color: { bg: 'bg-amber-500/15', text: 'text-amber-500' },
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const RenegociacaoDividas: React.FC = () => {
  return (
    <SimulatorLayout
      title="Renegociação de Dívidas"
      subtitle="Simule diferentes cenários para renegociar suas dívidas e encontrar a melhor opção"
    >
      <PageContainer>
        <div className="mb-4">
          <BackLink to="/simuladores" label="Simuladores" className="mb-2" />
        </div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {simulators.map((sim) => {
            const Icon = sim.icon;
            return (
              <motion.div key={sim.id} variants={cardVariants}>
                <Link to={sim.path}>
                  <Card className="h-full transition-all cursor-pointer group hover:shadow-md hover:border-primary/50">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`h-12 w-12 rounded-xl ${sim.color.bg} ${sim.color.text} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                            {sim.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {sim.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </PageContainer>
    </SimulatorLayout>
  );
};

export default RenegociacaoDividas;
