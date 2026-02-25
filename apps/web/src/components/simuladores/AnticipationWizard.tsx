import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  Truck,
  Store,
  Landmark,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wallet,
  Smartphone,
  Server,
  Globe,
  Lock,
  Users,
  Target,
  Package,
  FileText,
  XCircle,
  Zap,
  Play,
  Eye,
  Calculator,
  PieChart,
  PlusCircle,
  RotateCcw,
  Receipt,
  Rewind,
  HelpCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Importar componentes modulares
import {
  FINANCIAL_CONFIG,
  STEP_TO_CHAPTER,
  WIZARD_CHAPTERS,
  GlossaryTooltip,
  ExplanatoryNote,
  QuickTip,
  StepProgress,
  MobileStepIndicator,
  ActorCard,
  IntroActorCard,
  FlowArrow
} from './anticipation';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface AnticipationWizardProps {
  onClose?: () => void;
}

const AnticipationWizard: React.FC<AnticipationWizardProps> = ({ onClose }) => {
  // ============================================
  // ESTADOS DE CONTROLE
  // ============================================
  const [step, setStep] = useState(1);
  const totalSteps = 8;
  
  // Estados de animação por passo
  const [processingStage, setProcessingStage] = useState(0);
  const [tradeStep, setTradeStep] = useState(0);
  const [problemPhase, setProblemPhase] = useState(0);
  const [anticipationPhase, setAnticipationPhase] = useState(0);
  const [celebrationStage, setCelebrationStage] = useState(0);
  const hasTriggeredConfetti = useRef(false);

  // ============================================
  // CONSTANTES FINANCEIRAS (do config centralizado)
  // ============================================
  const {
    saleAmount,
    supplierCost,
    netInstallment,
    totalReceivable,
    anticipationRate,
    anticipationCost,
    finalNetValue
  } = FINANCIAL_CONFIG;

  // ============================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ============================================
  const nextStep = () => {
    setStep(prev => Math.min(prev + 1, totalSteps));
    resetAnimationStates();
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
    resetAnimationStates();
  };

  const goToStep = (targetStep: number) => {
    setStep(targetStep);
    resetAnimationStates();
  };

  // Sempre resetar animação do passo 5 quando entrar nele
  useEffect(() => {
    if (step === 5) {
      setProcessingStage(0);
      hasTriggeredConfetti.current = false; // Permite confetti novamente
    }
  }, [step]);

  const resetSimulation = () => {
    setStep(1);
    resetAnimationStates();
  };

  const resetAnimationStates = () => {
    setProcessingStage(0);
    setTradeStep(0);
    setProblemPhase(0);
    setAnticipationPhase(0);
    setCelebrationStage(0);
    hasTriggeredConfetti.current = false;
  };

  // ============================================
  // FUNÇÕES DE ANIMAÇÃO
  // ============================================
  
  const startTradeAnimation = () => {
    if (tradeStep > 0) return;
    setTradeStep(1);
    setTimeout(() => setTradeStep(2), 1500);
    setTimeout(() => setTradeStep(3), 3000);
  };

  const startProcessingAnimation = () => {
    if (processingStage > 0 && processingStage < 6) return;
    setProcessingStage(1);
    const timings = [1000, 2000, 3000, 4500, 6000];
    timings.forEach((t, i) => {
      setTimeout(() => setProcessingStage(i + 2), t);
    });
  };

  const resetProcessingAnimation = () => {
    setProcessingStage(0);
  };

  // Confetti ao completar processamento do passo 5 (compra aprovada)
  useEffect(() => {
    if (step === 5 && processingStage === 6 && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.7 }
      });
    }
  }, [step, processingStage]);

  const nextProblemPhase = () => {
    if (problemPhase < 4) {
      setProblemPhase(prev => prev + 1);
    }
  };

  const nextAnticipationPhase = () => {
    if (anticipationPhase === 0) {
      setAnticipationPhase(1);
      setTimeout(() => setAnticipationPhase(2), 2000);
    } else if (anticipationPhase < 5) {
      setAnticipationPhase(prev => prev + 1);
    }
  };

  // ============================================
  // VALIDAÇÃO DE NAVEGAÇÃO
  // ============================================
  const canProceed = () => {
    if (step === 3 && tradeStep < 3) return false;
    if (step === 5 && processingStage < 6) return false;
    if (step === 6 && celebrationStage < 3) return false; // Precisa ver até a solução
    if (step === 7 && anticipationPhase < 5) return false;
    return true;
  };

  // Obter título do capítulo atual
  const currentChapter = STEP_TO_CHAPTER[step] || 1;
  const chapterInfo = WIZARD_CHAPTERS.find(c => c.id === currentChapter);

  // ============================================
  // ANIMAÇÕES DE PÁGINA
  // ============================================
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/30 overflow-hidden">
      {/* HEADER COM NAVEGAÇÃO POR CAPÍTULOS */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border shadow-sm sticky top-0 z-20">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          {/* Título e dica */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight">
                  Ciclo de Pagamento
                </h2>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Entenda como funciona a antecipação de recebíveis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <QuickTip>
                  Passe o mouse nos termos sublinhados para aprender
                </QuickTip>
              </div>
              {/* Botão Fechar no Header */}
              {onClose && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Navegação por Capítulos */}
          <StepProgress 
            currentStep={step} 
            totalSteps={totalSteps}
            onChapterClick={goToStep}
          />
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <AnimatePresence mode="wait">
          
          {/* ========== PASSO 1: STAKEHOLDERS ========== */}
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-5xl mx-auto"
            >
              <div className="text-center max-w-2xl mx-auto px-4">
                <div className="inline-flex items-center justify-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">Participantes</span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-3">
                  Quem participa deste ciclo?
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Para entender a <GlossaryTooltip term="rav">antecipação de recebíveis</GlossaryTooltip>, 
                  primeiro precisamos conhecer os interesses de cada participante.
                </p>
              </div>

              {/* Grid de Stakeholders */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <IntroActorCard
                  icon={ShoppingBag}
                  title="Consumidor"
                  role="Comprador"
                  variant="consumer"
                  description="Quer parcelar para caber no bolso. Paga juros embutidos no preço à vista."
                  animationDelay={0}
                />
                <IntroActorCard
                  icon={Store}
                  title="Lojista"
                  role="Vendedor"
                  variant="retailer"
                  description="Vende parcelado para atrair clientes, mas precisa pagar fornecedor à vista."
                  animationDelay={0.1}
                />
                <IntroActorCard
                  icon={Truck}
                  title="Fornecedor"
                  role="Atacadista"
                  variant="supplier"
                  description="Vende mercadoria ao lojista e exige pagamento em 30 dias."
                  animationDelay={0.2}
                />
                <IntroActorCard
                  icon={Landmark}
                  title="Financeira"
                  role="Antecipadora"
                  variant="bank"
                  description="Oferece antecipar os recebíveis do lojista, cobrando uma taxa por isso."
                  animationDelay={0.3}
                  glossaryTerm="adquirente"
                />
              </div>

              {/* Nota Explicativa do Desafio */}
              <ExplanatoryNote type="tip" title="O Grande Desafio">
                <p>
                  Vamos usar o exemplo de um consumidor que faz uma compra de{' '}
                  <strong className="text-foreground">R$ {saleAmount.toFixed(2)}</strong> parcelada em{' '}
                  <strong className="text-foreground">5x sem juros</strong>.
                </p>
                <p className="mt-2">
                  O problema? O lojista precisa pagar o fornecedor integralmente em apenas{' '}
                  <strong className="text-foreground">30 dias</strong>. Isso cria o que chamamos de{' '}
                  <GlossaryTooltip term="descasamento">descasamento de caixa</GlossaryTooltip>.
                </p>
                <p className="mt-2 font-semibold text-amber-600 dark:text-amber-400">
                  Como o lojista fecha essa conta sem ficar no vermelho? Vamos descobrir juntos!
                </p>
              </ExplanatoryNote>
            </motion.div>
          )}

          {/* ========== PASSO 2: ESTOQUE INICIAL ========== */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Passo 1: Produto em estoque no fornecedor
                </h3>
                <p className="text-muted-foreground">
                  Tudo começa com o fornecedor que possui a mercadoria.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row justify-center items-center gap-6">
                <ActorCard 
                  icon={Truck} 
                  variant="supplier"
                  title="Fornecedor" 
                  subtitle="Possui o produto e quer vender para o lojista." 
                  balance={0} credit={0} debt={0}
                />
                
                <FlowArrow 
                  direction="right"
                  icon={<Package className="w-6 h-6 text-orange-500" />}
                  label="PRODUTO"
                  variant="warning"
                  animated
                />
                
                <ActorCard 
                  icon={Store} 
                  variant="retailer"
                  title="Lojista" 
                  subtitle="Quer comprar estoque para revender." 
                  balance={0} debt={0} credit={0} 
                />
              </div>
              
              <ExplanatoryNote type="info">
                O lojista negocia com o fornecedor. O custo deste produto é de{' '}
                <strong className="text-foreground">R$ {supplierCost.toFixed(2)}</strong>.
                O pagamento será feito com prazo de 30 dias (boleto).
              </ExplanatoryNote>
            </motion.div>
          )}

          {/* ========== PASSO 3: COMPRA DO ESTOQUE ========== */}
          {step === 3 && (
            <motion.div
              key="step-3"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Passo 2: Lojista compra e assume dívida
                </h3>
                <p className="text-muted-foreground">
                  O lojista recebe a mercadoria, mas agora tem um{' '}
                  <GlossaryTooltip term="recebivel">compromisso a pagar</GlossaryTooltip> em 30 dias.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row justify-center items-center gap-8 relative">
                <ActorCard 
                  icon={Truck} 
                  variant="supplier"
                  title="Fornecedor" 
                  subtitle={tradeStep < 1 ? "Aguardando pedido..." : (tradeStep < 3 ? "Enviando produto e nota fiscal..." : "Entregue! Aguardando pagamento.")} 
                  balance={0} 
                  credit={tradeStep === 3 ? supplierCost : 0} 
                  debt={0}
                  isHighlighted={tradeStep === 3}
                  highlightType="success"
                />
                
                {/* Área Central de Animação */}
                <div className="flex flex-col items-center justify-center w-48 h-48 relative">
                  {tradeStep === 0 && (
                    <Button 
                      onClick={startTradeAnimation}
                      className="gap-2 animate-pulse"
                      size="lg"
                    >
                      <Package className="w-4 h-4" /> Fazer Pedido
                    </Button>
                  )}
                  
                  {/* Animação do Produto */}
                  <AnimatePresence>
                    {tradeStep === 1 && (
                      <motion.div
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 100, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute flex items-center gap-2 bg-orange-100 dark:bg-orange-500/20 p-3 rounded-full border-2 border-orange-500"
                      >
                        <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Animação do Boleto */}
                  <AnimatePresence>
                    {tradeStep === 2 && (
                      <motion.div
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: -100, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute flex flex-col items-center gap-1 bg-red-100 dark:bg-red-500/20 p-3 rounded-xl border-2 border-red-500"
                      >
                        <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                        <div className="flex items-center gap-1 bg-red-200 dark:bg-red-600/30 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-red-700 dark:text-red-300" />
                          <span className="text-[10px] font-bold text-red-800 dark:text-red-200">30 DIAS</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Estado Final */}
                  {tradeStep === 3 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center space-y-3"
                    >
                      <div className="flex items-center gap-2 text-orange-500">
                        <Package className="w-4 h-4" />
                        <ArrowRight className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2 text-red-500">
                        <ArrowLeft className="w-6 h-6" />
                        <FileText className="w-4 h-4" />
                      </div>
                    </motion.div>
                  )}
                </div>
                
                <ActorCard 
                  icon={Store} 
                  variant="retailer"
                  title="Lojista" 
                  subtitle={tradeStep < 1 ? "Estoque vazio." : (tradeStep < 3 ? "Recebendo produto..." : "Estoque cheio. Dívida assumida!")} 
                  balance={0} 
                  debt={tradeStep === 3 ? supplierCost : 0} 
                  credit={0}
                  isHighlighted={tradeStep === 3}
                  highlightType="warning"
                />
              </div>
              
              {/* Nota de Consequência */}
              <AnimatePresence>
                {tradeStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ExplanatoryNote type="warning" title="Atenção ao Fluxo de Caixa">
                      O lojista recebeu o produto com nota fiscal, mas agora tem um{' '}
                      <strong>boleto de R$ {supplierCost.toFixed(2)}</strong> para pagar em 30 dias.
                      Note como surgiu uma "conta a receber" para o fornecedor e uma "conta a pagar" para o lojista.
                    </ExplanatoryNote>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ========== PASSO 4: VENDA AO CONSUMIDOR ========== */}
          {step === 4 && (
            <motion.div
              key="step-4"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto space-y-4"
            >
              {/* Título */}
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                  Passo 3: Consumidor faz a compra parcelada
                </h3>
                <p className="text-sm text-muted-foreground">
                  O consumidor paga com cartão de crédito em 5x sem juros.
                </p>
              </div>
              
              {/* Cards lado a lado com indicador de venda no meio */}
              <div className="flex flex-col md:flex-row justify-between items-stretch gap-4">
                <ActorCard 
                  icon={ShoppingBag} 
                  variant="consumer"
                  title="Consumidor" 
                  subtitle="Compra produto por R$ 100 em 5x no cartão de crédito." 
                  balance={0} 
                  credit={0} 
                  debt={saleAmount} 
                />
                
                <div className="flex flex-col items-center justify-center px-4 py-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="p-3 rounded-full bg-blue-500/10 border border-blue-200 dark:border-blue-500/30"
                  >
                    <CreditCard className="text-blue-600 dark:text-blue-400 w-8 h-8" />
                  </motion.div>
                  <span className="text-sm font-bold text-blue-800 dark:text-blue-300 mt-2">
                    VENDA R$ {saleAmount.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">5x de R$ 20,00 sem juros</span>
                  <ArrowRight className="text-blue-300 dark:text-blue-500/50 w-8 h-6 mt-2" />
                </div>
                
                <ActorCard 
                  icon={Store} 
                  variant="retailer"
                  title="Lojista" 
                  subtitle="Passa o cartão na maquininha. Crédito a receber criado!" 
                  balance={0} 
                  debt={supplierCost} 
                  credit={saleAmount}
                  isHighlighted
                  highlightType="success"
                />
              </div>

              {/* Nota rápida */}
              <QuickTip className="justify-center w-full">
                O lojista agora tem R$ 100 a receber, mas ainda deve R$ {supplierCost.toFixed(2)} ao fornecedor
              </QuickTip>

              {/* O que acontece - na parte inferior */}
              <ExplanatoryNote type="info" title="O que acontece nesta transação?">
                <ul className="space-y-2 mt-2">
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <span>
                      O <strong className="text-blue-600">Consumidor</strong> passa a ter uma{' '}
                      <strong className="text-red-600">conta a pagar</strong> de R$ 100,00 no cartão de crédito
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>
                      O <strong className="text-purple-600">Lojista</strong> passa a ter{' '}
                      <GlossaryTooltip term="recebivel">recebíveis</GlossaryTooltip> de R$ 100,00 via maquininha
                    </span>
                  </li>
                </ul>
              </ExplanatoryNote>
            </motion.div>
          )}

          {/* ========== PASSO 5: FLUXO DA INFORMAÇÃO ========== */}
          {step === 5 && (
            <motion.div
              key="step-5"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Passo 4: Fluxo de Informação
                </h3>
                <p className="text-muted-foreground">
                  Entre passar o cartão e ver "Aprovado", a transação viaja por 4 instituições em segundos.
                </p>
              </div>
              
              <div className="relative bg-card p-8 rounded-2xl shadow-lg border border-border overflow-hidden">
                {/* Linha de Conexão de Fundo */}
                <div className="absolute top-1/2 left-10 right-10 h-1 bg-muted -translate-y-1/2 z-0" />
                
                <div className="relative z-10 flex justify-between items-start gap-2">
                  {/* 1. Lojista */}
                  <motion.div 
                    className="flex flex-col items-center w-1/5"
                    animate={processingStage >= 6 ? { scale: 1.1 } : {}}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center border-4 bg-card z-10 transition-all duration-300",
                      processingStage >= 6 ? 'border-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 'border-border'
                    )}>
                      {processingStage >= 6 ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <Smartphone className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">1. Lojista</p>
                    <p className="text-[10px] text-muted-foreground/70">Maquininha</p>
                  </motion.div>
                  
                  {/* 2. Adquirente */}
                  <div className="flex flex-col items-center w-1/5">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center border-4 bg-card z-10 transition-all duration-300",
                      (processingStage === 2 || processingStage === 5) ? 'border-emerald-500 bg-emerald-500/10' : 'border-border'
                    )}>
                      <Server className={cn(
                        "w-8 h-8",
                        (processingStage === 2 || processingStage === 5) ? 'text-emerald-600' : 'text-muted-foreground/50'
                      )} />
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">
                      2. <GlossaryTooltip term="adquirente">Adquirente</GlossaryTooltip>
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">Stone, Cielo...</p>
                  </div>
                  
                  {/* 3. Bandeira */}
                  <div className="flex flex-col items-center w-1/5">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center border-4 bg-card z-10 transition-all duration-300",
                      (processingStage === 3 || processingStage === 5) ? 'border-orange-500 bg-orange-500/10' : 'border-border'
                    )}>
                      <Globe className={cn(
                        "w-8 h-8",
                        (processingStage === 3 || processingStage === 5) ? 'text-orange-500' : 'text-muted-foreground/50'
                      )} />
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">
                      3. <GlossaryTooltip term="bandeira">Bandeira</GlossaryTooltip>
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">Visa, Master...</p>
                  </div>
                  
                  {/* 4. Banco Emissor */}
                  <div className="flex flex-col items-center w-1/5">
                    <motion.div 
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center border-4 bg-card z-10 transition-all duration-300",
                        processingStage === 4 ? 'border-purple-600 bg-purple-500/10 shadow-lg' : 'border-border'
                      )}
                      animate={processingStage === 4 ? { scale: 1.1 } : { scale: 1 }}
                    >
                      <Landmark className={cn(
                        "w-8 h-8",
                        processingStage === 4 ? 'text-purple-600' : 'text-muted-foreground/50'
                      )} />
                    </motion.div>
                    <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">
                      4. <GlossaryTooltip term="emissor">Emissor</GlossaryTooltip>
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">Nubank, Itaú...</p>
                  </div>
                </div>
                
                {/* Feedback Dinâmico */}
                <div className="mt-8 text-center h-8">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={processingStage}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        processingStage === 6 && "bg-emerald-100 dark:bg-emerald-500/20 px-4 py-1 rounded-full"
                      )}
                    >
                      {processingStage === 0 && <span className="text-muted-foreground animate-pulse">Aguardando processamento...</span>}
                      {processingStage === 1 && <span className="text-blue-600 dark:text-blue-400 font-bold">Enviando dados criptografados... <Lock className="inline w-4 h-4"/></span>}
                      {processingStage === 2 && <span className="text-muted-foreground">Adquirente recebe e repassa...</span>}
                      {processingStage === 3 && <span className="text-orange-600 dark:text-orange-400">Bandeira identifica o banco...</span>}
                      {processingStage === 4 && <span className="text-purple-600 dark:text-purple-400 font-bold">Banco verifica saldo e aprova!</span>}
                      {processingStage === 5 && <span className="text-emerald-600 dark:text-emerald-400">Confirmação retornando...</span>}
                      {processingStage === 6 && <span className="text-emerald-700 dark:text-emerald-400 font-bold">COMPRA APROVADA</span>}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Botão de Ação */}
              <div className="flex justify-center gap-4">
                {processingStage === 0 && (
                  <Button onClick={startProcessingAnimation} size="lg" className="gap-2">
                    <Play className="w-4 h-4" />
                    Processar Pagamento
                  </Button>
                )}
                {processingStage > 0 && processingStage < 6 && (
                  <div className="text-muted-foreground text-sm flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Processando transação...
                  </div>
                )}
                {processingStage === 6 && (
                  <Button onClick={resetProcessingAnimation} variant="outline" className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Ver Novamente
                  </Button>
                )}
              </div>

              {processingStage >= 6 && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Aprovado! Avance para ver o cronograma de recebimentos.</span>
                </div>
              )}
            </motion.div>
          )}

          {/* ========== PASSO 6: CRONOGRAMA E PROBLEMA ========== */}
          {step === 6 && (
            <motion.div
              key="step-6"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Passo 5: Cronograma de Recebimentos
                </h3>
                <p className="text-muted-foreground">
                  O lojista vendeu R$ {saleAmount.toFixed(2)} em 5x. Após o{' '}
                  <GlossaryTooltip term="mdr">MDR</GlossaryTooltip> (2,5%), cada parcela líquida é de{' '}
                  <strong>R$ {netInstallment.toFixed(2)}</strong>.
                </p>
              </div>

              {/* Timeline Visual - sempre visível */}
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Linha do tempo de recebimentos</span>
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
                    Total: R$ {totalReceivable.toFixed(2)}
                  </span>
                </div>

                {/* Barra de Timeline */}
                <div className="relative">
                  <div className="h-2 bg-muted rounded-full" />
                  <div className="absolute top-0 left-0 w-full flex justify-between">
                    {[
                      { day: 'Hoje', value: 0 },
                      { day: '30d', value: netInstallment, hasDebit: true },
                      { day: '60d', value: netInstallment },
                      { day: '90d', value: netInstallment },
                      { day: '120d', value: netInstallment },
                      { day: '150d', value: netInstallment }
                    ].map((item, idx) => {
                      // In stage 1+, dim all points except 30d (idx === 1)
                      const isDimmed = celebrationStage >= 1 && idx !== 1;
                      const is30d = idx === 1;
                      
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: isDimmed ? 0.4 : 1, y: 0 }}
                          transition={{ delay: idx * 0.12, duration: 0.3 }}
                          className="flex flex-col items-center -mt-1"
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 bg-card transition-all duration-300",
                            isDimmed 
                              ? "border-muted-foreground/30" 
                              : idx === 0 
                                ? "border-muted-foreground" 
                                : is30d 
                                  ? "border-amber-500" 
                                  : "border-emerald-500"
                          )} />
                          <span className={cn(
                            "text-xs font-medium mt-2 transition-colors duration-300",
                            isDimmed ? "text-muted-foreground/40" : "text-muted-foreground"
                          )}>
                            {item.day}
                          </span>
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: isDimmed ? 0.4 : 1, scale: 1 }}
                            transition={{ delay: idx * 0.12 + 0.2, duration: 0.3 }}
                            className={cn(
                              "text-sm font-bold mt-1 transition-colors duration-300",
                              isDimmed
                                ? "text-muted-foreground/40"
                                : idx === 0 
                                  ? "text-muted-foreground" 
                                  : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {idx === 0 ? 'R$ 0,00' : `+R$ ${item.value.toFixed(2).replace('.', ',')}`}
                          </motion.span>
                          {item.hasDebit && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.8 }}
                              className="text-sm font-bold text-red-600 dark:text-red-400"
                            >
                              -R$ {supplierCost.toFixed(2).replace('.', ',')}
                            </motion.span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Legenda */}
                <div className="mt-16 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs">Recebimentos</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs">Débito fornecedor (30d)</span>
                    </div>
                  </div>
                  {celebrationStage >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1 text-amber-600 dark:text-amber-500 font-medium"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs">Atenção ao dia 30!</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Fase 0: Botão "Analisar cenário no dia 30" */}
              {celebrationStage === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="flex justify-center"
                >
                  <Button 
                    onClick={() => setCelebrationStage(1)}
                    variant="outline" 
                    className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-500/10"
                  >
                    <Rewind className="w-4 h-4" />
                    Analisar cenário no dia 30
                  </Button>
                </motion.div>
              )}

              {/* Fase 1: Botão "Detalhar o problema" (transição visual) */}
              {celebrationStage === 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <Button 
                    onClick={() => setCelebrationStage(2)}
                    className="gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-base"
                    size="lg"
                  >
                    Detalhar o problema
                  </Button>
                </motion.div>
              )}

              {/* Fase 2+: Cards de "Situação no Dia 30" */}
              {celebrationStage >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Título da situação */}
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Situação no Dia 30</span>
                  </div>

                  {/* Cards lado a lado */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Recebe do consumidor</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        +R$ {netInstallment.toFixed(2).replace('.', ',')}
                      </p>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-medium text-red-700 dark:text-red-400">Paga ao fornecedor</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                        -R$ {supplierCost.toFixed(2).replace('.', ',')}
                      </p>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-red-100 dark:bg-red-500/20 border-2 border-red-500 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-700 dark:text-red-400">Saldo no Caixa</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 text-center">
                        -R$ {(supplierCost - netInstallment).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-[10px] text-muted-foreground text-center mt-1">
                        O lojista não tem como pagar o fornecedor!
                      </p>
                    </motion.div>
                  </div>

                  {/* Explicação do descasamento - sempre visível na fase 2+ */}
                  <ExplanatoryNote type="warning" title="Descasamento de Caixa">
                    <p>
                      No dia 30, o lojista recebe apenas a <strong>1ª parcela</strong> (R$ {netInstallment.toFixed(2)}), 
                      mas precisa pagar <strong>100% do fornecedor</strong> (R$ {supplierCost.toFixed(2)}).
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      As outras 4 parcelas (R$ {(netInstallment * 4).toFixed(2)}) só chegarão nos meses seguintes. 
                      Esse é o famoso <GlossaryTooltip term="descasamento">descasamento de caixa</GlossaryTooltip>.
                    </p>
                  </ExplanatoryNote>

                  {/* Botão único para ver a solução */}
                  {celebrationStage === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex justify-center pt-2"
                    >
                      <Button 
                        onClick={() => setCelebrationStage(3)}
                        className="gap-2 bg-primary hover:bg-primary/90"
                        size="lg"
                      >
                        <Zap className="w-4 h-4" />
                        Ver a solução
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Fase 3: Solução revelada */}
              {celebrationStage >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <ExplanatoryNote type="tip" title="A Solução: Antecipação de Recebíveis">
                    <p>
                      Em vez de buscar empréstimo ou cheque especial, o lojista pode{' '}
                      <GlossaryTooltip term="rav">antecipar os recebíveis</GlossaryTooltip> com a financeira!
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      A financeira paga hoje o valor das parcelas futuras, cobrando uma taxa. 
                      Assim o lojista paga o fornecedor sem ficar no vermelho.
                    </p>
                  </ExplanatoryNote>

                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Avance para ver a antecipação em ação!</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}


          {/* ========== PASSO 7: A SOLUÇÃO - ANTECIPAÇÃO ========== */}
          {step === 7 && (
            <motion.div
              key="step-7"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-3 sm:space-y-4"
            >
              {/* Header compacto */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 shrink-0" />
                    <span className="truncate">Passo 6: A Solução - <GlossaryTooltip term="rav">Antecipação (RAV)</GlossaryTooltip></span>
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Traga o dinheiro futuro para hoje, pagando uma{' '}
                    <GlossaryTooltip term="taxaAntecipacao">taxa de antecipação</GlossaryTooltip>.
                  </p>
                </div>
              </div>

              {/* Nota explicativa sobre MDR - mais compacta */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CreditCard className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    Parcela R$ 20,00 − 2,5% <GlossaryTooltip term="mdr">MDR</GlossaryTooltip> = <strong className="text-emerald-600">R$ {netInstallment.toFixed(2).replace('.', ',')}</strong>
                  </span>
                </div>
              </div>

              {/* Narrativa da Animação */}
              <div className="text-center text-xs sm:text-sm text-muted-foreground h-5">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={anticipationPhase}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={cn(
                      anticipationPhase === 5 && "font-bold text-emerald-600"
                    )}
                  >
                    {anticipationPhase === 0 && "Parcelas a receber no tempo (já líquidas de MDR)"}
                    {anticipationPhase === 1 && "Trazendo parcelas para o valor presente..."}
                    {anticipationPhase === 2 && "Parcelas no caixa hoje!"}
                    {anticipationPhase === 3 && "Somando o valor bruto total..."}
                    {anticipationPhase === 4 && "Aplicando taxa de 15%..."}
                    {anticipationPhase === 5 && "Valor Líquido no Caixa!"}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Área de Animação do Gráfico - altura reduzida */}
              <div className="relative bg-muted/30 rounded-xl p-3 sm:p-4 pb-8">
                <div className="relative">
                  <div className="relative h-32 sm:h-40 flex justify-around items-end border-b-2 border-muted-foreground/30">
                    {/* Barra "Hoje" */}
                    <div className="w-10 sm:w-14 relative flex flex-col items-center justify-end h-full">
                      {/* Barras empilhadas (fase 2) */}
                      {anticipationPhase === 2 && [1, 2, 3, 4, 5].map((m, i) => (
                        <motion.div 
                          key={m}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-full bg-emerald-500 flex items-center justify-center border-b border-emerald-400"
                          style={{ height: '24px' }}
                        >
                          <span className="text-white text-[8px] sm:text-[9px] font-bold">R$ {netInstallment.toFixed(2).replace('.', ',')}</span>
                        </motion.div>
                      ))}
                      
                      {/* Barra unificada (fase 3) */}
                      {anticipationPhase === 3 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full bg-blue-500 rounded-t-lg flex items-center justify-center"
                          style={{ height: '120px' }}
                        >
                          <span className="text-white text-[10px] sm:text-xs font-bold">R$ {totalReceivable.toFixed(2)}</span>
                        </motion.div>
                      )}
                      
                      {/* Barra com taxa (fase 4+) */}
                      {anticipationPhase >= 4 && (
                        <div className="w-full flex flex-col">
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full bg-red-500 rounded-t-lg flex items-center justify-center relative"
                            style={{ height: '18px' }}
                          >
                            <span className="text-white text-[8px] font-bold">-15%</span>
                            <div className="absolute -right-20 sm:-right-24 top-1/2 -translate-y-1/2 text-right whitespace-nowrap">
                              <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                                -R$ {anticipationCost.toFixed(2)}
                              </p>
                            </div>
                          </motion.div>
                          <div 
                            className="w-full bg-emerald-500 flex items-center justify-center"
                            style={{ height: '102px' }}
                          >
                            {anticipationPhase >= 5 && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center"
                              >
                                <span className="text-white text-[8px] block">Líquido</span>
                                <span className="text-white text-[10px] sm:text-xs font-bold">R$ {finalNetValue.toFixed(2)}</span>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Barras das Parcelas Futuras */}
                    {[30, 60, 90, 120, 150].map((dia, i) => (
                      <div key={dia} className="w-10 sm:w-14 relative flex items-end justify-center h-full">
                        <motion.div 
                          className="w-full bg-emerald-500 rounded-t-lg flex items-center justify-center"
                          animate={{
                            height: anticipationPhase >= 2 ? 0 : 24,
                            opacity: anticipationPhase >= 1 ? (anticipationPhase >= 2 ? 0 : 0.6) : 1
                          }}
                          transition={{ delay: anticipationPhase === 1 ? i * 0.08 : 0 }}
                        >
                          {anticipationPhase < 2 && (
                            <span className="text-white text-[8px] sm:text-[9px] font-bold">R$ {netInstallment.toFixed(2).replace('.', ',')}</span>
                          )}
                        </motion.div>
                      </div>
                    ))}
                  </div>

                  {/* Eixo X */}
                  <div className="flex justify-around mt-1">
                    {['HOJE', '30d', '60d', '90d', '120d', '150d'].map((label, i) => (
                      <span 
                        key={label} 
                        className={cn(
                          "w-10 sm:w-14 text-center text-[9px] sm:text-xs",
                          i === 0 ? "font-bold text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legenda */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-muted-foreground">Recebível</span>
                </div>
                {anticipationPhase >= 4 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-muted-foreground">Taxa</span>
                  </motion.div>
                )}
              </div>

              {/* Botões de ação - sempre centralizados abaixo da legenda */}
              <div className="flex justify-center">
                {anticipationPhase === 0 && (
                  <Button 
                    onClick={nextAnticipationPhase} 
                    className="gap-2 bg-purple-500 hover:bg-purple-600"
                    size="lg"
                  >
                    <Zap className="w-4 h-4" />
                    Antecipar recebíveis futuros
                  </Button>
                )}
                {anticipationPhase === 1 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Movendo parcelas...</span>
                  </div>
                )}
                {anticipationPhase === 2 && (
                  <Button onClick={nextAnticipationPhase} className="gap-2 px-8" size="default">
                    <PlusCircle className="w-4 h-4" />
                    Consolidar
                  </Button>
                )}
                {anticipationPhase === 3 && (
                  <Button onClick={nextAnticipationPhase} className="gap-2 px-6 bg-red-500 hover:bg-red-600" size="default">
                    <Calculator className="w-4 h-4" />
                    Aplicar taxa de antecipação
                  </Button>
                )}
                {anticipationPhase === 4 && (
                  <Button onClick={nextAnticipationPhase} className="gap-2 px-8 bg-emerald-500 hover:bg-emerald-600" size="default">
                    <Eye className="w-4 h-4" />
                    Ver Resultado
                  </Button>
                )}
                {anticipationPhase >= 5 && (
                  <Button onClick={() => setAnticipationPhase(0)} variant="outline" className="gap-2">
                    <Rewind className="w-4 h-4" />
                    Repetir
                  </Button>
                )}
              </div>

              {/* Resultado - compacto */}
              {anticipationPhase >= 5 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-lg p-3 border border-emerald-500/30"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-muted-foreground">Bruto: </span>
                        <span className="font-medium">R$ {totalReceivable.toFixed(2)}</span>
                      </div>
                      <div className="text-red-600">
                        <span>− R$ {anticipationCost.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-500/20 rounded-lg px-3 py-1.5 border border-emerald-500">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-600 text-sm sm:text-base">R$ {finalNetValue.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    * Valor já descontado MDR (2,5%) e taxa de antecipação (15%)
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ========== PASSO 8: RESULTADO FINAL ========== */}
          {step === 8 && (
            <motion.div
              key="step-8"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                  🎉 Passo 7: Resultado Final
                </h3>
                <p className="text-muted-foreground">
                  Comparação entre o cenário com e sem antecipação de recebíveis.
                </p>
              </div>

              {/* Cards de Comparação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                {/* Sem Antecipação */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-5 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <h4 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Sem Antecipação
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recebe no Dia 30:</span>
                      <span className="font-medium">R$ {netInstallment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paga Fornecedor:</span>
                      <span className="font-medium text-red-600">-R$ {supplierCost.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-red-500/30 pt-3">
                      <div className="flex justify-between">
                        <span className="font-semibold">Saldo Dia 30:</span>
                        <span className="font-bold text-red-600 text-lg">-R$ {(supplierCost - netInstallment).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/20 mt-2">
                      <p className="text-xs text-red-600 font-medium">
                        ❌ Precisa de empréstimo para cobrir o caixa negativo
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Com Antecipação */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
                >
                  <h4 className="font-bold text-emerald-600 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Com Antecipação
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recebe Hoje:</span>
                      <span className="font-medium text-emerald-600">R$ {finalNetValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paga Fornecedor:</span>
                      <span className="font-medium text-red-600">-R$ {supplierCost.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-emerald-500/30 pt-3">
                      <div className="flex justify-between">
                        <span className="font-semibold">Saldo:</span>
                        <span className="font-bold text-emerald-600 text-lg">+R$ {(finalNetValue - supplierCost).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/20 mt-2">
                      <p className="text-xs text-emerald-600 font-medium">
                        ✅ Caixa positivo, sem necessidade de empréstimo
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Resumo Final */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-5 rounded-xl bg-muted/50 border border-border"
              >
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Resumo da Operação
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">Valor da venda</p>
                    <p className="font-bold text-foreground">R$ {saleAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">Custo fornecedor</p>
                    <p className="font-bold text-foreground">R$ {supplierCost.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">Taxas (MDR + RAV)</p>
                    <p className="font-bold text-red-600">-R$ {(saleAmount - finalNetValue).toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-500/20 border-2 border-emerald-500">
                    <p className="text-[10px] text-muted-foreground mb-1">Lucro bruto</p>
                    <p className="font-bold text-emerald-600">R$ {(finalNetValue - supplierCost).toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>

              {/* Call to Action Final */}
              <ExplanatoryNote type="tip" title="Conclusão">
                A <GlossaryTooltip term="rav">antecipação de recebíveis</GlossaryTooltip> é uma ferramenta 
                poderosa para resolver o <GlossaryTooltip term="descasamento">descasamento de caixa</GlossaryTooltip>.
                Embora tenha um custo (a <GlossaryTooltip term="taxaAntecipacao">taxa de antecipação</GlossaryTooltip>), 
                ela pode ser mais barata que um empréstimo bancário e mantém a saúde financeira do negócio.
              </ExplanatoryNote>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={resetSimulation} 
                  className="gap-2 w-full sm:w-auto" 
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar Simulação
                </Button>
                {onClose && (
                  <Button 
                    onClick={onClose} 
                    className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90" 
                    size="lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Concluir e Fechar
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER DE NAVEGAÇÃO */}
      <div className="bg-card/80 backdrop-blur-sm border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.03)] sticky bottom-0 z-20">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={step === 1}
            className="gap-2 min-w-[100px] sm:min-w-[120px]"
            size="default"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          
          {/* Indicador de progresso central - Mobile */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-16 sm:w-24 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
              <span className="font-medium tabular-nums">{step}/{totalSteps}</span>
            </div>
          </div>
          
          {step < totalSteps ? (
            <Button 
              onClick={nextStep} 
              disabled={!canProceed()}
              className="gap-2 min-w-[100px] sm:min-w-[120px]"
              size="default"
            >
              <span className="hidden sm:inline">Próximo</span>
              <span className="sm:hidden">Avançar</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : onClose ? (
            <Button 
              onClick={onClose} 
              className="gap-2 min-w-[100px] sm:min-w-[140px] bg-primary hover:bg-primary/90" 
              size="default"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Concluir</span>
              <span className="sm:hidden">Fechar</span>
            </Button>
          ) : (
            <Button onClick={resetSimulation} className="gap-2 min-w-[100px] sm:min-w-[120px]" size="default">
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Recomeçar</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnticipationWizard;
