import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DecimalInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  min?: number;
  max?: number;
  decimalPlaces?: number; // Default: 1 decimal place
  maxIntegerDigits?: number; // Max digits before decimal (default: 2)
}

export interface DecimalInputRef {
  focus: () => void;
  select: () => void;
}

export const DecimalInput = forwardRef<DecimalInputRef, DecimalInputProps>(({
  value,
  onChange,
  placeholder = '0,0',
  className,
  disabled,
  id,
  min = 0,
  max = 99.9,
  decimalPlaces = 1,
  maxIntegerDigits = 2,
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose focus and select methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    select: () => inputRef.current?.select(),
  }));

  // Format number to display (e.g., 13.0 -> "13,0")
  const formatToDisplay = (num: number): string => {
    if (num === 0) return '';
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  };

  // Update display when external value changes (only when not focused)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatToDisplay(value));
    }
  }, [value, decimalPlaces, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    
    // Allow empty input
    if (!rawInput) {
      setDisplayValue('');
      onChange(0);
      return;
    }
    
    // Allow only digits and one comma/period as decimal separator
    // Replace period with comma for consistency
    let cleaned = rawInput.replace(/[^\d,\.]/g, '').replace('.', ',');
    
    // Ensure only one comma
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      const beforeComma = cleaned.slice(0, commaIndex);
      const afterComma = cleaned.slice(commaIndex + 1).replace(/,/g, '');
      cleaned = beforeComma + ',' + afterComma;
    }
    
    // Split into integer and decimal parts
    const parts = cleaned.split(',');
    let integerPart = parts[0] || '';
    let decimalPart = parts[1] ?? '';
    
    // Limit integer part length
    if (integerPart.length > maxIntegerDigits) {
      integerPart = integerPart.slice(0, maxIntegerDigits);
    }
    
    // Limit decimal part length
    if (decimalPart.length > decimalPlaces) {
      decimalPart = decimalPart.slice(0, decimalPlaces);
    }
    
    // Reconstruct display value - preserve comma if user typed it
    let newDisplay = integerPart;
    if (cleaned.includes(',')) {
      newDisplay += ',' + decimalPart;
    }
    
    setDisplayValue(newDisplay);
    
    // Parse and clamp value for onChange
    const numericValue = parseFloat(newDisplay.replace(',', '.')) || 0;
    const clampedValue = Math.min(Math.max(numericValue, min), max);
    onChange(clampedValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format properly on blur
    const numericValue = parseFloat(displayValue.replace(',', '.')) || 0;
    const clampedValue = Math.min(Math.max(numericValue, min), max);
    setDisplayValue(formatToDisplay(clampedValue));
    onChange(clampedValue);
  };

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn('text-center', className)}
      disabled={disabled}
    />
  );
});

DecimalInput.displayName = 'DecimalInput';
