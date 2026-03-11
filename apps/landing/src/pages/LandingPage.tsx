import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, Instagram, Mail, BarChart3, Target, Brain, Clock, Plug, FileText } from 'lucide-react';
import {
  trackPageView,
  trackCTAClick,
  trackFeaturePreview,
  trackSignUpIntent,
  trackSocialClick,
  trackContactClick,
  initScrollTracking,
} from '@/lib/tracking';
import { Button } from '@/components/ui/button';
import { FeaturePreviewDialog } from '@/components/landing/FeaturePreviewDialog';
import { featureContentMap } from '@/components/landing/featureSlideContents';
import { ExitIntentPopup } from '@/components/landing/ExitIntentPopup';
import { LeadGateDialog } from '@/components/landing/LeadGateDialog';
import { CibeliaWidget } from '@/components/landing/CibeliaWidget';
import { HeroSection } from '@/components/landing/HeroSection';
import { SocialProofBar } from '@/components/landing/SocialProofBar';
import { SimulatorsSection } from '@/components/landing/SimulatorsSection';
import { TimelineSection } from '@/components/landing/TimelineSection';
import { FeaturesSection, FeatureItem } from '@/components/landing/FeaturesSection';
import { SignupBenefitsSection } from '@/components/landing/SignupBenefitsSection';
import { AuthoritySection } from '@/components/landing/AuthoritySection';
import { PrivacySecuritySection } from '@/components/landing/PrivacySecuritySection';
import { TrustBadges } from '@/components/landing/TrustBadges';
import logoRxFin from '@/assets/Logo_RXFin-10.png';

const APP_URL = 'https://app.rxfin.com.br';

const pillars: FeatureItem[] = [
  {
    id: 'cashflow',
    icon: BarChart3,
    title: 'Seu caixa projetado (sem planilhas)',
    description: 'Veja entradas e saídas futuras automaticamente e descubra com antecedência quando vai sobrar ou faltar.',
    cta: 'Ver um exemplo de projeção',
  },
  {
    id: 'goals',
    icon: Target,
    title: 'Metas com cálculo automático (do sonho ao plano)',
    description: 'O sistema diz quanto guardar por mês e ajusta o plano se sua realidade mudar.',
    cta: 'Simular minha meta',
  },
  {
    id: 'ai',
    icon: Brain,
    title: 'IA que encontra vazamentos e sugere ajustes práticos',
    description: 'Identifique gastos invisíveis e padrões — e receba recomendações simples para sobrar mais no fim do mês.',
    cta: 'Quero recomendações',
  },
];

const complementary: FeatureItem[] = [
  {
    id: 'freedom',
    icon: Clock,
    title: 'Independência financeira em cenários reais',
    description: 'Simule futuro com seus ativos e investimentos em cenários conservador/realista/otimista.',
    cta: 'Ver cenários',
  },
  {
    id: 'connection',
    icon: Plug,
    title: 'Conecte bancos e cartões com segurança',
    description: 'Integração para reduzir digitação e manter tudo sincronizado automaticamente.',
    cta: 'Ver bancos compatíveis',
  },
  {
    id: 'tax',
    icon: FileText,
    title: 'Imposto de Renda organizado o ano inteiro',
    description: 'Centralize rendas e despesas dedutíveis e chegue no IR com relatórios prontos (sem caça a comprovantes).',
    cta: 'Ver o que fica registrado',
  },
];

const LandingPage: React.FC = () => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('');
  const [leadGateOpen, setLeadGateOpen] = useState(false);
  const [pendingRedirectUrl, setPendingRedirectUrl] = useState('');
  const [pendingSimName, setPendingSimName] = useState('');
  const leadGateEnabled = useRef(true);

  useEffect(() => {
    (supabase.from('app_settings') as any)
      .select('setting_value')
      .eq('setting_key', 'landing_lead_gate_enabled')
      .single()
      .then(({ data }: any) => {
        if (data) leadGateEnabled.current = data.setting_value === true || data.setting_value === 'true';
      })
      .catch(() => { /* fallback: leadGateEnabled permanece default */ });
  }, []);

  useEffect(() => {
    trackPageView();
    const cleanup = initScrollTracking();
    return cleanup;
  }, []);

  const openLeadGate = (url: string, simName: string) => {
    if (!leadGateEnabled.current) { window.location.href = url; return; }
    const alreadyCaptured = sessionStorage.getItem('rxfin_lead_email');
    if (alreadyCaptured) { window.location.href = url; return; }
    setPendingRedirectUrl(url);
    setPendingSimName(simName);
    setLeadGateOpen(true);
  };

  const handleLeadGateContinue = () => {
    if (pendingRedirectUrl) window.location.href = pendingRedirectUrl;
  };

  const handleSimulatorClick = (simId: string) => {
    trackFeaturePreview(simId);
    setSelectedFeature(simId);
    setPreviewOpen(true);
  };

  const handleFeatureClick = (featureId: string) => {
    trackFeaturePreview(featureId);
    setSelectedFeature(featureId);
    setPreviewOpen(true);
  };

  const getPreviewContent = () => {
    if (featureContentMap[selectedFeature]) return featureContentMap[selectedFeature];
    return {
      featureName: selectedFeature,
      featureIcon: <Rocket className="h-8 w-8" />,
      slides: [
        { type: 'intro' as const, title: `${selectedFeature} está chegando!`, content: 'Esta funcionalidade está em desenvolvimento e será lançada em breve.' },
        { type: 'cta' as const, title: `Receba ${selectedFeature} em primeira mão`, content: 'Faça seu cadastro agora e garanta acesso vitalício aos simuladores gratuitos!' },
      ],
    };
  };

  const scrollToSystem = () => {
    document.getElementById('sistema')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <ExitIntentPopup />
      <CibeliaWidget />
      <LeadGateDialog open={leadGateOpen} onOpenChange={setLeadGateOpen} simulatorName={pendingSimName} onContinue={handleLeadGateContinue} />
      <FeaturePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} content={getPreviewContent()} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(161,79%,12%)] dark:bg-[hsl(161,60%,6%)] backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <img src={logoRxFin} alt="RXFin" className="h-8" />
            <nav className="hidden md:flex items-center gap-6">
              <a href="#simuladores" className="text-sm text-white/70 hover:text-white transition-colors">Simuladores</a>
              <a href="#sistema" className="text-sm text-white/70 hover:text-white transition-colors">Sistema</a>
              <a href="#seguranca" className="text-sm text-white/70 hover:text-white transition-colors">Segurança</a>
            </nav>
            <div className="flex items-center gap-2">
              <a href={`${APP_URL}/login`} onClick={() => trackCTAClick('header_login', `${APP_URL}/login`)}>
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                  Login
                </Button>
              </a>
              <a href={`${APP_URL}/signup`} onClick={() => trackCTAClick('header_criar_conta', `${APP_URL}/signup`)}>
                <Button size="sm" className="bg-white text-[hsl(161,79%,25%)] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
                  Criar conta grátis
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* 1. Hero */}
      <HeroSection onScrollToSystem={scrollToSystem} />

      {/* 1.1 Social Proof */}
      <SocialProofBar />

      {/* 2. Simuladores */}
      <SimulatorsSection onSimulatorClick={handleSimulatorClick} onOpenLeadGate={openLeadGate} />

      {/* 4. Um Sistema que Funciona */}
      <TimelineSection />

      {/* 5. Pare de adivinhar + Recursos Complementares + Segurança */}
      <FeaturesSection pillars={pillars} complementary={complementary} onFeatureClick={handleFeatureClick} />

      {/* 6. Ao se cadastrar você pode */}
      <SignupBenefitsSection />

      {/* 9. Privacidade e Segurança */}
      <PrivacySecuritySection />

      {/* 10. Autoridade */}
      <AuthoritySection />

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,12%)] dark:bg-[hsl(161,60%,5%)] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <img src={logoRxFin} alt="RXFin" className="h-8" />
              <p className="text-xs text-white/60">Seu Raio-X Financeiro Completo</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  trackSocialClick('instagram');
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (isMobile) {
                    window.location.href = 'instagram://user?username=rxfin.app';
                    setTimeout(() => { window.open('https://www.instagram.com/rxfin.app/', '_blank', 'noopener,noreferrer'); }, 500);
                  } else {
                    window.open('https://www.instagram.com/rxfin.app/', '_blank', 'noopener,noreferrer');
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
              >
                <Instagram className="h-4 w-4" />
                @rxfin.app
              </button>
              <a href="mailto:contato@rxfin.com.br" onClick={() => trackContactClick('email')} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
                <Mail className="h-4 w-4" />
                contato@rxfin.com.br
              </a>
            </div>
            <div className="flex items-center gap-2">
              <a href={`${APP_URL}/login`} onClick={() => trackCTAClick('footer_login', `${APP_URL}/login`)}>
                <Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 h-8 px-3">
                  Fazer login
                </Button>
              </a>
              <a href={`${APP_URL}/signup`} onClick={() => trackSignUpIntent('footer_criar_conta')}>
                <Button size="sm" className="text-xs bg-white text-[hsl(161,79%,25%)] hover:bg-white/90 hover:scale-105 transition-all duration-200 h-8 px-3 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
                  Criar conta grátis
                </Button>
              </a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center gap-5">
            <TrustBadges />
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
              <p className="text-[11px] text-white/50">© {new Date().getFullYear()} RXFin. Todos os direitos reservados.</p>
              <div className="flex items-center gap-4 text-[11px] text-white/50">
                <Link to="/sobre" className="hover:text-white transition-colors">Sobre nós</Link>
                <span className="text-white/20">|</span>
                <Link to="/manifesto" className="hover:text-white transition-colors">Manifesto</Link>
                <span className="text-white/20">|</span>
                <a href={`${APP_URL}/termos-de-uso`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Termos de Uso</a>
                <span className="text-white/20">|</span>
                <a href={`${APP_URL}/politica-privacidade`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Política de Privacidade</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
