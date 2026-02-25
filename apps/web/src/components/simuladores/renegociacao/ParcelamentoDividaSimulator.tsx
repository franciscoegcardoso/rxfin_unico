import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, ArrowRight, DollarSign, TrendingDown, Calendar } from 'lucide-react';
import { calcPriceParcela, calcCustoTotal, formatBRL, formatPercent } from '@/lib/financialCalculations';

export const ParcelamentoDividaSimulator: React.FC = () => {
  // Situação atual
  const [saldoDevedor, setSaldoDevedor] = useState('');
  const [taxaAtual, setTaxaAtual] = useState('');
  const [parcelasRestantes, setParcelasRestantes] = useState('');

  // Nova proposta
  const [novaTaxa, setNovaTaxa] = useState('');
  const [novoPrazo, setNovoPrazo] = useState('');
  const [entrada, setEntrada] = useState('');

  const results = useMemo(() => {
    const saldo = parseFloat(saldoDevedor) || 0;
    const iAtual = parseFloat(taxaAtual) || 0;
    const pRestantes = parseInt(parcelasRestantes) || 0;
    const iNova = parseFloat(novaTaxa) || 0;
    const pNovo = parseInt(novoPrazo) || 0;
    const ent = parseFloat(entrada) || 0;

    if (saldo <= 0 || pRestantes <= 0 || pNovo <= 0) return null;

    const parcelaAtual = calcPriceParcela(saldo, iAtual, pRestantes);
    const custoAtual = calcCustoTotal(parcelaAtual, pRestantes);

    const saldoAposEntrada = saldo - ent;
    const novaParcela = calcPriceParcela(saldoAposEntrada, iNova, pNovo);
    const custoNovo = calcCustoTotal(novaParcela, pNovo) + ent;

    const economia = custoAtual - custoNovo;
    const economiaPercent = (economia / custoAtual) * 100;
    const valeAPena = custoNovo < custoAtual;

    return {
      parcelaAtual,
      custoAtual,
      novaParcela,
      custoNovo,
      economia,
      economiaPercent,
      valeAPena,
    };
  }, [saldoDevedor, taxaAtual, parcelasRestantes, novaTaxa, novoPrazo, entrada]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Situação Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📋 Situação atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Saldo devedor (R$)</Label>
              <Input type="number" placeholder="Ex: 20000" value={saldoDevedor} onChange={e => setSaldoDevedor(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa de juros mensal (%)</Label>
                <Input type="number" step="0.01" placeholder="Ex: 3.5" value={taxaAtual} onChange={e => setTaxaAtual(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Parcelas restantes</Label>
                <Input type="number" placeholder="Ex: 36" value={parcelasRestantes} onChange={e => setParcelasRestantes(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nova Proposta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔄 Nova proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nova taxa mensal (%)</Label>
                <Input type="number" step="0.01" placeholder="Ex: 1.8" value={novaTaxa} onChange={e => setNovaTaxa(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Novo prazo (meses)</Label>
                <Input type="number" placeholder="Ex: 48" value={novoPrazo} onChange={e => setNovoPrazo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor de entrada (R$)</Label>
              <Input type="number" placeholder="Ex: 2000 (opcional)" value={entrada} onChange={e => setEntrada(e.target.value)} />
              <p className="text-xs text-muted-foreground">Deixe em branco ou 0 se não houver entrada</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Comparativo</CardTitle>
              {results.valeAPena ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Renegociação vantajosa
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  Manter condições atuais
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Antes */}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Antes</p>
                <div>
                  <p className="text-sm text-muted-foreground">Parcela</p>
                  <p className="text-lg font-semibold">{formatBRL(results.parcelaAtual)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo total</p>
                  <p className="text-lg font-semibold">{formatBRL(results.custoAtual)}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-muted-foreground hidden sm:block" />
              </div>

              {/* Depois */}
              <div className={`rounded-lg border p-4 space-y-3 ${results.valeAPena ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Depois</p>
                <div>
                  <p className="text-sm text-muted-foreground">Parcela</p>
                  <p className={`text-lg font-semibold ${results.valeAPena ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {formatBRL(results.novaParcela)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo total</p>
                  <p className={`text-lg font-semibold ${results.valeAPena ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {formatBRL(results.custoNovo)}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Economia total</p>
                  <p className={`text-lg font-bold ${results.valeAPena ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {formatBRL(Math.abs(results.economia))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Redução</p>
                  <p className={`text-lg font-bold ${results.valeAPena ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {formatPercent(Math.abs(results.economiaPercent))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
