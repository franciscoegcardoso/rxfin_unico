import { Rocket } from 'lucide-react';
import { EnvironmentIndicator } from './deploy/EnvironmentIndicator';
import { DeployChecklist } from './deploy/DeployChecklist';
import { DeployHistory } from './deploy/DeployHistory';
import { RollbackPanel } from './deploy/RollbackPanel';

export function DeployTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Rocket className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Deploy & Ambientes</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie deploys, verifique a integridade do sistema e execute rollbacks.
          </p>
        </div>
      </div>

      {/* Indicador de Ambiente */}
      <EnvironmentIndicator />

      {/* Grid principal */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Checklist */}
        <DeployChecklist />

        {/* Rollback */}
        <RollbackPanel />
      </div>

      {/* Histórico */}
      <DeployHistory />
    </div>
  );
}
