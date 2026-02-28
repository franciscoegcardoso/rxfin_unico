import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { useSyncContext } from '@/contexts/SyncContext';

export const SyncOpenFinanceDialog: React.FC = () => {
  const { step, busy, startFullSync } = useSyncContext();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={startFullSync}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : step === 'done' ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {busy ? 'Sincronizando…' : 'Sincronizar Faturas'}
    </Button>
  );
};
