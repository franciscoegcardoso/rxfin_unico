import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { RebalancingSuggestion } from '@/types/allocation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  comprar: { emoji: '📈', label: 'Comprar', color: 'emerald' },
  vender: { emoji: '💰', label: 'Vender', color: 'amber' },
  aportar: { emoji: '➕', label: 'Aportar', color: 'blue' },
  hold: { emoji: '⏸️', label: 'Aguardar', color: 'slate' },
} as const;

interface SuggestionCardProps {
  suggestion: RebalancingSuggestion;
  onAction?: () => void;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function getUrgencyClass(driftPct: number): string {
  if (Math.abs(driftPct) > 10) {
    return 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300';
  }
  if (Math.abs(driftPct) > 5) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
}

function getScheduledDateLabel(date: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, "d 'de' MMM", { locale: ptBR });
}

export function SuggestionCard({ suggestion, onAction }: SuggestionCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  if (suggestion.status === 'dismissed') return null;

  const type = TYPE_CONFIG[suggestion.suggestion_type];
  const urgencyClass = getUrgencyClass(suggestion.drift_pct);
  const isCommitted = suggestion.status === 'committed' || suggestion.status === 'confirmed';
  const scheduledLabel = useMemo(
    () => getScheduledDateLabel(suggestion.expires_at),
    [suggestion.expires_at]
  );

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.rpc('create_rebalancing_commitment', {
        p_user_id: user.id,
        p_suggestion_id: suggestion.id,
        p_asset_class: suggestion.asset_class,
        p_amount_brl: suggestion.suggested_amount_brl,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['allocation-dashboard'] });
      onAction?.();
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.rpc('dismiss_rebalancing_suggestion', {
        p_user_id: user.id,
        p_suggestion_id: suggestion.id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['allocation-dashboard'] });
      onAction?.();
    },
  });

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm',
        isCommitted ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>{type.emoji}</span>
            <span>{type.label}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {type.label} {formatBRL(suggestion.suggested_amount_brl)} em{' '}
            <span className="font-medium text-foreground capitalize">
              {suggestion.asset_class.replace('_', ' ')}
            </span>{' '}
            para reduzir desvio de {suggestion.drift_pct.toFixed(1)}%
          </p>
          {suggestion.cibelia_insight && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{suggestion.cibelia_insight}</p>
          )}
        </div>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0', urgencyClass)}>
          {Math.abs(suggestion.drift_pct) > 10 ? 'Urgente' : 'Atenção'}
        </span>
      </div>

      {isCommitted ? (
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
          Agendado{scheduledLabel ? ` para ${scheduledLabel}` : ''}.
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => scheduleMutation.mutate()}
            disabled={scheduleMutation.isPending || dismissMutation.isPending}
          >
            Agendar aporte
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dismissMutation.mutate()}
            disabled={scheduleMutation.isPending || dismissMutation.isPending}
          >
            Dispensar
          </Button>
        </div>
      )}
    </div>
  );
}
