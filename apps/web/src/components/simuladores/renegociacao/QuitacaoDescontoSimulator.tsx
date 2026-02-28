import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, TrendingDown, DollarSign, Percent, Calendar } from 'lucide-react';
import { calcTotalRestante, formatBRL, formatPercent } from '@/lib/financialCalculations';

export const QuitacaoDescontoSimulator: React.FC = () => {
  const [saldoDevedor, setSaldoDevedor] = useState<string>('');
  const [parcelasRestantes, setParcelasRestantes] = useState<string>('');
  const [valorParcela, setValorParcela] = useState<string>('');
  const [valorProposto, setValorProposto] = useState<string>('');

  const results = useMemo(() => {
    const saldo = parseFloat(saldoDevedor) || 0;
    const parcelas = parseInt(parcelasRestantes) || 0;
    const parcela = parseFloat(valorParcela) || 0;
    const proposto = parseFloat(valorProposto) || 0;

    if (saldo <= 0 || parcelas <= 0 || parcela <= 0 || proposto <= 0) return null;

    const totalSemDesconto = calcTotalRestante(parcela, parcelas);
    const economiaBruta = totalSemDesconto - proposto;
    const percentualDesconto = ((totalSemDesconto - proposto) / totalSemDesconto) * 100;
    const descontoSobreSaldo = ((saldo - proposto) / saldo) * 100;
    const valeAPena = proposto < totalSemDesconto;

    return {
      totalSemDesconto,
      economiaBruta,
      percentualDesconto,
      descontoSobreSaldo,
      valeAPena,
    };
  }, [saldoDevedor, parcelasRestantes, valorParcela, valorProposto]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da dívida e proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="saldo">Saldo devedor atual (R$)</Label>
            <Input
              id="saldo"
              type="number"
              placeholder="Ex: 15000"
              value={saldoDevedor}
              onChange={(e) => setSaldoDevedor(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parcelas">Parcelas restantes</Label>
              <Input
                id="parcelas"
                type="number"
                placeholder="Ex: 24"
                value={parcelasRestantes}
                onChange={(e) => setParcelasRestantes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorParcela">Valor da parcela (R$)</Label>
              <Input
                id="valorParcela"
                type="number"
                placeholder="Ex: 850"
                value={valorParcela}
                onChange={(e) => setValorParcela(e.target.value)}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="proposta">Valor proposto para quitação (R$)</Label>
            <Input
              id="proposta"
              type="number"
              placeholder="Ex: 9000"
              value={valorProposto}
              onChange={(e) => setValorProposto(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Valor que a instituição ofereceu para quitar à vista
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado da análise</CardTitle>
        </CardHeader>
        <CardContent>
          {!results ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Preencha todos os campos para ver a análise
            </div>
          ) : (
            <div className="space-y-4">
              {/* Verdict badge */}
              <div className="flex items-center gap-2">
                {results.valeAPena ? (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 gap-1.5 py-1 px-3">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Vale a pena quitar!
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 gap-1.5 py-1 px-3">
                    <XCircle className="h-3.5 w-3.5" />
                    Não compensa — continue pagando
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ResultCard
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Total sem desconto"
                  value={formatBRL(results.totalSemDesconto)}
                  sublabel="Soma das parcelas restantes"
                />
                <ResultCard
                  icon={<TrendingDown className="h-4 w-4" />}
                  label="Economia bruta"
                  value={formatBRL(results.economiaBruta)}
                  sublabel="Diferença total"
                  highlight={results.valeAPena}
                />
                <ResultCard
                  icon={<Percent className="h-4 w-4" />}
                  label="Desconto s/ total"
                  value={formatPercent(results.percentualDesconto)}
                  sublabel="Sobre soma das parcelas"
                />
                <ResultCard
                  icon={<Calendar className="h-4 w-4" />}
                  label="Desconto s/ saldo"
                  value={formatPercent(results.descontoSobreSaldo)}
                  sublabel="Sobre saldo devedor"
                />
              </div>

              <Separator />
              <p className="text-xs text-muted-foreground">
                💡 <strong>Dica:</strong> Compare o desconto oferecido com o rendimento que o dinheiro teria 
                se aplicado. Se o desconto for maior que o rendimento no período, vale a pena quitar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function ResultCard({ icon, label, value, sublabel, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-1 ${highlight ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}
