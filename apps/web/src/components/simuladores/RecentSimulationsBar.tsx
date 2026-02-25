import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { History, ArrowRight } from 'lucide-react';
import type { RecentSimulation } from '@/hooks/useRecentSimulations';

interface RecentSimulationsBarProps {
  simulations: RecentSimulation[];
}

export const RecentSimulationsBar: React.FC<RecentSimulationsBarProps> = ({ simulations }) => {
  if (simulations.length === 0) return null;

  const recent = simulations.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="flex items-center gap-3 px-1 overflow-x-auto"
    >
      <div className="flex items-center gap-1.5 text-muted-foreground/60 shrink-0">
        <History className="h-3.5 w-3.5" />
        <span className="text-xs">Recentes:</span>
      </div>
      {recent.map((sim) => (
        <Link
          key={sim.slug}
          to={sim.path}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0 group"
        >
          <span>{sim.title}</span>
          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
    </motion.div>
  );
};
