import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DURATION_MS = 1200;

/** Ease-out: progress rápido no início, suave no fim */
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Retorna o valor atual da animação de contagem (0 → end) ao longo de durationMs com ease-out.
 * Só inicia quando start é true (ex.: quando a seção entra no viewport).
 */
function useCountUp(end: number, durationMs: number, start: boolean): number {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;
    startTimeRef.current = null;
    let rafId: number;

    const tick = (now: number) => {
      if (startTimeRef.current == null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOut(progress);
      const current = eased * end;
      setValue(current);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [end, durationMs, start]);

  return Math.round(value);
}

/** Configuração por stat: valor/label inalterados; opcional animação numérica */
const stats = [
  { value: '+300', label: 'Bancos e fintechs\nconectados', numericEnd: 300, format: (n: number) => `+${n}` },
  { value: '9', label: 'Simuladores\ndisponíveis', numericEnd: 9, format: (n: number) => `${n}` },
  { value: '1,8M+', label: 'Registros FIPE\nindexados', numericEnd: 1.8, format: (n: number) => `${n.toFixed(1).replace('.', ',')}M+` },
  { value: '100%', label: 'Gratuito\npara começar', numericEnd: 100, format: (n: number) => `${n}%` },
  { value: 'IA', label: 'Insights sobre\nsua vida financeira' as const },
] as const;

type StatItem = (typeof stats)[number];
function isNumericStat(stat: StatItem): stat is StatItem & { numericEnd: number; format: (n: number) => string } {
  return 'numericEnd' in stat && typeof stat.numericEnd === 'number';
}

export const SocialProofBar: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold: 0.2, rootMargin: '0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: i * 0.06, ease: 'easeOut' as const },
    }),
  };

  return (
    <div
      ref={sectionRef}
      className="border-y border-border bg-background py-6 sm:py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto">
        {/* Desktop e tablet: linha horizontal com separadores */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          {stats.map((stat, i) => (
            <React.Fragment key={stat.value}>
              <StatCard
                stat={stat}
                index={i}
                inView={inView}
                variants={cardVariants}
                className="flex flex-col items-center gap-1 text-center flex-1"
              />
              {i < stats.length - 1 && (
                <div className="w-px h-10 bg-border shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile: grid 2 colunas + último centrado */}
        <div className="sm:hidden">
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
            {stats.slice(0, 4).map((stat, i) => (
              <StatCard
                key={stat.value}
                stat={stat}
                index={i}
                inView={inView}
                variants={cardVariants}
                className="flex flex-col items-center gap-1 text-center"
              />
            ))}
          </div>
          <motion.div
            className="flex flex-col items-center gap-1 text-center"
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={cardVariants}
            custom={4}
          >
            <span className="text-3xl font-bold text-primary tracking-tight leading-none">
              {stats[4].value}
            </span>
            <span className="text-xs text-muted-foreground leading-snug whitespace-pre-line mt-0.5">
              {stats[4].label}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  stat: (typeof stats)[number];
  index: number;
  inView: boolean;
  variants: {
    hidden: { opacity: number; y: number };
    visible: (i: number) => { opacity: number; y: number; transition: object };
  };
  className?: string;
}

function StatCard({ stat, index, inView, variants, className }: StatCardProps) {
  const isNumeric = isNumericStat(stat);
  const count = useCountUp(
    isNumeric ? stat.numericEnd : 0,
    DURATION_MS,
    inView && isNumeric
  );
  const displayValue = isNumeric ? stat.format(count) : stat.value;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      custom={index}
    >
      <span className="text-3xl lg:text-4xl font-bold text-primary tracking-tight leading-none">
        {displayValue}
      </span>
      <span className="text-xs text-muted-foreground leading-snug whitespace-pre-line mt-1 sm:mt-0.5">
        {stat.label}
      </span>
    </motion.div>
  );
}
