import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useIsMobile } from './use-mobile';

interface UseMonthNavigationOptions {
  allMonths: string[];
  currentMonth: string;
}

export function useMonthNavigation({ allMonths, currentMonth }: UseMonthNavigationOptions) {
  const isMobile = useIsMobile();
  const visibleMonths = isMobile ? 3 : 12;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculate current month index
  const currentMonthIndex = useMemo(() => {
    const idx = allMonths.indexOf(currentMonth);
    return idx >= 0 ? idx : 0;
  }, [allMonths, currentMonth]);

  // Center on current month
  const centerOnCurrentMonth = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const itemWidth = isMobile ? 70 : 85; // actual width per month column matching Planejamento.tsx
    const containerWidth = container.clientWidth;
    const centerOffset = (containerWidth / 2) - (itemWidth / 2);
    const scrollPosition = (currentMonthIndex * itemWidth) - centerOffset;
    
    container.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });
  }, [currentMonthIndex, isMobile]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Center on current month on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      centerOnCurrentMonth();
    }, 100);
    return () => clearTimeout(timer);
  }, [centerOnCurrentMonth]);

  return {
    scrollContainerRef,
    visibleMonths,
    isMobile,
    isDragging,
    centerOnCurrentMonth,
    currentMonthIndex,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    }
  };
}
