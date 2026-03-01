import React from 'react';
import { Label } from '@/components/ui/label';
import { CurrencyInput as UICurrencyInput } from '@/components/ui/currency-input';
import { cn } from '@/lib/utils';

interface SimulatorCurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Currency input for simulator pages: label above, R$ formatting in real time.
 */
export function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = '0,00',
  className,
  id,
  disabled,
}: SimulatorCurrencyInputProps) {
  const inputId = id ?? `sim-currency-${label.replace(/\s/g, '-').toLowerCase()}`;
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </Label>
      <UICurrencyInput
        id={inputId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}
