import React, { useState, useCallback, useRef } from 'react';
import { LayoutDashboard, Car, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OnboardingSlide {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: LayoutDashboard,
    title: 'Controle total das suas finanças',
    description:
      'Acompanhe receitas, despesas e investimentos em um só lugar.',
  },
  {
    icon: Car,
    title: 'Consulte FIPE e simule financiamentos',
    description:
      'Descubra o valor real do seu veículo e planeje a compra com inteligência.',
  },
  {
    icon: Zap,
    title: 'Conecte seus bancos automaticamente',
    description:
      'Importe transações e mantenha tudo atualizado sem esforço.',
  },
];

export interface OnboardingScreenProps {
  onComplete: () => void;
  className?: string;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  className,
}) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }, [index, onComplete]);

  const handlePular = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipe = 50;
    if (diff > minSwipe && index < SLIDES.length - 1) {
      setIndex((i) => i + 1);
    } else if (diff < -minSwipe && index > 0) {
      setIndex((i) => i - 1);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  }, [index]);

  const isLast = index === SLIDES.length - 1;

  return (
    <div
      className={cn(
        'min-h-screen w-full bg-background flex flex-col overflow-hidden',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pular — canto superior direito, slides 1 e 2 */}
      {!isLast && (
        <div className="flex justify-end p-4 absolute top-0 right-0 z-10">
          <button
            type="button"
            onClick={handlePular}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular
          </button>
        </div>
      )}

      {/* Conteúdo central — strip de 3 slides com transição horizontal */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 overflow-hidden w-full">
        <div className="w-full overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              width: `${SLIDES.length * 100}%`,
              transform: `translateX(-${(index / SLIDES.length) * 100}%)`,
            }}
          >
            {SLIDES.map((s, i) => {
              const SlideIcon = s.icon;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center flex-shrink-0 px-2"
                  style={{ width: `${100 / SLIDES.length}%` }}
                >
                  <div className="bg-primary/10 rounded-full p-8 mb-8">
                    <SlideIcon className="w-12 h-12 text-primary" />
                  </div>
                  <h1 className="font-syne font-extrabold text-3xl text-foreground text-center mb-3">
                    {s.title}
                  </h1>
                  <p className="text-muted-foreground text-center text-base max-w-xs mx-auto">
                    {s.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              i === index ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Botão principal */}
      <div className="px-6 pb-10 pt-2 w-full max-w-sm mx-auto">
        <button
          type="button"
          onClick={goNext}
          className="w-full min-h-[52px] bg-primary text-primary-foreground font-syne font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          {isLast ? 'Começar' : 'Próximo'}
        </button>
      </div>
    </div>
  );
};
