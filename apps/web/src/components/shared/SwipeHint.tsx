import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from 'lucide-react';

interface SwipeHintProps {
  show: boolean;
  onDismiss: () => void;
  autoHideDelay?: number;
}

export const SwipeHint: React.FC<SwipeHintProps> = ({ 
  show, 
  onDismiss, 
  autoHideDelay = 1500 // Changed from 3000 to 1500ms
}) => {
  const [isVisible, setIsVisible] = useState(show);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(handleDismiss, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [show, autoHideDelay, handleDismiss]);

  // Dismiss on any touch
  useEffect(() => {
    if (!isVisible) return;

    const handleTouch = () => {
      handleDismiss();
    };

    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('pointerdown', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('pointerdown', handleTouch);
    };
  }, [isVisible, handleDismiss]);

  // Only show on mobile/tablet
  const isTouchDevice = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  if (!isTouchDevice) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none"
        >
          <div className="flex flex-col items-center gap-2">
            {/* Animated hand with swipe gesture */}
            <motion.div
              className="relative"
              initial={{ x: 0 }}
              animate={{ x: [-20, 20, -20] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Hand className="h-10 w-10 text-primary transform -rotate-45" />
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xs text-muted-foreground font-medium"
            >
              Deslize para navegar
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
