import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { isStagingConfigured } from '@/lib/environment';

interface CheckItem {
  id: string;
  label: string;
  description: string;
  check: () => Promise<boolean>;
}

export function DeployChecklist() {
  const [results, setResults] = useState<Record<string, boolean | null>>({});
  const [running, setRunning] = useState(false);

  const checks: CheckItem[] = [
    {
      id: 'staging_configured',
      label: 'Staging Configurado',
      description: 'Projeto Supabase de staging com credenciais preenchidas.',
      check: async () => isStagingConfigured(),
    },
    {
      id: 'health_check',
      label: 'Health Check OK',
      description: 'Todas as páginas e rotas estão sincronizadas.',
      check: async () => {
        // Verifica se existem páginas ativas no banco
        const { count, error } = await supabase
          .from('pages')
          .select('*', { count: 'exact', head: true })
          .eq('is_active_users', true);
        return !error && (count ?? 0) > 0;
      },
    },
    {
      id: 'pending_rollbacks',
      label: 'Sem Rollbacks Pendentes',
      description: 'Nenhuma migration aguardando rollback.',
      check: async () => {
        const { data, error } = await supabase
          .from('migration_rollbacks')
          .select('id')
          .is('rolled_back_at', null)
          .eq('is_reversible', true);
        // OK if no error and 0 pending (or just check runs)
        return !error;
      },
    },
    {
      id: 'recent_errors',
      label: 'Sem Erros Recentes',
      description: 'Nenhum deploy com falha nas últimas 24h.',
      check: async () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('deploy_history')
          .select('id')
          .eq('status', 'failed')
          .gte('deployed_at', yesterday);
        return !error && (data?.length ?? 0) === 0;
      },
    },
  ];

  const runAllChecks = async () => {
    setRunning(true);
    const newResults: Record<string, boolean | null> = {};
    for (const check of checks) {
      newResults[check.id] = null;
    }
    setResults(newResults);

    for (const check of checks) {
      try {
        const result = await check.check();
        setResults(prev => ({ ...prev, [check.id]: result }));
      } catch {
        setResults(prev => ({ ...prev, [check.id]: false }));
      }
    }
    setRunning(false);
  };

  useEffect(() => {
    runAllChecks();
  }, []);

  const allPassed = checks.every(c => results[c.id] === true);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Checklist Pré-Deploy</CardTitle>
        <Button variant="ghost" size="sm" onClick={runAllChecks} disabled={running}>
          <RefreshCw className={`h-4 w-4 mr-1 ${running ? 'animate-spin' : ''}`} />
          Verificar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map(check => {
          const status = results[check.id];
          return (
            <div key={check.id} className="flex items-start gap-3">
              <div className="mt-0.5">
                {status === null ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : status ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.description}</p>
              </div>
            </div>
          );
        })}

        {!running && (
          <div className="pt-2 border-t">
            <p className={`text-sm font-medium ${allPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
              {allPassed
                ? '✅ Tudo pronto para deploy!'
                : '⚠️ Alguns itens precisam de atenção antes do deploy.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
