import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  compact?: boolean; // For table cells
  decimalPlaces?: number; // Number of decimal places (default 2 for currency)
  maxDigits?: number; // Maximum total digits allowed (including decimals)
  autoFocus?: boolean; // Auto focus the input on mount/update
  onFocus?: () => void; // Custom focus handler
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; // Custom keydown handler
}

export interface CurrencyInputRef {
  focus: () => void;
  select: () => void;
}

export const CurrencyInput = forwardRef<CurrencyInputRef, CurrencyInputProps>(({
  value,
  onChange,
  placeholder = '0,00',
  className,
  disabled,
  readOnly,
  id,
  compact = false,
  decimalPlaces = 2,
  maxDigits,
  autoFocus = false,
  onFocus: customOnFocus,
  onKeyDown,
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose focus and select methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    select: () => inputRef.current?.select(),
  }));

  // Format number to Brazilian currency display (without R$ prefix)
  const formatToDisplay = (num: number): string => {
    if (num === 0) return '';
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  };

  // Convert cents to decimal value
  const centsToDecimal = (cents: number): number => {
    return cents / Math.pow(10, decimalPlaces);
  };

  // Update display when external value changes
  useEffect(() => {
    setDisplayValue(formatToDisplay(value));
  }, [value, decimalPlaces]);

  // Auto focus when autoFocus prop is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Extract only digits
    let digits = inputValue.replace(/\D/g, '');
    
    if (!digits) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Enforce max digits limit
    if (maxDigits && digits.length > maxDigits) {
      digits = digits.slice(0, maxDigits);
    }

    // Convert digits to cents then to decimal
    const cents = parseInt(digits, 10);
    const decimalValue = centsToDecimal(cents);
    
    // Format for display
    setDisplayValue(formatToDisplay(decimalValue));
    onChange(decimalValue);
  };

  const handleFocus = () => {
    // Select all on focus for easy replacement
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
    customOnFocus?.();
  };

  if (compact) {
    return (
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn('text-right', className)}
        disabled={disabled}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
        R$
      </span>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn('pl-10', className)}
        disabled={disabled}
        readOnly={readOnly}
      />
    </div>
  );
});
