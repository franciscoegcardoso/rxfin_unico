import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Country {
  code: string;
  flag: string;
  ddi: string;
  placeholder: string;
  maxDigits: number;
}

const COUNTRIES: Country[] = [
  { code: 'BR', flag: '🇧🇷', ddi: '+55', placeholder: '(XX) XXXXX-XXXX', maxDigits: 11 },
  { code: 'US', flag: '🇺🇸', ddi: '+1', placeholder: '(XXX) XXX-XXXX', maxDigits: 10 },
  { code: 'PT', flag: '🇵🇹', ddi: '+351', placeholder: 'XXX XXX XXX', maxDigits: 9 },
  { code: 'AR', flag: '🇦🇷', ddi: '+54', placeholder: 'XX XXXX-XXXX', maxDigits: 10 },
  { code: 'UY', flag: '🇺🇾', ddi: '+598', placeholder: 'XX XXX XXX', maxDigits: 8 },
  { code: 'PY', flag: '🇵🇾', ddi: '+595', placeholder: 'XXX XXX XXX', maxDigits: 9 },
  { code: 'CL', flag: '🇨🇱', ddi: '+56', placeholder: 'X XXXX XXXX', maxDigits: 9 },
  { code: 'CO', flag: '🇨🇴', ddi: '+57', placeholder: 'XXX XXX XXXX', maxDigits: 10 },
  { code: 'MX', flag: '🇲🇽', ddi: '+52', placeholder: 'XX XXXX XXXX', maxDigits: 10 },
];

function formatBRPhone(digits: string): string {
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatUSPhone(digits: string): string {
  if (!digits) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function formatGenericPhone(digits: string): string {
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatPhone(digits: string, countryCode: string): string {
  switch (countryCode) {
    case 'BR': return formatBRPhone(digits);
    case 'US': return formatUSPhone(digits);
    default: return formatGenericPhone(digits);
  }
}

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string, isValid: boolean) => void;
  id?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, id, className }) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [digits, setDigits] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const handleDigitsChange = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, '').slice(0, selectedCountry.maxDigits);
    setDigits(onlyDigits);

    const isBR = selectedCountry.code === 'BR';
    const minDigits = isBR ? 10 : Math.max(selectedCountry.maxDigits - 2, 7);
    const isValid = onlyDigits.length >= minDigits;

    const fullPhone = `${selectedCountry.ddi} ${onlyDigits}`;
    onChange(fullPhone, isValid);
  };

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    setShowDropdown(false);
    setDigits('');
    onChange('', false);
  };

  const formatted = formatPhone(digits, selectedCountry.code);

  return (
    <div ref={containerRef} className={cn("relative flex items-center", className)}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1 px-2 h-9 rounded-l-md border border-r-0 border-input bg-muted/50 text-sm shrink-0 hover:bg-muted transition-colors"
        aria-label="Selecionar país"
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="text-xs text-muted-foreground">{selectedCountry.ddi}</span>
        <span className="text-[10px] text-muted-foreground/60 ml-0.5">▼</span>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto w-52">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
                c.code === selectedCountry.code && "bg-primary/5 font-medium"
              )}
              onClick={() => selectCountry(c)}
            >
              <span className="text-base">{c.flag}</span>
              <span className="text-muted-foreground">{c.ddi}</span>
              <span className="text-xs text-muted-foreground/70 ml-auto">{c.placeholder}</span>
            </button>
          ))}
        </div>
      )}

      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder={selectedCountry.placeholder}
        value={formatted}
        onChange={(e) => handleDigitsChange(e.target.value)}
        className="rounded-l-none flex-1 h-9"
      />
    </div>
  );
};
