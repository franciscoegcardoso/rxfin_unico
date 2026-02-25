import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFinancial } from '@/contexts/FinancialContext';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Wallet,
  PiggyBank,
  LineChart,
  Info
} from 'lucide-react';

interface OpportunityCostAnalysisProps {
  parcelaConsorcio: number;
  parcelaFinanciamento: number;
  totalConsorcio: number;
  totalFinanciamento: number;
  prazo: number;
  valorBem: number;
  rendimentoMensal: number; // % a.m.
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const OpportunityCostAnalysis: React.FC<OpportunityCostAnalysisProps> = ({
  parcelaConsorcio,
  parcelaFinanciamento,
  totalConsorcio,
  totalFinanciamento,
  prazo,
  valorBem,
  rendimentoMensal
}) => {
  const { config, getMonthlyEntry } = useFinancial();

  // Calculate user's average monthly cash flow
  const cashFlowAnalysis = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get last 3 months of data for average
    const months: string[] = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    let totalIncome = 0;
    let totalExpenses = 0;
    let monthsWithData = 0;

    months.forEach(month => {
      let monthIncome = 0;
      let monthExpenses = 0;

      config.incomeItems.filter(i => i.enabled).forEach(item => {
        monthIncome += getMonthlyEntry(month, item.id, 'income');
      });

      config.expenseItems.filter(e => e.enabled).forEach(item => {
        monthExpenses += getMonthlyEntry(month, item.id, 'expense');
      });

      if (monthIncome > 0 || monthExpenses > 0) {
        totalIncome += monthIncome;
        totalExpenses += monthExpenses;
        monthsWithData++;
      }
    });

    const avgMonthlyIncome = monthsWithData > 0 ? totalIncome / monthsWithData : 0;
    const avgMonthlyExpenses = monthsWithData > 0 ? totalExpenses / monthsWithData : 0;
    const avgCashFlow = avgMonthlyIncome - avgMonthlyExpenses;

    return {
      avgMonthlyIncome,
      avgMonthlyExpenses,
      avgCashFlow,
      hasData: monthsWithData > 0
    };
  }, [config, getMonthlyEntry]);

  // Calculate opportunity cost scenarios
  const opportunityCost = useMemo(() => {
    const diferencaParcela = Math.abs(parcelaConsorcio - parcelaFinanciamento);
    const menorParcela = Math.min(parcelaConsorcio, parcelaFinanciamento);
    const maiorParcela = Math.max(parcelaConsorcio, parcelaFinanciamento);
    const opcaoMenorParcela = parcelaConsorcio < parcelaFinanciamento ? 'consorcio' : 'financiamento';

    // If user invests the difference monthly, how much would they have?
    let patrimonioAcumulado = 0;
    const taxaMensal = rendimentoMensal / 100;
    
    for (let mes = 1; mes <= prazo; mes++) {
      patrimonioAcumulado = (patrimonioAcumulado + diferencaParcela) * (1 + taxaMensal);
    }

    // Total cost comparison with opportunity
    const custoRealConsorcio = totalConsorcio;
    const custoRealFinanciamento = totalFinanciamento;

    // If user chooses the cheaper option and invests the difference
    const custoEfetivoConsorcio = opcaoMenorParcela === 'consorcio' 
      ? totalConsorcio - patrimonioAcumulado 
      : totalConsorcio;
    const custoEfetivoFinanciamento = opcaoMenorParcela === 'financiamento' 
      ? totalFinanciamento - patrimonioAcumulado 
      : totalFinanciamento;

    // Break-even analysis: at what rate would both options be equal?
    const diferencaTotal = Math.abs(totalConsorcio - totalFinanciamento);
    
    return {
      diferencaParcela,
      menorParcela,
      maiorParcela,
      opcaoMenorParcela,
      patrimonioAcumulado,
      custoEfetivoConsorcio,
      custoEfetivoFinanciamento,
      diferencaTotal,
      melhorOpcao: custoEfetivoConsorcio < custoEfetivoFinanciamento ? 'consorcio' : 'financiamento'
    };
  }, [parcelaConsorcio, parcelaFinanciamento, totalConsorcio, totalFinanciamento, prazo, rendimentoMensal]);

  // Affordability analysis
  const affordability = useMemo(() => {
    if (!cashFlowAnalysis.hasData) return null;

    const disponivel = cashFlowAnalysis.avgCashFlow;
    const podeConsorcio = disponivel >= parcelaConsorcio;
    const podeFinanciamento = disponivel >= parcelaFinanciamento;
    const comprometimentoConsorcio = cashFlowAnalysis.avgMonthlyIncome > 0 
      ? (parcelaConsorcio / cashFlowAnalysis.avgMonthlyIncome) * 100 
      : 0;
    const comprometimentoFinanciamento = cashFlowAnalysis.avgMonthlyIncome > 0 
      ? (parcelaFinanciamento / cashFlowAnalysis.avgMonthlyIncome) * 100 
      : 0;

    return {
      disponivel,
      podeConsorcio,
      podeFinanciamento,
      comprometimentoConsorcio,
      comprometimentoFinanciamento,
      folga: {
        consorcio: disponivel - parcelaConsorcio,
        financiamento: disponivel - parcelaFinanciamento
      }
    };
  }, [cashFlowAnalysis, parcelaConsorcio, parcelaFinanciamento]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          Estudo de Custo de Oportunidade
        </CardTitle>
        <CardDescription>
          Análise considerando seu fluxo de caixa projetado e investimento da diferença
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Cash Flow Summary */}
        {cashFlowAnalysis.hasData ? (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4" />
              Seu Fluxo de Caixa Médio
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Receita Média</p>
                <p className="text-lg font-bold text-green-600">{formatMoney(cashFlowAnalysis.avgMonthlyIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesa Média</p>
                <p className="text-lg font-bold text-red-600">{formatMoney(cashFlowAnalysis.avgMonthlyExpenses)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className={`text-lg font-bold ${cashFlowAnalysis.avgCashFlow >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatMoney(cashFlowAnalysis.avgCashFlow)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Cadastre suas receitas e despesas em <strong>Entradas</strong> e <strong>Saídas</strong> para uma análise personalizada do seu fluxo de caixa.
            </AlertDescription>
          </Alert>
        )}

        {/* Affordability Analysis */}
        {affordability && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Capacidade de Pagamento</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border ${affordability.podeConsorcio ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Consórcio</span>
                  {affordability.podeConsorcio ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  Comprometimento: {affordability.comprometimentoConsorcio.toFixed(1)}% da renda
                </p>
                <Progress 
                  value={Math.min(affordability.comprometimentoConsorcio, 100)} 
                  className="h-2"
                />
                <p className={`text-xs mt-1 ${affordability.folga.consorcio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {affordability.folga.consorcio >= 0 ? 'Folga: ' : 'Déficit: '}
                  {formatMoney(Math.abs(affordability.folga.consorcio))}
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${affordability.podeFinanciamento ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Financiamento</span>
                  {affordability.podeFinanciamento ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  Comprometimento: {affordability.comprometimentoFinanciamento.toFixed(1)}% da renda
                </p>
                <Progress 
                  value={Math.min(affordability.comprometimentoFinanciamento, 100)} 
                  className="h-2"
                />
                <p className={`text-xs mt-1 ${affordability.folga.financiamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {affordability.folga.financiamento >= 0 ? 'Folga: ' : 'Déficit: '}
                  {formatMoney(Math.abs(affordability.folga.financiamento))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Opportunity Cost Calculation */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Cenário: Investir a Diferença das Parcelas
          </h4>

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-center mb-4">
              <p className="text-xs text-muted-foreground">Diferença mensal entre parcelas</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(opportunityCost.diferencaParcela)}</p>
              <p className="text-xs text-muted-foreground">
                {opportunityCost.opcaoMenorParcela === 'consorcio' ? 'Consórcio' : 'Financiamento'} é mais barato por mês
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center pt-3 border-t border-primary/20">
              <div>
                <p className="text-xs text-muted-foreground">Se investir {rendimentoMensal}% a.m.</p>
                <p className="text-lg font-bold text-green-600">
                  {formatMoney(opportunityCost.patrimonioAcumulado)}
                </p>
                <p className="text-[10px] text-muted-foreground">acumulado em {prazo} meses</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferença total pago</p>
                <p className="text-lg font-bold">
                  {formatMoney(opportunityCost.diferencaTotal)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {totalConsorcio < totalFinanciamento ? 'Consórcio' : 'Financiamento'} mais barato
                </p>
              </div>
            </div>
          </div>

          {/* Final Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-100">CONSÓRCIO</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Custo efetivo considerando investimento:</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                {formatMoney(opportunityCost.custoEfetivoConsorcio)}
              </p>
              {opportunityCost.melhorOpcao === 'consorcio' && (
                <Badge className="mt-2 bg-blue-600">Melhor Opção</Badge>
              )}
            </div>

            <div className="p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-100">FINANCIAMENTO</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Custo efetivo considerando investimento:</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {formatMoney(opportunityCost.custoEfetivoFinanciamento)}
              </p>
              {opportunityCost.melhorOpcao === 'financiamento' && (
                <Badge className="mt-2 bg-emerald-600">Melhor Opção</Badge>
              )}
            </div>
          </div>

          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Interpretação:</strong> Se você escolher a opção com parcela menor e investir a diferença a {rendimentoMensal}% a.m., 
              ao final do prazo terá acumulado <strong>{formatMoney(opportunityCost.patrimonioAcumulado)}</strong>, 
              que deve ser descontado do custo total para comparação justa.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};
