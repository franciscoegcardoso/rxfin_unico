import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/shared/EmptyState';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { ConsorcioDialog } from '@/components/credito/ConsorcioDialog';
import { useCreditos } from '@/hooks/useCreditos';

type ConsorcioItem = {
  id: string;
  nome: string;
  administradora: string;
  grupo: string;
  cota: string;
  valor_carta: number;
  valor_parcela: number;
  taxa_adm_total: number;
  prazo_total: number;
  parcelas_pagas: number;
  parcelas_restantes: number;
  progress_pct?: number | null;
  custo_adm_estimado: number;
  valor_pago: number;
  contemplado: boolean;
  data_contemplacao: string | null;
  data_inicio: string;
  data_termino_prevista: string;
  observacoes: string;
};

type PassivosConsorciosResponse = {
  consorcios: ConsorcioItem[];
  summary: {
    total_count: number;
    contemplados_count: number;
    aguardando_count: number;
    total_valor_carta: number;
    total_parcela_mensal: number;
    total_pago: number;
    total_custo_adm: number;
  };
  fetched_at: string;
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const ProgressBar = ({ value }: { value: number }) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-muted/70 overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
};

export default function PassivosConsorciosTab() {
  const [data, setData] = useState<PassivosConsorciosResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { addConsorcio } = useCreditos();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_passivos_consorcios');
        if (rpcError) throw rpcError;
        if (cancelled) return;
        setData((result ?? null) as PassivosConsorciosResponse | null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = data?.consorcios ?? [];

  if (isLoading) {
    return (
      <div className="py-6">
        <RXFinLoadingSpinner message="Carregando consórcios..." height="h-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Não foi possível carregar</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Consórcios
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Adicionar consórcio
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
          title="Nenhum consórcio cadastrado"
          description="Adicione consórcios para acompanhar contemplação, parcelas e evolução."
          actionLabel="Adicionar consórcio"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <ScrollArea className="h-[520px]">
          <div className="space-y-4">
            {items.map((c) => {
              const progress = typeof c.progress_pct === 'number' ? c.progress_pct : 0;
              return (
                <Card key={c.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.administradora || '—'} · {c.grupo} · cota {c.cota}
                        </p>
                      </div>
                      {c.contemplado ? (
                        <Badge variant="successSolid" className="whitespace-nowrap">
                          Contemplado
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="whitespace-nowrap">
                          Aguardando
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{formatMoney(c.valor_carta)}</Badge>
                      <Badge variant="outline">{formatMoney(c.valor_parcela)} / parcela</Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block">Pagas</span>
                        <span className="font-medium text-foreground">{c.parcelas_pagas}</span>
                      </div>
                      <div>
                        <span className="block">Restantes</span>
                        <span className="font-medium text-foreground">{c.parcelas_restantes}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
    <ConsorcioDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onSave={async (payload) => {
        const res = await addConsorcio(payload);
        if (!res.error) window.location.reload();
        return res;
      }}
    />
    </>
  );
}

