import React, { useState, createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  User, 
  Calculator, 
  FileText, 
  Settings, 
  History,
  Home,
  BarChart3,
  ChevronRight,
  Upload,
  ArrowRight,
  Camera,
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ReceiptCaptureDialog } from './ReceiptCaptureDialog';
import { VehicleRecordDialog } from '@/components/veiculos/VehicleRecordDialog';
import { useFinancial } from '@/contexts/FinancialContext';

// Context for visibility toggle
const VisibilityContext = createContext<{
  isHidden: boolean;
  toggle: () => void;
}>({
  isHidden: false,
  toggle: () => {},
});

const useVisibility = () => useContext(VisibilityContext);

// Format currency with visibility
const formatCurrency = (value: number, hidden: boolean) => {
  if (hidden) return '••••••';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Hook to get user's first name
const useUserName = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string>('');

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) {
        setFirstName('');
        return;
      }

      // First try from user metadata
      const metaName = user.user_metadata?.full_name;
      if (metaName) {
        setFirstName(metaName.split(' ')[0]);
        return;
      }

      // Then try from profiles table
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (data?.full_name) {
        setFirstName(data.full_name.split(' ')[0]);
      } else {
        // Fallback to email prefix
        setFirstName(user.email?.split('@')[0] || 'Usuário');
      }
    };

    fetchUserName();
  }, [user]);

  return firstName;
};

// Header Component
const NubankHeader: React.FC = () => {
  const { isHidden, toggle } = useVisibility();
  const navigate = useNavigate();
  const firstName = useUserName();

  return (
    <header className="bg-nubank-primary px-5 pt-12 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-nubank-foreground">
          Olá, <span className="font-bold">{firstName}</span>
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="p-2 rounded-full hover:bg-nubank-hover transition-colors"
            aria-label={isHidden ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {isHidden ? (
              <EyeOff className="h-6 w-6 text-nubank-foreground" />
            ) : (
              <Eye className="h-6 w-6 text-nubank-foreground" />
            )}
          </button>
          <button 
            onClick={() => navigate('/minha-conta')}
            className="p-2 rounded-full hover:bg-nubank-hover transition-colors"
          >
            <User className="h-6 w-6 text-nubank-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};

// Hero/Balance Section
const BalanceSection: React.FC = () => {
  const { isHidden } = useVisibility();
  const salarioLiquido = 8500;

  return (
    <div className="bg-nubank-primary px-5 pb-8">
      <p className="text-nubank-muted text-sm mb-1">Salário Líquido Atual</p>
      <p className="text-3xl font-bold text-nubank-foreground">
        {formatCurrency(salarioLiquido, isHidden)}
      </p>
    </div>
  );
};

// Quick Action Button
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 min-w-[72px] group"
  >
    <div className="h-14 w-14 rounded-full bg-nubank-surface flex items-center justify-center transition-all group-hover:bg-nubank-hover group-active:scale-95">
      {icon}
    </div>
    <span className="text-xs text-nubank-foreground text-center leading-tight max-w-[72px]">
      {label}
    </span>
  </button>
);

// Quick Actions Section
const QuickActionsSection: React.FC<{ 
  onReceiptCapture: () => void;
  onVehicleExpense?: () => void;
  hasActiveVehicles: boolean;
}> = ({ onReceiptCapture, onVehicleExpense, hasActiveVehicles }) => {
  const navigate = useNavigate();

  const actions = [
    { 
      icon: <Camera className="h-6 w-6 text-nubank-foreground" />, 
      label: 'Lançar Despesa',
      onClick: onReceiptCapture
    },
    ...(hasActiveVehicles && onVehicleExpense ? [{ 
      icon: <Car className="h-6 w-6 text-nubank-foreground" />, 
      label: 'Despesa Veículo',
      onClick: onVehicleExpense
    }] : []),
    { 
      icon: <Calculator className="h-6 w-6 text-nubank-foreground" />, 
      label: 'Nova Simulação',
      onClick: () => navigate('/financiamento-consorcio')
    },
    { 
      icon: <FileText className="h-6 w-6 text-nubank-foreground" />, 
      label: 'Extrato',
      onClick: () => navigate('/planejamento')
    },
    { 
      icon: <Settings className="h-6 w-6 text-nubank-foreground" />, 
      label: 'Configurar Impostos',
      onClick: () => navigate('/parametros')
    },
    { 
      icon: <History className="h-6 w-6 text-nubank-foreground" />, 
      label: 'Histórico',
      onClick: () => navigate('/planejamento')
    },
  ];

  return (
    <div className="bg-nubank-primary px-5 pb-6">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {actions.map((action, index) => (
          <QuickActionButton
            key={index}
            icon={action.icon}
            label={action.label}
            onClick={action.onClick}
          />
        ))}
      </div>
    </div>
  );
};

// Configuration Card
const ConfigurationCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="bg-card border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Método de Cálculo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Entrada: <span className="text-foreground font-medium">Valor Bruto</span>
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/parametros')}
            className="text-nubank-accent font-semibold hover:bg-nubank-accent/10"
          >
            Alterar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Tax Summary Card
const TaxSummaryCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const inss = 828.38;
  const irrf = 354.47;
  const total = inss + irrf;
  const salarioBruto = 10000;

  return (
    <Card className="bg-card border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Resumo de Impostos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">INSS</span>
              <span className="font-medium">{formatCurrency(inss, isHidden)}</span>
            </div>
            <Progress value={(inss / salarioBruto) * 100} className="h-2 bg-muted" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">IRRF</span>
              <span className="font-medium">{formatCurrency(irrf, isHidden)}</span>
            </div>
            <Progress value={(irrf / salarioBruto) * 100} className="h-2 bg-muted" />
          </div>
        </div>
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total de Descontos</span>
            <span className="font-bold text-foreground">{formatCurrency(total, isHidden)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Import History Card
const ImportHistoryCard: React.FC = () => {
  return (
    <Card className="bg-gradient-to-br from-nubank-accent/10 to-nubank-accent/5 border-nubank-accent/20 border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-nubank-accent/20 flex items-center justify-center flex-shrink-0">
            <Upload className="h-6 w-6 text-nubank-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Importar Histórico</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Traga seus dados de outras plataformas para uma visão completa.
            </p>
            <Button 
              variant="link" 
              className="text-nubank-accent p-0 h-auto mt-2 font-semibold hover:no-underline"
            >
              Começar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Monthly Overview Card
const MonthlyOverviewCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const navigate = useNavigate();
  const receitas = 8500;
  const despesas = 6200;
  const saldo = receitas - despesas;

  return (
    <Card className="bg-card border-0 shadow-sm">
      <CardHeader className="pb-1.5 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Resumo do Mês</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-nubank-accent font-medium p-0 h-auto hover:bg-transparent text-xs"
          >
            Ver mais <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        <div className="flex justify-between items-center py-1.5 border-b border-border">
          <span className="text-xs text-muted-foreground">Receitas</span>
          <span className="text-xs font-semibold text-income">{formatCurrency(receitas, isHidden)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border">
          <span className="text-xs text-muted-foreground">Despesas</span>
          <span className="text-xs font-semibold text-expense">{formatCurrency(despesas, isHidden)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-xs font-medium text-foreground">Saldo</span>
          <span className={cn(
            "text-xs font-bold",
            saldo >= 0 ? "text-income" : "text-expense"
          )}>
            {formatCurrency(saldo, isHidden)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Bottom Navigation
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 py-2 px-4 transition-colors",
      active ? "text-nubank-accent" : "text-muted-foreground hover:text-foreground"
    )}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');

  const handleNavigation = (tab: string, path: string) => {
    setActiveTab(tab);
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
      <div className="max-w-md mx-auto flex justify-around items-center">
        <NavItem
          icon={<Home className="h-6 w-6" />}
          label="Início"
          active={activeTab === 'home'}
          onClick={() => handleNavigation('home', '/')}
        />
        <NavItem
          icon={<Calculator className="h-6 w-6" />}
          label="Simulador"
          active={activeTab === 'calculator'}
          onClick={() => handleNavigation('calculator', '/financiamento-consorcio')}
        />
        <NavItem
          icon={<BarChart3 className="h-6 w-6" />}
          label="Relatórios"
          active={activeTab === 'reports'}
          onClick={() => handleNavigation('reports', '/dashboard')}
        />
        <NavItem
          icon={<User className="h-6 w-6" />}
          label="Perfil"
          active={activeTab === 'profile'}
          onClick={() => handleNavigation('profile', '/minha-conta')}
        />
      </div>
    </nav>
  );
};

// Main Component
export const NubankHome: React.FC = () => {
  const [isHidden, setIsHidden] = useState(false);
  const [receiptCaptureOpen, setReceiptCaptureOpen] = useState(false);
  const [vehicleRecordOpen, setVehicleRecordOpen] = useState(false);
  const { config } = useFinancial();

  // Verifica se o usuário tem veículos ativos
  const activeVehicles = config.assets.filter(
    a => a.type === 'vehicle' && !a.isSold
  );
  const hasActiveVehicles = activeVehicles.length > 0;

  return (
    <VisibilityContext.Provider value={{ isHidden, toggle: () => setIsHidden(!isHidden) }}>
      <div className="min-h-screen bg-nubank-bg pb-20">
        {/* Primary Section */}
        <div className="bg-nubank-primary">
          <NubankHeader />
          <BalanceSection />
          <QuickActionsSection 
            onReceiptCapture={() => setReceiptCaptureOpen(true)}
            onVehicleExpense={() => setVehicleRecordOpen(true)}
            hasActiveVehicles={hasActiveVehicles}
          />
        </div>

        {/* Curved transition */}
        <div className="h-4 bg-nubank-primary">
          <div className="h-full bg-nubank-bg rounded-t-3xl" />
        </div>

        {/* Card Feed */}
        <main className="px-4 space-y-4 -mt-1">
          <MonthlyOverviewCard />
          <ConfigurationCard />
          <TaxSummaryCard />
          <ImportHistoryCard />
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation />

        {/* Receipt Capture Dialog */}
        <ReceiptCaptureDialog
          open={receiptCaptureOpen}
          onOpenChange={setReceiptCaptureOpen}
        />

        {/* Vehicle Record Dialog */}
        {hasActiveVehicles && (
          <VehicleRecordDialog
            open={vehicleRecordOpen}
            onOpenChange={setVehicleRecordOpen}
            onSave={() => {
              setVehicleRecordOpen(false);
            }}
          />
        )}
      </div>
    </VisibilityContext.Provider>
  );
};

export default NubankHome;
