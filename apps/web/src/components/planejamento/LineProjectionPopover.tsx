import React from 'react';
import { Settings2 } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { LineParam, ProjectionIndex } from '@/hooks/useProjectionLineParams';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LineProjectionPopoverProps {
  label: string;
  param: LineParam;
  onChange: (update: Partial<LineParam>) => void;
}

const INDEX_OPTIONS: { value: ProjectionIndex; label: string }[] = [
  { value: 'ipca',     label: 'IPCA' },
  { value: 'igpm',     label: 'IGP-M' },
  { value: 'cdi',      label: 'CDI' },
  { value: 'ibovespa', label: 'Ibovespa' },
  { value: 'custom',   label: 'Personalizado' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export const LineProjectionPopover: React.FC<LineProjectionPopoverProps> = ({
  label,
  param,
  onChange,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded hover:bg-accent/60 opacity-50 hover:opacity-100 transition-opacity"
          title={`Configurar projeção: ${label}`}
        >
          <Settings2 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-4 space-y-4" align="start">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">
            Parâmetros de projeção para esta linha
          </p>
        </div>

        {/* Índice base */}
        <div className="space-y-1.5">
          <Label className="text-xs">Índice base</Label>
          <Select
            value={param.index}
            onValueChange={(v) => onChange({ index: v as ProjectionIndex })}
          >
            <SelectTrigger className="h-8 text-xs">
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
        </div>

        {/* Taxa personalizada — só quando custom */}
        {param.index === 'custom' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Taxa anual (%)</Label>
            <Input
              type="number"
              step="0.5"
              className="h-8 text-xs text-right"
              value={param.customRate ?? 0}
              onChange={e => onChange({ customRate: parseFloat(e.target.value) || 0 })}
            />
          </div>
        )}

        {/* Spread */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            Spread (% a.a.)
            <span className="text-muted-foreground ml-1">— pode ser negativo</span>
          </Label>
          <Input
            type="number"
            step="0.5"
            className="h-8 text-xs text-right"
            value={param.spread}
            onChange={e => onChange({ spread: parseFloat(e.target.value) || 0 })}
          />
        </div>

        {/* Preview da taxa efetiva — somente custom */}
        {param.index === 'custom' && (
          <div className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary font-medium text-center">
            Taxa efetiva: {((param.customRate ?? 0) + param.spread).toFixed(2)}% a.a.
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          A taxa do índice é calculada como média dos últimos 5 anos + spread.
        </p>
      </PopoverContent>
    </Popover>
  );
};
