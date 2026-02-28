import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Plus, Trash2, DollarSign, TrendingDown, Layers } from 'lucide-react';
import { calcPriceParcela, calcCustoTotal, formatBRL, formatPercent } from '@/lib/financialCalculations';

interface Divida {
  id: string;
  nome: string;
  saldo: string;
  taxa: string;
  parcelas: string;
}

const createDivida = (): Divida => ({
  id: crypto.randomUUID(),
  nome: '',
  saldo: '',
  taxa: '',
  parcelas: '',
});

export const ConsolidacaoDividasSimulator: React.FC = () => {
  const [dividas, setDividas] = useState<Divida[]>([createDivida(), createDivida()]);
  const [novaTaxa, setNovaTaxa] = useState('');
  const [novoPrazo, setNovoPrazo] = useState('');

  const addDivida = () => setDividas(prev => [...prev, createDivida()]);

  const removeDivida = (id: string) => {
    if (dividas.length <= 1) return;
    setDividas(prev => prev.filter(d => d.id !== id));
  };

  const updateDivida = (id: string, field: keyof Divida, value: string) => {
    setDividas(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const results = useMemo(() => {
    const iNova = parseFloat(novaTaxa) || 0;
    const pNovo = parseInt(novoPrazo) || 0;
    if (pNovo <= 0) return null;

    const dividasValidas = dividas.filter(d => {
      const s = parseFloat(d.saldo) || 0;
      const p = parseInt(d.parcelas) || 0;
      return s > 0 && p > 0;
    });

    if (dividasValidas.length === 0) return null;

    let totalSaldos = 0;
    let totalCustoAtual = 0;
    let totalParcelaAtual = 0;

    const detalhe = dividasValidas.map(d => {
      const saldo = parseFloat(d.saldo);
      const taxa = parseFloat(d.taxa) || 0;
      const parcelas = parseInt(d.parcelas);
      const parcela = calcPriceParcela(saldo, taxa, parcelas);
      const custo = calcCustoTotal(parcela, parcelas);

      totalSaldos += saldo;
      totalCustoAtual += custo;
      totalParcelaAtual += parcela;

      return { nome: d.nome || 'Dívida', saldo, parcela, custo };
    });

    const novaParcelaUnica = calcPriceParcela(totalSaldos, iNova, pNovo);
    const custoConsolidado = calcCustoTotal(novaParcelaUnica, pNovo);
    const economia = totalCustoAtual - custoConsolidado;
    const valeAPena = custoConsolidado < totalCustoAtual;

    return {
      detalhe,
      totalSaldos,
      totalParcelaAtual,
      totalCustoAtual,
      novaParcelaUnica,
      custoConsolidado,
      economia,
      economiaPercent: (economia / totalCustoAtual) * 100,
      valeAPena,
    };
  }, [dividas, novaTaxa, novoPrazo]);

  return (
    <div className="space-y-6">
      {/* Lista de Dívidas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Dívidas atuais
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addDivida} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dividas.map((d, index) => (
            <div key={d.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Dívida {index + 1}</span>
                {dividas.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeDivida(d.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Nome</Label>
                  <Input placeholder="Ex: Cartão" value={d.nome} onChange={e => updateDivida(d.id, 'nome', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Saldo (R$)</Label>
                  <Input type="number" placeholder="5000" value={d.saldo} onChange={e => updateDivida(d.id, 'saldo', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Taxa mensal (%)</Label>
                  <Input type="number" step="0.01" placeholder="3.5" value={d.taxa} onChange={e => updateDivida(d.id, 'taxa', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Parcelas rest.</Label>
                  <Input type="number" placeholder="12" value={d.parcelas} onChange={e => updateDivida(d.id, 'parcelas', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Proposta de consolidação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🔄 Proposta de consolidação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nova taxa mensal (%)</Label>
              <Input type="number" step="0.01" placeholder="Ex: 1.5" value={novaTaxa} onChange={e => setNovaTaxa(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Novo prazo (meses)</Label>
              <Input type="number" placeholder="Ex: 36" value={novoPrazo} onChange={e => setNovoPrazo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resultado da consolidação</CardTitle>
              {results.valeAPena ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Consolidação vantajosa
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  Manter separadas
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumo das dívidas */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumo atual</p>
              {results.detalhe.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.nome}</span>
                  <span className="font-medium">{formatBRL(d.saldo)} — {formatBRL(d.parcela)}/mês</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total atual</span>
                <span>{formatBRL(results.totalParcelaAtual)}/mês</span>
              </div>
            </div>

            {/* Cards de resultado */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className={`rounded-lg border p-3 space-y-1 ${results.valeAPena ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Nova parcela única</span>
                </div>
                <p className={`text-lg font-semibold ${results.valeAPena ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                  {formatBRL(results.novaParcelaUnica)}
                </p>
                <p className="text-[11px] text-muted-foreground">era {formatBRL(results.totalParcelaAtual)}</p>
              </div>

              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs">Economia total</span>
                </div>
                <p className={`text-lg font-semibold ${results.valeAPena ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {formatBRL(Math.abs(results.economia))}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatPercent(Math.abs(results.economiaPercent))}</p>
              </div>

              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span className="text-xs">Dívidas unificadas</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {results.detalhe.length} → 1
                </p>
                <p className="text-[11px] text-muted-foreground">simplificação</p>
              </div>
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground">
              💡 <strong>Dica:</strong> Mesmo que o custo total seja ligeiramente maior, consolidar pode valer 
              a pena pela simplicidade de gerenciar apenas uma parcela e evitar atrasos em múltiplas contas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
