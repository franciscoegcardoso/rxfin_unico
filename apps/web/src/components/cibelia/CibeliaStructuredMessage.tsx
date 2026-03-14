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
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { parseCibeliaResponse } from '@/lib/parseCibeliaResponse';
import type { CibeliaStructuredResponse } from '@/types/cibelia';
import { cn } from '@/lib/utils';

/** Detecta se um texto de CTA contém opções no formato [ Opção ]. Exportado para o pai renderizar opções fora do balão. */
export function parseCTAOptions(cta: string): string[] | null {
  const matches = [...cta.matchAll(/\[([^\]]+)\]/g)];
  if (matches.length < 2) return null; // só parseia se tiver 2+ opções
  return matches.map(m => m[1].trim());
}

/** Botões de opção para renderizar fora do balão (mesmo estilo: chips ou coluna com chevron). */
export function CibeliaOptionButtons({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  const isShort = options.every((o) => o.length < 20);
  return (
    <div className={cn('flex mt-2', isShort ? 'flex-wrap gap-2' : 'flex-col gap-1.5')}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={cn(
            'transition-all',
            isShort
              ? 'text-sm px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 active:scale-[0.97]'
              : 'text-left text-sm px-3 py-2 rounded-xl border border-border bg-background hover:bg-primary/5 hover:border-primary/30 hover:text-primary active:scale-[0.98] text-foreground w-full flex items-center justify-between gap-2'
          )}
        >
          <span>{opt}</span>
          {!isShort && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </button>
      ))}
    </div>
  );
}

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
  onOptionSelect?: (value: string) => void;
  /** Quando true, o pai renderiza as opções CTA fora do balão; este componente não desenha os botões. */
  renderOptionsInParent?: boolean;
}

export function CibeliaStructuredMessage({ content, structured, onOptionSelect, renderOptionsInParent }: CibeliaStructuredMessageProps) {
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

      {data.cta && (() => {
        const options = parseCTAOptions(data.cta!);
        if (options && onOptionSelect && !renderOptionsInParent) {
          const isShort = options.every((o) => o.length < 20);
          return (
            <div className={cn(isShort ? 'flex flex-wrap gap-2' : 'flex flex-col gap-1.5')}>
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onOptionSelect(opt)}
                  className={cn(
                    'transition-all',
                    isShort
                      ? 'text-sm px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 active:scale-[0.97]'
                      : 'text-left text-sm px-3 py-2 rounded-xl border border-border bg-background hover:bg-primary/5 hover:border-primary/30 hover:text-primary active:scale-[0.98] text-foreground w-full flex items-center justify-between gap-2'
                  )}
                >
                  <span>{opt}</span>
                  {!isShort && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                </button>
              ))}
            </div>
          );
        }
        return (
          <div className="flex gap-2 items-start text-sm text-primary rounded-xl border p-3 bg-primary/5 border-primary/20">
            <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
            <p className="leading-relaxed font-medium">{data.cta}</p>
          </div>
        );
      })()}
    </div>
  );
}
