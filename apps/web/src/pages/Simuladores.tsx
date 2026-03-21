import React, { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/shared/PageContainer';
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicSimulators } from '@/hooks/usePublicSimulators';
import { useRecentSimulations } from '@/hooks/useRecentSimulations';
import { SIMULATOR_CATEGORIES } from '@/components/simuladores/simulatorCategories';
import { DecisionNav } from '@/components/simuladores/DecisionNav';
import { SimulatorCategorySection } from '@/components/simuladores/SimulatorCategorySection';
import { RecentSimulationsBar } from '@/components/simuladores/RecentSimulationsBar';
import { MethodologyFooter } from '@/components/simuladores/MethodologyFooter';

const VALID_CATEGORIES = SIMULATOR_CATEGORIES.map(c => c.id);

export const Simuladores: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { simulators, isLoading, isAuthenticated, isAdmin } = usePublicSimulators();
  const { recentSimulations, addRecentSimulation } = useRecentSimulations();

  const activeCategory = VALID_CATEGORIES.includes(category || '') ? category! : 'veiculos';

  const handleCategoryChange = (id: string) => {
    navigate(`/simuladores/${id}`, { replace: true });
  };

  const simulatorMap = useMemo(() => {
    const map = new Map<string, (typeof simulators)[number]>();
    simulators.forEach((s) => map.set(s.slug, s));
    return map;
  }, [simulators]);

  const handleNavigate = (slug: string, title: string, path: string) => {
    addRecentSimulation({ slug, title, path });
  };

  const activeConfig = SIMULATOR_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    
      <PageContainer>
        <div className="space-y-6">
          {/* Institutional header */}
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-2 text-center max-w-2xl mx-auto pt-2"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Centro de Decisão Financeira
            </h1>
            <p className="text-sm text-muted-foreground">
              Ferramentas estruturadas para analisar cenários, reduzir incertezas e tomar decisões com clareza.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Metodologia baseada em práticas de planejamento financeiro, pricing e gestão estratégica utilizadas em grandes empresas.
            </p>
          </motion.header>

          {/* Recent simulations — above decision nav */}
          {isAuthenticated && <RecentSimulationsBar simulations={recentSimulations} />}

          {/* Decision navigation */}
          <DecisionNav activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

          {/* Microcopy — small and discrete, right below tabs */}
          <p className="text-[11px] text-muted-foreground/50 text-center">
            Pequenas decisões financeiras, quando estruturadas, geram grandes impactos no longo prazo.
          </p>

          {/* Login prompt */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground"
            >
              <Lock className="h-4 w-4" />
              <span>
                Faça login para acessar mais simuladores.
                <Link to="/login" className="ml-1 text-primary hover:underline font-medium">
                  Entrar
                </Link>
              </span>
            </motion.div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 rounded-xl" />
                      <Skeleton className="h-5 w-2/3" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                      <Skeleton className="h-3 w-4/6" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Active category section */
            <div>
              {activeConfig && (
                <SimulatorCategorySection
                  key={activeConfig.id}
                  category={activeConfig}
                  simulatorMap={simulatorMap}
                  isAdmin={isAdmin}
                  onNavigate={handleNavigate}
                />
              )}
            </div>
          )}

          {/* Methodology footer */}
          <MethodologyFooter />
        </div>
      </PageContainer>
    
  );
};

export default Simuladores;
