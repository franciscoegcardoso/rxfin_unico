import React from 'react';
import {
  AlertCircle,
  Sparkles,
  PlusCircle,
  Tag,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  BarChart2,
  CheckCircle2,
  Calendar,
  CreditCard,
  ShoppingCart,
  Home,
  Repeat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { parseCibeliaResponse } from '@/lib/parseCibeliaResponse';
import type { CibeliaStructuredResponse } from '@/types/cibelia';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  'plus-circle': PlusCircle,
  'tag': Tag,
  'clipboard-list': ClipboardList,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'target': Target,
  'dollar-sign': DollarSign,
  'bar-chart': BarChart2,
  'check-circle': CheckCircle2,
  'alert-circle': AlertCircle,
  'calendar': Calendar,
  'credit-card': CreditCard,
  'shopping-cart': ShoppingCart,
  'home': Home,
  'repeat': Repeat,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? CheckCircle2;
}

export interface CibeliaStructuredMessageProps {
  content: string;
  structured: boolean;
}

export function CibeliaStructuredMessage({ content, structured }: CibeliaStructuredMessageProps) {
  const data = parseCibeliaResponse(content, structured) as CibeliaStructuredResponse;

  if (
    data._fallback ||
    (!data.greeting && !data.data?.length && !data.nextSteps?.length && !data.cta && data.analysis === undefined)
  ) {
    return (
      <div className="flex flex-col gap-1 w-full min-w-0">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {data.analysis || content}
        </p>
        {import.meta.env.DEV && data._fallback && (
          <span className="text-[10px] text-orange-500 opacity-60 select-none" aria-hidden>
            [fallback mode]
          </span>
        )}
      </div>
    );
  }

  const hasStructuredContent =
    (data.greeting != null && data.greeting !== '') ||
    (data.data != null && data.data.length > 0) ||
    (data.nextSteps != null && data.nextSteps.length > 0) ||
    (data.cta != null && data.cta !== '');

  if (!hasStructuredContent && data.analysis != null) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {data.analysis}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full min-w-0">
      {data.greeting && (
        <p className="text-sm leading-relaxed text-foreground">{data.greeting}</p>
      )}

      {data.data && data.data.length > 0 && (
        <div
          className={cn(
            'rounded-xl border p-3 flex flex-col gap-1.5 min-w-0 overflow-hidden',
            'bg-muted/50 border-border'
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart2 className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {data.dataTitle ?? 'Resumo do período'}
            </span>
          </div>
          {data.data.map((item, i) => (
            <div
              key={i}
              className={cn(
                'flex justify-between items-center text-sm gap-2',
                i < data.data!.length - 1 && 'pb-1.5 border-b border-border'
              )}
            >
              <span className="text-muted-foreground shrink-0">{item.label}</span>
              <span
                className={cn(
                  'font-medium tabular-nums text-right',
                  item.highlight ? 'text-destructive font-bold' : 'text-foreground'
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.analysis && (
        <div className="flex gap-2 items-start text-sm text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="leading-relaxed">{data.analysis}</p>
        </div>
      )}

      {data.nextSteps && data.nextSteps.length > 0 && (
        <div className="rounded-xl border p-3 flex flex-col gap-1.5 bg-muted/50 border-border min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Próximos passos
            </span>
          </div>
          {data.nextSteps.map((step, i) => {
            const Icon = getIcon(step.icon);
            return (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-muted-foreground bg-background rounded-lg px-2.5 py-2 border border-border min-w-0"
            >
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span className="break-words min-w-0">{step.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {data.cta && (
        <div className="flex gap-2 items-start text-sm text-primary rounded-xl border p-3 bg-primary/5 border-primary/20">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed font-medium">{data.cta}</p>
        </div>
      )}
    </div>
  );
}
