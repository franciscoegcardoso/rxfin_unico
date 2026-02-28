import React from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const countries = [
  { code: '+55', flag: '🇧🇷' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+351', flag: '🇵🇹' },
  { code: '+44', flag: '🇬🇧' },
];

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = 'XX XXXXX-XXXX',
}) => {
  const currentDDI = countries.find(c => value?.startsWith(c.code))?.code || '+55';
  const currentNumber = value ? value.substring(currentDDI.length).trim() : '';

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let numbers = e.target.value.replace(/\D/g, '');

    if (currentDDI === '+55') {
      if (numbers.length > 11) numbers = numbers.substring(0, 11);
      let formatted = numbers;
      if (numbers.length > 2) formatted = `${numbers.substring(0, 2)} ${numbers.substring(2)}`;
      if (numbers.length > 7) formatted = `${numbers.substring(0, 2)} ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
      onChange(`${currentDDI} ${formatted}`);
    } else {
      onChange(`${currentDDI} ${numbers}`);
    }
  };

  const handleDdiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(`${e.target.value} ${currentNumber}`);
  };

  return (
    <div className="flex rounded-lg overflow-hidden bg-card border border-input focus-within:ring-2 focus-within:ring-primary/20 transition-all w-full">
      <div className="bg-muted border-r border-border relative flex items-center">
        <select
          value={currentDDI}
          onChange={handleDdiChange}
          className="appearance-none bg-transparent text-secondary-foreground text-sm pl-2 pr-6 py-3 outline-none cursor-pointer font-medium w-full z-10"
        >
          {countries.map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground text-[10px]">
          ▼
        </div>
      </div>
      <input
        type="tel"
        className="flex-1 p-3 outline-none text-foreground bg-transparent placeholder:text-muted-foreground"
        placeholder={placeholder}
        value={currentNumber}
        onChange={handleNumberChange}
      />
    </div>
  );
};
