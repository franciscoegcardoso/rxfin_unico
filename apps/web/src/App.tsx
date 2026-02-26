import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FinancialProvider } from "@/contexts/FinancialContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { VisibilityProvider } from "@/contexts/VisibilityContext";
import { TourProvider } from "@/contexts/TourContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { GlobalSyncIndicator } from "@/components/sync/GlobalSyncIndicator";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
// AdminProtectedRoute removed — all admin routes now use AdminSecureLayout (MFA-required)
import { GuidedTour } from "@/components/tour/GuidedTour";
import { ImpersonationFloater } from "@/components/admin/ImpersonationFloater";
import { MagicLinkHandler } from "@/components/auth/MagicLinkHandler";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { TrackingProvider } from "@/contexts/TrackingContext";
import { RXFinLoadingSpinner } from "@/components/shared/RXFinLoadingSpinner";
import { AdminSecureLayout } from '@/components/admin/AdminSecureLayout';
import { AdminAuditDashboard } from '@/pages/admin/AdminAuditDashboard';

import LandingPage from "./pages/LandingPage";
import Inicio from "./pages/Inicio";
// Dashboard removed - charts moved to Planejamento, indicators to Inicio
import Parametros from "./pages/Parametros";
import Lancamentos from "./pages/Lancamentos";

import BensInvestimentosLayout from "./pages/bens-investimentos/BensInvestimentosLayout";
import ConsolidadoTab from "./pages/bens-investimentos/ConsolidadoTab";
import PatrimonioTab from "./pages/bens-investimentos/PatrimonioTab";
import InvestimentosTab from "./pages/bens-investimentos/InvestimentosTab";
import CreditoTab from "./pages/bens-investimentos/CreditoTab";
import SegurosTab from "./pages/bens-investimentos/SegurosTab";
import PlanejamentoLayout from "./pages/planejamento/PlanejamentoLayout";
import VisaoMensalTab from "./pages/Planejamento";
import MetasTab from "./pages/planejamento/MetasTab";
import AnalisesTab from "./pages/planejamento/AnalisesTab";
import CartaoCredito from "./pages/CartaoCredito";
import PlanejamentoAnual from "./pages/PlanejamentoAnual";

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
import IndicacoesTab from "./pages/financeiro/IndicacoesTab";

import Simuladores from "./pages/Simuladores";
import SimuladorFipe from "./pages/SimuladorFipe";
import SimuladorFinanciamento from "./pages/SimuladorFinanciamento";
import SimuladorCustoHora from "./pages/SimuladorCustoHora";
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
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import VerificarEmail from "./pages/VerificarEmail";
// Admin routes — lazy loaded so non-admin users never download admin code
const Admin = lazy(() => import('./pages/admin/Admin'));
const AdminUsuarios = lazy(() => import('./pages/admin/AdminUsuarios'));
const AdminPlanos = lazy(() => import('./pages/admin/AdminPlanos'));
const AdminPaginas = lazy(() => import('./pages/admin/AdminPaginas'));
const AdminEmails = lazy(() => import('./pages/admin/AdminEmails'));
const AdminTermos = lazy(() => import('./pages/admin/AdminTermos'));
const AdminNotificacoes = lazy(() => import('./pages/admin/AdminNotificacoes'));
const AdminDeploy = lazy(() => import('./pages/admin/AdminDeploy'));
const AdminRollbacks = lazy(() => import('./pages/admin/AdminRollbacks'));
const AdminHealthCheck = lazy(() => import('./pages/admin/AdminHealthCheck'));
const FipeSync = lazy(() => import('./pages/admin/FipeSync'));
const AdminMarketing = lazy(() => import('./pages/admin/AdminMarketing'));
const AIFeedback = lazy(() => import('./pages/admin/AIFeedback'));
const AIMetrics = lazy(() => import('./pages/admin/AIMetrics'));
const AdminCRM = lazy(() => import('./pages/admin/AdminCRM'));
const CrmAutomations = lazy(() => import('./pages/admin/CrmAutomations'));
const AdminAfiliados = lazy(() => import('./pages/admin/AdminAfiliados'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
import { RaioXChat } from "./components/ai/RaioXChat";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import BemVindo from "./pages/BemVindo";
import LegalDocument from "./pages/LegalDocument";
import Onboarding2 from "./pages/Onboarding2";
// Perfil page removed - now part of MinhaConta

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <FinancialProvider>
          <VisibilityProvider>
            <TourProvider>
              <ImpersonationProvider>
                <TooltipProvider>
                  <SyncProvider>
                    <Toaster />
                    <Sonner />
                    <GlobalSyncIndicator />
                <BrowserRouter>
                  <TrackingProvider>
                  <MagicLinkHandler>
                    <GuidedTour />
                    <ImpersonationFloater />
                    <CookieConsentBanner />
                    <RaioXChat />
                    <Routes>
                  <Route path="/" element={<Navigate to="/inicio" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/auth" element={<Login />} /> {/* Redirect legacy route */}
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} /> {/* Public - handles password recovery */}
                  <Route path="/verificar-email" element={<VerificarEmail />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/onboarding2" element={<ProtectedRoute><Onboarding2 /></ProtectedRoute>} />
                  <Route path="/app" element={<Navigate to="/inicio" replace />} />
                  <Route path="/inicio" element={<ProtectedRoute><Inicio /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
                  <Route path="/parametros" element={<ProtectedRoute><Parametros /></ProtectedRoute>} />
                  <Route path="/lancamentos" element={<ProtectedRoute><Lancamentos /></ProtectedRoute>} />
                  <Route path="/contas" element={<Navigate to="/lancamentos" replace />} />
                  <Route path="/fluxo-financeiro" element={<Navigate to="/lancamentos" replace />} />
                  <Route path="/bens-investimentos" element={<ProtectedRoute><BensInvestimentosLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="consolidado" replace />} />
                    <Route path="consolidado" element={<ConsolidadoTab />} />
                    <Route path="patrimonio" element={<PatrimonioTab />} />
                    <Route path="investimentos" element={<InvestimentosTab />} />
                    <Route path="credito" element={<CreditoTab />} />
                    <Route path="seguros" element={<SegurosTab />} />
                  </Route>
                  <Route path="/cartao-credito" element={<ProtectedRoute><CartaoCredito /></ProtectedRoute>} />
                  <Route path="/planejamento" element={<ProtectedRoute><PlanejamentoLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="visao-mensal" replace />} />
                    <Route path="visao-mensal" element={<VisaoMensalTab />} />
                    <Route path="metas" element={<MetasTab />} />
                    <Route path="analises" element={<AnalisesTab />} />
                  </Route>
                  <Route path="/planejamento-anual" element={<ProtectedRoute><PlanejamentoAnual /></ProtectedRoute>} />
                  {/* Redirect old cartao routes to new standalone page */}
                  <Route path="/planejamento-cartao" element={<Navigate to="/cartao-credito" replace />} />
                  <Route path="/metas-mensais" element={<Navigate to="/planejamento?tab=metas" replace />} />
                  <Route path="/registro-compras" element={<ProtectedRoute><RegistroCompras /></ProtectedRoute>} />
                  <Route path="/pacotes-orcamento" element={<ProtectedRoute><PacotesOrcamento /></ProtectedRoute>} />
                  <Route path="/sonhos" element={<ProtectedRoute><Sonhos /></ProtectedRoute>} />
                  <Route path="/minha-conta" element={<ProtectedRoute><MinhaConta /></ProtectedRoute>} />
                  {/* Redirects from old routes */}
                  <Route path="/configuracoes" element={<Navigate to="/minha-conta?tab=perfil" replace />} />
                  <Route path="/perfil" element={<Navigate to="/minha-conta?tab=perfil" replace />} />
                  <Route path="/configuracoes-hub" element={<ProtectedRoute><ConfiguracoesHub /></ProtectedRoute>} />
                  <Route path="/configuracoes-fiscais" element={<ProtectedRoute><ConfiguracoesFiscais /></ProtectedRoute>} />
                  <Route path="/instituicoes-financeiras" element={<ProtectedRoute><InstituicoesFinanceiras /></ProtectedRoute>} />
                  <Route path="/dados-financeiros" element={<ProtectedRoute><DadosFinanceiros /></ProtectedRoute>} />
                  <Route path="/financeiro" element={<ProtectedRoute><FinanceiroLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="planos" replace />} />
                    <Route path="planos" element={<PlanosTab />} />
                    <Route path="pagamentos" element={<PagamentosTab />} />
                    <Route path="minhas-indicacoes" element={<IndicacoesTab />} />
                  </Route>
                  {/* Redirects from old standalone routes */}
                  <Route path="/planos" element={<Navigate to="/financeiro/planos" replace />} />
                  <Route path="/historico-pagamentos" element={<Navigate to="/financeiro/pagamentos" replace />} />
                  <Route path="/minhas-indicacoes" element={<Navigate to="/financeiro/minhas-indicacoes" replace />} />
                  <Route path="/regras-categoria" element={<Navigate to="/parametros?tab=regras" replace />} />
                  {/* Simuladores — URL-driven categories */}
                  <Route path="/simuladores" element={<Navigate to="/simuladores/veiculos" replace />} />
                  <Route path="/simuladores/:category" element={<Simuladores />} />
                  {/* Simuladores — nested simulator routes */}
                  <Route path="/simuladores/veiculos/simulador-fipe" element={<SimuladorFipe />} />
                  <Route path="/simuladores/veiculos/simulador-carro-ab" element={<ProtectedRoute><SimuladorCarroAB /></ProtectedRoute>} />
                  <Route path="/simuladores/veiculos/simulador-custo-oportunidade-carro" element={<ProtectedRoute><SimuladorCustoOportunidadeCarro /></ProtectedRoute>} />
                  <Route path="/simuladores/dividas/renegociacao-dividas" element={<ProtectedRoute><RenegociacaoDividas /></ProtectedRoute>} />
                  <Route path="/simuladores/dividas/financiamento-consorcio" element={<ProtectedRoute><SimuladorFinanciamento /></ProtectedRoute>} />
                  <Route path="/simuladores/planejamento/simulador-custo-hora" element={<ProtectedRoute><SimuladorCustoHora /></ProtectedRoute>} />
                  <Route path="/simuladores/planejamento/simulador-desconto-justo" element={<ProtectedRoute><SimuladorDescontoJusto /></ProtectedRoute>} />
                  <Route path="/simuladores/planejamento/econograph" element={<ProtectedRoute><EconoGraph /></ProtectedRoute>} />
                  {/* Dynamic simulators */}
                  <Route path="/simuladores/:category/:slug" element={<SimuladorDinamico />} />
                  {/* Legacy redirects — old flat URLs → new nested URLs */}
                  <Route path="/simulador-fipe" element={<Navigate to="/simuladores/veiculos/simulador-fipe" replace />} />
                  <Route path="/simulador-carro-ab" element={<Navigate to="/simuladores/veiculos/simulador-carro-ab" replace />} />
                  <Route path="/simulador-custo-oportunidade-carro" element={<Navigate to="/simuladores/veiculos/simulador-custo-oportunidade-carro" replace />} />
                  <Route path="/financiamento-consorcio" element={<Navigate to="/simuladores/dividas/financiamento-consorcio" replace />} />
                  <Route path="/simulador-financiamento" element={<Navigate to="/simuladores/dividas/financiamento-consorcio" replace />} />
                  <Route path="/simulador-custo-hora" element={<Navigate to="/simuladores/planejamento/simulador-custo-hora" replace />} />
                  <Route path="/simulador-desconto-justo" element={<Navigate to="/simuladores/planejamento/simulador-desconto-justo" replace />} />
                  <Route path="/econograph" element={<Navigate to="/simuladores/planejamento/econograph" replace />} />
                  <Route path="/renegociacao-dividas" element={<ProtectedRoute><RenegociacaoDividas /></ProtectedRoute>} />
                   <Route path="/renegociacao-dividas/quitacao-desconto" element={<ProtectedRoute><QuitacaoDesconto /></ProtectedRoute>} />
                   <Route path="/renegociacao-dividas/parcelamento" element={<ProtectedRoute><ParcelamentoDivida /></ProtectedRoute>} />
                   <Route path="/renegociacao-dividas/portabilidade" element={<ProtectedRoute><PortabilidadeCredito /></ProtectedRoute>} />
                   <Route path="/renegociacao-dividas/consolidacao" element={<ProtectedRoute><ConsolidacaoDividas /></ProtectedRoute>} />
                  <Route path="/balanco-patrimonial" element={<Navigate to="/bens-investimentos/consolidado" replace />} />
                  <Route path="/gestao-veiculos" element={<ProtectedRoute><GestaoVeiculos /></ProtectedRoute>} />
                  <Route path="/seguros" element={<ProtectedRoute><Seguros /></ProtectedRoute>} />
                  <Route path="/presentes" element={<ProtectedRoute><Presentes /></ProtectedRoute>} />
                  <Route path="/rx-split" element={<ProtectedRoute><RXSplit /></ProtectedRoute>} />
                  <Route path="/dividir-conta" element={<ProtectedRoute><DividirConta /></ProtectedRoute>} />
                  <Route path="/meu-ir" element={<ProtectedRoute><MeuIR /></ProtectedRoute>} />
                  {/* Perfil route now redirected above */}
                  {/* Admin Routes — all require MFA via AdminSecureLayout */}
                  <Route path="/admin" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" message="Carregando painel admin..." />}><Admin /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/dashboard" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminDashboard /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/usuarios" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminUsuarios /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/planos" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminPlanos /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/paginas" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminPaginas /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/emails" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminEmails /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/termos" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminTermos /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/notificacoes" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminNotificacoes /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/deploy" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminDeploy /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/rollbacks" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminRollbacks /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/health" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminHealthCheck /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/fipe-sync" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><FipeSync /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/marketing" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminMarketing /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/ai-feedback" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AIFeedback /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/ai-metrics" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AIMetrics /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/crm" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminCRM /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/crm/automations" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><CrmAutomations /></Suspense></AdminSecureLayout>} />
                  <Route path="/admin/audit" element={<AdminSecureLayout><AdminAuditDashboard /></AdminSecureLayout>} />
                  <Route path="/admin/afiliados" element={<AdminSecureLayout><Suspense fallback={<RXFinLoadingSpinner height="h-screen" />}><AdminAfiliados /></Suspense></AdminSecureLayout>} />
                  {/* Legacy redirects */}
                  <Route path="/admin/simuladores" element={<Navigate to="/admin/paginas" replace />} />
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
                  </MagicLinkHandler>
                  </TrackingProvider>
                </BrowserRouter>
                  </SyncProvider>
                </TooltipProvider>
            </ImpersonationProvider>
          </TourProvider>
        </VisibilityProvider>
      </FinancialProvider>
    </AuthProvider>
  </ThemeProvider>
  </QueryClientProvider>
);

export default App;
