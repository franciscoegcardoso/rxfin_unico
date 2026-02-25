import { useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function AdminPendingChangesBar() {
  const { 
    pendingChanges, 
    hasChanges, 
    clearChanges, 
    openConfirmDialog 
  } = useAdminPendingChanges();

  return (
    <AnimatePresence>
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="sticky top-0 z-50 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm"
        >
          <div className="px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Você tem alterações não salvas
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300">
                  {pendingChanges.length} {pendingChanges.length === 1 ? 'alteração pendente' : 'alterações pendentes'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearChanges}
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                <X className="h-4 w-4" />
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={openConfirmDialog}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Save className="h-4 w-4" />
                Salvar
                <Badge variant="secondary" className="bg-amber-500 text-white text-xs">
                  {pendingChanges.length}
                </Badge>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
