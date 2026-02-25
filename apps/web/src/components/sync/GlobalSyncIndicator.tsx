import React from 'react';
import { useSyncContext } from '@/contexts/SyncContext';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const GlobalSyncIndicator: React.FC = () => {
  const { step, stepLabel, progressPercent, busy, jobProgress } = useSyncContext();

  // Only show when syncing or just completed (not on the card page where the button lives)
  const visible = step !== 'idle';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-card text-card-foreground shadow-lg p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
            <span className="text-sm font-medium">
              {busy ? 'Sincronizando faturas…' : 'Sincronização concluída!'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate">{stepLabel}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>

          {busy && jobProgress && jobProgress.transactions_saved > 0 && (
            <p className="text-xs text-muted-foreground">
              {jobProgress.transactions_saved.toLocaleString('pt-BR')} transações salvas
              {jobProgress.bills_linked > 0 && ` · ${jobProgress.bills_linked} faturas vinculadas`}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
