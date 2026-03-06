import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Info,
  TrendingUp,
  RefreshCw,
  DollarSign,
  PiggyBank,
  CalendarDays,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { FinancialTermTooltip } from './FinancialTermTooltip';
import { DescontoJustoContextSection } from './DescontoJustoContextSection';

interface InstallmentDetail {
  month: number;
  nominal: number;
  presentValue: number;
  costOfTime: number;
  costPercent: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

export const DescontoJustoSimulator: React.FC = () => {
  // Estados de entrada
  const [purchaseValue, setPurchaseValue] = useState(1000);
  const [installments, setInstallments] = useState(12);
  const [cdiRate, setCdiRate] = useState(14.15);
  const [isLoadingCdi, setIsLoadingCdi] = useState(false);
  
  // Estados de visualização
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [monthlyExpense, setMonthlyExpense] = useState(500);
  
  // Fetch CDI automático
  const fetchCdiRate = async () => {
    setIsLoadingCdi(true);
    try {
      const response = await fetch('https://brasilapi.com.br/api/taxas/v1/cdi');
      const data = await response.json();
      if (data && data.valor) {
        setCdiRate(data.valor);
      }
    } catch (error) {
      console.error('Erro ao buscar CDI:', error);
    } finally {
      setIsLoadingCdi(false);
    }
  };

  useEffect(() => {
    fetchCdiRate();
  }, []);

  // Cálculos
  const calculations = useMemo(() => {
    // Taxa mensal efetiva (CDI anual -> mensal, com 85% líquido após IR médio)
    const monthlyRate = Math.pow(1 + (cdiRate / 100), 1/12) - 1;
    const effectiveRate = monthlyRate * 0.85; // 85% do CDI (conservador, após IR)
    
    const installmentValue = purchaseValue / installments;
    
    // Calcular valor presente de cada parcela
    const installmentDetails: InstallmentDetail[] = [];
    let totalPresentValue = 0;
    
    for (let month = 1; month <= installments; month++) {
      const pv = installmentValue / Math.pow(1 + effectiveRate, month);
      const costOfTime = installmentValue - pv;
      const costPercent = (costOfTime / installmentValue) * 100;
      
      totalPresentValue += pv;
      
      installmentDetails.push({
        month,
        nominal: installmentValue,
        presentValue: pv,
        costOfTime,
        costPercent
      });
    }
    
    // Desconto justo
    const fairDiscount = purchaseValue - totalPresentValue;
    const fairDiscountPercent = (fairDiscount / purchaseValue) * 100;
    
    // Custo do parcelamento para o consumidor (rendimento perdido)
    const lostYield = purchaseValue - totalPresentValue;
    
    return {
      monthlyRate,
      effectiveRate,
      installmentValue,
      installmentDetails,
      totalPresentValue,
      fairDiscount,
      fairDiscountPercent,
      lostYield,
      opportunityRate: effectiveRate * 100
    };
  }, [purchaseValue, installments, cdiRate]);

  // Cálculo de economia anual
  const annualSavings = useMemo(() => {
    const monthlyRate = Math.pow(1 + (cdiRate / 100), 1/12) - 1;
    const effectiveRate = monthlyRate * 0.85;
    
    // Se economizar o desconto justo todo mês
    const monthlyDiscount = (monthlyExpense * calculations.fairDiscountPercent) / 100;
    const annualTotal = monthlyDiscount * 12;
    
    // Com rendimento composto
    let accumulated = 0;
    for (let month = 1; month <= 12; month++) {
      accumulated = (accumulated + monthlyDiscount) * (1 + effectiveRate);
    }
    
    return {
      monthlyDiscount,
      annualTotal,
      withYield: accumulated
    };
  }, [monthlyExpense, calculations.fairDiscountPercent, cdiRate]);

  const handlePurchaseValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setPurchaseValue(Number(rawValue) / 100);
  };

  return (
    <div className="space-y-6">
      {/* Seção de Contexto Visual */}
      <DescontoJustoContextSection 
        purchaseValue={purchaseValue}
        installments={installments}
        effectiveRate={calculations.effectiveRate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna de Inputs */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Valor da Compra (R$)</Label>
                <Input
                  type="text"
                  value={purchaseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  onChange={handlePurchaseValueChange}
                  className="text-lg font-semibold"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Número de Parcelas (1-60x)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={installments}
                  onChange={(e) => setInstallments(Math.min(60, Math.max(1, Number(e.target.value))))}
                />
                {installments > 60 && (
                  <p className="text-xs text-destructive">Limite de 60x para fins de simulação.</p>
                )}
              </div>
              
              <div className="space-y-2">
              <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    CDI Anual (%)
                    <FinancialTermTooltip termKey="cdi" iconOnly />
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchCdiRate}
                    disabled={isLoadingCdi}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingCdi ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={cdiRate}
                  onChange={(e) => setCdiRate(Number(e.target.value))}
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>
                    Taxa de Oportunidade (85% CDI): <strong>{formatPercent(calculations.opportunityRate)} a.m.</strong>
                  </span>
                </div>
              </div>
          </CardContent>
          </Card>
        </div>

        {/* Coluna de Resultados */}
        <div className="lg:col-span-8 space-y-4">
          {/* Banner Principal do Resultado - Dark Style */}
          <Card className="bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden">
            <CardContent className="pt-8 pb-8">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                <div className="flex-1">
                  <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
                    Desconto Mínimo Sugerido
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <motion.span
                      key={calculations.fairDiscountPercent}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-sans font-bold tracking-tight leading-none tabular-nums text-[40px] md:text-[48px] text-blue-400"
                    >
                      {formatPercent(calculations.fairDiscountPercent)}
                    </motion.span>
                    <span className="text-xl text-slate-300">
                      ({formatCurrency(calculations.fairDiscount)})
                    </span>
                  </div>
                  <p className="mt-4 text-slate-400 text-sm max-w-md">
                    Este é o "ponto de equilíbrio". Se o lojista der menos que isso, o parcelamento é mais caro para ele do que o desconto à vista.
                  </p>
                </div>

                {/* Botão Provocador */}
                <button
                  onClick={() => setShowSavingsModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-4 py-3 rounded-xl flex flex-col items-center justify-center transition-all backdrop-blur-sm shadow-lg hover:shadow-2xl"
                >
                  <span className="text-lg font-extrabold text-white text-center">
                    {formatPercent(calculations.fairDiscountPercent)} de economia é pouco?
                  </span>
                  <span className="text-xs uppercase tracking-widest text-slate-300 mt-1 flex items-center gap-1">
                    Simule o Impacto Anual →
                  </span>
                </button>
              </div>
              
              {/* Efeito de Fundo */}
              <div className="absolute right-0 bottom-0 opacity-5 transform translate-y-4 translate-x-4 pointer-events-none">
                <Info className="w-48 h-48" />
              </div>
            </CardContent>
          </Card>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                      <p className="text-2xl font-bold">{formatCurrency(calculations.installmentValue)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Parcelamento sem juros nominal</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Rendimento Perdido
                        <FinancialTermTooltip termKey="opportunityCost" iconOnly />
                      </p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(calculations.lostYield)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Custo de oportunidade do parcelamento</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Tabela de Fluxo Detalhado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fluxo Detalhado de Recebimento</CardTitle>
              <CardDescription>
                Veja quanto cada parcela realmente vale em dinheiro de hoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16">Mês</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          Valor Real (Hoje)
                          <FinancialTermTooltip termKey="presentValue" iconOnly />
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Custo do Prazo (R$)</TableHead>
                      <TableHead className="text-right">% Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.installmentDetails.map((item) => (
                      <TableRow key={item.month}>
                        <TableCell className="font-medium">{item.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.nominal)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(item.presentValue)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          -{formatCurrency(item.costOfTime)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono text-xs">
                            -{formatPercent(item.costPercent, 1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Linha de Total */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(purchaseValue)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(calculations.totalPresentValue)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(calculations.fairDiscount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="font-mono">
                          -{formatPercent(calculations.fairDiscountPercent, 1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Insight Card */}
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                  <PiggyBank className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                    Dica de Economia
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    Ao pagar à vista com {formatPercent(calculations.fairDiscountPercent)} de desconto, você economiza {formatCurrency(calculations.fairDiscount)}. Se investisse o valor total no CDI, renderia aproximadamente {formatPercent(calculations.opportunityRate)} ao mês.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Economia Anual - Design atualizado */}
      <Dialog open={showSavingsModal} onOpenChange={setShowSavingsModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Header cinza com texto provocador */}
          <div className="bg-gray-200 dark:bg-gray-800 p-6 text-center border-b border-gray-300 dark:border-gray-700">
            <h3 className="text-xl md:text-2xl font-extrabold text-foreground">
              {formatPercent(calculations.fairDiscountPercent)} de economia é pouco?
            </h3>
          </div>

          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600 shadow-inner">
              <PiggyBank className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold text-foreground mb-2">Poder do Desconto no Tempo</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Imagine se você aplicasse essa lógica de "Desconto Justo" em <strong>todas</strong> as suas compras do mês. Quanto sobraria no seu bolso?
            </p>

            <div className="space-y-6">
              <div className="text-left">
                <Label className="text-sm font-semibold mb-2 block">
                  Quanto você gasta por mês em compras?
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                  <Input
                    type="text"
                    value={monthlyExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setMonthlyExpense(Number(rawValue) / 100);
                    }}
                    className="pl-10 text-lg font-bold"
                    placeholder="Ex: 2.000,00"
                  />
                </div>
              </div>
              
              {/* Resultado grande e destacado */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 text-center">
                <p className="text-sm text-green-600 dark:text-green-400 font-semibold uppercase tracking-wider mb-2">
                  Sua economia anual potencial
                </p>
                <p className="font-sans font-bold tracking-tight leading-none tabular-nums text-[40px] md:text-[48px] text-green-700 dark:text-green-300">
                  R$ {annualSavings.annualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Aplicando {formatPercent(calculations.fairDiscountPercent)} de desconto em todas as compras parceláveis
                </p>
              </div>

              {/* Cards adicionais */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Por mês</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(annualSavings.monthlyDiscount)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">+ CDI</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(annualSavings.withYield)}
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              * Considerando investimento a {formatPercent(calculations.opportunityRate)} ao mês (85% do CDI).
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DescontoJustoSimulator;
