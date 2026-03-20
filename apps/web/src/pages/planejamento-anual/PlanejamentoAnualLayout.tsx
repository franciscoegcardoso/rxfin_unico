import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { BarChart3, CalendarDays, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const TAB_CLASS =
  'flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-md border-b-2 border-transparent transition-colors';
const TAB_ACTIVE =
  'border-primary text-foreground font-medium bg-muted/40';
const TAB_INACTIVE =
  'text-muted-foreground hover:text-foreground border-transparent';

const PlanejamentoAnualLayout: React.FC = () => {
  const location = useLocation();

  return (
    <AppLayout>
      <div className="content-zone py-5 md:py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Planejamento Anual</h1>
              <p className="text-muted-foreground mt-1">
                Projeção de longo prazo e planejamento estratégico
              </p>
            </div>
            <VisibilityToggle />
            <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.projecao30Anos} />
          </div>
        </div>

        <nav className="grid w-full grid-cols-3 gap-1 p-1 bg-muted/30 rounded-lg border border-border">
          <NavLink
            to="/planejamento-anual"
            end
            className={({ isActive }) =>
              cn('rounded-md', TAB_CLASS, isActive ? TAB_ACTIVE : TAB_INACTIVE)
            }
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Visão Geral</span>
          </NavLink>
          <NavLink
            to="/planejamento-anual/plano2anos"
            className={({ isActive }) =>
              cn('rounded-md', TAB_CLASS, isActive ? TAB_ACTIVE : TAB_INACTIVE)
            }
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Plano 2026–2027</span>
          </NavLink>
          <NavLink
            to="/planejamento-anual/plano30anos"
            className={({ isActive }) =>
              cn('rounded-md', TAB_CLASS, isActive ? TAB_ACTIVE : TAB_INACTIVE)
            }
          >
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Plano 30 Anos</span>
          </NavLink>
        </nav>

        <Outlet key={location.pathname} />
      </div>
    </AppLayout>
  );
};

export default PlanejamentoAnualLayout;
