import React, { useRef, useState, useEffect } from 'react';

/**
 * Hook que detecta quando um elemento entra na viewport via IntersectionObserver.
 * @param threshold - Fração do elemento visível para considerar "in view". Padrão: 0.05.
 * @returns Tupla [ref, isInView]. Anexe ref ao elemento a observar.
 */
export function useInView(threshold = 0.05): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // dispara só uma vez
        }
      },
      {
        threshold,
        rootMargin: '0px 0px 0px 0px', // removido o -80px que bloqueava a detecção
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isInView];
}
