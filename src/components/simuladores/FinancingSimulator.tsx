import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  ShieldAlert, 
  Landmark, 
  ArrowRightLeft,
  CalendarDays,
  Info,
  Upload,
  LogIn
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreditos } from '@/hooks/useCreditos';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Consorcio, Financiamento } from '@/types/credito';
import { OpportunityCostAnalysis } from './OpportunityCostAnalysis';
import { ConsorcioSimulator } from './ConsorcioSimulator';
import { FinanciamentoSimulator } from './FinanciamentoSimulator';

type SimulationMode = 'consorcio' | 'financiamento' | 'comparar';
type AmortizationType = 'PRICE' | 'SAC';
type TableView = 'anual' | 'mensal';

interface FluxoItem {
  ano: number;
  mes: number;
  isReajuste: boolean;
  valorCarta: number;
  parcelaConsorcio: number;
  totalPagoConsorcio: number;
  saldoDevedorFinanc: number;
  parcelaFinanc: number;
  totalPagoFinanciamento: number;
}

interface SimulationResults {
  consorcio: {
    parcelaInicial: number;
    parcelaFinal: number;
    totalPago: number;
    valorFinalBem: number;
  };
  financiamento: {
    parcelaInicial: number;
    parcelaFinal: number;
    totalPago: number;
    totalJuros: number;
  };
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const FinancingSimulator: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { consorcios, financiamentos, loading: creditosLoading } = useCreditos();

  // Estados de Controle
  const [modo, setModo] = useState<SimulationMode>('comparar');
  const [visaoTabela, setVisaoTabela] = useState<TableView>('anual');

  // Parâmetros Comuns
  const [valorBem, setValorBem] = useState(50000);
  const [prazo, setPrazo] = useState(60);
  const [rendimentoInvestimento, setRendimentoInvestimento] = useState(0.85);

  // Parâmetros Consórcio
  const [taxaAdm, setTaxaAdm] = useState(15);
  const [fundoReserva, setFundoReserva] = useState(2);
  const [seguroConsorcio, setSeguroConsorcio] = useState(0.05);
  const [reajusteAnual, setReajusteAnual] = useState(4.5);

  // Parâmetros Financiamento
  const [entrada, setEntrada] = useState(10000);
  const [jurosMensais, setJurosMensais] = useState(1.49);
  const [taxasExtrasFinanc, setTaxasExtrasFinanc] = useState(1500);
  const [seguroMensalFinanc, setSeguroMensalFinanc] = useState(35);
  const [sistemaAmortizacao, setSistemaAmortizacao] = useState<AmortizationType>('PRICE');

  // Load consórcio into simulator
  const loadConsorcio = (c: Consorcio) => {
    setModo('consorcio');
    setValorBem(c.valor_carta);
    setPrazo(c.prazo_total);
    setTaxaAdm(c.taxa_adm_total);
    setFundoReserva(c.fundo_reserva);
    setSeguroConsorcio(c.seguro_mensal);
    setReajusteAnual(c.reajuste_anual);
  };

  // Load financiamento into simulator
  const loadFinanciamento = (f: Financiamento) => {
    setModo('financiamento');
    setValorBem(f.valor_bem);
    setPrazo(f.prazo_total);
    setEntrada(f.valor_entrada);
    setJurosMensais(f.taxa_juros_mensal);
    setTaxasExtrasFinanc(f.taxas_extras);
    setSeguroMensalFinanc(f.seguro_mensal);
    setSistemaAmortizacao(f.sistema_amortizacao);
  };

  // Resultados
  const [resultados, setResultados] = useState<SimulationResults | null>(null);
  const [fluxoCaixa, setFluxoCaixa] = useState<FluxoItem[]>([]);

  const calcularTudo = () => {
    // Cálculos Iniciais Consórcio
    let totalPagoConsorcio = 0;
    let valorCartaAtual = valorBem;
    const taxaTotalPercentual = (taxaAdm + fundoReserva) / 100;

    // Cálculos Iniciais Financiamento
    let totalPagoFinanciamento = entrada;
    let saldoDevedorFinanc = (valorBem - entrada) + taxasExtrasFinanc;
    const amortizacaoSAC = saldoDevedorFinanc / prazo;

    // Cálculo da Parcela Fixa PRICE (PMT)
    const taxaJurosDec = jurosMensais / 100;
    let parcelaPriceBase = 0;
    if (taxaJurosDec > 0) {
      parcelaPriceBase = saldoDevedorFinanc * ((taxaJurosDec * Math.pow(1 + taxaJurosDec, prazo)) / (Math.pow(1 + taxaJurosDec, prazo) - 1));
    } else {
      parcelaPriceBase = saldoDevedorFinanc / prazo;
    }

    const fluxo: FluxoItem[] = [];

    for (let mes = 1; mes <= prazo; mes++) {
      // Lógica Consórcio - Reajuste anual (mês 13, 25, 37...)
      const isMesReajuste = mes > 1 && (mes - 1) % 12 === 0;
      
      if (isMesReajuste) {
        valorCartaAtual = valorCartaAtual * (1 + (reajusteAnual / 100));
      }

      // Parcela = (CartaAtual * (1 + TaxasFixas)) / Prazo
      const parcelaBaseConsorcio = (valorCartaAtual * (1 + taxaTotalPercentual)) / prazo;
      const valorSeguroConsorcio = valorCartaAtual * (seguroConsorcio / 100);
      const parcelaTotalConsorcio = parcelaBaseConsorcio + valorSeguroConsorcio;
      totalPagoConsorcio += parcelaTotalConsorcio;

      // Lógica Financiamento
      let parcelaFinancTotal = 0;
      const jurosMes = saldoDevedorFinanc * taxaJurosDec;
      let amortizacaoMes = 0;

      if (sistemaAmortizacao === 'SAC') {
        amortizacaoMes = amortizacaoSAC;
        parcelaFinancTotal = amortizacaoMes + jurosMes + seguroMensalFinanc;
      } else {
        parcelaFinancTotal = parcelaPriceBase + seguroMensalFinanc;
        amortizacaoMes = parcelaPriceBase - jurosMes;
      }

      // Ajuste final para última parcela
      if (saldoDevedorFinanc < amortizacaoMes || mes === prazo) {
        amortizacaoMes = saldoDevedorFinanc;
        parcelaFinancTotal = amortizacaoMes + jurosMes + seguroMensalFinanc;
      }

      saldoDevedorFinanc -= amortizacaoMes;
      if (saldoDevedorFinanc < 0) saldoDevedorFinanc = 0;
      totalPagoFinanciamento += parcelaFinancTotal;

      fluxo.push({
        ano: Math.ceil(mes / 12),
        mes,
        isReajuste: isMesReajuste,
        valorCarta: valorCartaAtual,
        parcelaConsorcio: parcelaTotalConsorcio,
        totalPagoConsorcio,
        saldoDevedorFinanc,
        parcelaFinanc: parcelaFinancTotal,
        totalPagoFinanciamento,
      });
    }

    setResultados({
      consorcio: {
        parcelaInicial: ((valorBem * (1 + taxaTotalPercentual)) / prazo) + (valorBem * (seguroConsorcio / 100)),
        parcelaFinal: fluxo[fluxo.length - 1].parcelaConsorcio,
        totalPago: totalPagoConsorcio,
        valorFinalBem: valorCartaAtual
      },
      financiamento: {
        parcelaInicial: fluxo[0].parcelaFinanc,
        parcelaFinal: fluxo[fluxo.length - 1].parcelaFinanc,
        totalPago: totalPagoFinanciamento,
        totalJuros: totalPagoFinanciamento - (valorBem - entrada) - entrada
      }
    });
    setFluxoCaixa(fluxo);
  };

  useEffect(() => {
    calcularTudo();
  }, [valorBem, prazo, taxaAdm, fundoReserva, reajusteAnual, rendimentoInvestimento, entrada, jurosMensais, sistemaAmortizacao, seguroConsorcio, taxasExtrasFinanc, seguroMensalFinanc]);

  const filteredFluxo = useMemo(() => {
    return fluxoCaixa.filter(row => 
      visaoTabela === 'mensal' || (row.mes % 12 === 0 || row.mes === prazo)
    );
  }, [fluxoCaixa, visaoTabela, prazo]);

  const showConsorcio = modo === 'consorcio' || modo === 'comparar';
  const showFinanciamento = modo === 'financiamento' || modo === 'comparar';

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Modo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Simulador de Crédito Completo
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare Consórcio x Financiamento com todas as taxas ocultas: Seguros, IOF, TAC e Reajustes
          </p>
      </div>

      {/* Registered Credits Section */}
      {user && (consorcios.length > 0 || financiamentos.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Carregar Dados Cadastrados
            </CardTitle>
            <CardDescription>Carregue os parâmetros de um consórcio ou financiamento cadastrado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {consorcios.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadConsorcio(c)}
                  className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <TrendingUp className="h-3 w-3" />
                  {c.nome}
                </Button>
              ))}
              {financiamentos.map((f) => (
                <Button
                  key={f.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadFinanciamento(f)}
                  className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <Landmark className="h-3 w-3" />
                  {f.nome}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogIn className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Salve seus consórcios e financiamentos</p>
                  <p className="text-xs text-muted-foreground">Faça login para cadastrar e simular seus créditos</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                Entrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

        <Tabs value={modo} onValueChange={(v) => setModo(v as SimulationMode)}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="consorcio">
              <TrendingUp className="h-4 w-4" />
              Consórcio
            </TabsTrigger>
            <TabsTrigger value="financiamento">
              <Landmark className="h-4 w-4" />
              Financiamento
            </TabsTrigger>
            <TabsTrigger value="comparar">
              <ArrowRightLeft className="h-4 w-4" />
              Comparar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Consórcio - Simulador Completo */}
      {modo === 'consorcio' && (
        <ConsorcioSimulator />
      )}

      {/* Financiamento - Simulador Completo */}
      {modo === 'financiamento' && (
        <FinanciamentoSimulator />
      )}

      {/* Comparar */}
      {modo === 'comparar' && (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Coluna de Inputs - Progressive Disclosure */}
        <div className="xl:col-span-4 space-y-4">
          {/* Step 1: Parâmetros Gerais (sempre visíveis) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Valor e Prazo
              </CardTitle>
              <CardDescription className="text-xs">
                Primeiro, informe o valor do bem que deseja adquirir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Valor do Bem</Label>
                <Input
                  type="number"
                  value={valorBem}
                  onChange={(e) => setValorBem(Number(e.target.value))}
                  placeholder="Ex: 50000"
                />
              </div>
              
              {/* Step 2: Prazo - só aparece após valor do bem */}
              {valorBem > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label>Prazo (Meses)</Label>
                  <Input
                    type="number"
                    value={prazo}
                    onChange={(e) => setPrazo(Number(e.target.value))}
                    placeholder="Ex: 60"
                  />
                </div>
              )}
              
              {/* Step 3: Custo de Oportunidade - só aparece após prazo */}
              {valorBem > 0 && prazo > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-1">
                    <Label>Custo Oportunidade (% a.m.)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p>Rendimento que você teria se investisse o dinheiro (CDI, poupança, etc.)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={rendimentoInvestimento}
                    onChange={(e) => setRendimentoInvestimento(Number(e.target.value))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 4: Inputs Consórcio - só aparece após parâmetros básicos */}
          {valorBem > 0 && prazo > 0 && showConsorcio && (
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <TrendingUp className="h-4 w-4" />
                  Consórcio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-blue-700 dark:text-blue-400">Taxa Adm Total (%)</Label>
                    <Input
                      type="number"
                      value={taxaAdm}
                      onChange={(e) => setTaxaAdm(Number(e.target.value))}
                      className="border-blue-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-blue-700 dark:text-blue-400">Fundo Reserva (%)</Label>
                    <Input
                      type="number"
                      value={fundoReserva}
                      onChange={(e) => setFundoReserva(Number(e.target.value))}
                      className="border-blue-200"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-white/50 dark:bg-background/50 rounded-lg border border-blue-200">
                  <Label className="text-xs uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    Seguro Prestamista (% a.m.)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={seguroConsorcio}
                    onChange={(e) => setSeguroConsorcio(Number(e.target.value))}
                    className="border-blue-200"
                  />
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">Cobrado todo mês sobre a carta.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-blue-700 dark:text-blue-400">Reajuste Anual (IPCA/INCC) %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={reajusteAnual}
                    onChange={(e) => setReajusteAnual(Number(e.target.value))}
                    className="border-blue-200"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Inputs Financiamento - só aparece após parâmetros básicos */}
          {valorBem > 0 && prazo > 0 && showFinanciamento && (
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Landmark className="h-4 w-4" />
                  Financiamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-emerald-700 dark:text-emerald-400">Entrada (R$)</Label>
                    <Input
                      type="number"
                      value={entrada}
                      onChange={(e) => setEntrada(Number(e.target.value))}
                      className="border-emerald-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Tabela</Label>
                    <Select value={sistemaAmortizacao} onValueChange={(v) => setSistemaAmortizacao(v as AmortizationType)}>
                      <SelectTrigger className="border-emerald-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRICE">PRICE</SelectItem>
                        <SelectItem value="SAC">SAC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Juros Mensais (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={jurosMensais}
                    onChange={(e) => setJurosMensais(Number(e.target.value))}
                    className="border-emerald-200"
                  />
                </div>

                <div className="space-y-3 p-3 bg-white/50 dark:bg-background/50 rounded-lg border border-emerald-200">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-emerald-700 dark:text-emerald-400">
                      Taxas Financiadas (IOF, TAC, Reg.) R$
                    </Label>
                    <Input
                      type="number"
                      value={taxasExtrasFinanc}
                      onChange={(e) => setTaxasExtrasFinanc(Number(e.target.value))}
                      className="border-emerald-200"
                    />
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Soma-se ao valor solicitado e paga juros.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-emerald-700 dark:text-emerald-400">
                      Seguro Mensal (R$)
                    </Label>
                    <Input
                      type="number"
                      value={seguroMensalFinanc}
                      onChange={(e) => setSeguroMensalFinanc(Number(e.target.value))}
                      className="border-emerald-200"
                    />
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Valor fixo somado na parcela.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna de Resultados - Progressive Disclosure */}
        <div className="xl:col-span-8 space-y-4">
          {/* Placeholder quando não há dados suficientes */}
          {(!valorBem || valorBem <= 0 || !prazo || prazo <= 0) && (
            <div className="flex items-center justify-center p-12 border-2 border-dashed border-muted-foreground/20 rounded-xl min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <Calculator className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Preencha os parâmetros</p>
                <p className="text-sm mt-1">Informe o valor do bem e o prazo para ver a simulação</p>
              </div>
            </div>
          )}
          
          {/* Cards de Resumo - só aparece quando há resultados válidos */}
          {resultados && valorBem > 0 && prazo > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-400">
              {showConsorcio && (
                <Card className="border-t-4 border-t-blue-500">
                  <CardHeader className="pb-2">
                    <Badge variant="outline" className="w-fit text-blue-600 border-blue-200 bg-blue-50">
                      CONSÓRCIO
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Parcela Inicial → Final</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold">{formatMoney(resultados.consorcio.parcelaInicial)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-lg font-semibold text-muted-foreground">{formatMoney(resultados.consorcio.parcelaFinal)}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Total Pago</p>
                      <p className="text-2xl font-bold text-blue-600">{formatMoney(resultados.consorcio.totalPago)}</p>
                      <p className="text-xs text-muted-foreground">
                        Multiplicador: <span className="font-bold">{(resultados.consorcio.totalPago / valorBem).toFixed(2)}x</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {showFinanciamento && (
                <Card className="border-t-4 border-t-emerald-500">
                  <CardHeader className="pb-2">
                    <Badge variant="outline" className="w-fit text-emerald-600 border-emerald-200 bg-emerald-50">
                      FINANCIAMENTO
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Parcela Inicial → Final</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold">{formatMoney(resultados.financiamento.parcelaInicial)}</span>
                        {sistemaAmortizacao === 'SAC' && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-lg font-semibold text-muted-foreground">{formatMoney(resultados.financiamento.parcelaFinal)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Total Pago</p>
                      <p className="text-2xl font-bold text-emerald-600">{formatMoney(resultados.financiamento.totalPago)}</p>
                      <p className="text-xs text-muted-foreground">
                        Valor Financiado Real: <strong>{formatMoney(valorBem - entrada + taxasExtrasFinanc)}</strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Opportunity Cost Analysis - com animação */}
          {resultados && valorBem > 0 && prazo > 0 && modo === 'comparar' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <OpportunityCostAnalysis
                parcelaConsorcio={resultados.consorcio.parcelaInicial}
                parcelaFinanciamento={resultados.financiamento.parcelaInicial}
                totalConsorcio={resultados.consorcio.totalPago}
                totalFinanciamento={resultados.financiamento.totalPago}
                prazo={prazo}
                valorBem={valorBem}
                rendimentoMensal={rendimentoInvestimento}
              />
            </div>
          )}

          {/* Tabela de Fluxo - só aparece após resultados */}
          {resultados && valorBem > 0 && prazo > 0 && (
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fluxo de Pagamentos
              </CardTitle>
              <Tabs value={visaoTabela} onValueChange={(v) => setVisaoTabela(v as TableView)}>
                <TabsList className="h-8">
                  <TabsTrigger value="anual" className="text-xs h-7 gap-1">
                    <Calendar className="h-3 w-3" />
                    Resumo Anual
                  </TabsTrigger>
                  <TabsTrigger value="mensal" className="text-xs h-7 gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Mês a Mês
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background">Período</TableHead>
                      {showConsorcio && (
                        <>
                          <TableHead className="sticky top-0 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">Parcela</TableHead>
                          <TableHead className="sticky top-0 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">Acumulado</TableHead>
                        </>
                      )}
                      {showFinanciamento && (
                        <>
                          <TableHead className="sticky top-0 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">Parcela</TableHead>
                          <TableHead className="sticky top-0 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">Acumulado</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFluxo.map((row) => (
                      <TableRow key={row.mes} className={row.isReajuste ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">Mês {row.mes}</span>
                            <span className="text-[10px] text-muted-foreground">Ano {row.ano}</span>
                            {row.isReajuste && (
                              <Badge variant="outline" className="text-[10px] h-4 w-fit text-amber-600 border-amber-200 mt-1">
                                REAJUSTE
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {showConsorcio && (
                          <>
                            <TableCell className="font-medium">
                              {formatMoney(row.parcelaConsorcio)}
                              {row.isReajuste && (
                                <div className="text-[10px] text-amber-600">Carta: {formatMoney(row.valorCarta)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatMoney(row.totalPagoConsorcio)}</TableCell>
                          </>
                        )}
                        {showFinanciamento && (
                          <>
                            <TableCell className="font-medium">{formatMoney(row.parcelaFinanc)}</TableCell>
                            <TableCell className="text-muted-foreground">{formatMoney(row.totalPagoFinanciamento)}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
          )}

          {/* Análise de Riscos - só aparece após resultados */}
          {resultados && valorBem > 0 && prazo > 0 && (
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Matriz de Riscos e Considerações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showConsorcio && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Impacto do Seguro no Consórcio
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                      O seguro ({seguroConsorcio}% a.m.) parece pouco, mas incide sobre o total da carta. 
                      Em um plano longo, pode representar <strong>mais de 3% a 5%</strong> do custo total do bem.
                    </p>
                  </div>
                )}

                {showFinanciamento && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      O Efeito "Bola de Neve" das Taxas
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
                      Ao financiar as taxas extras ({formatMoney(taxasExtrasFinanc)}), você paga juros sobre elas. 
                      No final, esses R$ {taxasExtrasFinanc.toLocaleString()} podem virar o dobro.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg border">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Consórcio vs Financiamento
                  </h4>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li><strong>Consórcio:</strong> Não paga juros, mas tem taxas de administração e reajuste anual</li>
                    <li><strong>Financiamento:</strong> Acesso imediato ao bem, mas juros compostos elevam o custo</li>
                    <li>Considere seu <strong>custo de oportunidade</strong> ao investir a diferença</li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Referências de Mercado (Brasil - 2024)
                  </h4>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 mt-2 space-y-1 list-disc list-inside">
                    <li>Taxa Selic: 10,75% a 12,25% a.a.</li>
                    <li>Financiamento Veículos: 1,2% a 2,5% a.m.</li>
                    <li>Taxa Adm Consórcio: 10% a 20% total</li>
                    <li>IPCA (inflação): ~4% a 6% a.a.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
