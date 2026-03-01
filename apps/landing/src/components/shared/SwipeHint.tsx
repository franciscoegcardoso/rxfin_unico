"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

interface SwipeHintProps {
  show: boolean;
  onDismiss: () => void;
  autoHideDelay?: number;
}

export function SwipeHint({ show, onDismiss, autoHideDelay = 1500 }: SwipeHintProps) {
  const [isVisible, setIsVisible] = useState(show);
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const t = setTimeout(handleDismiss, autoHideDelay);
      return () => clearTimeout(t);
    }
  }, [show, autoHideDelay, handleDismiss]);

  useEffect(() => {
    if (!isVisible) return;
    const handleTouch = () => handleDismiss();
    window.addEventListener("touchstart", handleTouch, { passive: true });
    window.addEventListener("pointerdown", handleTouch, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("pointerdown", handleTouch);
    };
  }, [isVisible, handleDismiss]);

  const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
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
            <motion.div
              className="relative"
              animate={{ x: [-20, 20, -20] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              <Hand className="h-10 w-10 text-primary transform -rotate-45" />
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-xs text-muted-foreground font-medium">
              Deslize para navegar
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
