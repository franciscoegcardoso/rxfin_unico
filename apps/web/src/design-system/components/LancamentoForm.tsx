import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Receipt,
} from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type LancamentoFormTipo = "receita" | "despesa";

export interface CategoryOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface LancamentoFormProps {
  tipo: LancamentoFormTipo;
  onTipoChange: (tipo: LancamentoFormTipo) => void;
  valor: number;
  onValorChange: (value: number) => void;
  categoria: string;
  onCategoriaChange: (value: string) => void;
  categorias: CategoryOption[];
  descricao?: string;
  onDescricaoChange?: (value: string) => void;
  data?: string;
  onDataChange?: (value: string) => void;
  contaLabel?: string;
  contaValue?: string;
  onContaChange?: (value: string) => void;
  contaOptions?: { value: string; label: string }[];
  onSubmit: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
  submitLabel?: string;
  /** Conteúdo extra para "Mais detalhes" (ex.: forma pagamento, lista de compras) */
  childrenSecondary?: React.ReactNode;
}

export const LancamentoForm: React.FC<LancamentoFormProps> = ({
  tipo,
  onTipoChange,
  valor,
  onValorChange,
  categoria,
  onCategoriaChange,
  categorias,
  descricao = "",
  onDescricaoChange,
  data = "",
  onDataChange,
  contaLabel,
  contaValue,
  onContaChange,
  contaOptions = [],
  onSubmit,
  onBack,
  isSubmitting = false,
  isEditing = false,
  submitLabel,
  childrenSecondary,
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const defaultSubmitLabel =
    tipo === "receita"
      ? isEditing
        ? "Salvar alterações"
        : "Registrar entrada"
      : isEditing
        ? "Salvar alterações"
        : "Registrar saída";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* 1) Toggle Receita / Despesa — dois botões lado a lado */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          type="button"
          onClick={() => onTipoChange("receita")}
          className={cn(
            "flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors",
            tipo === "receita"
              ? "bg-income text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-5 w-5 shrink-0" />
          Receita
        </button>
        <button
          type="button"
          onClick={() => onTipoChange("despesa")}
          className={cn(
            "flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors",
            tipo === "despesa"
              ? "bg-expense text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingDown className="h-5 w-5 shrink-0" />
          Despesa
        </button>
      </div>

      {/* 2) Valor — Syne bold text-2xl, BRL, teclado decimal em mobile */}
      <div className="space-y-2 mb-6">
        <Label className="text-muted-foreground">Valor</Label>
        <CurrencyInput
          value={valor}
          onChange={onValorChange}
          inputMode="decimal"
          placeholder="0,00"
          className={cn(
            "w-full font-sans font-bold text-2xl h-14 rounded-xl border border-border bg-background text-foreground tabular-nums"
          )}
        />
      </div>

      {/* 3) Categoria — grid de chips com ícone + label */}
      <div className="space-y-2 mb-6">
        <Label className="text-muted-foreground">Categoria</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {categorias.map((cat) => {
            const selected = categoria === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => onCategoriaChange(cat.value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-left transition-colors min-h-[44px]",
                  selected
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.icon ?? <Receipt className="h-4 w-4 shrink-0" />}
                <span className="text-sm font-medium truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mais detalhes — expansível (descrição, data, conta) */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Mais detalhes
            {detailsOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {onDescricaoChange && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => onDescricaoChange(e.target.value)}
                placeholder="Ex: Salário, Supermercado..."
                className="rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}
          {onDataChange && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => onDataChange(e.target.value)}
                className="rounded-xl border border-border bg-background text-foreground"
              />
            </div>
          )}
          {contaLabel && onContaChange && contaOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">{contaLabel}</Label>
              <Select value={contaValue ?? ""} onValueChange={onContaChange}>
                <SelectTrigger className="rounded-xl border border-border bg-background text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contaOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {childrenSecondary}
        </CollapsibleContent>
      </Collapsible>

      {/* Botão confirmar */}
      <div className="flex flex-col sm:flex-row gap-2 mt-6">
        {onBack && !isEditing && (
          <button
            type="button"
            onClick={onBack}
            className="order-2 sm:order-1 py-3 px-4 rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Voltar
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn(
            "min-h-[56px] w-full rounded-xl font-sans font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity",
            onBack && !isEditing ? "sm:flex-1 order-1 sm:order-2" : ""
          )}
        >
          {isSubmitting ? "Salvando…" : submitLabel ?? defaultSubmitLabel}
        </button>
      </div>
    </div>
  );
};
