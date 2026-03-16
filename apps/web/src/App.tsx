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
// AdminProtectedRoute removed — all admin routes now use AdminSecureLayout (MFA-required)
import { ImpersonationFloater } from "@/components/admin/ImpersonationFloater";
import { MagicLinkHandler } from "@/components/auth/MagicLinkHandler";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { TrackingProvider } from "@/contexts/TrackingContext";
import { RXFinLoadingSpinner } from "@/components/shared/RXFinLoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { AdminSecureLayout } from '@/components/admin/AdminSecureLayout';
import { AdminAuditDashboard } from '@/pages/admin/AdminAuditDashboard';

import LandingPage from "./pages/LandingPage";
import { MobileCtaBar } from "@/components/landing/MobileCtaBar";
import Inicio from "./pages/Inicio";
// Dashboard removed - charts moved to Planejamento, indicators to Inicio
import Parametros from "./pages/Parametros";
import MovimentacoesPage from "./pages/MovimentacoesPage";

import BensInvestimentosLayout from "./pages/bens-investimentos/BensInvestimentosLayout";
import ConsolidadoTab from "./pages/bens-investimentos/ConsolidadoTab";
import PatrimonioTab from "./pages/bens-investimentos/PatrimonioTab";
import InvestimentosTab from "./pages/bens-investimentos/InvestimentosTab";
import PassivosTab from "./pages/bens-investimentos/PassivosTab";
import SegurosTab from "./pages/bens-investimentos/SegurosTab";
import ParticipacaoTab from "./pages/bens-investimentos/ParticipacaoTab";
import IntangiveisTab from "./pages/bens-investimentos/IntangiveisTab";
import HistoricoIrTab from "./pages/bens-investimentos/HistoricoIrTab";
import PlanejamentoLayout from "./pages/planejamento/PlanejamentoLayout";
import VisaoMensalTab from "./pages/Planejamento";
import MetasTab from "./pages/planejamento/MetasTab";
import AnalisesTab from "./pages/planejamento/AnalisesTab";
import PlanejamentoAnual from "./pages/PlanejamentoAnual";
import Contas from "./pages/Contas";
import FluxoFinanceiro from "./pages/FluxoFinanceiro";

import RegistroCompras from "./pages/RegistroCompras";
import PacotesOrcamento from "./pages/PacotesOrcamento";
import Sonhos from "./pages/Sonhos";
import MinhaConta from "./pages/MinhaConta";
import ConfiguracoesHub from "./pages/ConfiguracoesHub";
import InstituicoesFinanceiras from "./pages/InstituicoesFinanceiras";
import DadosFinanceiros from "./pages/DadosFinanceiros";


import FinanceiroLayout from "./pages/financeiro/FinanceiroLayout";
import PlanosTab from "./pages/financeiro/PlanosTab";
import PagamentosTab from "./pages/financeiro/PagamentosTab";
import HistoricoPagamentos from "./pages/HistoricoPagamentos";
import IndicacoesTab from "./pages/financeiro/IndicacoesTab";

import Simuladores from "./pages/Simuladores";
import SimuladorFipe from "./pages/SimuladorFipe";
import SimuladorFinanciamento from "./pages/SimuladorFinanciamento";
import SimuladorCustoHora from "./pages/SimuladorCustoHora";
import HubSimuladores from "./pages/simuladores/Hub";
import SimuladorCustoOportunidadeCarro from "./pages/SimuladorCustoOportunidadeCarro";

import SimuladorCarroAB from "./pages/SimuladorCarroAB";
import SimuladorDescontoJusto from "./pages/SimuladorDescontoJusto";
import SimuladorDinamico from "./pages/SimuladorDinamico";
import EconoGraph from "./pages/EconoGraph";
import RenegociacaoDividas from "./pages/RenegociacaoDividas";
import QuitacaoDesconto from "./pages/renegociacao/QuitacaoDesconto";
import ParcelamentoDivida from "./pages/renegociacao/ParcelamentoDivida";
import PortabilidadeCredito from "./pages/renegociacao/PortabilidadeCredito";
import ConsolidacaoDividas from "./pages/renegociacao/ConsolidacaoDividas";

import GestaoVeiculos from "./pages/GestaoVeiculos";
import MeuIR from "./pages/MeuIR";
import ConfiguracoesFiscais from "./pages/ConfiguracoesFiscais";
import Seguros from "./pages/Seguros";
import Presentes from "./pages/Presentes";
import RXSplit from "./pages/RXSplit";
import DividirConta from "./pages/DividirConta";
import Alertas from "./pages/Alertas";
import Recorrentes from "./pages/Recorrentes";
import Compromissos from "./pages/Compromissos";
import Notificacoes from "./pages/Notificacoes";
import Lixeira from "./pages/Lixeira";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import VerificarEmail from "./pages/VerificarEmail";
import Admin from "./pages/admin/Admin";
// Admin routes — lazy loaded so non-admin users never download admin code (Admin is static so /admin redirects immediately)
const AdminUsuarios = lazy(() => import('./pages/admin/AdminUsuarios'));
const AdminPlanos = lazy(() => import('./pages/admin/AdminPlanos'));
const AdminPaginas = lazy(() => import('./pages/admin/AdminPaginas'));
const AdminEmails = lazy(() => import('./pages/admin/AdminEmails'));
const AdminTermos = lazy(() => import('./pages/admin/AdminTermos'));
const AdminNotificacoes = lazy(() => import('./pages/admin/AdminNotificacoes'));
const AdminDeploy = lazy(() => import('./pages/admin/AdminDeploy'));
const AdminRollbacks = lazy(() => import('./pages/admin/AdminRollbacks'));
const DatabaseHealthDashboard = lazy(() => import('./pages/admin/DatabaseHealthDashboard'));
const AdminMarketing = lazy(() => import('./pages/admin/AdminMarketing'));
const AIFeedback = lazy(() => import('./pages/admin/AIFeedback'));
const AIMetrics = lazy(() => import('./pages/admin/AIMetrics'));
const AdminCRM = lazy(() => import('./pages/admin/AdminCRM'));
const CrmAutomations = lazy(() => import('./pages/admin/CrmAutomations'));
const AdminAfiliados = lazy(() => import('./pages/admin/AdminAfiliados'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Estrategico = lazy(() => import('./pages/admin/Estrategico'));
const AdminImpersonate = lazy(() => import('./pages/admin/AdminImpersonate'));
const AdminArchitecturePage = lazy(() => import('./pages/admin/AdminArchitecturePage'));
const AdminInfraestrutura = lazy(() => import('./pages/admin/AdminInfraestrutura'));
const AdminSimuladores = lazy(() => import('./pages/admin/AdminSimuladores'));
const ApiKeysPage = lazy(() => import('./pages/admin/ApiKeysPage'));
const AdminRolesPage = lazy(() => import('./pages/admin/AdminRolesPage'));
import { RaioXChat } from "./components/ai/RaioXChat";
import { CanonicalLink } from "@/components/seo/CanonicalLink";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import BemVindo from "./pages/BemVindo";
import LegalDocument from "./pages/LegalDocument";
import { OnboardingWizardV3 } from "./components/onboarding/OnboardingWizardV3";
import { useAuth } from "@/contexts/AuthContext";

/** Rota "/": landing para não autenticados, redireciona para /inicio se autenticado (rxfin.com.br). MobileCtaBar aqui para garantir inclusão no bundle e na árvore React. */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/inicio" replace />;
  return (
    <>
      <LandingPage />
      <MobileCtaBar />
    </>
  );
}

// Perfil page removed - now part of MinhaConta

const queryClient = new QueryClient();

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
                    <Routes>
                  <Route path="/" element={<RootRoute />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/auth" element={<Login />} /> {/* Redirect legacy route */}
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} /> {/* Public - handles password recovery */}
                  <Route path="/verificar-email" element={<VerificarEmail />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/planos" element={<Navigate to="/financeiro/planos" replace />} />
                  {/* Onboarding canônico — wizard completo */}
                  <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizardV3 /></ProtectedRoute>} />
                  {/* Legados: redirecionar para o canônico */}
                  <Route path="/onboarding2" element={<Navigate to="/onboarding" replace />} />
                  <Route path="/onboarding-v2" element={<Navigate to="/onboarding" replace />} />
                  <Route path="/onboarding-controle" element={<Navigate to="/onboarding" replace />} />
                  <Route path="/onboarding-raio-x" element={<Navigate to="/onboarding" replace />} />
                  <Route path="/app" element={<Navigate to="/inicio" replace />} />
                  {/* Authenticated app shell: mobile = bottom nav, desktop = sidebar */}
                  <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                    <Route path="inicio" element={<Inicio />} />
                    <Route path="dashboard" element={<Navigate to="/inicio" replace />} />
                    <Route path="compromissos" element={<Compromissos />} />
                    <Route path="parametros" element={<Parametros />} />
                    <Route path="movimentacoes" element={<MovimentacoesPage />} />
                    <Route path="movimentacoes/extrato" element={<MovimentacoesPage defaultTab="extrato" />} />
                    <Route path="movimentacoes/cartao-credito" element={<MovimentacoesPage defaultTab="cartao-credito" />} />
                    <Route path="lancamentos" element={<Navigate to="/movimentacoes/extrato" replace />} />
                    <Route path="contas" element={<Contas />} />
                    <Route path="fluxo-financeiro" element={<FluxoFinanceiro />} />
                    <Route path="bens-investimentos" element={<BensInvestimentosLayout />}>
                      <Route index element={<Navigate to="consolidado" replace />} />
                      <Route path="consolidado" element={<ConsolidadoTab />} />
                      <Route path="patrimonio" element={<PatrimonioTab />} />
                      <Route path="investimentos" element={<InvestimentosTab />} />
                      <Route path="passivos" element={<PassivosTab />} />
                      <Route path="credito" element={<Navigate to="/bens-investimentos/passivos" replace />} />
                      <Route path="seguros" element={<SegurosTab />} />
                      <Route path="participacoes" element={<ParticipacaoTab />} />
                      <Route path="intangiveis" element={<IntangiveisTab />} />
                      <Route path="historico-ir" element={<HistoricoIrTab />} />
                    </Route>
                    <Route path="cartao-credito" element={<Navigate to="/movimentacoes/cartao-credito" replace />} />
                    <Route path="planejamento" element={<PlanejamentoLayout />}>
                      <Route index element={<Navigate to="visao-mensal" replace />} />
                      <Route path="visao-mensal" element={<VisaoMensalTab />} />
                      <Route path="metas" element={<MetasTab />} />
                      <Route path="analises" element={<AnalisesTab />} />
                    </Route>
                    <Route path="planejamento-anual" element={<PlanejamentoAnual />} />
                    <Route path="planejamento-cartao" element={<Navigate to="/movimentacoes/cartao-credito" replace />} />
                    <Route path="metas-mensais" element={<Navigate to="/planejamento?tab=metas" replace />} />
                    <Route path="registro-compras" element={<RegistroCompras />} />
                    <Route path="compras" element={<Navigate to="/registro-compras" replace />} />
                    <Route path="pacotes-orcamento" element={<PacotesOrcamento />} />
                    <Route path="sonhos" element={<Sonhos />} />
                    <Route path="minha-conta" element={<MinhaConta />} />
                    {/* Simuladores dentro do shell para navegação funcionar */}
                    <Route path="simuladores" element={<HubSimuladores />} />
                    <Route path="simuladores/:category" element={<Simuladores />} />
                    <Route path="simuladores/veiculos/simulador-fipe" element={<SimuladorFipe />} />
                    <Route path="simuladores/veiculos/simulador-carro-ab" element={<SimuladorCarroAB />} />
                    <Route path="simuladores/veiculos/simulador-custo-oportunidade-carro" element={<SimuladorCustoOportunidadeCarro />} />
                    <Route path="simuladores/dividas/renegociacao-dividas" element={<RenegociacaoDividas />} />
                    {/* Sub-rotas de renegociação — dentro do AppShell para manter sidebar/bottom-nav */}
                    <Route path="renegociacao-dividas/quitacao-desconto" element={<QuitacaoDesconto />} />
                    <Route path="renegociacao-dividas/parcelamento"      element={<ParcelamentoDivida />} />
                    <Route path="renegociacao-dividas/portabilidade"     element={<PortabilidadeCredito />} />
                    <Route path="renegociacao-dividas/consolidacao"     element={<ConsolidacaoDividas />} />
                    <Route path="simuladores/dividas/financiamento-consorcio" element={<SimuladorFinanciamento />} />
                    <Route path="simuladores/planejamento/simulador-custo-hora" element={<SimuladorCustoHora />} />
                    <Route path="simuladores/planejamento/simulador-desconto-justo" element={<SimuladorDescontoJusto />} />
                    <Route path="simuladores/planejamento/econograph" element={<EconoGraph />} />
                    <Route path="simuladores/:category/:slug" element={<SimuladorDinamico />} />
                    {/* Rotas migradas — dentro do AppShell (sidebar/bottom nav) */}
                    <Route path="configuracoes" element={<ConfiguracoesHub />} />
                    <Route path="configuracoes-hub" element={<ConfiguracoesHub />} />
                    <Route path="configuracoes-fiscais" element={<ConfiguracoesFiscais />} />
                    <Route path="instituicoes-financeiras" element={<InstituicoesFinanceiras />} />
                    <Route path="instituicoes" element={<InstituicoesFinanceiras />} />
                    <Route path="dados-financeiros" element={<DadosFinanceiros />} />
                    <Route path="dados" element={<DadosFinanceiros />} />
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
                    <Route path="meu-ir" element={<MeuIR />} />
                  </Route>
                  {/* Redirects from old routes */}
                  {/* /configuracoes agora renderiza ConfiguracoesHub (opções); mantido redirect legado apenas para /perfil */}
                  <Route path="/perfil" element={<Navigate to="/minha-conta?tab=perfil" replace />} />
                  <Route path="/minhas-indicacoes" element={<Navigate to="/financeiro/minhas-indicacoes" replace />} />
                  <Route path="/regras-categoria" element={<Navigate to="/parametros?tab=regras" replace />} />
                  {/* Simuladores — rotas com shell estão dentro de AppShell acima */}
                  {/* URL antiga: apenas redirect — não renderizar componente em /simulador-fipe */}
                  <Route path="/simulador-fipe" element={<Navigate to="/simuladores/veiculos/simulador-fipe" replace />} />
                  <Route path="/simulador-custo-hora" element={<Navigate to="/simuladores/planejamento/simulador-custo-hora" replace />} />
                  {/* Legacy redirects — outras flat URLs → nested */}
                  <Route path="/simulador-comparativo-carro" element={<Navigate to="/simuladores" replace />} />
                  <Route path="/simulador-carro-ab" element={<Navigate to="/simuladores/veiculos/simulador-carro-ab" replace />} />
                  <Route path="/simulador-custo-oportunidade-carro" element={<Navigate to="/simuladores/veiculos/simulador-custo-oportunidade-carro" replace />} />
                  <Route path="/financiamento-consorcio" element={<Navigate to="/simuladores/dividas/financiamento-consorcio" replace />} />
                  <Route path="/simulador-financiamento" element={<Navigate to="/simuladores/dividas/financiamento-consorcio" replace />} />
                  <Route path="/simulador-desconto-justo" element={<Navigate to="/simuladores/planejamento/simulador-desconto-justo" replace />} />
                  <Route path="/econograph" element={<Navigate to="/simuladores/planejamento/econograph" replace />} />
                  <Route path="/renegociacao-dividas" element={<Navigate to="/simuladores/dividas/renegociacao-dividas" replace />} />
                  {/* Legacy redirects — sub-rotas de renegociação agora dentro do AppShell */}
                  <Route path="/renegociacao-dividas/quitacao-desconto" element={<Navigate to="/renegociacao-dividas/quitacao-desconto" replace />} />
                  <Route path="/renegociacao-dividas/parcelamento"      element={<Navigate to="/renegociacao-dividas/parcelamento" replace />} />
                  <Route path="/renegociacao-dividas/portabilidade"     element={<Navigate to="/renegociacao-dividas/portabilidade" replace />} />
                  <Route path="/renegociacao-dividas/consolidacao"      element={<Navigate to="/renegociacao-dividas/consolidacao" replace />} />
                  <Route path="/balanco-patrimonial" element={<Navigate to="/bens-investimentos/consolidado" replace />} />
                  <Route path="/credito" element={<Navigate to="/bens-investimentos/passivos" replace />} />
                  <Route path="/rxsplit" element={<Navigate to="/rx-split" replace />} />
                  {/* Admin Routes — all require MFA via AdminSecureLayout */}
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
                  {/* Legacy redirects */}
                  <Route path="/admin/simuladores" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminSimuladores /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin-secure" element={<Navigate to="/admin/audit" replace />} />
                  {/* Welcome Pages - Post-purchase */}
                  <Route path="/bem-vindo/:plan" element={<BemVindo />} />
                  {/* Legal Pages - Public */}
                   <Route path="/termos-de-uso" element={<LegalDocument slug="termos-de-uso" />} />
                   <Route path="/politica-privacidade" element={<LegalDocument slug="politica-privacidade" />} />
                   <Route path="/politica-cookies" element={<LegalDocument slug="politica-cookies" />} />
                    <Route path="/403" element={<Forbidden />} />
                    <Route path="*" element={<NotFound />} />
                    </Routes>
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
