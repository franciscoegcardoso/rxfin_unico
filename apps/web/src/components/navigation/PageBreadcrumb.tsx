import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';

/**
 * Migalhas com base na tabela `pages` (Supabase). Só mostra se houver match de path.
 */
export function PageBreadcrumb() {
  const items = useBreadcrumb();
  const navigate = useNavigate();
  if (items.length <= 1) return null;

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground pb-3" aria-label="Migalhas">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={`${item.path}-${idx}`} className="flex items-center gap-1 min-w-0">
            {idx > 0 && <ChevronRight size={14} className="opacity-40 shrink-0" />}
            {isLast ? (
              <span className="text-foreground font-medium truncate">{item.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => navigate(item.path)}
                className="hover:text-foreground transition-colors truncate text-left"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
