import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, X, Rocket, Gift, UserPlus, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { SwipeHint } from '@/components/shared/SwipeHint';
import { trackSlideNavigation, trackSignUpIntent } from '@/lib/tracking';

export interface FeatureSlide {
  type: 'intro' | 'feature' | 'benefit' | 'cta';
  title: string;
  subtitle?: string;
  content?: string;
  icon?: React.ReactNode;
  bulletPoints?: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
  visualElement?: React.ReactNode;
}

export interface FeaturePreviewContent {
  featureName: string;
  featureIcon: React.ReactNode;
  slides: FeatureSlide[];
}

interface FeaturePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: FeaturePreviewContent;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0
  })
};

const IntroSlide: React.FC<{ slide: FeatureSlide; featureIcon: React.ReactNode }> = ({ slide, featureIcon }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
      className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6"
    >
      {featureIcon}
    </motion.div>
    <motion.h2
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-2xl sm:text-3xl font-bold text-foreground mb-4"
    >
      {slide.title}
    </motion.h2>
    <motion.p
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-muted-foreground text-base max-w-md"
    >
      {slide.content}
    </motion.p>
  </div>
);

const FeatureSlideComponent: React.FC<{ slide: FeatureSlide }> = ({ slide }) => (
  <div className="flex flex-col h-full px-4">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-l-4 border-primary pl-4 mb-4"
    >
      <h3 className="text-xl font-bold text-foreground">{slide.title}</h3>
      {slide.subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{slide.subtitle}</p>
      )}
    </motion.div>
    
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="text-muted-foreground mb-6"
    >
      {slide.content}
    </motion.p>

    {slide.bulletPoints && (
      <div className="space-y-3">
        {slide.bulletPoints.map((point, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {point.icon}
            </div>
            <span className="text-sm text-foreground">{point.text}</span>
          </motion.div>
        ))}
      </div>
    )}

    {slide.visualElement && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 bg-muted/50 rounded-xl p-4 border"
      >
        {slide.visualElement}
      </motion.div>
    )}

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="mt-auto pt-4"
    >
      <a href="https://app.rxfin.com.br/auth" target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/5">
          <UserPlus className="h-3 w-3 mr-2" />
          Criar conta grátis para ter acesso
        </Button>
      </a>
    </motion.div>
  </div>
);

const CTASlide: React.FC<{ slide: FeatureSlide; onClose: () => void }> = ({ slide, onClose }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 bg-gradient-to-br from-primary/5 to-primary/10 -m-6 p-6 rounded-lg">
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
      className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-6"
    >
      <Gift className="h-8 w-8" />
    </motion.div>
    
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">
        <Sparkles className="h-3 w-3 mr-1" />
        Oferta Exclusiva - Primeiros 1.000 cadastros
      </Badge>
    </motion.div>
    
    <motion.h2
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-2xl font-bold text-foreground mb-3"
    >
      {slide.title}
    </motion.h2>
    
    <motion.p
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-muted-foreground max-w-sm mb-6"
    >
      {slide.content}
    </motion.p>

    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="space-y-3 w-full max-w-xs"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span>Acesso vitalício aos simuladores gratuitos</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span>Novos módulos em primeira mão</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span>Sem compromisso, cancele quando quiser</span>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="mt-6 w-full max-w-xs"
    >
      <a href="https://app.rxfin.com.br/auth" target="_blank" rel="noopener noreferrer" onClick={() => { trackSignUpIntent('dialog_cta'); onClose(); }}>
        <Button className="w-full gradient-primary text-white" size="lg">
          <UserPlus className="h-4 w-4 mr-2" />
          Criar Minha Conta Grátis
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </a>
      <p className="mt-3 text-xs text-muted-foreground">
        Cadastro rápido em menos de 1 minuto
      </p>
    </motion.div>
  </div>
);

const SlideRenderer: React.FC<{ 
  slide: FeatureSlide; 
  featureIcon: React.ReactNode;
  onClose: () => void;
}> = ({ slide, featureIcon, onClose }) => {
  switch (slide.type) {
    case 'intro':
      return <IntroSlide slide={slide} featureIcon={featureIcon} />;
    case 'feature':
    case 'benefit':
      return <FeatureSlideComponent slide={slide} />;
    case 'cta':
      return <CTASlide slide={slide} onClose={onClose} />;
    default:
      return <FeatureSlideComponent slide={slide} />;
  }
};

export const FeaturePreviewDialog: React.FC<FeaturePreviewDialogProps> = ({ 
  open, 
  onOpenChange, 
  content 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const paginate = useCallback((newDirection: number) => {
    setCurrentSlide(prev => {
      const newSlide = prev + newDirection;
      if (newSlide >= 0 && newSlide < content.slides.length) {
        setPage([newSlide, newDirection]);
        trackSlideNavigation(content.featureName, newSlide);
        return newSlide;
      }
      return prev;
    });
  }, [content.slides.length, content.featureName]);

  const { handlers, hasSwiped } = useSwipeNavigation({
    onSwipeLeft: () => paginate(1),
    onSwipeRight: () => paginate(-1),
    threshold: 50
  });

  React.useEffect(() => {
    if (hasSwiped) {
      setShowSwipeHint(false);
    }
  }, [hasSwiped]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setCurrentSlide(0);
      setPage([0, 0]);
      setShowSwipeHint(true);
    }
  };

  const goToSlide = (index: number) => {
    const newDirection = index > currentSlide ? 1 : -1;
    setPage([index, newDirection]);
    setCurrentSlide(index);
  };

  const isLastSlide = currentSlide === content.slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden [&>button:last-child]:hidden rounded-lg sm:mx-0 sm:w-full w-[100vw] max-w-[100vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {content.featureIcon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{content.featureName}</h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Rocket className="h-3 w-3" />
                Em desenvolvimento
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Slide Content with Swipe Support */}
        <div 
          className="relative h-[320px] sm:h-[420px] overflow-hidden touch-pan-y"
          {...handlers}
        >
          <SwipeHint 
            show={open && showSwipeHint && content.slides.length > 1} 
            onDismiss={() => setShowSwipeHint(false)} 
          />

          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0 p-6"
            >
              <SlideRenderer 
                slide={content.slides[currentSlide]} 
                featureIcon={content.featureIcon}
                onClose={() => handleOpenChange(false)}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => paginate(-1)}
            disabled={currentSlide === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {content.slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  currentSlide === index
                    ? "bg-primary scale-125"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          <Button
            variant={isLastSlide ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              if (isLastSlide) {
                handleOpenChange(false);
              } else {
                paginate(1);
              }
            }}
            className="gap-2"
          >
            {isLastSlide ? 'Fechar' : 'Próximo'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
