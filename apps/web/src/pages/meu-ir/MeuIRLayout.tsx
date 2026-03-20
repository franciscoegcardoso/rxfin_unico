import React from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Bot, History, Settings2, FileText } from 'lucide-react';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { IRTipsDialog } from '@/components/ir-import/IRTipsDialog';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import IrExercicioSummaryCard from '@/components/ir/IrExercicioSummaryCard';
import { cn } from '@/lib/utils';

const TAB_TRIGGER =
  'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-4 min-h-[52px] text-sm font-normal rounded-none border-b-2 border-transparent transition-colors text-center leading-tight bg-muted/30 hover:bg-muted/50';
const TAB_ACTIVE = 'border-primary font-semibold shadow-none bg-transparent';
const TAB_INACTIVE = 'border-transparent';

const MeuIRLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const year = new Date().getFullYear();

  return (
    <AppLayout>
      <div className="flex flex-col min-h-full w-full max-w-full min-w-0 bg-[hsl(var(--color-surface-base))]">
        <div className="content-zone py-5 md:py-6 space-y-5 flex-1">
          <PageHeader
            icon={FileText}
            title="Meu IR"
            subtitle="Organize comprovantes e acompanhe seu histórico de declarações"
            actions={
              <>
                <VisibilityToggle />
                <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.meuIR} />
                <Link to="/configuracoes-fiscais">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Configurações Fiscais</span>
                    <span className="sm:hidden">Config</span>
                  </Button>
                </Link>
                <IRTipsDialog />
              </>
            }
          />
          <IrExercicioSummaryCard
            anoExercicio={year}
            onReconcileClick={() => {
              navigate('/meu-ir/historico');
              setTimeout(
                () => document.getElementById('ir-reconcile-banners')?.scrollIntoView({ behavior: 'smooth' }),
                150
              );
            }}
            onBensDireitosClick={() => {
              navigate('/meu-ir/historico', { state: { scrollTo: 'bens' } });
            }}
            onImportClick={() => {
              navigate('/meu-ir/historico', { state: { openImport: true } });
            }}
          />

          <div className="w-full">
            <nav className="w-full grid grid-cols-2 h-auto min-h-[52px] p-0 bg-transparent gap-0">
              <NavLink
                to="/meu-ir"
                end
                className={({ isActive }) => cn(TAB_TRIGGER, isActive ? TAB_ACTIVE : TAB_INACTIVE)}
              >
                <Bot className="h-4 w-4 shrink-0" />
                Organizar {year}
              </NavLink>
              <NavLink
                to="/meu-ir/historico"
                className={({ isActive }) => cn(TAB_TRIGGER, isActive ? TAB_ACTIVE : TAB_INACTIVE)}
              >
                <History className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Histórico IR</span>
                <span className="sm:hidden">Histórico</span>
              </NavLink>
            </nav>

            <div className="mt-6">
              <Outlet key={location.pathname} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MeuIRLayout;
