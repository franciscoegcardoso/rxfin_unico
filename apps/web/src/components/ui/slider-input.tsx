import React, { useState, useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SliderInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  className?: string;
  disabled?: boolean;
  decimalPlaces?: number;
}

export const SliderInput: React.FC<SliderInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 0.1,
  suffix = '%',
  className,
  disabled,
  decimalPlaces = 1,
}) => {
  const [inputValue, setInputValue] = useState(value.toFixed(decimalPlaces));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input with external value changes (when not focused)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toFixed(decimalPlaces));
    }
  }, [value, decimalPlaces, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    setInputValue(raw);
    
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, min), max);
      onChange(clamped);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(inputValue.replace(',', '.'));
    if (!isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, min), max);
      onChange(clamped);
      setInputValue(clamped.toFixed(decimalPlaces));
    } else {
      setInputValue(value.toFixed(decimalPlaces));
    }
  };

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0];
    onChange(newValue);
    if (!isFocused) {
      setInputValue(newValue.toFixed(decimalPlaces));
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        className="flex-1 py-2"
        disabled={disabled}
      />
      <div className="relative w-20 flex-shrink-0">
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleInputBlur}
          className="text-center pr-6 h-8 text-sm font-medium"
          disabled={disabled}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  );
};
