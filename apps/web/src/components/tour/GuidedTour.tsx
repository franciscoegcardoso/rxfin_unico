import React, { useCallback, useRef, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS, Step } from 'react-joyride';
import { useTour } from '@/contexts/TourContext';
import { joyrideStyles } from './tourStyles';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTourAnalytics } from '@/hooks/useTourAnalytics';
import confetti from 'canvas-confetti';

const desktopSteps: Step[] = [
  {
    target: 'body',
    content: 'Bem-vindo ao RXFin! Vamos fazer um tour rápido pelas principais funcionalidades do seu Raio-X Financeiro.',
    placement: 'center',
    disableBeacon: true,
    title: '🎉 Bem-vindo ao RXFin!',
  },
  {
    target: '[data-tour="onboarding-progress"]',
    content: 'Aqui você acompanha o progresso da configuração da sua conta. Complete todas as etapas para aproveitar ao máximo!',
    placement: 'bottom',
    title: '📋 Progresso do Onboarding',
  },
  {
    target: '[data-tour="metrics-cards"]',
    content: 'Visualize suas métricas do mês: gastos realizados, comparação com o mês anterior e o ritmo de consumo.',
    placement: 'bottom',
    title: '📊 Métricas do Mês',
  },
  {
    target: '[data-tour="category-goals"]',
    content: 'Acompanhe suas metas por categoria em tempo real. Verde significa dentro do orçamento!',
    placement: 'top',
    title: '🎯 Metas por Categoria',
  },
  {
    target: '[data-tour="nav-patrimonio"]',
    content: 'Gerencie seu patrimônio: bens, investimentos, veículos, FGTS e muito mais.',
    placement: 'bottom',
    title: '🏦 Patrimônio',
  },
  {
    target: '[data-tour="nav-planejar"]',
    content: 'Crie metas mensais, faça projeções de longo prazo e mantenha suas finanças sob controle.',
    placement: 'bottom',
    title: '📅 Planejamento',
  },
  {
    target: '[data-tour="nav-config"]',
    content: 'Acesse simuladores, Imposto de Renda, seguros, presentes e todas as configurações.',
    placement: 'bottom',
    title: '⚙️ Mais Opções',
  },
];

const mobileSteps: Step[] = [
  {
    target: 'body',
    content: 'Bem-vindo ao RXFin! Vamos fazer um tour rápido pelas principais funcionalidades do seu Raio-X Financeiro.',
    placement: 'center',
    disableBeacon: true,
    title: '🎉 Bem-vindo ao RXFin!',
  },
  {
    target: '[data-tour="onboarding-progress"]',
    content: 'Aqui você acompanha o progresso da configuração da sua conta. Complete todas as etapas!',
    placement: 'bottom',
    title: '📋 Progresso',
  },
  {
    target: '[data-tour="metrics-cards"]',
    content: 'Visualize suas métricas do mês: gastos, comparação e ritmo de consumo.',
    placement: 'bottom',
    title: '📊 Métricas',
  },
  {
    target: '[data-tour="nav-inicio"]',
    content: 'Volte para a tela inicial a qualquer momento.',
    placement: 'top',
    title: '🏠 Início',
  },
  {
    target: '[data-tour="nav-patrimonio"]',
    content: 'Gerencie seu patrimônio: bens, investimentos e veículos.',
    placement: 'top',
    title: '🏦 Patrimônio',
  },
  {
    target: '[data-tour="fab-button"]',
    content: 'Use o botão central para ações rápidas: lançar despesa, escanear recibo e mais!',
    placement: 'top',
    title: '⚡ Ações Rápidas',
  },
  {
    target: '[data-tour="nav-planejar"]',
    content: 'Crie metas e faça projeções para suas finanças.',
    placement: 'top',
    title: '📅 Planejamento',
  },
  {
    target: '[data-tour="nav-mais"]',
    content: 'Acesse todas as outras funcionalidades: simuladores, IR, seguros e configurações.',
    placement: 'top',
    title: '⚙️ Mais Opções',
  },
];

export const GuidedTour: React.FC = () => {
  const { isTourActive, markTourCompleted, endTour } = useTour();
  const isMobile = useIsMobile();
  const { trackTourStarted, trackStepViewed, trackTourSkipped, trackTourCompleted } = useTourAnalytics();
  const hasTrackedStart = useRef(false);
  const lastTrackedStep = useRef<number>(-1);

  const steps = isMobile ? mobileSteps : desktopSteps;

  // Track tour start
  useEffect(() => {
    if (isTourActive && !hasTrackedStart.current) {
      hasTrackedStart.current = true;
      lastTrackedStep.current = -1;
      trackTourStarted(steps.length, isMobile);
    }
    if (!isTourActive) {
      hasTrackedStart.current = false;
      lastTrackedStep.current = -1;
    }
  }, [isTourActive, steps.length, isMobile, trackTourStarted]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type, step } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    // Track step view when entering a new step
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      if (index !== lastTrackedStep.current && index < steps.length) {
        lastTrackedStep.current = index;
        const target = typeof step?.target === 'string' ? step.target : 'body';
        trackStepViewed(index, target, steps.length, isMobile);
      }
    }

    if (finishedStatuses.includes(status)) {
      if (status === STATUS.FINISHED) {
        // Track completion
        trackTourCompleted(steps.length, isMobile);
        // Celebrate completion with confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#16a34a', '#15803d', '#166534'],
        });
      } else if (status === STATUS.SKIPPED) {
        // Track skip with the current step info
        const target = typeof step?.target === 'string' ? step.target : 'body';
        trackTourSkipped(index, target, steps.length, isMobile);
      }
      markTourCompleted();
    }
  }, [markTourCompleted, steps.length, isMobile, trackStepViewed, trackTourSkipped, trackTourCompleted]);

  return (
    <Joyride
      steps={steps}
      run={isTourActive}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      spotlightClicks={false}
      callback={handleJoyrideCallback}
      styles={joyrideStyles}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        nextLabelWithProgress: 'Próximo ({step} de {steps})',
        skip: 'Pular tour',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};
