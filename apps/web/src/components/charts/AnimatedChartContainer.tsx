import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedChartContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Wrapper component that adds subtle entry animations to charts
 * Uses framer-motion for smooth fade-in and scale effects
 */
export const AnimatedChartContainer: React.FC<AnimatedChartContainerProps> = ({
  children,
  className = '',
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad for smooth feel
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Staggered animation container for multiple chart elements
 */
export const AnimatedChartGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}> = ({ children, className = '', staggerDelay = 0.1 }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.97 },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};
