import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  format: string;
  maxLength: number;
}

const countries: Country[] = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷', format: '(XX) XXXXX-XXXX', maxLength: 11 },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸', format: '(XXX) XXX-XXXX', maxLength: 10 },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷', format: 'X XX XX XX XX', maxLength: 9 },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪', format: 'XXXX XXXXXXX', maxLength: 11 },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧', format: 'XXXX XXXXXX', maxLength: 10 },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', format: 'XX XXXX-XXXX', maxLength: 10 },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', format: 'X XXXX XXXX', maxLength: 9 },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: '🇺🇾', format: 'X XXX XXXX', maxLength: 8 },
  { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: '🇵🇾', format: 'XXX XXX XXX', maxLength: 9 },
];

interface InternationalPhoneInputProps {
  value: string;
  onChange: (value: string, country: Country) => void;
  defaultCountry?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

function formatPhoneNumber(digits: string, country: Country): string {
  const cleaned = digits.replace(/\D/g, '').slice(0, country.maxLength);
  
  if (country.code === 'BR') {
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  
  if (country.code === 'US') {
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Generic formatting for other countries - groups of 3
  const groups = cleaned.match(/.{1,3}/g) || [];
  return groups.join(' ');
}

export function InternationalPhoneInput({
  value,
  onChange,
  defaultCountry = 'BR',
  error,
  disabled = false,
  placeholder,
}: InternationalPhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find(c => c.code === defaultCountry) || countries[0]
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse initial value if it contains dial code
  useEffect(() => {
    if (value && value.startsWith('+')) {
      const country = countries.find(c => value.startsWith(c.dialCode));
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    // Notify parent with current digits and new country
    const digits = value.replace(/\D/g, '');
    onChange(`${country.dialCode}${digits}`, country);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digits = inputValue.replace(/\D/g, '').slice(0, selectedCountry.maxLength);
    onChange(`${selectedCountry.dialCode}${digits}`, selectedCountry);
  };

  // Extract digits from value (remove dial code if present)
  const getDisplayDigits = () => {
    if (!value) return '';
    const withoutDialCode = value.replace(selectedCountry.dialCode, '');
    return withoutDialCode.replace(/\D/g, '');
  };

  const displayValue = formatPhoneNumber(getDisplayDigits(), selectedCountry);

  return (
    <div className="space-y-1">
      <div className={cn(
        "flex rounded-md border border-input bg-background",
        error && "border-destructive",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="h-10 px-3 rounded-r-none border-r border-input hover:bg-muted/50 focus:ring-0"
            >
              <span className="text-xl mr-1">{selectedCountry.flag}</span>
              <span className="text-xs text-muted-foreground">{selectedCountry.dialCode}</span>
              <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar país..." />
              <CommandList>
                <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                <CommandGroup>
                  {countries.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.dialCode}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="cursor-pointer"
                    >
                      <span className="text-xl mr-2">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-muted-foreground text-sm">{country.dialCode}</span>
                      {selectedCountry.code === country.code && (
                        <Check className="ml-2 h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        <Input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder || selectedCountry.format}
          className="border-0 rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

export { countries };
