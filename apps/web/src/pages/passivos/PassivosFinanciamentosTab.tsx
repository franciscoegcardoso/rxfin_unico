import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/shared/EmptyState';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Landmark, Plus, RefreshCw } from 'lucide-react';
import { FinanciamentoDialog } from '@/components/credito/FinanciamentoDialog';
import { useCreditos } from '@/hooks/useCreditos';
import { usePassivosPage } from '@/hooks/usePassivosPage';
import { useAuth } from '@/contexts/AuthContext';

type FinancingItem = {
  id: string;
  nome: string;
  instituicao: string;
  contrato: string;
  valor_bem: number;
  valor_entrada: number;
  valor_financiado: number;
  saldo_devedor: number;
  valor_parcela: number;
  taxa_juros_mensal: number;
  taxa_juros_anual: number;
  sistema_amortizacao: string;
  prazo_total: number;
  parcelas_pagas: number;
  parcelas_restantes: number;
  progress_pct?: number | null;
  data_inicio: string;
  data_termino_prevista: string;
  observacoes: string;
};

type PassivosFinanciamentosResponse = {
  financiamentos: FinancingItem[];
  summary: {
    total_count: number;
    total_saldo_devedor: number;
    total_valor_financiado: number;
    total_parcela_mensal: number;
    media_taxa_mensal: number;
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

export default function PassivosFinanciamentosTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { addFinanciamento } = useCreditos();
  const { data: pageData, isLoading, error } = usePassivosPage(user?.id, 'financiamentos');
  const data = (pageData?.tab_data ?? null) as PassivosFinanciamentosResponse | null;

  const items = data?.financiamentos ?? [];

  if (isLoading) {
    return (
      <div className="py-6">
        <RXFinLoadingSpinner message="Carregando financiamentos..." height="h-full" />
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
                <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : String(error)}</p>
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary shrink-0" />
          Financiamentos
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Adicionar financiamento
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-6 w-6 text-muted-foreground" />}
          title="Nenhum financiamento cadastrado"
          description="Adicione financiamentos para acompanhar saldo devedor, parcelas e progresso."
          actionLabel="Adicionar financiamento"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <ScrollArea className="h-[520px]">
          <div className="space-y-4">
            {items.map((f) => {
              const progress = typeof f.progress_pct === 'number' ? f.progress_pct : 0;
              return (
                <Card key={f.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{f.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.instituicao ? f.instituicao : '—'} · {f.sistema_amortizacao}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {formatMoney(f.saldo_devedor)}
                      </Badge>
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
                        <span className="block">Parcela</span>
                        <span className="font-medium text-foreground">{formatMoney(f.valor_parcela)}</span>
                      </div>
                      <div>
                        <span className="block">Restantes</span>
                        <span className="font-medium text-foreground">{f.parcelas_restantes}</span>
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
    <FinanciamentoDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onSave={async (payload) => {
        const res = await addFinanciamento(payload);
        if (!res.error && user?.id) {
          await queryClient.invalidateQueries({ queryKey: ['passivos-page', user.id] });
        }
        return res;
      }}
    />
    </>
  );
}

