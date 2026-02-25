import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type OrdenacaoCampo = 'data' | 'valor';
export type OrdenacaoDirecao = 'asc' | 'desc';

interface SortFilterBarProps {
  showRealizados: boolean;
  onToggleRealizados: () => void;
  realizadosCount: number;
  ordenacaoPrimaria: OrdenacaoCampo;
  direcaoPrimaria: OrdenacaoDirecao;
  onSortChange: (campo: OrdenacaoCampo, direcao: OrdenacaoDirecao) => void;
}

export const SortFilterBar: React.FC<SortFilterBarProps> = ({
  showRealizados,
  onToggleRealizados,
  realizadosCount,
  ordenacaoPrimaria,
  direcaoPrimaria,
  onSortChange,
}) => {
  const ordenacaoSecundaria: OrdenacaoCampo = ordenacaoPrimaria === 'data' ? 'valor' : 'data';
  const direcaoSecundaria: OrdenacaoDirecao = direcaoPrimaria === 'asc' ? 'desc' : 'asc';

  const togglePrimarySortDirection = () => {
    onSortChange(ordenacaoPrimaria, direcaoPrimaria === 'asc' ? 'desc' : 'asc');
  };

  const swapSortOrder = () => {
    // Swap primary and secondary
    onSortChange(ordenacaoSecundaria, direcaoSecundaria);
  };

  const getSortLabel = (campo: OrdenacaoCampo) => {
    return campo === 'data' ? 'Data' : 'Valor';
  };

  const getSortIcon = (campo: OrdenacaoCampo) => {
    return campo === 'data' ? Calendar : DollarSign;
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Toggle Realizados - Checkbox style */}
      <button
        onClick={onToggleRealizados}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
          "text-sm font-medium shrink-0",
          showRealizados
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-background border-border text-muted-foreground hover:bg-muted/50"
        )}
      >
        <div className={cn(
          "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
          showRealizados
            ? "bg-primary border-primary"
            : "border-muted-foreground/50"
        )}>
          {showRealizados && (
            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
          )}
        </div>
        <span className="hidden sm:inline">Apenas realizadas</span>
        <span className="sm:hidden">Realizadas</span>
        {realizadosCount > 0 && (
          <Badge variant="secondary" className={cn(
            "text-[10px] px-1.5 h-5",
            showRealizados && "bg-primary/20 text-primary"
          )}>
            {realizadosCount}
          </Badge>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort Controls */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs sm:text-sm"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ordenar:</span>
            <span className="font-medium">{getSortLabel(ordenacaoPrimaria)}</span>
            {direcaoPrimaria === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4 bg-background border border-border shadow-lg z-50" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Ordenação</h4>
              <Badge variant="secondary" className="text-[10px]">
                2 níveis
              </Badge>
            </div>

            <Separator />

            {/* Nível 1 */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Nível 1 (Principal)
              </Label>
              <div className="flex gap-2">
                <SortOptionButton
                  campo="data"
                  direcao={ordenacaoPrimaria === 'data' ? direcaoPrimaria : 'asc'}
                  isActive={ordenacaoPrimaria === 'data'}
                  onClick={() => {
                    if (ordenacaoPrimaria === 'data') {
                      togglePrimarySortDirection();
                    } else {
                      onSortChange('data', 'asc');
                    }
                  }}
                />
                <SortOptionButton
                  campo="valor"
                  direcao={ordenacaoPrimaria === 'valor' ? direcaoPrimaria : 'desc'}
                  isActive={ordenacaoPrimaria === 'valor'}
                  onClick={() => {
                    if (ordenacaoPrimaria === 'valor') {
                      togglePrimarySortDirection();
                    } else {
                      onSortChange('valor', 'desc');
                    }
                  }}
                />
              </div>
            </div>

            {/* Nível 2 - Automático */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Nível 2 (Secundário)
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border/50">
                {React.createElement(getSortIcon(ordenacaoSecundaria), { 
                  className: "h-4 w-4 text-muted-foreground" 
                })}
                <span className="text-sm text-muted-foreground flex-1">
                  {getSortLabel(ordenacaoSecundaria)}
                </span>
                {direcaoSecundaria === 'asc' ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    A→Z <ArrowUp className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    Z→A <ArrowDown className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Automaticamente definido com base no nível 1
              </p>
            </div>

            <Separator />

            {/* Quick swap */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-2"
              onClick={swapSortOrder}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Inverter ordem dos níveis
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface SortOptionButtonProps {
  campo: OrdenacaoCampo;
  direcao: OrdenacaoDirecao;
  isActive: boolean;
  onClick: () => void;
}

const SortOptionButton: React.FC<SortOptionButtonProps> = ({
  campo,
  direcao,
  isActive,
  onClick,
}) => {
  const Icon = campo === 'data' ? Calendar : DollarSign;
  const label = campo === 'data' ? 'Data' : 'Valor';

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-all",
        isActive
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-background border-border text-foreground hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {isActive && (
        <div className="flex items-center gap-1 text-xs">
          {direcao === 'asc' ? (
            <>
              <span className="hidden sm:inline">A→Z</span>
              <ArrowUp className="h-3 w-3" />
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Z→A</span>
              <ArrowDown className="h-3 w-3" />
            </>
          )}
        </div>
      )}
    </button>
  );
};
