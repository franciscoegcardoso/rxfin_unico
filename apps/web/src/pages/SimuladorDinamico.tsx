import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSimulatorBySlug } from '@/hooks/useSimulatorBySlug';
import { ProfileCompletionDialog } from '@/components/simuladores/ProfileCompletionDialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lock, 
  Crown, 
  MessageCircle, 
  ArrowLeft,
  AlertTriangle,
  LogIn
} from 'lucide-react';

const APP_NAME = 'RXFIN';
// Import existing simulator components
import SimuladorFipe from './SimuladorFipe';
import SimuladorFinanciamento from './SimuladorFinanciamento';
import SimuladorCustoHora from './SimuladorCustoHora';
import SimuladorCustoOportunidadeCarro from './SimuladorCustoOportunidadeCarro';
import SimuladorComparativoCarro from './SimuladorComparativoCarro';
import SimuladorCarroAB from './SimuladorCarroAB';
import SimuladorDescontoJusto from './SimuladorDescontoJusto';

// Map slugs to their respective components
const SIMULATOR_COMPONENTS: Record<string, React.ComponentType> = {
  'fipe': SimuladorFipe,
  'simulador-fipe': SimuladorFipe,
  'financiamento': SimuladorFinanciamento,
  'simulador-financiamento': SimuladorFinanciamento,
  'financiamento-consorcio': SimuladorFinanciamento,
  'custo-hora': SimuladorCustoHora,
  'simulador-custo-hora': SimuladorCustoHora,
  'custo-oportunidade-carro': SimuladorCustoOportunidadeCarro,
  'simulador-custo-oportunidade-carro': SimuladorCustoOportunidadeCarro,
  'comparativo-carro': SimuladorComparativoCarro,
  'simulador-comparativo-carro': SimuladorComparativoCarro,
  'carro-ab': SimuladorCarroAB,
  'simulador-carro-ab': SimuladorCarroAB,
  'desconto-justo': SimuladorDescontoJusto,
  'simulador-desconto-justo': SimuladorDescontoJusto,
};

export const SimuladorDinamico: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileCompleted, setProfileCompleted] = useState(false);

  const {
    simulator,
    profile,
    isLoading,
    error,
    hasAccess,
    isInactive,
    needsProfileCompletion,
    subscriptionRole,
  } = useSimulatorBySlug(slug || '');

  // Dynamic SEO - update document title and meta description
  useEffect(() => {
    if (simulator) {
      // Update document title
      document.title = `${simulator.title} | ${APP_NAME}`;
      
      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', simulator.description || `Simulador ${simulator.title} - ${APP_NAME}`);
    }
    
    // Cleanup: restore default title when leaving
    return () => {
      document.title = APP_NAME;
    };
  }, [simulator]);

  // Redirect if simulator is inactive
  useEffect(() => {
    if (!isLoading && isInactive) {
      toast.error('Este simulador está temporariamente indisponível');
      navigate('/simuladores', { replace: true });
    }
  }, [isLoading, isInactive, navigate]);

  // Handle profile completion
  const handleProfileComplete = () => {
    setProfileCompleted(true);
  };

  // Show profile dialog if needed
  const showProfileDialog = user && needsProfileCompletion && !profileCompleted;

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state - simulator not found
  if (error || !simulator) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Simulador não encontrado</h1>
            <p className="text-muted-foreground max-w-md">
              O simulador que você está procurando não existe ou foi removido.
            </p>
          </div>
          <Button asChild>
            <Link to="/simuladores">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Simuladores
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Not logged in for non-public simulators
  if (!user && simulator.access_level !== 'public') {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto mt-12">
          <Card className="border-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Login Necessário</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Para acessar o simulador <strong>{simulator.title}</strong>, você precisa estar logado.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link to="/simuladores">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/login">
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Access restricted - premium required
  if (!hasAccess && simulator.access_level === 'premium') {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto mt-12">
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                Acesso Restrito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/30">
                <Crown className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">
                  Simulador Premium
                </AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  O simulador <strong>{simulator.title}</strong> está disponível apenas para 
                  assinantes do plano Premium.
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Faça upgrade do seu plano para desbloquear todos os simuladores 
                  e recursos exclusivos.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button className="w-full" variant="hero" asChild>
                  <Link to="/planos">
                    <Crown className="h-4 w-4 mr-2" />
                    Ver Planos Premium
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a 
                    href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o plano Premium." 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Falar com Suporte
                  </a>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/simuladores">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Simuladores
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Get the simulator component
  const SimulatorComponent = SIMULATOR_COMPONENTS[slug || ''];

  // If no component mapping exists, show placeholder
  if (!SimulatorComponent) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{simulator.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {simulator.description}
              </p>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Em Desenvolvimento</AlertTitle>
            <AlertDescription>
              Este simulador está em desenvolvimento e estará disponível em breve.
            </AlertDescription>
          </Alert>

          <Button variant="outline" asChild>
            <Link to="/simuladores">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Simuladores
            </Link>
          </Button>
        </div>

        {/* Profile completion dialog */}
        <ProfileCompletionDialog
          open={showProfileDialog}
          onComplete={handleProfileComplete}
          currentName={profile?.full_name}
          currentPhone={profile?.phone}
        />
      </AppLayout>
    );
  }

  // Render the actual simulator
  return (
    <>
      <SimulatorComponent />
      
      {/* Profile completion dialog */}
      <ProfileCompletionDialog
        open={showProfileDialog}
        onComplete={handleProfileComplete}
        currentName={profile?.full_name}
        currentPhone={profile?.phone}
      />
    </>
  );
};

export default SimuladorDinamico;
