import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Settings2 } from 'lucide-react';
import { useAllocationDashboard } from '@/hooks/useAllocationDashboard';
import { ScoreGauge } from '@/components/alocacao/ScoreGauge';
import { DriftCard } from '@/components/alocacao/DriftCard';
import { PortfolioTierBadge } from '@/components/alocacao/PortfolioTierBadge';
import { PersonaOnboarding } from '@/components/alocacao/PersonaOnboarding';
import { GoalProgressBar } from '@/components/alocacao/GoalProgressBar';
import type { AssetClass } from '@/types/allocation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ASSET_CLASSES: AssetClass[] = ['renda_fixa', 'acoes', 'fii', 'internacional'];

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AlocacaoPage() {
  const { data: dashboard, isLoading, isError, error, refetch } = useAllocationDashboard();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const hasPolicy = !!dashboard?.policy && (dashboard.policy.targets?.length ?? 0) > 0;
  const snapshot = dashboard?.snapshot ?? null;
  const hasSnapshot = (snapshot?.total_brl ?? 0) > 0;
  const score = dashboard?.health_score ?? 0;
  const threshold = dashboard?.completeness_threshold ?? 85;
  const completeness = snapshot?.completeness_pct ?? null;
  const showDisclaimer = completeness !== null && completeness < threshold;
  const policy = dashboard?.policy;
  const statusRows = dashboard?.allocation_status ?? [];
  const primaryGoal = dashboard?.primary_goal ?? null;
  const marketStress = dashboard?.market_stress_active ?? false;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-10">
            <ScoreGauge score={0} isLoading />
            <Skeleton className="h-4 w-40 mt-4" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ASSET_CLASSES.map((c) => (
            <DriftCard
              key={c}
              assetClass={c}
              currentPct={0}
              targetPct={25}
              driftPct={0}
              currentBrl={0}
              isLoading
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-destructive font-medium">Não foi possível carregar a alocação</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Erro desconhecido'}
        </p>
        <Button className="mt-4" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!hasPolicy || showOnboarding) {
    return (
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <PersonaOnboarding
          onComplete={() => {
            setShowOnboarding(false);
            void refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Alocação de Ativos</h1>
          {snapshot && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Atualizado em {format(new Date(snapshot.snapshot_date), "d 'de' MMMM yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {snapshot && <PortfolioTierBadge tier={snapshot.portfolio_tier} showDesc />}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border"
            aria-label="Editar política"
            onClick={() => setShowOnboarding(true)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {marketStress && (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
        >
          Indicadores sugerem estresse de mercado. Considere revisar risco e liquidez antes de movimentar
          a carteira.
        </div>
      )}

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="pt-6 pb-6 flex flex-col items-center">
          <ScoreGauge score={hasSnapshot ? score : 0} isLoading={false} />
          {hasSnapshot && snapshot && (
            <p className="mt-4 text-lg font-semibold text-foreground tabular-nums">
              {formatBrl(snapshot.total_brl)}
            </p>
          )}
          {!hasSnapshot && (
            <div className="mt-6 flex flex-col items-center gap-3 text-center w-full">
              <p className="text-sm text-muted-foreground max-w-xs">
                Conecte sua corretora para ver como sua carteira se compara com sua estratégia.
              </p>
              <Button asChild className="gap-2">
                <Link to="/instituicoes-financeiras">
                  <Building2 className="h-4 w-4" />
                  Conectar corretora
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showDisclaimer && (
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-sm',
            'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
          )}
        >
          Cobertura dos dados: {completeness?.toFixed(0)}% — alguns ativos podem não estar refletidos.
          Conecte todas as instituições para um panorama completo.
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Por classe de ativo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ASSET_CLASSES.map((cls) => {
            const targetPct =
              policy?.targets?.find((t) => t.asset_class === cls)?.target_pct ?? 0;
            const row = statusRows.find((r) => r.asset_class === cls);
            return (
              <DriftCard
                key={cls}
                assetClass={cls}
                currentPct={row?.current_pct ?? 0}
                targetPct={targetPct}
                driftPct={row?.drift_pct ?? 0}
                currentBrl={row?.current_brl ?? 0}
                threshold={policy?.rebalancing_threshold_pct ?? 5}
                isEmpty={!hasSnapshot}
              />
            );
          })}
        </div>
      </div>

      {primaryGoal && hasSnapshot && snapshot && (
        <GoalProgressBar goal={primaryGoal} currentBrl={snapshot.total_brl} />
      )}

      <div
        className="rounded-xl border border-border bg-muted/30 dark:bg-muted/20 px-4 py-3 flex items-center justify-between"
      >
        <div>
          <p className="text-xs text-muted-foreground">Política ativa</p>
          <p className="text-sm font-semibold text-foreground">{policy?.name}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground capitalize border border-border">
          {policy?.risk_profile}
        </span>
      </div>

      <div
        className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-6 text-center"
      >
        <p className="text-sm font-medium text-muted-foreground">Simulador de Aporte</p>
        <p className="text-xs text-muted-foreground/80 mt-1">Em breve — Fase 2</p>
      </div>
    </div>
  );
}
