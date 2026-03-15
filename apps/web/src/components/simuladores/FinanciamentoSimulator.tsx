import React, { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { FinancialTermTooltip, InsightCard } from './FinancialTermTooltip';
import { 
  Car, 
  Home, 
  UserCheck, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  Layers,
  Download,
  ChevronDown,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// --- Constantes de Mercado ---
const DEFAULTS_MERCADO = {
  veiculo: {
    valor: 143563.29,
    entrada: 28700,
    prazo: 48,
    taxa: 1.55,
    sistema: 'PRICE' as const,
    avaliacao: 709,
    registro: 317.54,
    seguro: 0
  },
  imovel: {
    valor: 500000.00,
    entrada: 100000,
    prazo: 360,
    taxa: 0.85,
    sistema: 'SAC' as const,
    avaliacao: 0,
    registro: 0,
    seguro: 45.00
  },
  consignado: {
    valor: 30000.00,
    entrada: 0,
    prazo: 48,
    taxa: 1.85,
    sistema: 'PRICE' as const,
    avaliacao: 0,
    registro: 0,
    seguro: 0
  }
};

type TipoCredito = 'veiculo' | 'imovel' | 'consignado';
type SistemaAmortizacao = 'PRICE' | 'SAC';
type ViewMode = 'graficos' | 'tabela';
type TabelaView = 'anual' | 'mensal';

interface CronogramaItem {
  mes: number;
  parcela: number;
  amortizacao: number;
  juros: number;
  saldo: number;
  acumuladoPago: number;
  acumuladoPrincipal: number;
  percentualQuitado: number;
}

interface DadosCalculados {
  cronograma: CronogramaItem[];
  totalPago: number;
  totalJuros: number;
  totalEncargos: number;
  iof: number;
  taxasIniciais: number;
  cetAnual: number;
  cetMensal: number;
  pmtInicial: number;
  pmtFinal: number;
  principalPuro: number;
  pctPrincipal: number;
  pctJuros: number;
  pctEncargos: number;
  entryPercentage: number;
  turningPointMonth: number | null;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatCompact = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

// --- Motor Financeiro ---
const FinancialEngine = {
  calculateIOF: (valorFinanciado: number, prazo: number): number => {
    const aliquotaAdicional = 0.0038;
    const aliquotaDiaria = 0.000082;
    const dias = Math.min(prazo * 30, 365);
    return (valorFinanciado * aliquotaAdicional) + (valorFinanciado * aliquotaDiaria * dias);
  },
  calculateCET: (valorBemOriginal: number, pmt: number, prazo: number, chuteInicial = 0.01): number => {
    let taxa = chuteInicial;
    for (let i = 0; i < 50; i++) {
      let f = 0, df = 0;
      for (let t = 1; t <= prazo; t++) {
        const fator = Math.pow(1 + taxa, t);
        f += pmt / fator;
        df -= (t * pmt) / (fator * (1 + taxa));
      }
      f -= valorBemOriginal;
      if (Math.abs(df) < 0.0001) break;
      const novaTaxa = taxa - f / df;
      if (Math.abs(novaTaxa - taxa) < 0.000001) return novaTaxa;
      taxa = novaTaxa;
    }
    return taxa;
  }
};

// --- Gráfico Donut Simplificado ---
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

export const FinanciamentoSimulator: React.FC = () => {
  const isMobile = useIsMobile();
  // Estados principais
  const [tipo, setTipo] = useState<TipoCredito>('veiculo');
  const [valorBem, setValorBem] = useState(DEFAULTS_MERCADO.veiculo.valor);
  const [entrada, setEntrada] = useState(DEFAULTS_MERCADO.veiculo.entrada);
  const [prazo, setPrazo] = useState(DEFAULTS_MERCADO.veiculo.prazo);
  const [taxaNominal, setTaxaNominal] = useState(DEFAULTS_MERCADO.veiculo.taxa);
  const [sistema, setSistema] = useState<SistemaAmortizacao>(DEFAULTS_MERCADO.veiculo.sistema);
  const [taxaAvaliacao, setTaxaAvaliacao] = useState(DEFAULTS_MERCADO.veiculo.avaliacao);
  const [taxaRegistro, setTaxaRegistro] = useState(DEFAULTS_MERCADO.veiculo.registro);
  const [seguroMensal, setSeguroMensal] = useState(DEFAULTS_MERCADO.veiculo.seguro);

  // Estados de visualização
  const [viewMode, setViewMode] = useState<ViewMode>('graficos');
  const [tabelaView, setTabelaView] = useState<TabelaView>('anual');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Atualizar defaults quando tipo muda
  useEffect(() => {
    const d = DEFAULTS_MERCADO[tipo];
    setValorBem(d.valor);
    setEntrada(d.entrada);
    setPrazo(d.prazo);
    setTaxaNominal(d.taxa);
    setSistema(d.sistema);
    setTaxaAvaliacao(d.avaliacao);
    setTaxaRegistro(d.registro);
    setSeguroMensal(d.seguro);
  }, [tipo]);

  // Cálculos principais
  const data = useMemo<DadosCalculados>(() => {
    const principalPuro = valorBem - entrada;
    const iof = tipo === 'imovel' ? 0 : FinancialEngine.calculateIOF(principalPuro, prazo);
    const taxasIniciais = tipo === 'veiculo' ? (taxaAvaliacao + taxaRegistro) : 0;
    const totalSeguros = seguroMensal * prazo;
    const totalEncargos = iof + taxasIniciais + totalSeguros;
    
    const principalTotal = principalPuro + iof + taxasIniciais;
    const i = taxaNominal / 100;

    const cronograma: CronogramaItem[] = [];
    let saldo = principalTotal;
    let acumuladoPago = 0;
    let acumuladoPrincipal = 0;
    let turningPointMonth: number | null = null;

    for (let t = 1; t <= prazo; t++) {
      let pmtTotal: number, jurosMes: number, amortizacaoMes: number;

      if (sistema === 'PRICE') {
        const pmtBase = i > 0 
          ? principalTotal * (i * Math.pow(1 + i, prazo)) / (Math.pow(1 + i, prazo) - 1)
          : principalTotal / prazo;
        jurosMes = saldo * i;
        amortizacaoMes = pmtBase - jurosMes;
        pmtTotal = pmtBase + seguroMensal;
      } else {
        amortizacaoMes = principalTotal / prazo;
        jurosMes = saldo * i;
        pmtTotal = amortizacaoMes + jurosMes + seguroMensal;
      }

      saldo -= amortizacaoMes;
      acumuladoPago += pmtTotal;
      acumuladoPrincipal += amortizacaoMes;

      // Detectar ponto de virada
      if (turningPointMonth === null && acumuladoPrincipal >= Math.max(0, saldo)) {
        turningPointMonth = t;
      }

      cronograma.push({
        mes: t,
        parcela: pmtTotal,
        amortizacao: amortizacaoMes,
        juros: jurosMes,
        saldo: Math.max(0, saldo),
        acumuladoPago,
        acumuladoPrincipal: Math.min(principalPuro, acumuladoPrincipal),
        percentualQuitado: (Math.min(principalPuro, acumuladoPrincipal) / principalPuro) * 100
      });
    }

    const totalJuros = cronograma.reduce((acc, curr) => acc + curr.juros, 0);
    const cetMensal = FinancialEngine.calculateCET(principalPuro, cronograma[0]?.parcela || 0, prazo, i);

    return {
      cronograma,
      totalPago: acumuladoPago,
      totalJuros,
      totalEncargos,
      iof,
      taxasIniciais,
      cetAnual: (Math.pow(1 + cetMensal, 12) - 1) * 100,
      cetMensal: cetMensal * 100,
      pmtInicial: cronograma[0]?.parcela || 0,
      pmtFinal: cronograma[cronograma.length - 1]?.parcela || 0,
      principalPuro,
      pctPrincipal: (principalPuro / acumuladoPago) * 100,
      pctJuros: (totalJuros / acumuladoPago) * 100,
      pctEncargos: (totalEncargos / acumuladoPago) * 100,
      entryPercentage: (entrada / valorBem) * 100,
      turningPointMonth,
    };
  }, [tipo, valorBem, entrada, prazo, taxaNominal, sistema, taxaAvaliacao, taxaRegistro, seguroMensal]);

  // Dados para gráficos
  const chartFluxoData = useMemo(() => {
    const interval = Math.max(1, Math.ceil(prazo / 12));
    return data.cronograma.filter((_, idx) => idx % interval === 0).map(m => ({
      mes: m.mes,
      juros: m.juros,
      amortizacao: m.amortizacao,
    }));
  }, [data.cronograma, prazo]);

  const chartBalanceData = useMemo(() => {
    const interval = Math.max(1, Math.ceil(prazo / 8));
    return data.cronograma.filter((_, idx) => idx % interval === 0 || idx === prazo - 1).map(m => ({
      mes: m.mes,
      divida: m.saldo,
      patrimonio: m.acumuladoPrincipal,
    }));
  }, [data.cronograma, prazo]);

  const donutData = useMemo(() => [
    { label: 'Bem', value: data.pctPrincipal, color: 'hsl(var(--primary))' },
    { label: 'Juros', value: data.pctJuros, color: 'hsl(var(--primary) / 0.4)' },
    { label: 'Taxas', value: data.pctEncargos, color: 'hsl(var(--expense))' },
  ], [data.pctPrincipal, data.pctJuros, data.pctEncargos]);

  const filteredCronograma = useMemo(() => {
    if (tabelaView === 'anual') {
      return data.cronograma.filter(m => m.mes % 12 === 0 || m.mes === prazo);
    }
    return data.cronograma;
  }, [data.cronograma, tabelaView, prazo]);

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Mês;Parcela;Amortização;Juros;Saldo Devedor;Total Pago\n"; 
    
    data.cronograma.forEach(row => {
      const line = [
        row.mes,
        row.parcela.toFixed(2).replace('.', ','),
        row.amortizacao.toFixed(2).replace('.', ','),
        row.juros.toFixed(2).replace('.', ','),
        row.saldo.toFixed(2).replace('.', ','),
        row.acumuladoPago.toFixed(2).replace('.', ',')
      ].join(";");
      csvContent += line + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financiamento_${tipo}_${prazo}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartConfig = {
    juros: { label: "Juros", color: "hsl(var(--primary) / 0.3)" },
    amortizacao: { label: "Amortização", color: "hsl(var(--primary))" },
    divida: { label: "Dívida", color: "hsl(var(--expense))" },
    patrimonio: { label: "Patrimônio", color: "hsl(var(--income))" },
  };

  // Insight dinâmico baseado nos dados
  const getInsight = () => {
    if (data.entryPercentage < 10) {
      return { type: 'warning' as const, title: 'Entrada muito baixa', desc: `Com apenas ${data.entryPercentage.toFixed(0)}% de entrada, você pagará muito mais juros. Tente aumentar para pelo menos 20%.` };
    }
    if (data.entryPercentage >= 30) {
      return { type: 'success' as const, title: 'Excelente entrada!', desc: `${data.entryPercentage.toFixed(0)}% de entrada garante as melhores taxas do mercado.` };
    }
    if (data.cetAnual > 40) {
      return { type: 'warning' as const, title: 'CET muito alto', desc: 'Compare com outras instituições. Um CET acima de 40% a.a. é considerado caro.' };
    }
    return { type: 'tip' as const, title: 'Dica', desc: sistema === 'PRICE' ? 'No sistema PRICE você paga mais juros no total, mas as parcelas são previsíveis.' : 'O SAC começa mais pesado, mas você paga menos juros no total.' };
  };

  const insight = getInsight();

  return (
    <div className="space-y-6">
      {/* Seletor de Tipo */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-muted/50 rounded-xl w-fit">
        {[
          { id: 'veiculo' as const, icon: Car, label: 'Veículo' },
          { id: 'imovel' as const, icon: Home, label: 'Imóvel' },
          { id: 'consignado' as const, icon: UserCheck, label: 'Consignado' }
        ].map(t => (
          <Button
            key={t.id}
            variant={tipo === t.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setTipo(t.id)}
            className={cn("gap-2", tipo === t.id && "shadow-sm")}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Coluna de Inputs — C5B formulário */}
        <div className="xl:col-span-4 space-y-4">
          <Card className="bg-card border border-border rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                Dados do Financiamento
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Preencha os valores para simular
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {/* Valor do Bem */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Valor do veículo</span>
                <CurrencyInput
                  value={valorBem}
                  onChange={setValorBem}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="font-sans font-bold text-2xl h-12 rounded-xl border border-border bg-card text-foreground tabular-nums"
                />
              </div>

              {/* Entrada % e R$ side-by-side sincronizados */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Entrada</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={valorBem > 0 ? ((entrada / valorBem) * 100).toFixed(1) : '0'}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value);
                        if (!Number.isNaN(pct)) setEntrada((valorBem * Math.min(100, Math.max(0, pct))) / 100);
                      }}
                      className="h-12 rounded-xl border border-border bg-card text-foreground font-sans font-semibold tabular-nums pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <CurrencyInput
                    value={entrada}
                    onChange={setEntrada}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="h-12 rounded-xl border border-border bg-card text-foreground font-syne font-bold"
                  />
                </div>
              </div>

              {/* Prazo — slider customizado */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Prazo (meses)</span>
                <div className="space-y-3">
                  <Slider
                    value={[prazo]}
                    onValueChange={([v]) => setPrazo(v)}
                    min={6}
                    max={tipo === 'imovel' ? 360 : 84}
                    step={1}
                    className="[&_.relative.h-2]:bg-muted [&_.relative.h-2]:rounded-full [&_.block.h-5.w-5]:bg-primary [&_.block.h-5.w-5]:border-2 [&_.block.h-5.w-5]:border-primary-foreground [&_.block.h-5.w-5]:rounded-full"
                  />
                  <p className="font-sans font-semibold tabular-nums tracking-tight text-primary text-xl">{prazo} meses</p>
                </div>
              </div>

              {/* Taxa de juros — input com sufixo % a.m. */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <FinancialTermTooltip termKey="juros" iconOnly />
                  Taxa de juros
                </span>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.01}
                    value={taxaNominal.toFixed(2)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(',', '.'));
                      if (!Number.isNaN(v)) setTaxaNominal(Math.min(10, Math.max(0, v)));
                    }}
                    className="h-12 rounded-xl border border-border bg-card text-foreground font-sans font-semibold tabular-nums pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">% a.m.</span>
                </div>
              </div>

              {/* Sistema de Amortização */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Como prefere pagar?</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSistema('PRICE')}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      sistema === 'PRICE'
                        ? "bg-primary/10 border-primary text-foreground"
                        : "bg-card border-border hover:border-primary/50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FinancialTermTooltip termKey="price" iconOnly />
                      <span className="font-bold text-xs">Fixas</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight">Valor igual todo mês</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSistema('SAC')}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      sistema === 'SAC'
                        ? "bg-primary/10 border-primary text-foreground"
                        : "bg-card border-border hover:border-primary/50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FinancialTermTooltip termKey="sac" iconOnly />
                      <span className="font-bold text-xs">Decrescentes</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight">Começa maior e diminui</div>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxas Adicionais (Collapsible) */}
          {tipo !== 'consignado' && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Taxas Adicionais
                    </CardTitle>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform text-muted-foreground",
                      showAdvanced && "rotate-180"
                    )} />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {tipo === 'veiculo' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Taxa Avaliação</Label>
                          <CurrencyInput value={taxaAvaliacao} onChange={setTaxaAvaliacao} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Taxa Registro</Label>
                          <CurrencyInput value={taxaRegistro} onChange={setTaxaRegistro} />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Seguro Mensal (R$)</Label>
                      <CurrencyInput value={seguroMensal} onChange={setSeguroMensal} />
                    </div>

                    {data.iof > 0 && (
                      <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1">
                          <FinancialTermTooltip termKey="iof" iconOnly />
                          IOF Estimado
                        </span>
                        <span className="text-sm font-bold">{formatMoney(data.iof)}</span>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* FinancingResultCard — C5B */}
          <Card className="bg-card border border-border rounded-xl">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Parcela mensal</p>
                <p className="font-sans font-bold tracking-tight leading-none tabular-nums text-foreground text-[40px] md:text-[48px]">
                  {formatMoney(data.pmtInicial)}
                </p>
              </div>
              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor financiado</p>
                  <p className="text-sm font-sans font-semibold tabular-nums tracking-tight text-foreground">{formatMoney(data.principalPuro + data.iof + data.taxasIniciais)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de juros</p>
                  <p className="text-sm font-sans font-semibold tabular-nums tracking-tight text-expense">{formatMoney(data.totalJuros)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Custo total</p>
                  <p className="text-sm font-sans font-semibold tabular-nums tracking-tight text-foreground">{formatMoney(data.totalPago)}</p>
                </div>
              </div>
              {/* Barra de composição principal vs juros */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Composição</p>
                <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${data.pctPrincipal}%` }}
                  />
                  <div
                    className="h-full bg-expense transition-all"
                    style={{ width: `${data.pctJuros}%` }}
                  />
                  {data.pctEncargos > 0 && (
                    <div
                      className="h-full bg-muted transition-all"
                      style={{ width: `${data.pctEncargos}%` }}
                    />
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {prazo} parcelas · {taxaNominal.toFixed(2)}% a.m.
                {data.cetAnual > 0 && (
                  <span className="ml-1">
                    · CET <FinancialTermTooltip termKey="cet" variant="inline" showIcon={false}>{data.cetAnual.toFixed(2)}% a.a.</FinancialTermTooltip>
                  </span>
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-card border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-xl font-sans font-bold"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Salvar simulação (CSV)
              </Button>
            </CardContent>
          </Card>

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
              {/* Gráfico: Composição da Parcela */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Composição da Parcela
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Quanto vai para você vs. para o banco
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <BarChart data={chartFluxoData} barCategoryGap="20%">
                      <CartesianGrid {...premiumGrid} />
                      <XAxis 
                        dataKey="mes" 
                        {...premiumXAxis}
                        tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                        tickFormatter={(v) => `${v}m`}
                      />
                      <YAxis
                        hide={isMobile}
                        {...premiumYAxis}
                        tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                        tickFormatter={(v) => formatCompact(v)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => <span>{formatMoney(Number(value))}</span>}
                          />
                        }
                      />
                      <Bar dataKey="juros" stackId="a" fill="var(--color-juros)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="amortizacao" stackId="a" fill="var(--color-amortizacao)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-primary" />
                      <span className="text-xs text-muted-foreground">
                        <FinancialTermTooltip termKey="amortizacao" variant="inline" showIcon={false}>
                          Amortização
                        </FinancialTermTooltip>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-primary/30" />
                      <span className="text-xs text-muted-foreground">Juros</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico: Composição Total */}
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
                    data={donutData}
                    centerLabel="Multiplicador"
                    centerValue={`${(data.totalPago / data.principalPuro).toFixed(2)}x`}
                  />
                  <div className="grid grid-cols-3 gap-2 w-full mt-4">
                    {donutData.map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center p-2">
                        <div 
                          className="w-8 h-1 rounded-full mb-1.5" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{item.label}</span>
                        <span className="text-xs font-bold">{Math.round(item.value)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico: Ponto de Virada */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    Quem é Dono do Bem?
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Acompanhe quando o bem passa a ser mais seu do que do banco
                    {data.turningPointMonth && (
                      <span className="ml-1 text-income font-medium">
                        • Virada no mês {data.turningPointMonth}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-56 w-full">
                    <AreaChart data={chartBalanceData}>
                      <CartesianGrid {...premiumGrid} />
                      <XAxis 
                        dataKey="mes" 
                        {...premiumXAxis}
                        tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                        tickFormatter={(v) => `${v}m`}
                      />
                      <YAxis
                        hide={isMobile}
                        {...premiumYAxis}
                        tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                        tickFormatter={(v) => formatCompact(v)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => <span>{formatMoney(Number(value))}</span>}
                          />
                        }
                      />
                      <Area 
                        type="monotone" 
                        dataKey="divida" 
                        stroke="hsl(var(--expense))" 
                        fill="hsl(var(--expense) / 0.2)"
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="patrimonio" 
                        stroke="hsl(var(--income))" 
                        fill="hsl(var(--income) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-expense" />
                      <span className="text-xs text-muted-foreground">
                        <FinancialTermTooltip termKey="saldoDevedor" variant="inline" showIcon={false}>
                          Dívida Restante
                        </FinancialTermTooltip>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-income" />
                      <span className="text-xs text-muted-foreground">Você já possui</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Cronograma de Pagamentos</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Tabs value={tabelaView} onValueChange={(v) => setTabelaView(v as TabelaView)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="anual" className="text-xs h-7">Anual</TabsTrigger>
                      <TabsTrigger value="mensal" className="text-xs h-7">Mensal</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
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
                        <TableHead className="sticky top-0 bg-background">
                          <FinancialTermTooltip termKey="amortizacao" variant="inline" showIcon={false}>
                            Amortização
                          </FinancialTermTooltip>
                        </TableHead>
                        <TableHead className="sticky top-0 bg-background">Juros</TableHead>
                        <TableHead className="sticky top-0 bg-background">
                          <FinancialTermTooltip termKey="saldoDevedor" variant="inline" showIcon={false}>
                            Saldo Devedor
                          </FinancialTermTooltip>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCronograma.map((m) => (
                        <TableRow key={m.mes} className="hover:bg-muted/50">
                          <TableCell className="font-bold text-muted-foreground">{m.mes}º</TableCell>
                          <TableCell className="font-bold">{formatMoney(m.parcela)}</TableCell>
                          <TableCell className="text-income font-medium">{formatMoney(m.amortizacao)}</TableCell>
                          <TableCell className="text-expense/70 font-medium">{formatMoney(m.juros)}</TableCell>
                          <TableCell className="font-bold text-primary">{formatMoney(m.saldo)}</TableCell>
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
