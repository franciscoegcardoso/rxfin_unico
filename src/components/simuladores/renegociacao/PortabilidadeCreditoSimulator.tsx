import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Building2, ArrowRightLeft, DollarSign, TrendingDown, Clock } from 'lucide-react';
import { calcPriceParcela, calcCustoTotal, formatBRL, formatPercent } from '@/lib/financialCalculations';

export const PortabilidadeCreditoSimulator: React.FC = () => {
  // Instituição atual
  const [saldoDevedor, setSaldoDevedor] = useState('');
  const [taxaAtual, setTaxaAtual] = useState('');
  const [parcelasRestantes, setParcelasRestantes] = useState('');

  // Nova instituição
  const [novaTaxa, setNovaTaxa] = useState('');
  const [custoPortabilidade, setCustoPortabilidade] = useState('');

  const results = useMemo(() => {
    const saldo = parseFloat(saldoDevedor) || 0;
    const iAtual = parseFloat(taxaAtual) || 0;
    const prazo = parseInt(parcelasRestantes) || 0;
    const iNova = parseFloat(novaTaxa) || 0;
    const custoPort = parseFloat(custoPortabilidade) || 0;

    if (saldo <= 0 || prazo <= 0) return null;

    const parcelaAtual = calcPriceParcela(saldo, iAtual, prazo);
    const custoAtual = calcCustoTotal(parcelaAtual, prazo);

    const novoSaldo = saldo + custoPort;
    const novaParcela = calcPriceParcela(novoSaldo, iNova, prazo);
    const custoNovo = calcCustoTotal(novaParcela, prazo);

    const economiaMensal = parcelaAtual - novaParcela;
    const economiaTotal = custoAtual - custoNovo;
    const valeAPena = custoNovo < custoAtual;

    // Meses para recuperar o custo de portabilidade
    const breakEvenMeses = economiaMensal > 0 ? Math.ceil(custoPort / economiaMensal) : Infinity;

    return {
      parcelaAtual,
      custoAtual,
      novaParcela,
      custoNovo,
      economiaMensal,
      economiaTotal,
      valeAPena,
      breakEvenMeses,
    };
  }, [saldoDevedor, taxaAtual, parcelasRestantes, novaTaxa, custoPortabilidade]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Instituição Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Instituição atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Saldo devedor (R$)</Label>
              <Input type="number" placeholder="Ex: 50000" value={saldoDevedor} onChange={e => setSaldoDevedor(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa de juros mensal (%)</Label>
                <Input type="number" step="0.01" placeholder="Ex: 1.5" value={taxaAtual} onChange={e => setTaxaAtual(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Parcelas restantes</Label>
                <Input type="number" placeholder="Ex: 48" value={parcelasRestantes} onChange={e => setParcelasRestantes(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nova Instituição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              Nova instituição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nova taxa mensal (%)</Label>
              <Input type="number" step="0.01" placeholder="Ex: 0.9" value={novaTaxa} onChange={e => setNovaTaxa(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custo de portabilidade (R$)</Label>
              <Input type="number" placeholder="Ex: 500 (opcional)" value={custoPortabilidade} onChange={e => setCustoPortabilidade(e.target.value)} />
              <p className="text-xs text-muted-foreground">Taxas cobradas pela transferência (IOF, tarifas, etc.)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resultado da portabilidade</CardTitle>
              {results.valeAPena ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Portabilidade vantajosa
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  Não compensa trocar
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Economia mensal</span>
                </div>
                <p className={`text-lg font-semibold ${results.economiaMensal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {formatBRL(Math.abs(results.economiaMensal))}
                </p>
                <p className="text-[11px] text-muted-foreground">por mês</p>
              </div>

              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs">Economia total</span>
                </div>
                <p className={`text-lg font-semibold ${results.economiaTotal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {formatBRL(Math.abs(results.economiaTotal))}
                </p>
                <p className="text-[11px] text-muted-foreground">no período</p>
              </div>

              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Break-even</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {results.breakEvenMeses === Infinity ? '—' : `${results.breakEvenMeses} meses`}
                </p>
                <p className="text-[11px] text-muted-foreground">para recuperar custos</p>
              </div>

              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Nova parcela</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {formatBRL(results.novaParcela)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  era {formatBRL(results.parcelaAtual)}
                </p>
              </div>
            </div>

            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              💡 <strong>Dica:</strong> Pela Lei da Portabilidade (Resolução CMN 4.292/2013), a instituição 
              original não pode cobrar taxas para fornecer informações. O custo acima refere-se a eventuais 
              tarifas da nova instituição e IOF.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
