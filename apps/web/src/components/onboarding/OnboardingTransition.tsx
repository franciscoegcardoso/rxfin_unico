import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface OnboardingTransitionProps {
  /** Fase que acabou de ser concluída */
  completedPhase: 'block_a' | 'block_b' | 'block_c';
  /** Callback chamado quando a transição termina (auto após delay ou ao clicar) */
  onDone: () => void;
}

const TRANSITION_CONTENT = {
  block_a: {
    completedTitle: 'Perfil identificado!',
    completedSubtitle: 'Agora sabemos quem você é financeiramente.',
    processingLines: [
      'Preparando sua área bancária...',
      'Carregando instituições disponíveis...',
      'Configurando conexão segura...',
    ],
    nextTitle: 'Próximo: conectar seus bancos',
    nextDescription:
      'Vamos buscar seus dados reais diretamente nas suas instituições financeiras. ' +
      'Você vai escolher os bancos que usa e como prefere conectá-los.',
    durationMs: 2800,
  },
  block_b: {
    completedTitle: 'Bancos conectados!',
    completedSubtitle: 'Seus dados financeiros foram importados com sucesso.',
    processingLines: [
      'A IA está lendo seus lançamentos...',
      'Identificando receitas e fontes de renda...',
      'Categorizando despesas automaticamente...',
      'Calculando sua identidade financeira...',
    ],
    nextTitle: 'Próximo: validar o diagnóstico',
    nextDescription:
      'A IA já categorizou tudo. Agora você só precisa confirmar se as sugestões ' +
      'estão corretas — ou ajustar o que precisar. Leva menos de 2 minutos.',
    durationMs: 3500,
  },
  block_c: {
    completedTitle: 'Identidade Financeira completa!',
    completedSubtitle: 'Receitas e despesas mapeadas com dados reais.',
    processingLines: [
      'Calculando seu patrimônio líquido...',
      'Buscando dados de bens e investimentos...',
      'Preparando importação do Imposto de Renda...',
    ],
    nextTitle: 'Próximo: patrimônio e planejamento',
    nextDescription:
      'Vamos mapear tudo que você tem e deve — imóveis, veículos, investimentos, ' +
      'dívidas e seguros. Usando sua declaração de IR como ponto de partida.',
    durationMs: 2800,
  },
};

export const OnboardingTransition: React.FC<OnboardingTransitionProps> = ({
  completedPhase,
  onDone,
}) => {
  const content = TRANSITION_CONTENT[completedPhase];
  const [lineIndex, setLineIndex] = useState(0);
  const [showNext, setShowNext] = useState(false);

  // Ciclar pelas linhas de processamento
  useEffect(() => {
    const intervalMs = content.durationMs / content.processingLines.length;
    const interval = setInterval(() => {
      setLineIndex((prev) => {
        if (prev < content.processingLines.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [completedPhase, content.durationMs, content.processingLines.length]);

  // Mostrar o "próximo" após as linhas terminarem
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNext(true);
    }, content.durationMs - 400);
    return () => clearTimeout(timer);
  }, [content.durationMs]);

  // Auto-avançar após mostrar "próximo" (ref evita reinício do timer quando onDone muda)
  useEffect(() => {
    if (!showNext) return;
    const timer = setTimeout(() => onDoneRef.current?.(), 1800);
    return () => clearTimeout(timer);
  }, [showNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6"
    >
      {/* Completed badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col items-center gap-3 mb-10"
      >
        <div className="relative">
          {/* Logo animada */}
          <RXFinLoadingSpinner size={72} variant="inline" />
          {/* Check overlay quando showNext */}
          <AnimatePresence>
            {showNext && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-full h-full rounded-full bg-background/80 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{content.completedTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{content.completedSubtitle}</p>
        </div>
      </motion.div>

      {/* Processing lines */}
      <AnimatePresence mode="wait">
        {!showNext && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-3 mb-8"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={lineIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-muted-foreground text-center"
              >
                {content.processingLines[lineIndex]}
              </motion.p>
            </AnimatePresence>
            {/* Progress bar */}
            <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: content.durationMs / 1000 - 0.3, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next block preview */}
      <AnimatePresence>
        {showNext && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-sm w-full bg-card border border-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground">{content.nextTitle}</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {content.nextDescription}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
