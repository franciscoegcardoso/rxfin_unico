import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { ProjectionLineParams, LineParamKey, ProjectionIndex } from '@/hooks/useProjectionLineParams';
import { LINE_LABELS } from '@/hooks/useProjectionLineParams';

const INDEX_OPTIONS: { value: ProjectionIndex; label: string }[] = [
  { value: 'ipca',     label: 'IPCA' },
  { value: 'igpm',     label: 'IGP-M' },
  { value: 'cdi',      label: 'CDI' },
  { value: 'ibovespa', label: 'Ibovespa' },
  { value: 'custom',   label: 'Personalizado' },
];

interface ProjectionParamsPanelProps {
  params: ProjectionLineParams;
  updateLine: (key: LineParamKey, patch: Partial<ProjectionLineParams[LineParamKey]>) => void;
  resetToDefaults: () => void;
  indexAverages: Record<string, number>;
  isLoading?: boolean;
}

export function ProjectionParamsPanel({
  params,
  updateLine,
  resetToDefaults,
  indexAverages,
  isLoading,
}: ProjectionParamsPanelProps) {

  const getEffectiveRate = (key: LineParamKey): number => {
    const p = params[key];
    const base = p.index === 'custom'
      ? (p.customRate ?? 0)
      : (indexAverages[p.index] ?? 0);
    return base + (p.spread ?? 0);
  };

  const formatRate = (r: number): string => {
    const sign = r >= 0 ? '+' : '';
    return `${sign}${r.toFixed(1)}%`;
  };

  const lineKeys = Object.keys(LINE_LABELS) as LineParamKey[];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Parâmetros — Plano 30 Anos
          </span>
          <Badge variant="secondary" className="text-xs">
            Médias 5a
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-7 px-2"
          onClick={resetToDefaults}
          disabled={isLoading}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Resetar
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        {lineKeys.map((key, idx) => {
          const p = params[key];
          const effective = getEffectiveRate(key);
          const effectiveFormatted = formatRate(effective);
          const isPositive = effective >= 0;

          return (
            <div key={key}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center min-w-0">
                <span className="text-xs text-muted-foreground truncate">
                  {LINE_LABELS[key]}
                </span>

                <Select
                  value={p.index}
                  onValueChange={(val) => updateLine(key, { index: val as ProjectionIndex })}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-7 text-xs w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDEX_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative w-[72px]">
                  <Input
                    type="number"
                    step="0.5"
                    className="h-7 text-xs pr-5 pl-2"
                    value={p.spread ?? 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) updateLine(key, { spread: v });
                    }}
                    disabled={isLoading}
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>

                <span className={`text-xs font-medium w-[42px] text-right tabular-nums ${
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                }`}>
                  {effectiveFormatted}
                </span>
              </div>

              {p.index === 'custom' && (
                <div className="mt-1 ml-[calc(1fr+0.5rem)] flex items-center gap-1 pl-[calc(100%/4)]">
                  <span className="text-[10px] text-muted-foreground">Taxa base:</span>
                  <div className="relative w-[72px]">
                    <Input
                      type="number"
                      step="0.5"
                      className="h-6 text-xs pr-5 pl-2"
                      value={p.customRate ?? 0}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) updateLine(key, { customRate: v });
                      }}
                      disabled={isLoading}
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              )}

              {idx < lineKeys.length - 1 && (
                <Separator className="mt-2 opacity-40" />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug pt-1 border-t border-border/40">
        Os spreads são somados ao índice base. As médias usam os últimos 5 anos históricos.
        Configurações salvas automaticamente.
      </p>
    </div>
  );
}
