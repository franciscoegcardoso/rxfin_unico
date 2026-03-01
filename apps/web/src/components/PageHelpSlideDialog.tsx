import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { SwipeHint } from '@/components/shared/SwipeHint';

export interface SlideContent {
  type: 'hero' | 'feature' | 'steps' | 'chart' | 'comparison' | 'conclusion';
  badge?: {
    text: string;
    variant: 'primary' | 'success' | 'warning' | 'danger';
  };
  title: string;
  subtitle?: string;
  content?: string;
  icon?: React.ReactNode;
  features?: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
  quote?: string;
  bulletPoints?: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
  visualElement?: React.ReactNode;
}

export interface PageHelpSlideContent {
  title: string;
  slides: SlideContent[];
  icon?: React.ReactNode;
  accentColor?: string;
}

interface PageHelpSlideDialogProps {
  content: PageHelpSlideContent;
  className?: string;
  variant?: 'icon' | 'button';
}

const badgeVariants = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

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

const HeroSlide: React.FC<{ slide: SlideContent }> = ({ slide }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4">
    {slide.icon && (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6"
      >
        {slide.icon}
      </motion.div>
    )}
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
      className="text-muted-foreground text-lg max-w-md"
    >
      {slide.content}
    </motion.p>
  </div>
);

const FeatureSlide: React.FC<{ slide: SlideContent }> = ({ slide }) => (
  <div className="flex flex-col h-full px-4">
    {slide.badge && (
      <motion.span
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-4",
          badgeVariants[slide.badge.variant]
        )}
      >
        {slide.badge.text}
      </motion.span>
    )}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="border-l-4 border-primary pl-4 mb-4"
    >
      <h3 className="text-xl font-bold text-foreground">{slide.title}</h3>
    </motion.div>
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-muted-foreground mb-6"
    >
      {slide.content}
    </motion.p>
    
    {slide.visualElement && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-muted/50 rounded-xl p-4 border"
      >
        {slide.visualElement}
      </motion.div>
    )}

    {slide.quote && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-auto pt-4 text-sm italic text-muted-foreground border-l-2 border-primary/50 pl-4"
      >
        "{slide.quote}"
      </motion.p>
    )}
  </div>
);

const StepsSlide: React.FC<{ slide: SlideContent }> = ({ slide }) => (
  <div className="flex flex-col h-full px-4">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-l-4 border-primary pl-4 mb-6"
    >
      <h3 className="text-xl font-bold text-foreground">{slide.title}</h3>
    </motion.div>

    <div className="grid gap-4">
      {slide.features?.map((feature, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + index * 0.1 }}
          className="flex gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {feature.icon}
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        </motion.div>
      ))}
    </div>

    {slide.quote && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-auto pt-4 text-sm italic text-muted-foreground border-l-2 border-primary/50 pl-4"
      >
        "{slide.quote}"
      </motion.p>
    )}
  </div>
);

const ComparisonSlide: React.FC<{ slide: SlideContent }> = ({ slide }) => (
  <div className="flex flex-col h-full px-4">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-l-4 border-primary pl-4 mb-4"
    >
      <h3 className="text-xl font-bold text-foreground">{slide.title}</h3>
    </motion.div>
    
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
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
  </div>
);

const ConclusionSlide: React.FC<{ slide: SlideContent }> = ({ slide }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 bg-gradient-to-br from-primary/5 to-primary/10 -m-6 p-6 rounded-lg">
    {slide.icon && (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-6"
      >
        {slide.icon}
      </motion.div>
    )}
    <motion.h2
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-2xl font-bold text-foreground mb-4"
    >
      {slide.title}
    </motion.h2>
    <motion.p
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-muted-foreground max-w-sm"
    >
      {slide.content}
    </motion.p>
  </div>
);

const SlideRenderer: React.FC<{ slide: SlideContent }> = ({ slide }) => {
  switch (slide.type) {
    case 'hero':
      return <HeroSlide slide={slide} />;
    case 'feature':
      return <FeatureSlide slide={slide} />;
    case 'steps':
      return <StepsSlide slide={slide} />;
    case 'comparison':
      return <ComparisonSlide slide={slide} />;
    case 'conclusion':
      return <ConclusionSlide slide={slide} />;
    default:
      return <FeatureSlide slide={slide} />;
  }
};

export const PageHelpSlideDialog: React.FC<PageHelpSlideDialogProps> = ({ 
  content, 
  className,
  variant = 'icon' 
}) => {
  const [open, setOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const paginate = useCallback((newDirection: number) => {
    setCurrentSlide(prev => {
      const newSlide = prev + newDirection;
      if (newSlide >= 0 && newSlide < content.slides.length) {
        setPage([newSlide, newDirection]);
        return newSlide;
      }
      return prev;
    });
  }, [content.slides.length]);

  const { handlers, hasSwiped } = useSwipeNavigation({
    onSwipeLeft: () => paginate(1),
    onSwipeRight: () => paginate(-1),
    threshold: 50
  });

  // Hide swipe hint after first swipe
  React.useEffect(() => {
    if (hasSwiped) {
      setShowSwipeHint(false);
    }
  }, [hasSwiped]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10",
              className
            )}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
          >
            <HelpCircle className="h-4 w-4" />
            Ajuda
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden" hideCloseButton>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {content.icon && (
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {content.icon}
              </div>
            )}
            <h2 className="text-lg font-semibold text-foreground">{content.title}</h2>
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
          className="relative h-[400px] overflow-hidden touch-pan-y"
          {...handlers}
        >
          {/* Swipe Hint Overlay */}
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
              <SlideRenderer slide={content.slides[currentSlide]} />
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

          {/* Dots */}
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
            variant={currentSlide === content.slides.length - 1 ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              if (currentSlide === content.slides.length - 1) {
                handleOpenChange(false);
              } else {
                paginate(1);
              }
            }}
            className="gap-2"
          >
            {currentSlide === content.slides.length - 1 ? 'Concluir' : 'Próximo'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
