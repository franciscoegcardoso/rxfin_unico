import { useState } from 'react';
import { useAllocationPolicy } from '@/hooks/useAllocationPolicy';
import {
  useAllocationStatus,
  calcHealthScore,
} from '@/hooks/useAllocationStatus';
import { useLatestSnapshot } from '@/hooks/useLatestSnapshot';
import { ScoreGauge } from '@/components/alocacao/ScoreGauge';
import { DriftCard } from '@/components/alocacao/DriftCard';
import { PortfolioTierBadge } from '@/components/alocacao/PortfolioTierBadge';
import { PersonaOnboarding } from '@/components/alocacao/PersonaOnboarding';
import type { AssetClass } from '@/types/allocation';
import { RefreshCw } from 'lucide-react';

const ASSET_CLASSES: AssetClass[] = [
  'renda_fixa',
  'acoes',
  'fii',
  'internacional',
];

export default function AlocacaoPage() {
  const { data: policy, isLoading: loadingPolicy } = useAllocationPolicy();
  const { data: statusRows = [], isLoading: loadingStatus } =
    useAllocationStatus();
  const { data: snapshot, isLoading: loadingSnapshot } = useLatestSnapshot();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const isLoading = loadingPolicy || loadingStatus || loadingSnapshot;
  const hasPolicy = !!policy;
  const hasSnapshot = !!snapshot && snapshot.total_brl > 0;
  const score = calcHealthScore(statusRows);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!hasPolicy || showOnboarding) {
    return (
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <PersonaOnboarding onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Alocação de Ativos
          </h1>
          {snapshot && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Atualizado em{' '}
              {new Date(snapshot.snapshot_date).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        {snapshot && (
          <PortfolioTierBadge tier={snapshot.portfolio_tier} showDesc />
        )}
      </div>

      <div className="flex flex-col items-center py-4">
        <ScoreGauge score={hasSnapshot ? score : 0} />
        {!hasSnapshot && (
          <div className="mt-4 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Conecte sua corretora para ver como sua carteira se compara com
              sua estratégia
            </p>
            <a
              href="/instituicoes-financeiras"
              className="px-4 py-2 bg-[#00C896] hover:bg-[#00b085] text-white
                         text-sm font-semibold rounded-lg transition-colors"
            >
              Conectar corretora
            </a>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Por Classe de Ativo
          </h2>
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Editar política
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ASSET_CLASSES.map((cls) => {
            const row = statusRows.find((r) => r.asset_class === cls);
            const target = policy?.allocation_targets?.find(
              (t) => t.asset_class === cls
            );

            if (!target) return null;

            return (
              <DriftCard
                key={cls}
                assetClass={cls}
                currentPct={row?.current_pct ?? 0}
                targetPct={target.target_pct}
                driftPct={row?.drift_pct ?? 0}
                currentBrl={row?.current_brl ?? 0}
                isEmpty={!hasSnapshot}
              />
            );
          })}
        </div>
      </div>

      <div
        className="rounded-xl border border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-800/30 px-4 py-3
                      flex items-center justify-between"
      >
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Política ativa
          </p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {policy.name}
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700
                         text-slate-600 dark:text-slate-400 capitalize"
        >
          {policy.risk_profile}
        </span>
      </div>
    </div>
  );
}
