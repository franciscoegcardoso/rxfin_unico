import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  GitCompare,
  Scale,
  Clock,
  BadgePercent,
  ShieldAlert,
  Building2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from '@/lib/simulatorSession';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SimulatorConfig {
  title: string;
  publicPath: string;
  privatePath?: string;
  icon: React.ElementType;
  description: string;
  isNew?: boolean;
}

const SIMULATORS: SimulatorConfig[] = [
  {
    title: 'Valor FIPE e Custo Real',
    publicPath: '/simulador-fipe',
    privatePath: '/simuladores/veiculos/simulador-fipe',
    icon: Car,
    description: 'Descubra o valor de mercado do seu veículo e quanto realmente custa mantê-lo',
    isNew: true,
  },
  {
    title: 'Comparador A vs B',
    publicPath: '/simuladores/veiculos/simulador-carro-ab',
    privatePath: '/simuladores/veiculos/simulador-carro-ab',
    icon: GitCompare,
    description: 'Compare dois carros lado a lado: preço, custos e depreciação',
    isNew: true,
  },
  {
    title: 'Carro vs Alternativas',
    publicPath: '/simuladores/veiculos/simulador-custo-oportunidade-carro',
    privatePath: '/simuladores/veiculos/simulador-custo-oportunidade-carro',
    icon: Scale,
    description: 'Ter carro próprio compensa? Compare com transporte público, app e aluguel',
  },
  {
    title: 'Quanto vale sua Hora?',
    publicPath: '/simulador-custo-hora',
    privatePath: '/simuladores/planejamento/simulador-custo-hora',
    icon: Clock,
    description: 'Descubra o valor real da sua hora considerando todos os custos',
  },
  {
    title: 'Desconto Justo',
    publicPath: '/simuladores/planejamento/simulador-desconto-justo',
    privatePath: '/simuladores/planejamento/simulador-desconto-justo',
    icon: BadgePercent,
    description: 'Calcule se o desconto à vista realmente vale a pena',
  },
  {
    title: 'SOS Dívidas',
    publicPath: '/simuladores/dividas/renegociacao-dividas',
    privatePath: '/simuladores/dividas/renegociacao-dividas',
    icon: ShieldAlert,
    description: 'Simule renegociação e quitação de dívidas',
  },
  {
    title: 'Financ. vs Consórcio',
    publicPath: '/simuladores/dividas/financiamento-consorcio',
    privatePath: '/simuladores/dividas/financiamento-consorcio',
    icon: Building2,
    description: 'Compare financiamento e consórcio para descobrir a melhor opção',
  },
  {
    title: 'EconoGraph',
    publicPath: '/simuladores/planejamento/econograph',
    privatePath: '/simuladores/planejamento/econograph',
    icon: TrendingUp,
    description: 'Histórico de índices econômicos (IPCA, Selic, CDI, dólar)',
  },
];

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        <header className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Simuladores Financeiros
          </h1>
          <p className="mt-2 text-muted-foreground">
            Ferramentas gratuitas para tomar decisões inteligentes
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SIMULATORS.map((item) => {
            const Icon = item.icon;
            const path = user && item.privatePath ? item.privatePath : item.publicPath;

            return (
              <Card
                key={item.publicPath}
                className="rounded-2xl border border-border/80 bg-card hover:border-primary/30 transition-colors overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {item.isNew && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-green-600 text-white shrink-0"
                      >
                        Novo
                      </Badge>
                    )}
                  </div>
                  <h2 className="font-semibold text-foreground mb-1">{item.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {item.description}
                  </p>
                  <Link to={path}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 group"
                    >
                      Simular
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <footer className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Quer mais? Com RXFin você organiza toda sua vida financeira.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gap-2">
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </footer>
      </div>
    </div>
  );
}
