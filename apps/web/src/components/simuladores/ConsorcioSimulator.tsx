import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SliderInput } from '@/components/ui/slider-input';
import { IndexHistoryPopover } from './IndexHistoryPopover';
import { FinancialTermTooltip, InsightCard } from './FinancialTermTooltip';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Calculator,
  TrendingUp,
  Calendar,
  Percent,
  Home,
  Car,
  Truck,
  Wallet,
  ChevronDown,
  Check,
  Zap,
  Plus,
  FileText,
  Coins,
  ArrowUpRight,
  BarChart3,
  Download,
  Layers,
  PieChart,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

// Configurações simplificadas de tipos
const CONSORCIO_TYPES = {
  imovel: {
    label: 'Imóveis',
    icon: Home,
    description: 'Casas, apartamentos, terrenos',
    defaults: { credit: 300000, months: 180, admin: 22, reserve: 2, insurance: 0.04, inflation: 6.0, index: 'incc' as const },
  },
  veiculo: {
    label: 'Veículos',
    icon: Car,
    description: 'Carros, motos, caminhões',
    defaults: { credit: 80000, months: 72, admin: 16, reserve: 2, insurance: 0.05, inflation: 4.5, index: 'ipca' as const },
  },
  pesados: {
    label: 'Pesados',
    icon: Truck,
    description: 'Caminhões, máquinas agrícolas',
    defaults: { credit: 200000, months: 100, admin: 14, reserve: 1, insurance: 0.06, inflation: 4.5, index: 'ipca' as const },
  },
  servicos: {
    label: 'Serviços',
    icon: Wallet,
    description: 'Viagens, reformas, cirurgias',
    defaults: { credit: 30000, months: 48, admin: 15, reserve: 1, insurance: 0.03, inflation: 4.0, index: 'ipca' as const },
  },
};

const INDICES_CONFIG = {
  ipca: { label: 'IPCA', name: 'Inflação Oficial', defaultRate: 4.5 },
  incc: { label: 'INCC', name: 'Custo Construção', defaultRate: 6.0 },
  igpm: { label: 'IGPM', name: 'Índice Geral', defaultRate: 5.5 },
};

type ConsorcioType = keyof typeof CONSORCIO_TYPES;
type IndexType = keyof typeof INDICES_CONFIG;
type BidType = 'prazo' | 'parcela';
type TabelaView = 'anual' | 'mensal';
type ViewMode = 'graficos' | 'tabela';

interface ChartDataItem {
  month: number;
  payment: number;
  accumulatedPaid: number;
  creditValue: number;
  originalCredit: number;
  remainingBalance: number;
}

interface SimulationResults {
  firstInstallment: number;
  lastInstallment: number;
  finalLetterValue: number;
  totalAppreciation: number;
  finalMonths: number;
  totalPaid: number;
  netCreditValue: number;
  embeddedBidValue: number;
  costOverCredit: number;
  cetPercent: number;
  appliedBid: number;
  totalEffectiveBid: number;
}

const COLORS = {
  principal: 'hsl(var(--primary))',
  admin: 'hsl(var(--chart-2))',
  reserve: 'hsl(var(--chart-3))',
  insurance: 'hsl(var(--chart-4))',
  growth: 'hsl(var(--income))',
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatCompact = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

// Donut simplificado
const SimpleDonut: React.FC<{
  data: { label: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
}> = ({ data, centerValue, centerLabel }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativePercent = 0;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="hsl(var(--muted))" strokeWidth="2.5" />
        {data.map((segment, idx) => {
          const percent = (segment.value / total) * 100;
          const strokeDasharray = `${percent} ${100 - percent}`;
          const strokeDashoffset = -cumulativePercent;
          cumulativePercent += percent;
          return (
            <circle
              key={idx}
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke={segment.color}
              strokeWidth="2.5"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">{centerLabel}</span>
        <span className="text-lg font-bold">{centerValue}</span>
      </div>
    </div>
  );
};

export const ConsorcioSimulator: React.FC = () => {
  // Estado do tipo
  const [selectedType, setSelectedType] = useState<ConsorcioType>('veiculo');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Parâmetros básicos
  const [creditValue, setCreditValue] = useState(80000);
  const [months, setMonths] = useState(72);

  // Taxas
  const [adminFee, setAdminFee] = useState(16);
  const [reserveFund, setReserveFund] = useState(2);
  const [insuranceMonthly, setInsuranceMonthly] = useState(0.05);

  // Reajuste
  const [inflationRate, setInflationRate] = useState(4.5);
  const [selectedIndex, setSelectedIndex] = useState<IndexType>('ipca');

  // Lances
  const [bidAmount, setBidAmount] = useState(0);
  const [embeddedBidPercent, setEmbeddedBidPercent] = useState(0);
  const [bidType, setBidType] = useState<BidType>('prazo');

  // Visualização
  const [viewMode, setViewMode] = useState<ViewMode>('graficos');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBidConfig, setShowBidConfig] = useState(false);
  const [tabelaView, setTabelaView] = useState<TabelaView>('anual');

  // Resultados
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);

  const handleTypeChange = (typeKey: ConsorcioType) => {
    const typeConfig = CONSORCIO_TYPES[typeKey];
    setSelectedType(typeKey);
    setCreditValue(typeConfig.defaults.credit);
    setMonths(typeConfig.defaults.months);
    setAdminFee(typeConfig.defaults.admin);
    setReserveFund(typeConfig.defaults.reserve);
    setInsuranceMonthly(typeConfig.defaults.insurance);
    setInflationRate(typeConfig.defaults.inflation);
    setSelectedIndex(typeConfig.defaults.index);
    setBidAmount(0);
    setEmbeddedBidPercent(0);
    setIsTypeDropdownOpen(false);
  };

  const handleIndexChange = (indexKey: IndexType) => {
    setSelectedIndex(indexKey);
    setInflationRate(INDICES_CONFIG[indexKey].defaultRate);
  };

  // Lógica de cálculo
  useEffect(() => {
    const calculateConsorcio = () => {
      const totalAdminFeeValue = creditValue * (adminFee / 100);
      const totalReserveFundValue = creditValue * (reserveFund / 100);
      const baseDebt = creditValue + totalAdminFeeValue + totalReserveFundValue;

      const monthlyCommonFundPart = creditValue / months;
      const monthlyAdminPart = totalAdminFeeValue / months;
      const monthlyReservePart = totalReserveFundValue / months;
      const monthlyInsuranceValue = creditValue * (insuranceMonthly / 100);

      let currentFullInstallment = monthlyCommonFundPart + monthlyAdminPart + monthlyReservePart + monthlyInsuranceValue;
      let currentRawInstallment = monthlyCommonFundPart + monthlyAdminPart + monthlyReservePart;

      let finalMonths = months;

      const embeddedBidValue = creditValue * (embeddedBidPercent / 100);
      const totalEffectiveBid = bidAmount + embeddedBidValue;
      const netCreditValue = creditValue - embeddedBidValue;

      let appliedBid = Math.min(totalEffectiveBid, baseDebt);

      if (appliedBid > 0) {
        const totalDebtNoInsurance = currentRawInstallment * months;
        const newBalanceDue = totalDebtNoInsurance - appliedBid;

        if (bidType === 'prazo') {
          finalMonths = Math.ceil(newBalanceDue / currentRawInstallment);
        } else {
          const reductionFactor = newBalanceDue / totalDebtNoInsurance;
          currentRawInstallment = currentRawInstallment * reductionFactor;
          currentFullInstallment = currentRawInstallment + monthlyInsuranceValue;
        }
      }

      const tempData: Omit<ChartDataItem, 'remainingBalance'>[] = [];
      let accumulatedPaid = 0;
      let currentCreditValue = creditValue;
      let installmentValue = currentFullInstallment;
      let lastInstallmentValue = 0;

      if (bidAmount > 0) {
        accumulatedPaid += bidAmount;
      }

      for (let i = 1; i <= months; i++) {
        if (i > 1 && (i - 1) % 12 === 0) {
          const adjustmentFactor = 1 + inflationRate / 100;
          currentCreditValue = currentCreditValue * adjustmentFactor;
          installmentValue = installmentValue * adjustmentFactor;
        }

        let paymentThisMonth = 0;

        if (i <= finalMonths) {
          paymentThisMonth = installmentValue;
          lastInstallmentValue = installmentValue;
        }

        let visualPayment = paymentThisMonth;
        if (i === 1 && bidAmount > 0) {
          visualPayment += bidAmount;
        }

        accumulatedPaid += paymentThisMonth;

        if (i > finalMonths) {
          visualPayment = 0;
        }

        tempData.push({
          month: i,
          payment: visualPayment,
          accumulatedPaid: accumulatedPaid,
          creditValue: currentCreditValue,
          originalCredit: creditValue,
        });
      }

      const totalPaidFinal = accumulatedPaid;

      const finalData: ChartDataItem[] = tempData.map((item) => ({
        ...item,
        remainingBalance: Math.max(0, totalPaidFinal - item.accumulatedPaid),
      }));

      const costOverCredit = totalPaidFinal - netCreditValue;
      const cetPercent = (costOverCredit / netCreditValue) * 100;
      const totalAppreciation = currentCreditValue - creditValue;

      setResults({
        firstInstallment: currentFullInstallment,
        lastInstallment: lastInstallmentValue,
        finalLetterValue: currentCreditValue,
        totalAppreciation,
        finalMonths,
        totalPaid: totalPaidFinal,
        netCreditValue,
        embeddedBidValue,
        costOverCredit,
        cetPercent,
        appliedBid,
        totalEffectiveBid,
      });

      setChartData(finalData);
    };

    calculateConsorcio();
  }, [creditValue, months, adminFee, reserveFund, insuranceMonthly, bidAmount, embeddedBidPercent, bidType, inflationRate]);

  const exportToCSV = () => {
    if (!chartData || chartData.length === 0) return;

    const headers = ['Mês', 'Parcela', 'Acumulado Pago', 'Saldo Devedor', 'Valor da Carta'];
    const csvContent = [
      headers.join(','),
      ...chartData.map((row) =>
        [
          row.month,
          `"${row.payment.toFixed(2).replace('.', ',')}"`,
          `"${row.accumulatedPaid.toFixed(2).replace('.', ',')}"`,
          `"${row.remainingBalance.toFixed(2).replace('.', ',')}"`,
          `"${row.creditValue.toFixed(2).replace('.', ',')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fluxo_consorcio.csv';
    link.click();
  };

  // Dados para gráficos - Parcela média por ano
  const chartFluxoData = useMemo(() => {
    const yearlyData: { ano: number; parcela: number }[] = [];
    const totalYears = Math.ceil(months / 12);
    
    for (let year = 1; year <= totalYears; year++) {
      const startMonth = (year - 1) * 12;
      const endMonth = Math.min(year * 12, months);
      const yearPayments = chartData.slice(startMonth, endMonth);
      
      if (yearPayments.length > 0) {
        const avgPayment = yearPayments.reduce((sum, m) => sum + m.payment, 0) / yearPayments.length;
        yearlyData.push({
          ano: year,
          parcela: avgPayment,
        });
      }
    }
    
    return yearlyData;
  }, [chartData, months]);

  const chartEvolucaoData = useMemo(() => {
    const interval = Math.max(1, Math.ceil(months / 8));
    return chartData.filter((_, idx) => idx % interval === 0 || idx === months - 1).map(m => ({
      mes: m.month,
      pago: m.accumulatedPaid,
      carta: m.creditValue,
    }));
  }, [chartData, months]);

  const compositionData = useMemo(() => {
    if (!results) return [];
    const totalTaxas = creditValue * (adminFee / 100);
    const totalReserva = creditValue * (reserveFund / 100);
    const totalSeguro = creditValue * (insuranceMonthly / 100) * months;
    const total = results.totalPaid;
    
    return [
      { label: 'Bem', value: (results.netCreditValue / total) * 100, color: COLORS.principal },
      { label: 'Taxas', value: (totalTaxas / total) * 100, color: COLORS.admin },
      { label: 'Reserva', value: (totalReserva / total) * 100, color: COLORS.reserve },
      { label: 'Seguros', value: (totalSeguro / total) * 100, color: COLORS.insurance },
    ];
  }, [results, creditValue, adminFee, reserveFund, insuranceMonthly, months]);

  const chartConfig = {
    parcela: { label: "Parcela", color: "hsl(var(--primary))" },
    pago: { label: "Total Pago", color: "hsl(var(--primary))" },
    carta: { label: "Valor da Carta", color: "hsl(var(--income))" },
  };

  // Filtered data for table view (annual vs monthly)
  const filteredChartData = useMemo(() => {
    if (tabelaView === 'anual') {
      return chartData.filter(m => m.month % 12 === 0 || m.month === months);
    }
    return chartData;
  }, [chartData, tabelaView, months]);

  // Insight dinâmico
  const getInsight = () => {
    if (adminFee > 20) {
      return { type: 'warning' as const, title: 'Taxa alta', desc: `Taxa de ${adminFee}% está acima da média. Pesquise outras administradoras.` };
    }
    if (embeddedBidPercent > 30) {
      return { type: 'warning' as const, title: 'Lance alto', desc: `Com ${embeddedBidPercent}% de lance embutido, você receberá menos crédito.` };
    }
    if (results && results.totalAppreciation > 0) {
      return { type: 'success' as const, title: 'Proteção contra inflação', desc: `Sua carta vai valorizar ~${formatCurrency(results.totalAppreciation)} durante o plano.` };
    }
    return { type: 'tip' as const, title: 'Sobre o consórcio', desc: 'Diferente do financiamento, você não paga juros. O custo são as taxas administrativas.' };
  };

  const insight = getInsight();
  const CurrentIcon = CONSORCIO_TYPES[selectedType].icon;

  return (
    <div className="space-y-6">
      {/* Seletor de Tipo */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-muted/50 rounded-xl w-fit">
        {Object.entries(CONSORCIO_TYPES).map(([key, type]) => {
          const TypeIcon = type.icon;
          return (
            <Button
              key={key}
              variant={selectedType === key ? "default" : "ghost"}
              size="sm"
              onClick={() => handleTypeChange(key as ConsorcioType)}
              className={cn("gap-2", selectedType === key && "shadow-sm")}
            >
              <TypeIcon className="h-4 w-4" />
              {type.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Coluna de Inputs */}
        <div className="xl:col-span-4 space-y-4">
          {/* Card Principal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Dados do Consórcio
              </CardTitle>
              <CardDescription className="text-xs">
                {CONSORCIO_TYPES[selectedType].description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Valor da Carta */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <FinancialTermTooltip termKey="carta" iconOnly />
                  Valor da Carta de Crédito
                </Label>
                <CurrencyInput value={creditValue} onChange={setCreditValue} />
              </div>

              {/* Prazo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prazo do Plano</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="pr-14 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">meses</span>
                </div>
              </div>

              {/* Índice de Reajuste */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <FinancialTermTooltip termKey="reajuste" iconOnly />
                  Índice de Reajuste Anual
                </Label>
                <div className="flex gap-2">
                  {Object.entries(INDICES_CONFIG).map(([key, config]) => (
                    <IndexHistoryPopover key={key} indexKey={key as 'ipca' | 'incc' | 'igpm'}>
                      <Button
                        variant={selectedIndex === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleIndexChange(key as IndexType)}
                        className="flex-1 gap-1"
                      >
                        <FinancialTermTooltip termKey={key as 'ipca' | 'incc' | 'igpm'} showIcon={false}>
                          {config.label}
                        </FinancialTermTooltip>
                        <TrendingUp className="h-3 w-3 opacity-50" />
                      </Button>
                    </IndexHistoryPopover>
                  ))}
                </div>
                <SliderInput
                  value={inflationRate}
                  onChange={setInflationRate}
                  min={0}
                  max={15}
                  step={0.1}
                  suffix="% a.a."
                  decimalPlaces={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Taxas (Collapsible) */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    Taxas da Administradora
                  </CardTitle>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform text-muted-foreground",
                    showAdvanced && "rotate-180"
                  )} />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <FinancialTermTooltip termKey="taxaAdm" iconOnly />
                      Taxa de Administração (Total)
                    </Label>
                    <SliderInput
                      value={adminFee}
                      onChange={setAdminFee}
                      min={0}
                      max={40}
                      step={0.1}
                      suffix="%"
                      decimalPlaces={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <FinancialTermTooltip termKey="fundoReserva" iconOnly />
                      Fundo de Reserva (Total)
                    </Label>
                    <SliderInput
                      value={reserveFund}
                      onChange={setReserveFund}
                      min={0}
                      max={10}
                      step={0.1}
                      suffix="%"
                      decimalPlaces={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Seguro Mensal</Label>
                    <SliderInput
                      value={insuranceMonthly}
                      onChange={setInsuranceMonthly}
                      min={0}
                      max={0.5}
                      step={0.01}
                      suffix="%"
                      decimalPlaces={2}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Lances (Collapsible) */}
          <Collapsible open={showBidConfig} onOpenChange={setShowBidConfig}>
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Zap className="h-4 w-4" />
                    Configurar Lance
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(bidAmount > 0 || embeddedBidPercent > 0) && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                        {formatCurrency(bidAmount + creditValue * (embeddedBidPercent / 100))}
                      </Badge>
                    )}
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform text-emerald-600",
                      showBidConfig && "rotate-180"
                    )} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <InsightCard
                    type="info"
                    title="O que é o lance?"
                    description="É uma oferta para tentar ser contemplado mais rápido. Você pode usar dinheiro próprio ou parte da sua carta."
                  />

                  {/* Lance Livre */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
                      <FinancialTermTooltip termKey="lance" iconOnly />
                      Lance Livre (do seu bolso)
                    </Label>
                    <CurrencyInput value={bidAmount} onChange={setBidAmount} />
                  </div>

                  {/* Lance Embutido */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1">
                        <FinancialTermTooltip termKey="lanceEmbutido" iconOnly />
                        Lance Embutido (usando a carta)
                      </span>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                        {embeddedBidPercent}%
                      </Badge>
                    </Label>
                    <SliderInput
                      value={embeddedBidPercent}
                      onChange={setEmbeddedBidPercent}
                      min={0}
                      max={50}
                      step={5}
                      suffix="%"
                      decimalPlaces={0}
                    />
                    {embeddedBidPercent > 0 && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 text-right">
                        Você receberá: {formatCurrency(creditValue - creditValue * (embeddedBidPercent / 100))}
                      </p>
                    )}
                  </div>

                  {/* Total do Lance */}
                  {(bidAmount > 0 || embeddedBidPercent > 0) && (
                    <div className="p-3 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-bold flex items-center gap-1 text-emerald-900 dark:text-emerald-300">
                          <Plus className="w-4 h-4" /> Lance Total
                        </span>
                        <span className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(bidAmount + creditValue * (embeddedBidPercent / 100))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tipo de Abatimento */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      Se contemplado, o que reduzir?
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={bidType === 'prazo' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBidType('prazo')}
                        className="gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        Prazo
                      </Button>
                      <Button
                        variant={bidType === 'parcela' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBidType('parcela')}
                        className="gap-1"
                      >
                        <Coins className="w-3 h-3" />
                        Parcela
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Card Resumo */}
          {results && (
            <Card className="bg-primary text-primary-foreground overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                  <Wallet className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    <FinancialTermTooltip termKey="carta">Crédito Líquido</FinancialTermTooltip>
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold">{formatCurrency(results.netCreditValue)}</span>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-white/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-80">1ª Parcela</span>
                    <span className="text-lg font-bold">{formatCurrency(results.firstInstallment)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs opacity-60">Última (corrigida)</span>
                    <span className="text-sm font-bold opacity-80">~{formatCurrency(results.lastInstallment)}</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="mt-4 pt-3 border-t border-white/20 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[10px] opacity-60 uppercase tracking-wide">Prazo</p>
                    <p className="text-sm font-bold">{results.finalMonths} meses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] opacity-60 uppercase tracking-wide">Custo</p>
                    <p className="text-sm font-bold">+{results.cetPercent.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] opacity-60 uppercase tracking-wide">Total</p>
                    <p className="text-sm font-bold">{formatCurrency(results.totalPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insight Dinâmico */}
          <InsightCard
            type={insight.type}
            title={insight.title}
            description={insight.desc}
          />
        </div>

        {/* Coluna de Resultados */}
        <div className="xl:col-span-8 space-y-4">
          {/* Navegação de Visualização */}
          <div className="flex bg-muted/50 p-1.5 rounded-xl">
            <Button
              variant={viewMode === 'graficos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('graficos')}
              className="flex-1 gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Análise Visual
            </Button>
            <Button
              variant={viewMode === 'tabela' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('tabela')}
              className="flex-1 gap-2"
            >
              <Layers className="h-4 w-4" />
              Tabela Detalhada
            </Button>
          </div>

          {viewMode === 'graficos' ? (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Gráfico: Evolução das Parcelas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Evolução das Parcelas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    As parcelas aumentam anualmente pela inflação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <BarChart data={chartFluxoData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="ano" 
                        tickLine={false} 
                        axisLine={false}
                        fontSize={10}
                        tickFormatter={(v) => `Ano ${v}`}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false}
                        fontSize={10}
                        tickFormatter={(v) => formatCompact(v)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(label) => `Ano ${label}`}
                            formatter={(value) => <span>{formatCurrency(Number(value))}</span>}
                          />
                        }
                      />
                      <Bar dataKey="parcela" fill="var(--color-parcela)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Gráfico: Composição */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" />
                    Para Onde Vai Seu Dinheiro
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Divisão do total que você vai pagar
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <SimpleDonut
                    data={compositionData}
                    centerLabel="Custo Total"
                    centerValue={results ? `+${results.cetPercent.toFixed(0)}%` : '0%'}
                  />
                  <div className="grid grid-cols-4 gap-1 w-full mt-4">
                    {compositionData.map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center p-1">
                        <div 
                          className="w-6 h-1 rounded-full mb-1" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[9px] font-medium text-muted-foreground uppercase">{item.label}</span>
                        <span className="text-xs font-bold">{Math.round(item.value)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico: Valorização da Carta */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                    Valorização da Carta vs. Total Pago
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Acompanhe como sua carta cresce com a inflação
                    {results && results.totalAppreciation > 0 && (
                      <span className="ml-1 text-income font-medium">
                        • Valorização de {formatCurrency(results.totalAppreciation)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-56 w-full">
                    <AreaChart data={chartEvolucaoData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="mes" 
                        tickLine={false} 
                        axisLine={false}
                        fontSize={10}
                        tickFormatter={(v) => `${v}m`}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false}
                        fontSize={10}
                        tickFormatter={(v) => formatCompact(v)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => <span>{formatCurrency(Number(value))}</span>}
                          />
                        }
                      />
                      <Area 
                        type="monotone" 
                        dataKey="pago" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.2)"
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="carta" 
                        stroke="hsl(var(--income))" 
                        fill="hsl(var(--income) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-primary" />
                      <span className="text-xs text-muted-foreground">Total Pago</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-income" />
                      <span className="text-xs text-muted-foreground">Valor da Carta</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Cronograma de Pagamentos</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Tabs value={tabelaView} onValueChange={(v) => setTabelaView(v as TabelaView)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="anual" className="text-xs h-7">Anual</TabsTrigger>
                      <TabsTrigger value="mensal" className="text-xs h-7">Mensal</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5">
                    <Download className="h-3 w-3" />
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background">Mês</TableHead>
                        <TableHead className="sticky top-0 bg-background">Parcela</TableHead>
                        <TableHead className="sticky top-0 bg-background">Acumulado</TableHead>
                        <TableHead className="sticky top-0 bg-background text-expense">Saldo Devedor</TableHead>
                        <TableHead className="sticky top-0 bg-background text-income">Valor Carta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChartData.map((row) => (
                        <TableRow 
                          key={row.month} 
                          className={cn(
                            "hover:bg-muted/50",
                            row.month % 12 === 0 && "bg-amber-50/50 dark:bg-amber-950/10"
                          )}
                        >
                          <TableCell className="font-bold text-muted-foreground">{row.month}º</TableCell>
                          <TableCell className="font-bold">{formatCurrency(row.payment)}</TableCell>
                          <TableCell>{formatCurrency(row.accumulatedPaid)}</TableCell>
                          <TableCell className="text-expense font-medium">{formatCurrency(row.remainingBalance)}</TableCell>
                          <TableCell className="text-income font-medium">{formatCurrency(row.creditValue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
