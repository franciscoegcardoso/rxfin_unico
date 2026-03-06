import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  ArrowLeftRight,
  Scale,
  Clock,
  BadgePercent,
  AlertCircle,
  Building2,
  LineChart,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from '@/lib/simulatorSession';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicSimuladoresHeader } from '@/components/simuladores/PublicSimuladoresHeader';
import { SimuladorCard } from '@/components/simuladores/SimuladorCard';

interface SimulatorItem {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  isPublic: boolean;
  badge?: string;
}

const SIMULATORS: SimulatorItem[] = [
  {
    title: 'Valor de Mercado (FIPE)',
    description: 'Consulte o valor de mercado do seu veículo e calcule o custo real de propriedade.',
    icon: Car,
    path: '/simuladores/veiculos/simulador-fipe',
    isPublic: true,
    badge: 'Novo',
  },
  {
    title: 'Comparador: Carro A vs B',
    description: 'Compare dois veículos lado a lado considerando financiamento, seguro, IPVA e manutenção.',
    icon: ArrowLeftRight,
    path: '/simuladores/veiculos/simulador-carro-ab',
    isPublic: false,
    badge: 'Novo',
  },
  {
    title: 'Carro Próprio vs Alternativas',
    description: 'Descubra se vale mais a pena ter carro ou usar apps de mobilidade e transporte público.',
    icon: Scale,
    path: '/simuladores/veiculos/simulador-custo-oportunidade-carro',
    isPublic: false,
  },
  {
    title: 'Financiamento vs Consórcio',
    description: 'Simule e compare as duas modalidades para encontrar a melhor estratégia de compra.',
    icon: Building2,
    path: '/simuladores/dividas/financiamento-consorcio',
    isPublic: false,
  },
  {
    title: 'SOS Quitação de Dívidas',
    description: 'Organize suas dívidas e encontre o melhor plano para sair no menor tempo e custo.',
    icon: AlertCircle,
    path: '/simuladores/dividas/renegociacao-dividas',
    isPublic: false,
  },
  {
    title: 'Quanto vale sua Hora?',
    description: 'Calcule o custo real da sua hora de trabalho incluindo todos os encargos e despesas.',
    icon: Clock,
    path: '/simuladores/planejamento/simulador-custo-hora',
    isPublic: false,
  },
  {
    title: 'Mestre da Negociação',
    description: 'Descubra qual desconto é realmente justo considerando custo de oportunidade e inflação.',
    icon: BadgePercent,
    path: '/simuladores/planejamento/simulador-desconto-justo',
    isPublic: false,
  },
  {
    title: 'EconoGraph — Índices Econômicos',
    description: 'Visualize o histórico de IPCA, Selic, CDI e outros índices econômicos brasileiros.',
    icon: LineChart,
    path: '/simuladores/planejamento/econograph',
    isPublic: false,
  },
];

const PUBLIC_SIMULATORS = SIMULATORS.filter((s) => s.isPublic);
const LOCKED_SIMULATORS = SIMULATORS.filter((s) => !s.isPublic);

export default function Hub() {
  const { user } = useAuth();

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    supabase
      .from('page_views')
      .insert({ page: '/simuladores', session_id: sessionId })
      .then(() => {});
  }, []);

  const isLoggedIn = user !== null;

  // Layout para usuário LOGADO: AppLayout + grid único
  if (isLoggedIn) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Simuladores Financeiros
            </h1>
            <p className="text-muted-foreground mt-1">
              Ferramentas para decisões financeiras inteligentes
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {SIMULATORS.map((sim) => (
              <SimuladorCard
                key={sim.path}
                title={sim.title}
                description={sim.description}
                icon={sim.icon}
                path={sim.path}
                isPublic={sim.isPublic}
                isLoggedIn={true}
                badge={sim.badge}
              />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Layout para usuário NÃO LOGADO: header público + hero + seções + CTA
  return (
    <div className="min-h-screen bg-background">
      <PublicSimuladoresHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Simuladores Financeiros
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Tome decisões financeiras com mais clareza. Experimente grátis agora.
          </p>
        </div>

        {PUBLIC_SIMULATORS.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Disponível agora, sem cadastro
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {PUBLIC_SIMULATORS.map((sim) => (
                <SimuladorCard
                  key={sim.path}
                  title={sim.title}
                  description={sim.description}
                  icon={sim.icon}
                  path={sim.path}
                  isPublic={true}
                  isLoggedIn={false}
                  badge={sim.badge}
                />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Acesse todos com cadastro gratuito
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LOCKED_SIMULATORS.map((sim) => (
              <SimuladorCard
                key={sim.path}
                title={sim.title}
                description={sim.description}
                icon={sim.icon}
                path={sim.path}
                isPublic={false}
                isLoggedIn={false}
                badge={sim.badge}
              />
            ))}
          </div>
        </section>

        <div className="text-center py-8 px-4 border rounded-xl bg-card shadow-sm space-y-3">
          <p className="font-semibold text-lg text-foreground">
            Acesse todos os simuladores + gestão financeira completa
          </p>
          <p className="text-muted-foreground text-sm">
            Cadastro 100% gratuito, sem cartão de crédito
          </p>
          <Button size="lg" asChild>
            <Link to="/signup" className="gap-2">
              Criar minha conta grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
