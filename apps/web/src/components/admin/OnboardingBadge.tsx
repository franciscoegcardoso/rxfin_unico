import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, Compass, Layers, Building2, BarChart3, Circle } from 'lucide-react';

const PHASE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  not_started: { label: 'Não iniciado', color: 'bg-muted text-muted-foreground', icon: Circle },
  started: { label: 'Iniciado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Compass },
  block_a_done: { label: 'Bloco A ✓', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Layers },
  block_b_done: { label: 'Bloco B ✓', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: Building2 },
  block_c_done: { label: 'Bloco C ✓', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: BarChart3 },
  completed: { label: 'Completo', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: CheckCircle },
};

const PHASE_DESCRIPTIONS: Record<string, string> = {
  not_started: 'Usuário ainda não iniciou o onboarding',
  started: 'Onboarding em andamento',
  block_a_done: 'Identidade financeira concluída (Rendas/Despesas)',
  block_b_done: 'Patrimônio concluído (Ativos/Dívidas)',
  block_c_done: 'Fluxo de caixa concluído (Planejamento/Metas)',
  completed: 'Jornada de clareza completa',
};

interface OnboardingBadgeProps {
  phase: string;
  compact?: boolean;
}

export function OnboardingBadge({ phase, compact = false }: OnboardingBadgeProps) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.not_started;
  const Icon = config.icon;
  const description = PHASE_DESCRIPTIONS[phase] || '';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className={`${config.color} text-xs gap-1 whitespace-nowrap`}>
          <Icon className="h-3 w-3" />
          {!compact && <span>{config.label}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div className="font-medium">{config.label}</div>
          {description && <div className="text-muted-foreground">{description}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
