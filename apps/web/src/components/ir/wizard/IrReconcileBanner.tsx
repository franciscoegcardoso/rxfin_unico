import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IrReconciliationWizard } from './IrReconciliationWizard';

export interface IrReconcileBannerCompleteResult {
  success: boolean;
  created: number;
  linked: number;
  ignored: number;
  total: number;
}

export interface IrReconcileBannerProps {
  irImportId: string;
  anoCalendario: number;
  totalBens: number;
  onComplete?: (result: IrReconcileBannerCompleteResult) => void;
}

export function IrReconcileBanner({
  irImportId,
  anoCalendario,
  totalBens,
  onComplete,
}: IrReconcileBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState(false);

  const handleComplete = (result: IrReconcileBannerCompleteResult) => {
    setDone(true);
    setExpanded(false);
    onComplete?.(result);
  };

  if (done) {
    return (
      <div className="rounded-lg border border-green-500/40 bg-green-500/10 shadow-sm p-4 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-green-600 shrink-0" />
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          Reconciliação concluída. Bens vinculados ao seu patrimônio.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <Layers className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            {totalBens} bens encontrados no IR {anoCalendario}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vincule cada bem ao seu patrimônio
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          Reconciliar
        </Badge>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          <IrReconciliationWizard
            irImportId={irImportId}
            anoCalendario={anoCalendario}
            onComplete={handleComplete}
          />
        </div>
      )}
    </div>
  );
}
