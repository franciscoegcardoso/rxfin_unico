import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  Wallet, 
  TrendingDown, 
  CircleDollarSign,
  PiggyBank,
  Car,
  ArrowRight,
  Info,
  Landmark,
  Users,
  Clock,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancingCreditInfo {
  tipo: 'financiamento';
  totalJuros: number;
  taxaJurosImplicita: number;
  custoOportunidadeEntrada: number;
  custoOportunidadeParcelas: number;
  saldoDevedor: number;
  parcelasRestantes: number;
  valorParcela: number;
}

interface ConsorcioCreditInfo {
  tipo: 'consorcio';
  totalTaxas: number;
  mesesSemBem: number;
  valorPagoSemBem: number;
  custoOportunidadeParcelas: number;
  parcelasRestantes: number;
  valorParcela: number;
  contemplado: boolean;
}

type CreditInfo = FinancingCreditInfo | ConsorcioCreditInfo;

interface OpportunityCostInsightsDialogProps {
  summary: {
    paidOffValue: number;
    totalOpportunityCost: number;
    totalExpenses: number;
    totalDepreciation: number;
    realTotalCost: number;
    realMonthlyCost: number;
    equivalentDailyRent: number;
    finalInvestedCapital: number;
    cdiUsed: number;
    creditCost?: number;
    deadPeriodCost?: number;
    mesesSemBem?: number;
  };
  projectionMonths: number;
  vehicleName: string;
  analysisMode: 'depreciation_only' | 'with_expenses';
  isFinanced?: boolean;
  creditInfo?: CreditInfo;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const OpportunityCostInsightsDialog: React.FC<OpportunityCostInsightsDialogProps> = ({
  summary,
  projectionMonths,
  vehicleName,
  analysisMode,
  isFinanced = false,
  creditInfo,
}) => {
  const years = projectionMonths / 12;
  const capitalLostPercent = ((summary.totalOpportunityCost / summary.paidOffValue) * 100);
  const depreciationPercent = ((summary.totalDepreciation / summary.paidOffValue) * 100);
  const expensePercent = analysisMode === 'with_expenses' 
    ? ((summary.totalExpenses / summary.realTotalCost) * 100) 
    : 0;

  // Cálculo do peso de cada componente no custo total
  const creditCost = summary.creditCost || 0;
  const deadPeriodCost = summary.deadPeriodCost || 0;
  const totalWithCredit = summary.realTotalCost;
  
  const opportunityWeight = (summary.totalOpportunityCost / totalWithCredit) * 100;
  const depreciationWeight = (summary.totalDepreciation / totalWithCredit) * 100;
  const expenseWeight = analysisMode === 'with_expenses' 
    ? (summary.totalExpenses / totalWithCredit) * 100 
    : 0;
  const creditWeight = isFinanced && creditCost > 0
    ? (creditCost / totalWithCredit) * 100 
    : 0;
  const deadPeriodWeight = isFinanced && deadPeriodCost > 0
    ? (deadPeriodCost / totalWithCredit) * 100
    : 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Lightbulb className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Interpretar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Interpretação Detalhada
          </DialogTitle>
          <DialogDescription>
            Entenda cada componente do custo real do seu {vehicleName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Capital Imobilizado */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Capital Imobilizado</h4>
                <p className="text-lg font-bold">{formatMoney(summary.paidOffValue)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Este é o valor que você tem "preso" no veículo. É dinheiro que não está trabalhando para você — 
              não rende juros, dividendos ou qualquer retorno financeiro. Enquanto está no carro, 
              é como se estivesse guardado "debaixo do colchão".
            </p>
          </div>

          {/* Custo de Oportunidade */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <PiggyBank className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Custo de Oportunidade</h4>
                <p className="text-lg font-bold text-primary">{formatMoney(summary.totalOpportunityCost)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {opportunityWeight.toFixed(1)}% do custo total
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Se você vendesse o carro e investisse os {formatMoney(summary.paidOffValue)} a 100% CDI 
              ({formatPercent(summary.cdiUsed)} a.a.), em {years} anos teria <strong>{formatMoney(summary.finalInvestedCapital)}</strong>. 
              O custo de oportunidade de <strong>{formatMoney(summary.totalOpportunityCost)}</strong> é o rendimento que você 
              deixa de ganhar por manter o dinheiro no carro.
            </p>
            <div className="flex items-center gap-2 text-xs bg-primary/5 p-2 rounded">
              <Info className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Isso representa <strong>{capitalLostPercent.toFixed(1)}%</strong> do valor investido no veículo.
              </span>
            </div>
          </div>

          {/* Despesas Operacionais (apenas se modo completo) */}
          {analysisMode === 'with_expenses' && summary.totalExpenses > 0 && (
            <div className="p-4 rounded-lg bg-expense/10 border border-expense/20 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-expense/20 flex items-center justify-center">
                  <CircleDollarSign className="h-4 w-4 text-expense" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Despesas Operacionais</h4>
                  <p className="text-lg font-bold text-expense">{formatMoney(summary.totalExpenses)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {expenseWeight.toFixed(1)}% do custo total
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Soma de todos os gastos para manter e operar o veículo ao longo de {years} anos: 
                combustível, seguro, IPVA, manutenção, pneus, limpeza, entre outros. 
                Em média, você gasta <strong>{formatMoney(summary.totalExpenses / projectionMonths)}/mês</strong> para manter o carro rodando.
              </p>
            </div>
          )}

          {/* Custo do Crédito (financiamento ou consórcio) */}
          {isFinanced && creditInfo && creditCost > 0 && (
            <div className={cn(
              "p-4 rounded-lg border space-y-2",
              creditInfo.tipo === 'consorcio' 
                ? "bg-amber-500/10 border-amber-500/20" 
                : "bg-red-500/10 border-red-500/20"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  creditInfo.tipo === 'consorcio' ? "bg-amber-500/20" : "bg-red-500/20"
                )}>
                  {creditInfo.tipo === 'consorcio' 
                    ? <Users className="h-4 w-4 text-amber-600" />
                    : <Landmark className="h-4 w-4 text-red-600" />
                  }
                </div>
                <div>
                  <h4 className="font-medium text-sm">
                    {creditInfo.tipo === 'consorcio' ? 'Custo do Consórcio' : 'Custo do Financiamento'}
                  </h4>
                  <p className={cn(
                    "text-lg font-bold",
                    creditInfo.tipo === 'consorcio' ? "text-amber-600" : "text-red-600"
                  )}>
                    {formatMoney(creditCost)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {creditWeight.toFixed(1)}% do custo total
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {creditInfo.tipo === 'consorcio' ? (
                  <>
                    Taxas administrativas e fundo de reserva do consórcio.
                    {creditInfo.parcelasRestantes > 0 && (
                      <> Ainda faltam <strong>{creditInfo.parcelasRestantes} parcelas</strong> de {formatMoney(creditInfo.valorParcela)}.</>
                    )}
                  </>
                ) : (
                  <>
                    Você está pagando <strong>{creditInfo.taxaJurosImplicita.toFixed(1)}%</strong> de juros sobre o valor financiado.
                    {creditInfo.parcelasRestantes > 0 && (
                      <> Ainda faltam <strong>{creditInfo.parcelasRestantes} parcelas</strong> de {formatMoney(creditInfo.valorParcela)}.</>
                    )}
                  </>
                )}
              </p>
              <div className={cn(
                "flex items-center gap-2 text-xs p-2 rounded",
                creditInfo.tipo === 'consorcio' ? "bg-amber-500/5" : "bg-red-500/5"
              )}>
                <Info className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  creditInfo.tipo === 'consorcio' ? "text-amber-600" : "text-red-600"
                )} />
                <span>
                  {creditInfo.tipo === 'consorcio' 
                    ? 'Diferente do financiamento, no consórcio você não paga juros, mas sim taxas de administração.'
                    : 'Esse dinheiro pago em juros poderia estar rendendo para você em investimentos.'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Período sem o bem (consórcio não contemplado) - custos passados */}
          {isFinanced && creditInfo && creditInfo.tipo === 'consorcio' && (summary.mesesSemBem || 0) > 0 && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Período Sem o Bem (passado)</h4>
                  <p className="text-lg font-bold text-purple-600">{summary.mesesSemBem} meses</p>
                  <p className="text-[10px] text-muted-foreground">
                    {deadPeriodWeight.toFixed(1)}% do custo total (custo de oportunidade)
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Durante {summary.mesesSemBem} meses você pagou <strong>{formatMoney(creditInfo.valorPagoSemBem)}</strong> sem 
                ter o veículo. Isso representa um custo de oportunidade extra de <strong>{formatMoney(deadPeriodCost)}</strong>, 
                pois você perdeu o rendimento E não teve o benefício do carro.
              </p>
              <div className="flex items-center gap-2 text-xs bg-purple-500/5 p-2 rounded">
                <Info className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>
                  Este é o custo "dobrado" do consórcio: você paga, mas não tem nem o dinheiro nem o carro até ser contemplado.
                </span>
              </div>
            </div>
          )}
          
          {/* Projeção bifásica: período futuro sem o bem */}
          {isFinanced && creditInfo && creditInfo.tipo === 'consorcio' && !creditInfo.contemplado && (
            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Projeção Bifásica</h4>
                  <p className="text-xs text-muted-foreground">Custos diferentes antes e depois da contemplação</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-indigo-500/5 rounded">
                  <p className="text-muted-foreground">Fase 1: Sem o carro</p>
                  <p className="font-medium">Apenas parcelas</p>
                  <p className="text-[10px] text-muted-foreground">Sem IPVA, seguro, combustível, manutenção</p>
                </div>
                <div className="p-2 bg-indigo-500/5 rounded">
                  <p className="text-muted-foreground">Fase 2: Com o carro</p>
                  <p className="font-medium">Custos completos</p>
                  <p className="text-[10px] text-muted-foreground">Parcelas + despesas operacionais + depreciação</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A projeção considera que você <strong>não terá custos de carro</strong> até ser contemplado. 
                Após a contemplação, os custos operacionais são incluídos na análise.
              </p>
            </div>
          )}

          {/* Depreciação */}
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Depreciação Total</h4>
                <p className="text-lg font-bold text-orange-600">{formatMoney(summary.totalDepreciation)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {depreciationWeight.toFixed(1)}% do custo total
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Carros perdem valor ao longo do tempo. Esta é a perda estimada de patrimônio: 
              o carro que hoje vale {formatMoney(summary.paidOffValue)} valerá aproximadamente 
              <strong> {formatMoney(summary.paidOffValue - summary.totalDepreciation)}</strong> daqui a {years} anos. 
              Isso representa uma desvalorização de <strong>{depreciationPercent.toFixed(1)}%</strong>.
            </p>
          </div>

          {/* Conclusão */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-expense/10 border space-y-3">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-foreground" />
              <h4 className="font-medium">Custo Real Total</h4>
            </div>
            
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-2xl font-bold">{formatMoney(summary.realTotalCost)}</p>
                <p className="text-xs text-muted-foreground">em {years} anos</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
              <div className="text-right">
                <p className="text-2xl font-bold text-expense">{formatMoney(summary.realMonthlyCost)}/mês</p>
                <p className="text-xs text-muted-foreground">≈ {formatMoney(summary.equivalentDailyRent)}/dia</p>
              </div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium">O que isso significa?</p>
              <p className="text-xs text-muted-foreground">
                {analysisMode === 'with_expenses' ? (
                  <>
                    Ter este carro custa efetivamente <strong>{formatMoney(summary.realMonthlyCost)}</strong> por mês 
                    quando você considera: o dinheiro parado que poderia estar rendendo, 
                    a perda de valor do veículo e todas as despesas operacionais.
                  </>
                ) : (
                  <>
                    Mesmo sem considerar despesas operacionais, manter este carro custa 
                    <strong> {formatMoney(summary.realMonthlyCost)}</strong> por mês em termos de perda de patrimônio 
                    (depreciação) e rendimento que você deixa de ganhar (custo de oportunidade).
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Compare esse valor com alternativas como: aluguel de carro quando precisar, 
                apps de transporte (Uber/99), ou transporte público — e avalie se ter carro próprio 
                faz sentido para o seu perfil de uso.
              </p>
            </div>
          </div>

          {/* Composição visual */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs font-medium mb-2">Composição do Custo Total</p>
            <div className="flex h-4 rounded-full overflow-hidden">
              <div 
                className="bg-primary" 
                style={{ width: `${opportunityWeight}%` }}
                title={`Custo de Oportunidade: ${opportunityWeight.toFixed(1)}%`}
              />
              {isFinanced && creditWeight > 0 && (
                <div 
                  className={creditInfo?.tipo === 'consorcio' ? "bg-amber-500" : "bg-red-500"}
                  style={{ width: `${creditWeight}%` }}
                  title={`${creditInfo?.tipo === 'consorcio' ? 'Taxas' : 'Juros'}: ${creditWeight.toFixed(1)}%`}
                />
              )}
              {isFinanced && deadPeriodWeight > 0 && (
                <div 
                  className="bg-purple-500" 
                  style={{ width: `${deadPeriodWeight}%` }}
                  title={`Período sem bem: ${deadPeriodWeight.toFixed(1)}%`}
                />
              )}
              {analysisMode === 'with_expenses' && expenseWeight > 0 && (
                <div 
                  className="bg-expense" 
                  style={{ width: `${expenseWeight}%` }}
                  title={`Despesas: ${expenseWeight.toFixed(1)}%`}
                />
              )}
              <div 
                className="bg-orange-500" 
                style={{ width: `${depreciationWeight}%` }}
                title={`Depreciação: ${depreciationWeight.toFixed(1)}%`}
              />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Oport. {opportunityWeight.toFixed(0)}%
              </span>
              {isFinanced && creditWeight > 0 && (
                <span className="flex items-center gap-1">
                  <span className={cn("h-2 w-2 rounded-full", creditInfo?.tipo === 'consorcio' ? "bg-amber-500" : "bg-red-500")} />
                  {creditInfo?.tipo === 'consorcio' ? 'Taxas' : 'Juros'} {creditWeight.toFixed(0)}%
                </span>
              )}
              {isFinanced && deadPeriodWeight > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  S/bem {deadPeriodWeight.toFixed(0)}%
                </span>
              )}
              {analysisMode === 'with_expenses' && expenseWeight > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-expense" />
                  Desp. {expenseWeight.toFixed(0)}%
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Depr. {depreciationWeight.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
