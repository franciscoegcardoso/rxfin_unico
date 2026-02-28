import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Package, 
  CreditCard, 
  AlertCircle, 
  Zap,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_CHAPTERS, STEP_TO_CHAPTER } from './types';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  onChapterClick?: (chapterStartStep: number) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Users: <Users className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  AlertCircle: <AlertCircle className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
};

// Mapeia capítulo para o primeiro passo daquele capítulo
const chapterToFirstStep: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 6,
  5: 7,
};

/**
 * Barra de progresso visual por capítulos
 * Mostra em qual fase do wizard o usuário está
 */
export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  onChapterClick
}) => {
  const currentChapter = STEP_TO_CHAPTER[currentStep] || 1;
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-3">
      {/* Navegação por capítulos - Desktop/Tablet */}
      <div className="hidden sm:flex items-center justify-between gap-1">
        {WIZARD_CHAPTERS.map((chapter, index) => {
          const isActive = currentChapter === chapter.id;
          const isCompleted = currentChapter > chapter.id;
          const isClickable = onChapterClick && isCompleted;
          
          return (
            <React.Fragment key={chapter.id}>
              {/* Conector entre capítulos */}
              {index > 0 && (
                <div className={cn(
                  "flex-1 h-0.5 transition-all duration-500",
                  isCompleted ? "bg-primary" : isActive ? "bg-gradient-to-r from-primary to-muted" : "bg-muted"
                )} />
              )}
              
              {/* Círculo do capítulo */}
              <button
                onClick={() => isClickable && onChapterClick(chapterToFirstStep[chapter.id])}
                disabled={!isClickable}
                className={cn(
                  "relative group flex flex-col items-center transition-all duration-300",
                  isClickable && "cursor-pointer hover:scale-105",
                  !isClickable && "cursor-default"
                )}
              >
                <motion.div
                  className={cn(
                    "w-10 h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isActive && "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110",
                    isCompleted && "border-primary bg-primary/10 text-primary",
                    !isActive && !isCompleted && "border-muted-foreground/30 bg-card text-muted-foreground/50"
                  )}
                  whileHover={isClickable ? { scale: 1.1 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    iconMap[chapter.icon]
                  )}
                </motion.div>
                
                {/* Label do capítulo */}
                <span className={cn(
                  "mt-2 text-[10px] lg:text-xs font-medium text-center leading-tight max-w-[70px] lg:max-w-20 transition-colors",
                  isActive && "text-foreground font-semibold",
                  isCompleted && "text-primary",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}>
                  {chapter.title}
                </span>

                {/* Tooltip no hover */}
                <div className={cn(
                  "absolute -bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10",
                  "bg-popover border border-border rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap"
                )}>
                  <span className="text-xs text-popover-foreground">{chapter.description}</span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Indicador compacto - Mobile */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
          <motion.div 
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            key={currentChapter}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {iconMap[WIZARD_CHAPTERS[currentChapter - 1]?.icon || 'Users']}
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {WIZARD_CHAPTERS[currentChapter - 1]?.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {WIZARD_CHAPTERS[currentChapter - 1]?.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-lg font-bold text-primary tabular-nums">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>
        
        {/* Barra de progresso mobile */}
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
};

interface MobileStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  chapterTitle: string;
}

/**
 * Indicador compacto para mobile
 */
export const MobileStepIndicator: React.FC<MobileStepIndicatorProps> = ({
  currentStep,
  totalSteps,
  chapterTitle
}) => {
  const currentChapter = STEP_TO_CHAPTER[currentStep] || 1;
  const chapter = WIZARD_CHAPTERS.find(c => c.id === currentChapter);
  
  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
          {chapter && iconMap[chapter.icon]}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{chapterTitle}</p>
          <p className="text-xs text-muted-foreground">
            Passo {currentStep} de {totalSteps}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xl font-bold text-primary tabular-nums">
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>
    </div>
  );
};
