import React, { useEffect, useMemo } from 'react';
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
  Calculator,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from '@/lib/simulatorSession';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { PublicSimuladoresHeader } from '@/components/simuladores/PublicSimuladoresHeader';
import { SimuladorCard } from '@/components/simuladores/SimuladorCard';
import { SIMULATOR_CATEGORIES } from '@/components/simuladores/simulatorCategories';
import { cn } from '@/lib/utils';
import { PageBreadcrumb } from '@/components/navigation/PageBreadcrumb';

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

/** Path prefix to category id: /simuladores/veiculos/... -> veiculos */
function getCategoryIdFromPath(path: string): string {
  const match = path.match(/^\/simuladores\/([^/]+)\//);
  return match ? match[1] : '';
}

export default function Hub() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const sessionId = getSessionId();
    if (!sessionId) return;
    supabase
      .from('page_views')
      .insert({ page: '/simuladores', session_id: sessionId })
      .then(() => {})
      .catch(() => {});
  }, [user]);

  const isLoggedIn = user !== null;

  // Group simulators by category (only categories that have at least one simulator we offer)
  const categoriesWithSimulators = useMemo(() => {
    return SIMULATOR_CATEGORIES.map((cat) => ({
      ...cat,
      simulators: SIMULATORS.filter((s) => getCategoryIdFromPath(s.path) === cat.id),
    })).filter((c) => c.simulators.length > 0);
  }, []);

  const publicSimulators = SIMULATORS.filter((s) => s.isPublic);
  const hasPublicSection = publicSimulators.length > 0;

  const SectionContent = (
    <>
      <div className="space-y-10">
        {hasPublicSection && !isLoggedIn && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Disponível agora, sem cadastro
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Experimente grátis antes de criar sua conta
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              {publicSimulators.map((sim) => (
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

        {categoriesWithSimulators.map((category) => {
          const { id, title, description, icon: CatIcon, color, simulators } = category;
          if (simulators.length === 0) return null;
          return (
            <section key={id} className="space-y-4">
              <div
                className={cn(
                  'flex items-start gap-3 pb-3 border-b',
                  color?.headerBorder ?? 'border-border'
                )}
              >
                <div
                  className={cn(
                    'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
                    color?.iconBg ?? 'bg-primary/10'
                  )}
                >
                  <CatIcon className={cn('h-5 w-5', color?.iconText ?? 'text-primary')} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {simulators.map((sim) => (
                  <SimuladorCard
                    key={sim.path}
                    title={sim.title}
                    description={sim.description}
                    icon={sim.icon}
                    path={sim.path}
                    isPublic={sim.isPublic}
                    isLoggedIn={isLoggedIn}
                    badge={sim.badge}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );

  // Layout para usuário LOGADO: shell + PageHeader + seções por tema
  if (isLoggedIn) {
    return (
      <>
        <PageBreadcrumb />
        <PageHeader
          icon={Calculator}
          title="Simuladores"
          subtitle="Ferramentas agrupadas por tema para decisões com mais clareza"
        />
        <div className="space-y-6">
          {SectionContent}
        </div>
      </>
    );
  }

  // Layout para usuário NÃO LOGADO: header público + seções por tema + CTA
  return (
    <div className="min-h-screen bg-background">
      <PublicSimuladoresHeader />

      <main className="w-full max-w-full px-4 py-8 sm:py-12 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Simuladores Financeiros
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Tome decisões financeiras com mais clareza. Navegue por tema e experimente grátis.
          </p>
        </div>

        {SectionContent}

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
