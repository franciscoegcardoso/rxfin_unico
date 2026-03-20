import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavChip {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  color: string;
  textColor: string;
  borderColor: string;
  path: string;
  tab?: string;
}

export interface NavChipsProps {
  chips: NavChip[];
  currentPath: string;
}

function isModulePathActive(currentPath: string, chipPath: string): boolean {
  if (currentPath === chipPath) return true;
  if (chipPath !== '/' && currentPath.startsWith(`${chipPath}/`)) return true;
  return false;
}

function goToPath(navigate: ReturnType<typeof useNavigate>, chip: NavChip) {
  const q = chip.tab ? `?tab=${encodeURIComponent(chip.tab)}` : '';
  navigate(`${chip.path}${q}`);
}

export const NavChips: React.FC<NavChipsProps> = ({ chips, currentPath }) => {
  const navigate = useNavigate();
  const visible = chips.filter((c) => !isModulePathActive(currentPath, c.path));

  if (visible.length === 0) return null;

  return (
    <nav
      role="navigation"
      aria-label="Navegar para outros módulos"
      className={cn(
        'flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3',
        'lg:flex lg:flex-row lg:flex-wrap lg:gap-2'
      )}
    >
      {visible.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.id}
            type="button"
            role="button"
            tabIndex={0}
            onClick={() => goToPath(navigate, chip)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToPath(navigate, chip);
              }
            }}
            className={cn(
              'flex items-center gap-3 rounded-lg border text-left transition-all duration-150',
              'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'px-4 py-4 min-h-[56px] md:min-h-0 md:py-3',
              'lg:px-3 lg:py-1.5 lg:min-h-0 lg:text-sm',
              chip.color,
              chip.borderColor,
              chip.textColor
            )}
          >
            <Icon className="h-5 w-5 shrink-0 lg:h-4 lg:w-4" aria-hidden />
            <div className="min-w-0 flex-1">
              <span className="font-semibold lg:font-medium block">{chip.label}</span>
              {chip.sublabel && (
                <span className="text-xs text-muted-foreground block lg:hidden md:block">{chip.sublabel}</span>
              )}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-60 lg:hidden" aria-hidden />
          </button>
        );
      })}
    </nav>
  );
};
