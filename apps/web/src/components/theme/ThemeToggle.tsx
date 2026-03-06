'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemePreference } from '@/hooks/useThemePreference';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ThemeValue = 'light' | 'dark' | 'system';

const OPTIONS: { value: ThemeValue; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'system', label: 'Automático', description: 'Segue o sistema operacional', icon: Monitor },
  { value: 'light',  label: 'Claro',      description: 'Fundo branco',                icon: Sun     },
  { value: 'dark',   label: 'Escuro',     description: 'Fundo escuro',                icon: Moon    },
];

/**
 * ThemeSelector — para usar em /minha-conta/preferencias
 * Persiste a escolha no Supabase via useThemePreference
 */
export function ThemeSelector() {
  const { theme, resolvedTheme, setTheme, isSaving } = useThemePreference();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-[var(--radius)] bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const handleChange = (value: ThemeValue) => {
    document.documentElement.classList.add('theme-transitioning');
    setTheme(value);
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 300);
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Aparência</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Como o RXFin é exibido no seu dispositivo
          {isSaving && <span className="ml-2 text-primary">Salvando…</span>}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map(({ value, label, description, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              onClick={() => handleChange(value)}
              className={cn(
                'relative flex flex-col items-center gap-2.5 p-4 rounded-[var(--radius)]',
                'border cursor-pointer transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-pressed={isActive}
            >
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-md', isActive ? 'bg-primary/12' : 'bg-muted')}>
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="text-center">
                <p className={cn('text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{label}</p>
                {value === 'system' && mounted && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    ({resolvedTheme === 'dark' ? 'escuro' : 'claro'} agora)
                  </p>
                )}
              </div>
              {isActive && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ThemeToggle — botão compacto (mantido para compatibilidade com usos existentes)
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useThemePreference();
  const isDark = resolvedTheme === 'dark' || theme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 min-h-[44px] min-w-[44px]"
      aria-label="Alternar tema"
      onClick={() => {
        document.documentElement.classList.add('theme-transitioning');
        setTheme(isDark ? 'light' : 'dark');
        setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 300);
      }}
    >
      <Sun  className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
