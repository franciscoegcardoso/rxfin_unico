import React from 'react';
import { Loader2, Info } from 'lucide-react';

interface SyncProcessingBannerProps {
  connectorName: string;
}

export const SyncProcessingBanner: React.FC<SyncProcessingBannerProps> = ({ connectorName }) => (
  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
    <Loader2 className="h-4 w-4 text-primary animate-spin mt-0.5 shrink-0" />
    <div className="space-y-0.5">
      <p className="text-sm font-medium text-foreground">
        Organizando suas finanças…
      </p>
      <p className="text-xs text-muted-foreground">
        Estamos importando os dados de {connectorName}. Isso pode levar até 60 segundos conforme a resposta do seu banco.
      </p>
    </div>
  </div>
);
