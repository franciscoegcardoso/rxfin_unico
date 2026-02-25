import * as React from 'react';
import { Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  showIcon?: boolean;
  /** If true, onChange receives only digits. If false, receives formatted string */
  onlyDigits?: boolean;
}

/**
 * Formats a phone number string to Brazilian format: (00) 00000-0000
 */
export function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Extracts only digits from a phone number string
 */
export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, showIcon = true, onlyDigits = true, ...props }, ref) => {
    // Display formatted value
    const displayValue = formatBrazilianPhone(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const digits = extractPhoneDigits(inputValue);
      
      if (onlyDigits) {
        onChange(digits);
      } else {
        onChange(formatBrazilianPhone(inputValue));
      }
    };

    if (showIcon) {
      return (
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={ref}
            type="tel"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
            className={cn("pl-10", className)}
            {...props}
          />
        </div>
      );
    }

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder="(00) 00000-0000"
        className={className}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
