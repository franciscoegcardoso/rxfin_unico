import type { PortfolioTier } from '@/types/allocation';

const TIER_CONFIG: Record<
  PortfolioTier,
  { label: string; desc: string; className: string }
> = {
  starter: {
    label: 'Iniciante',
    desc: 'Abaixo de R$ 5k',
    className:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  growing: {
    label: 'Em crescimento',
    desc: 'R$ 5k – R$ 50k',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  established: {
    label: 'Consolidado',
    desc: 'R$ 50k – R$ 500k',
    className:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  advanced: {
    label: 'Avançado',
    desc: 'Acima de R$ 500k',
    className:
      'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
};

interface Props {
  tier: PortfolioTier;
  showDesc?: boolean;
}

export function PortfolioTierBadge({ tier, showDesc = false }: Props) {
  const config = TIER_CONFIG[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
      {showDesc && <span className="opacity-70">· {config.desc}</span>}
    </span>
  );
}
