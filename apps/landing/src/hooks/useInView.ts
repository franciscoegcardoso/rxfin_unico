import { useRef, useState, useEffect } from 'react';

/**
 * Hook que detecta quando um elemento entra na viewport via IntersectionObserver.
 * @param threshold - Fração do elemento visível para considerar "in view" (0 a 1). Padrão: 0.08.
 * @returns Tupla [ref, isInView]. Anexe ref ao elemento a observar.
 */
export function useInView(threshold = 0.08): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsInView(true);
      },
      { threshold, rootMargin: '0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isInView];
}
