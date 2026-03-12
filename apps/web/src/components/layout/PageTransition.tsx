import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  // Usar apenas o segmento raiz como key da animação.
  // Rotas nested (ex: /planejamento/metas vs /planejamento/visao-mensal) compartilham o mesmo key
  // e não disparam re-mount desnecessário (evita travamento de abas).
  const rootSegment = location.pathname.split('/').filter(Boolean)[0] ?? '/';

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={rootSegment}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
