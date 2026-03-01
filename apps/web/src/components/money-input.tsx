import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  /** When true, renders a compact input without prefix and right-aligned text (useful for tables). */
  compact?: boolean;
  /** Set false to hide the prefix (defaults to "R$"). */
  prefix?: string | false;
  /** Clamp the value (applied on blur). */
  min?: number;
  /** Clamp the value (applied on blur). */
  max?: number;
};

const ptBrNumberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const clamp = (n: number, min?: number, max?: number) => {
  let v = n;
  if (typeof min === "number") v = Math.max(min, v);
  if (typeof max === "number") v = Math.min(max, v);
  return v;
};

const parsePtBrNumber = (text: string): number => {
  // Accepts: "1234", "1.234", "1.234,56", "1234,56"
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Remove currency symbols/spaces; keep digits, dot, comma.
  const cleaned = trimmed.replace(/[^0-9.,]/g, "");
  if (!cleaned) return 0;

  // Remove thousand separators (.) and use comma as decimal separator.
  const noThousands = cleaned.replace(/\./g, "");
  const normalized = noThousands.replace(/,/g, ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "0,00",
      className,
      disabled,
      readOnly,
      id,
      compact = false,
      prefix = "R$",
      min,
      max,
    },
    ref,
  ) => {
    const [text, setText] = React.useState<string>(() => 
      value ? ptBrNumberFormatter.format(value) : ""
    );
    const [focused, setFocused] = React.useState(false);
    const innerRef = React.useRef<HTMLInputElement>(null);

    // Sync external value changes when NOT focused
    React.useEffect(() => {
      if (!focused) {
        setText(value ? ptBrNumberFormatter.format(value) : "");
      }
    }, [value, focused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      // Show raw value for easier editing
      setText(value ? value.toFixed(2).replace(".", ",") : "");
      // Select all text after a tick
      requestAnimationFrame(() => {
        e.target.select();
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only update local text state - do NOT call onChange here
      // This prevents re-renders that cause cursor to jump
      setText(e.target.value);
    };

    const handleBlur = () => {
      setFocused(false);
      const parsed = clamp(parsePtBrNumber(text), min, max);
      // Only call onChange on blur to prevent cursor issues
      onChange(parsed);
      setText(parsed ? ptBrNumberFormatter.format(parsed) : "");
    };

    const inputProps = {
      ref: (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      id,
      type: "text" as const,
      inputMode: "decimal" as const,
      value: text,
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder,
      disabled,
      readOnly,
    };

    if (compact || prefix === false) {
      return (
        <Input
          {...inputProps}
          className={cn(compact && "text-right", className)}
        />
      );
    }

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
          {prefix}
        </span>
        <Input
          {...inputProps}
          className={cn("pl-10", className)}
        />
      </div>
    );
  },
);

MoneyInput.displayName = "MoneyInput";
