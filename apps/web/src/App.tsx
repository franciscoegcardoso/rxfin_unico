// build-trigger: InteractiveDemoSection frame v6
import React, { lazy, Suspense } from 'react';
import * as Sentry from '@sentry/react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FinancialProvider } from "@/contexts/FinancialContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { VisibilityProvider } from "@/contexts/VisibilityContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { AccountPendingChangesProvider } from "@/contexts/AccountPendingChangesContext";
import { GlobalSyncIndicator } from "@/components/sync/GlobalSyncIndicator";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/design-system/layouts/AppShell";
import { ImpersonationFloater } from "@/components/admin/ImpersonationFloater";
import { MagicLinkHandler } from "@/components/auth/MagicLinkHandler";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { TrackingProvider } from "@/contexts/TrackingContext";
import { RXFinLoadingSpinner } from "@/components/shared/RXFinLoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { AdminSecureLayout } from '@/components/admin/AdminSecureLayout';
import { AdminAuditDashboard } from '@/pages/admin/AdminAuditDashboard';
import { MobileCtaBar } from "@/components/landing/MobileCtaBar";
import { CanonicalLink } from "@/components/seo/CanonicalLink";
import { RaioXChat } from "./components/ai/RaioXChat";
import { INVESTIMENTOS_ALOCACAO_PATH, LEGACY_ALOCACAO_ROUTE_SEGMENT } from "@/constants/appPaths";

// ─── ESTÁTICO: carregado em TODA sessão ──────────────────────────────────────
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import VerificarEmail from "./pages/VerificarEmail";
import AuthCallback from "./pages/AuthCallback";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import BemVindo from "./pages/BemVindo";

// ─── LAZY: carregam só quando a rota é acessada ───────────────────────────────
const Inicio = lazy(() => import(/* webpackChunkName: "core" */ "./pages/Inicio"));
const Parametros = lazy(() => import(/* webpackChunkName: "core" */ "./pages/Parametros"));
const MovimentacoesPage = lazy(() => import(/* webpackChunkName: "movimentacoes" */ "./pages/MovimentacoesPage"));
const Contas = lazy(() => import(/* webpackChunkName: "core" */ "./pages/Contas"));
const MinhaConta = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/MinhaConta"));
const ConfiguracoesHub = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/ConfiguracoesHub"));
const Notificacoes = lazy(() => import(/* webpackChunkName: "core" */ "./pages/Notificacoes"));

const BensInvestimentosLayout = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/BensInvestimentosLayout"));
const ConsolidadoTab = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/ConsolidadoTab"));
const MeusImoveis = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/imoveis/MeusImoveis"));
const MeusVeiculos = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/veiculos/MeusVeiculos"));
const InvestimentosTab = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/InvestimentosTab"));
const FGTSPage = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/fgts/FGTSPage"));
const PassivosPage = lazy(() => import(/* webpackChunkName: "movimentacoes" */ "./pages/PassivosPage"));
const PassivosConsolidadoTab = lazy(() => import(/* webpackChunkName: "movimentacoes" */ "./pages/passivos/PassivosConsolidadoTab"));
const PassivosDividasTab = lazy(() => import(/* webpackChunkName: "movimentacoes" */ "./pages/passivos/PassivosDividasTab"));
const PassivosFinanciamentosTab = lazy(() => import(/* webpackChunkName: "movimentacoes" */ "./pages/passivos/PassivosFinanciamentosTab"));
const PassivosConsorciosTab = lazy(() => import(/* webpackChunkName: "movimentacoes" */ "./pages/passivos/PassivosConsorciosTab"));
const SegurosTab = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/SegurosTab"));
const ParticipacaoTab = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/ParticipacaoTab"));
const IntangiveisTab = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/bens-investimentos/IntangiveisTab"));
const AlocacaoRoute = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/alocacao/AlocacaoRoute").then((m) => ({ default: m.AlocacaoRoute })));

const PlanejamentoLayout = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/planejamento/PlanejamentoLayout"));
const VisaoMensalTab = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/Planejamento"));
const MetasTab = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/planejamento/MetasTab"));
const AnalisesTab = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/planejamento/AnalisesTab"));
const PlanejamentoAnualLayout = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/planejamento-anual/PlanejamentoAnualLayout"));
const PlanejamentoAnualVisaoGeral = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/planejamento-anual/PlanejamentoAnualVisaoGeral"));
const PlanoAnualTab = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/planejamento-anual/PlanoAnualTab"));
const Plano30AnosTab = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/planejamento-anual/Plano30AnosTab"));

const FluxoFinanceiro = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/FluxoFinanceiro"));
const FinanceiroLayout = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/financeiro/FinanceiroLayout"));
const PlanosTab = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/financeiro/PlanosTab"));
const PagamentosTab = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/financeiro/PagamentosTab"));
const HistoricoPagamentos = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/HistoricoPagamentos"));
const IndicacoesTab = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/financeiro/IndicacoesTab"));

const Simuladores = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/Simuladores"));
const SimuladorFipe = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/SimuladorFipe"));
const SimuladorFinanciamento = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/SimuladorFinanciamento"));
const SimuladorCustoHora = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/SimuladorCustoHora"));
const HubSimuladores = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/simuladores/Hub"));
const SimuladorCustoOportunidadeCarro = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/SimuladorCustoOportunidadeCarro"));
const SimuladorCarroAB = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/SimuladorCarroAB"));
const SimuladorDescontoJusto = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/SimuladorDescontoJusto"));
const SimuladorDinamico = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/SimuladorDinamico"));
const EconoGraph = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/EconoGraph"));

const RenegociacaoDividas = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/RenegociacaoDividas"));
const QuitacaoDesconto = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/renegociacao/QuitacaoDesconto"));
const ParcelamentoDivida = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/renegociacao/ParcelamentoDivida"));
const PortabilidadeCredito = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/renegociacao/PortabilidadeCredito"));
const ConsolidacaoDividas = lazy(() => import(/* webpackChunkName: "simuladores" */ "./pages/renegociacao/ConsolidacaoDividas"));

const GestaoVeiculos = lazy(() => import(/* webpackChunkName: "bens" */ "./pages/GestaoVeiculos"));
const MeuIRLayout = lazy(() => import(/* webpackChunkName: "ir" */ "./pages/meu-ir/MeuIRLayout"));
const MeuIROrganizar = lazy(() => import(/* webpackChunkName: "ir" */ "./pages/meu-ir/MeuIROrganizar"));
const MeuIRHistorico = lazy(() => import(/* webpackChunkName: "ir" */ "./pages/meu-ir/MeuIRHistorico"));
const CibeliaPage = lazy(() => import(/* webpackChunkName: "tools" */ "./pages/CibeliaPage"));
const ConfiguracoesFiscais = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/ConfiguracoesFiscais"));
const Seguros = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/Seguros"));
const Presentes = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/Presentes"));
const RXSplit = lazy(() => import(/* webpackChunkName: "tools" */ "./pages/RXSplit"));
const DividirConta = lazy(() => import(/* webpackChunkName: "tools" */ "./pages/DividirConta"));
const Alertas = lazy(() => import(/* webpackChunkName: "core" */ "./pages/Alertas"));
const Recorrentes = lazy(() => import(/* webpackChunkName: "core" */ "./pages/Recorrentes"));
const Lixeira = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/Lixeira"));
const RegistroCompras = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/RegistroCompras"));
const PacotesOrcamento = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/PacotesOrcamento"));
const Sonhos = lazy(() => import(/* webpackChunkName: "planejamento" */ "./pages/Sonhos"));
const InstituicoesFinanceiras = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/InstituicoesFinanceiras"));
const DadosFinanceiros = lazy(() => import(/* webpackChunkName: "configuracoes" */ "./pages/DadosFinanceiros"));
const LegalDocument = lazy(() => import(/* webpackChunkName: "core" */ "./pages/LegalDocument"));

const OnboardingWizardV3 = lazy(() =>
  import(/* webpackChunkName: "core" */ "./components/onboarding/OnboardingWizardV3").then(m => ({ default: m.OnboardingWizardV3 }))
);
const OnboardingControlWizard = lazy(() =>
  import(/* webpackChunkName: "core" */ './components/onboarding-control/OnboardingControlWizard').then(m => ({
    default: m.OnboardingControlWizard,
  }))
);

const Admin = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/Admin"));
const AdminUsuarios = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminUsuarios'));
const AdminPlanos = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminPlanos'));
const AdminPaginas = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminPaginas'));
const AdminEmails = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminEmails'));
const AdminTermos = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminTermos'));
const AdminNotificacoes = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminNotificacoes'));
const AdminDeploy = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminDeploy'));
const AdminRollbacks = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminRollbacks'));
const DatabaseHealthDashboard = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/DatabaseHealthDashboard'));
const AdminMarketing = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminMarketing'));
const AIFeedback = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AIFeedback'));
const AIMetrics = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AIMetrics'));
const AdminCRM = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCRM'));
const CrmAutomations = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/CrmAutomations'));
const AdminAfiliados = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminAfiliados'));
const AdminDashboard = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminDashboard'));
const Estrategico = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/Estrategico'));
const AdminImpersonate = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminImpersonate'));
const AdminArchitecturePage = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminArchitecturePage'));
const AdminInfraestrutura = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminInfraestrutura'));
const AdminPluggy = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminPluggy'));
const AdminSimuladores = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminSimuladores'));
const ApiKeysPage = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/ApiKeysPage'));
const AdminRolesPage = lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminRolesPage'));

const PageSkeleton = () => <RXFinLoadingSpinner height="h-screen" />;

function RootRoute() {
  return (
    <>
      <LandingPage />
      <MobileCtaBar />
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Mantém cache após sair da página (observers = 0) — evita refetch ao voltar ao Início */
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      /** Default 1 min — evita 13+ refetches ao alternar abas; cada hook pode sobrescrever. */
      staleTime: 60 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <FinancialProvider>
          <VisibilityProvider>
            <ImpersonationProvider>
              <TooltipProvider>
                <SyncProvider>
                  <Toaster />
                  <Sonner />
                  <GlobalSyncIndicator />
                  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <ScrollToTop />
                    <AccountPendingChangesProvider>
                      <CanonicalLink />
                      <TrackingProvider>
                        <MagicLinkHandler>
                          <ImpersonationFloater />
                          <CookieConsentBanner />
                          <RaioXChat />
                          <ErrorBoundary>
                            <Suspense fallback={<PageSkeleton />}>
                              <Routes>
                                <Route path="/" element={<RootRoute />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<Signup />} />
                                <Route path="/auth" element={<Login />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                                <Route path="/update-password" element={<UpdatePassword />} />
                                <Route path="/verificar-email" element={<VerificarEmail />} />
                                <Route path="/auth/callback" element={<AuthCallback />} />
                                <Route path="/planos" element={<Navigate to="/financeiro/planos" replace />} />

                                <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizardV3 /></ProtectedRoute>} />
                                <Route
                                  path="/onboarding-control"
                                  element={
                                    <ProtectedRoute>
                                      <OnboardingControlWizard />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route path="/onboarding2" element={<Navigate to="/onboarding" replace />} />
                                <Route path="/onboarding-v2" element={<Navigate to="/onboarding" replace />} />
                                <Route path="/onboarding-controle" element={<Navigate to="/onboarding-control" replace />} />
                                <Route path="/onboarding-raio-x" element={<Navigate to="/onboarding" replace />} />
                                <Route path="/app" element={<Navigate to="/inicio" replace />} />

                                <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                                  <Route path="inicio" element={<Inicio />} />
                                  <Route path="dashboard" element={<Navigate to="/inicio" replace />} />
                                  <Route path="compromissos" element={<Navigate to="/movimentacoes/extrato" replace />} />
                                  <Route path="parametros" element={<Parametros />} />
                                  <Route path="movimentacoes" element={<MovimentacoesPage defaultTab="visao-geral" />} />
                                  <Route path="movimentacoes/extrato" element={<MovimentacoesPage defaultTab="extrato" />} />
                                  <Route path="movimentacoes/cartao-credito" element={<MovimentacoesPage defaultTab="cartao-credito" />} />
                                  <Route path="movimentacoes/consolidado" element={<Navigate to="/movimentacoes" replace />} />
                                  <Route path="lancamentos" element={<Navigate to="/movimentacoes/extrato" replace />} />
                                  <Route path="contas" element={<Contas />} />
                                  <Route path="fluxo-financeiro" element={<FluxoFinanceiro />} />

                                  <Route path="bens-investimentos" element={<BensInvestimentosLayout />}>
                                    <Route index element={<Navigate to="consolidado" replace />} />
                                    <Route path="consolidado" element={<ConsolidadoTab />} />
                                    <Route path="patrimonio" element={<Navigate to="/bens-investimentos/imoveis" replace />} />
                                    <Route path="imoveis" element={<MeusImoveis />} />
                                    <Route path="veiculos" element={<MeusVeiculos />} />
                                    <Route path="investimentos" element={<InvestimentosTab />} />
                                    {/* Alocação: sub-rota de B&I > Investimentos (padrão tipo movimentacoes/cartao-credito) */}
                                    <Route path="investimentos/alocacao" element={<Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AlocacaoRoute /></Suspense>} />
                                    <Route path="fgts" element={<FGTSPage />} />
                                    <Route path="passivos" element={<Navigate to="/passivos" replace />} />
                                    <Route path="credito" element={<Navigate to="/passivos" replace />} />
                                    <Route path="dividas" element={<Navigate to="/passivos" replace />} />
                                    <Route path="seguros" element={<SegurosTab />} />
                                    <Route path="participacoes" element={<ParticipacaoTab />} />
                                    <Route path="intangiveis" element={<IntangiveisTab />} />
                                    <Route path="historico-ir" element={<Navigate to="/meu-ir/historico" replace />} />
                                  </Route>

                                  <Route path="passivos" element={<PassivosPage />}>
                                    <Route index element={<PassivosConsolidadoTab />} />
                                    <Route path="visao-geral" element={<Navigate to="/passivos" replace />} />
                                    <Route path="dividas" element={<PassivosDividasTab />} />
                                    <Route path="financiamentos" element={<PassivosFinanciamentosTab />} />
                                    <Route path="consorcios" element={<PassivosConsorciosTab />} />
                                  </Route>
                                  <Route path="cartao-credito" element={<Navigate to="/movimentacoes/cartao-credito" replace />} />

                                  <Route path="planejamento-mensal" element={<PlanejamentoLayout />}>
                                    <Route index element={<VisaoMensalTab />} />
                                    <Route path="metas" element={<MetasTab />} />
                                    <Route path="analises" element={<AnalisesTab />} />
                                  </Route>
                                  <Route path="planejamento" element={<Navigate to="/planejamento-mensal" replace />} />
                                  <Route path="planejamento/visao-mensal" element={<Navigate to="/planejamento-mensal" replace />} />
                                  <Route path="planejamento/metas" element={<Navigate to="/planejamento-mensal/metas" replace />} />
                                  <Route path="planejamento/analises" element={<Navigate to="/planejamento-mensal/analises" replace />} />
                                  <Route path="planejamento-anual" element={<PlanejamentoAnualLayout />}>
                                    <Route index element={<PlanejamentoAnualVisaoGeral />} />
                                    <Route path="plano2anos" element={<PlanoAnualTab />} />
                                    <Route path="plano30anos" element={<Plano30AnosTab />} />
                                    <Route path="plano-anual" element={<Navigate to="/planejamento-anual/plano2anos" replace />} />
                                    <Route path="plano-30-anos" element={<Navigate to="/planejamento-anual/plano30anos" replace />} />
                                  </Route>
                                  <Route path="planejamento-cartao" element={<Navigate to="/movimentacoes/cartao-credito" replace />} />
                                  <Route path="metas-mensais" element={<Navigate to="/planejamento-mensal/metas" replace />} />

                                  <Route path="registro-compras" element={<RegistroCompras />} />
                                  <Route path="compras" element={<Navigate to="/registro-compras" replace />} />
                                  <Route path="pacotes-orcamento" element={<PacotesOrcamento />} />
                                  <Route path="sonhos" element={<Sonhos />} />
                                  <Route path="minha-conta" element={<MinhaConta />} />

                                  <Route path="simuladores" element={<HubSimuladores />} />
                                  <Route path="simuladores/:category" element={<Simuladores />} />
                                  <Route path="simuladores/veiculos/simulador-fipe" element={<SimuladorFipe />} />
                                  <Route path="simuladores/veiculos/simulador-carro-ab" element={<SimuladorCarroAB />} />
                                  <Route path="simuladores/veiculos/simulador-custo-oportunidade-carro" element={<SimuladorCustoOportunidadeCarro />} />
                                  <Route path="simuladores/dividas/renegociacao-dividas" element={<RenegociacaoDividas />} />
                                  <Route path="renegociacao-dividas/quitacao-desconto" element={<QuitacaoDesconto />} />
                                  <Route path="renegociacao-dividas/parcelamento" element={<ParcelamentoDivida />} />
                                  <Route path="renegociacao-dividas/portabilidade" element={<PortabilidadeCredito />} />
                                  <Route path="renegociacao-dividas/consolidacao" element={<ConsolidacaoDividas />} />
                                  <Route path="simuladores/dividas/financiamento-consorcio" element={<SimuladorFinanciamento />} />
                                  <Route path="simuladores/planejamento/simulador-custo-hora" element={<SimuladorCustoHora />} />
                                  <Route path="simuladores/planejamento/simulador-desconto-justo" element={<SimuladorDescontoJusto />} />
                                  <Route path="simuladores/planejamento/econograph" element={<EconoGraph />} />
                                  <Route path="simuladores/:category/:slug" element={<SimuladorDinamico />} />

                                  <Route path="configuracoes" element={<ConfiguracoesHub />} />
                                  <Route path="configuracoes-hub" element={<ConfiguracoesHub />} />
                                  <Route path="configuracoes-fiscais" element={<ConfiguracoesFiscais />} />
                                  <Route path="instituicoes-financeiras" element={<InstituicoesFinanceiras />} />
                                  <Route path="instituicoes" element={<InstituicoesFinanceiras />} />
                                  <Route path="dados-financeiros" element={<DadosFinanceiros />} />
                                  <Route path="dados" element={<DadosFinanceiros />} />
                                  <Route path={LEGACY_ALOCACAO_ROUTE_SEGMENT} element={<Navigate to={INVESTIMENTOS_ALOCACAO_PATH} replace />} />

                                  <Route path="financeiro" element={<FinanceiroLayout />}>
                                    <Route index element={<Navigate to="planos" replace />} />
                                    <Route path="planos" element={<PlanosTab />} />
                                    <Route path="pagamentos" element={<PagamentosTab />} />
                                    <Route path="minhas-indicacoes" element={<IndicacoesTab />} />
                                  </Route>
                                  <Route path="historico-pagamentos" element={<HistoricoPagamentos />} />

                                  <Route path="gestao-veiculos" element={<GestaoVeiculos />} />
                                  <Route path="alertas" element={<Alertas />} />
                                  <Route path="recorrentes" element={<Recorrentes />} />
                                  <Route path="notificacoes" element={<Notificacoes />} />
                                  <Route path="lixeira" element={<Lixeira />} />
                                  <Route path="seguros" element={<Seguros />} />
                                  <Route path="presentes" element={<Presentes />} />
                                  <Route path="rx-split" element={<RXSplit />} />
                                  <Route path="dividir-conta" element={<DividirConta />} />
                                  <Route path="meu-ir" element={<MeuIRLayout />}>
                                    <Route index element={<MeuIROrganizar />} />
                                    <Route path="historico" element={<MeuIRHistorico />} />
                                    <Route
                                      path="bens-direitos"
                                      element={<Navigate to="/meu-ir/historico" state={{ scrollTo: 'bens' }} replace />}
                                    />
                                    <Route path="historico-ir" element={<Navigate to="/meu-ir/historico" replace />} />
                                  </Route>
                                  <Route path="cibelia" element={<CibeliaPage />} />
                                </Route>

                                <Route path="/perfil" element={<Navigate to="/minha-conta?tab=perfil" replace />} />
                                <Route path="/minhas-indicacoes" element={<Navigate to="/financeiro/minhas-indicacoes" replace />} />
                                <Route path="/regras-categoria" element={<Navigate to="/parametros?tab=regras" replace />} />
                                <Route path="/simulador-fipe" element={<Navigate to="/simuladores/veiculos/simulador-fipe" replace />} />
                                <Route path="/simulador-custo-hora" element={<Navigate to="/simuladores/planejamento/simulador-custo-hora" replace />} />
                                <Route path="/simulador-comparativo-carro" element={<Navigate to="/simuladores" replace />} />
                                <Route path="/simulador-carro-ab" element={<Navigate to="/simuladores/veiculos/simulador-carro-ab" replace />} />
                                <Route path="/simulador-custo-oportunidade-carro" element={<Navigate to="/simuladores/veiculos/simulador-custo-oportunidade-carro" replace />} />
                                <Route path="/financiamento-consorcio" element={<Navigate to="/simuladores/dividas/financiamento-consorcio" replace />} />
                                <Route path="/simulador-financiamento" element={<Navigate to="/simuladores/dividas/financiamento-consorcio" replace />} />
                                <Route path="/simulador-desconto-justo" element={<Navigate to="/simuladores/planejamento/simulador-desconto-justo" replace />} />
                                <Route path="/econograph" element={<Navigate to="/simuladores/planejamento/econograph" replace />} />
                                <Route path="/renegociacao-dividas" element={<Navigate to="/simuladores/dividas/renegociacao-dividas" replace />} />
                                <Route path="/renegociacao-dividas/quitacao-desconto" element={<Navigate to="/renegociacao-dividas/quitacao-desconto" replace />} />
                                <Route path="/renegociacao-dividas/parcelamento" element={<Navigate to="/renegociacao-dividas/parcelamento" replace />} />
                                <Route path="/renegociacao-dividas/portabilidade" element={<Navigate to="/renegociacao-dividas/portabilidade" replace />} />
                                <Route path="/renegociacao-dividas/consolidacao" element={<Navigate to="/renegociacao-dividas/consolidacao" replace />} />
                                <Route path="/balanco-patrimonial" element={<Navigate to="/bens-investimentos/consolidado" replace />} />
                                <Route path="/credito" element={<Navigate to="/passivos" replace />} />
                                <Route path="/rxsplit" element={<Navigate to="/rx-split" replace />} />

                                <Route path="/admin" element={<AdminSecureLayout><Admin /></AdminSecureLayout>} />
                                <Route path="/admin/dashboard" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminDashboard /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/estrategico" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><Estrategico /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/usuarios" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminUsuarios /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/planos" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminPlanos /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/paginas" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminPaginas /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/emails" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminEmails /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/termos" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminTermos /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/notificacoes" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminNotificacoes /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/deploy" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminDeploy /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/rollbacks" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminRollbacks /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/health" element={<Navigate to="/admin/database-health" replace />} />
                                <Route path="/admin/database-health" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><DatabaseHealthDashboard /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/infraestrutura" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminInfraestrutura /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/pluggy" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminPluggy /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/marketing" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminMarketing /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/ai-feedback" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AIFeedback /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/ai-metrics" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AIMetrics /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/crm" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminCRM /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/crm/automations" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><CrmAutomations /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/audit" element={<AdminSecureLayout><AdminAuditDashboard /></AdminSecureLayout>} />
                                <Route path="/admin/afiliados" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminAfiliados /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/impersonate" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminImpersonate /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/architecture" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminArchitecturePage /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/api-keys" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><ApiKeysPage /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/roles" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminRolesPage /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin/simuladores" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminSimuladores /></Suspense></AdminSecureLayout>} />
                                <Route path="/admin-secure" element={<Navigate to="/admin/audit" replace />} />

                                <Route path="/bem-vindo/:plan" element={<BemVindo />} />
                                <Route path="/termos-de-uso" element={<LegalDocument slug="termos-de-uso" />} />
                                <Route path="/politica-privacidade" element={<LegalDocument slug="politica-privacidade" />} />
                                <Route path="/politica-cookies" element={<LegalDocument slug="politica-cookies" />} />

                                <Route path="/403" element={<Forbidden />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </Suspense>
                          </ErrorBoundary>
                        </MagicLinkHandler>
                      </TrackingProvider>
                    </AccountPendingChangesProvider>
                  </BrowserRouter>
                </SyncProvider>
              </TooltipProvider>
            </ImpersonationProvider>
          </VisibilityProvider>
        </FinancialProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h2>Ocorreu um erro inesperado</h2>
      <p>Nossa equipe foi notificada. Por favor, recarregue a página.</p>
      <button type="button" onClick={() => window.location.reload()}>Recarregar</button>
    </div>
  );
}

export default Sentry.withErrorBoundary(App, {
  fallback: ({ error }) => <ErrorFallback error={error} />,
});