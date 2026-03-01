import { useCallback, useRef, useState } from 'react';

interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50
}: UseSwipeNavigationOptions) => {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [hasSwiped, setHasSwiped] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) {
      return;
    }

    const distance = touchStartX.current - touchEndX.current;
    const isSwipeLeft = distance > threshold;
    const isSwipeRight = distance < -threshold;

    if (isSwipeLeft && onSwipeLeft) {
      onSwipeLeft();
      setHasSwiped(true);
    } else if (isSwipeRight && onSwipeRight) {
      onSwipeRight();
      setHasSwiped(true);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    hasSwiped,
    resetSwipeState: () => setHasSwiped(false)
  };
};
