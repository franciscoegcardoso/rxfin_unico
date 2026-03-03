import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Landmark, TrendingUp, AlertTriangle, Info, HelpCircle, Calculator, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FinancingData {
  entradaValue: number;
  totalParcelas: number;
  parcelasPagas: number;
  valorParcela: number;
  // Novo campo CET
  cetAnual?: number;
  inputMode?: 'parcelas' | 'cet';
}

export interface FinancingCalculations {
  valorFinanciado: number;
  totalJaPago: number;
  parcelasRestantes: number;
  saldoDevedor: number;
  totalAPagar: number;
  totalJuros: number;
  taxaJurosImplicita: number;
  capitalImobilizado: number;
  cetCalculado?: number;
}

interface FinancingDataCardProps {
  vehicleValue: number;
  financingData: FinancingData;
  onFinancingDataChange: (data: FinancingData) => void;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Função para calcular parcela usando CET (aproximação via PMT)
const calcularParcelaPorCET = (
  valorFinanciado: number, 
  cetAnual: number, 
  totalParcelas: number
): number => {
  if (valorFinanciado <= 0 || cetAnual <= 0 || totalParcelas <= 0) return 0;
  
  // Converter CET anual para taxa mensal
  const taxaMensal = Math.pow(1 + cetAnual / 100, 1/12) - 1;
  
  // Fórmula PMT: P = PV * [i(1+i)^n] / [(1+i)^n - 1]
  const numerador = taxaMensal * Math.pow(1 + taxaMensal, totalParcelas);
  const denominador = Math.pow(1 + taxaMensal, totalParcelas) - 1;
  
  return valorFinanciado * (numerador / denominador);
};

// Função para calcular CET a partir das parcelas (aproximação)
const calcularCETPorParcelas = (
  valorFinanciado: number,
  valorParcela: number,
  totalParcelas: number
): number => {
  if (valorFinanciado <= 0 || valorParcela <= 0 || totalParcelas <= 0) return 0;
  
  // Newton-Raphson para encontrar taxa
  let taxa = 0.02; // Chute inicial de 2% a.m.
  
  for (let i = 0; i < 100; i++) {
    const numerador = taxa * Math.pow(1 + taxa, totalParcelas);
    const denominador = Math.pow(1 + taxa, totalParcelas) - 1;
    const parcelaCalculada = valorFinanciado * (numerador / denominador);
    
    const diferenca = parcelaCalculada - valorParcela;
    if (Math.abs(diferenca) < 0.01) break;
    
    // Derivada numérica
    const h = 0.0001;
    const numeradorH = (taxa + h) * Math.pow(1 + taxa + h, totalParcelas);
    const denominadorH = Math.pow(1 + taxa + h, totalParcelas) - 1;
    const parcelaH = valorFinanciado * (numeradorH / denominadorH);
    const derivada = (parcelaH - parcelaCalculada) / h;
    
    if (Math.abs(derivada) < 0.0001) break;
    taxa = taxa - diferenca / derivada;
    
    // Limitar taxa
    if (taxa < 0.001) taxa = 0.001;
    if (taxa > 0.1) taxa = 0.1;
  }
  
  // Converter taxa mensal para CET anual
  return (Math.pow(1 + taxa, 12) - 1) * 100;
};

export const calculateFinancing = (vehicleValue: number, data: FinancingData): FinancingCalculations => {
  const { entradaValue, totalParcelas, parcelasPagas, valorParcela, cetAnual, inputMode } = data;
  
  const valorFinanciado = Math.max(0, vehicleValue - entradaValue);
  
  // Se modo CET, calcular parcela a partir do CET
  let parcelaEfetiva = valorParcela;
  if (inputMode === 'cet' && cetAnual && cetAnual > 0) {
    parcelaEfetiva = calcularParcelaPorCET(valorFinanciado, cetAnual, totalParcelas);
  }
  
  const totalJaPago = entradaValue + (parcelasPagas * parcelaEfetiva);
  const parcelasRestantes = Math.max(0, totalParcelas - parcelasPagas);
  const saldoDevedor = parcelasRestantes * parcelaEfetiva;
  const totalAPagar = entradaValue + (totalParcelas * parcelaEfetiva);
  const totalJuros = Math.max(0, totalAPagar - vehicleValue);
  const taxaJurosImplicita = valorFinanciado > 0 ? (totalJuros / valorFinanciado) * 100 : 0;
  
  // Calcular CET se não foi informado
  const cetCalculado = inputMode === 'cet' 
    ? cetAnual 
    : calcularCETPorParcelas(valorFinanciado, valorParcela, totalParcelas);
  
  // Capital imobilizado = entrada + parcelas pagas (dinheiro que já saiu do bolso)
  const capitalImobilizado = totalJaPago;

  return {
    valorFinanciado,
    totalJaPago,
    parcelasRestantes,
    saldoDevedor,
    totalAPagar,
    totalJuros,
    taxaJurosImplicita,
    capitalImobilizado,
    cetCalculado,
  };
};

const CETHelpDialog: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            O que é o CET?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>
            O <strong>Custo Efetivo Total (CET)</strong> é a taxa que representa o custo 
            real de um financiamento, incluindo:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Juros do financiamento</li>
            <li>Taxas administrativas</li>
            <li>IOF (Imposto sobre Operações Financeiras)</li>
            <li>Seguros obrigatórios</li>
            <li>Tarifas de cadastro</li>
            <li>Outras despesas incluídas no contrato</li>
          </ul>
          
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="font-medium text-primary mb-1">Onde encontrar o CET?</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• No seu <strong>contrato de financiamento</strong></li>
              <li>• Na <strong>simulação</strong> do banco/financeira</li>
              <li>• No <strong>Custo Efetivo Total</strong> da proposta</li>
              <li>• Geralmente expresso como <strong>% ao ano (a.a.)</strong></li>
            </ul>
          </div>
          
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="font-medium text-amber-600 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Atenção
            </p>
            <p className="text-xs text-muted-foreground">
              O CET é <strong>sempre maior</strong> que a taxa de juros nominal, pois inclui 
              todos os custos da operação. É a melhor forma de comparar financiamentos 
              de diferentes instituições.
            </p>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Exemplo prático:</p>
            <p>
              Um financiamento com juros de 1,5% a.m. pode ter um CET de 25% a.a. devido 
              aos custos adicionais incluídos.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const FinancingDataCard: React.FC<FinancingDataCardProps> = ({
  vehicleValue,
  financingData,
  onFinancingDataChange,
}) => {
  const inputMode = financingData.inputMode || 'parcelas';
  const calculations = calculateFinancing(vehicleValue, financingData);
  
  const hasValidData = useMemo(() => {
    if (inputMode === 'cet') {
      return financingData.totalParcelas > 0 && (financingData.cetAnual || 0) > 0;
    }
    return financingData.totalParcelas > 0 && financingData.valorParcela > 0;
  }, [inputMode, financingData]);

  const updateField = <K extends keyof FinancingData>(field: K, value: FinancingData[K]) => {
    onFinancingDataChange({ ...financingData, [field]: value });
  };
  
  const setInputMode = (mode: 'parcelas' | 'cet') => {
    onFinancingDataChange({ ...financingData, inputMode: mode });
  };

  // Calcular parcela estimada quando usando CET
  const parcelaEstimada = useMemo(() => {
    if (inputMode === 'cet' && financingData.cetAnual && financingData.cetAnual > 0) {
      const valorFinanciado = Math.max(0, vehicleValue - financingData.entradaValue);
      return calcularParcelaPorCET(valorFinanciado, financingData.cetAnual, financingData.totalParcelas);
    }
    return 0;
  }, [inputMode, vehicleValue, financingData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          Dados do Financiamento
        </CardTitle>
        <CardDescription>
          Informe os detalhes para calcular o custo real incluindo juros
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valor de entrada - sempre visível */}
        <div className="space-y-1.5">
          <Label className="text-xs">Valor de entrada</Label>
          <CurrencyInput
            value={financingData.entradaValue}
            onChange={(v) => updateField('entradaValue', v)}
            placeholder="0,00"
          />
        </div>

        {/* Tabs para escolher modo de entrada */}
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'parcelas' | 'cet')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parcelas" className="text-xs">
              <Calculator className="h-3.5 w-3.5 mr-1.5" />
              Parcelas
            </TabsTrigger>
            <TabsTrigger value="cet" className="text-xs">
              <Percent className="h-3.5 w-3.5 mr-1.5" />
              CET
            </TabsTrigger>
          </TabsList>

          {/* Modo Parcelas (padrão) */}
          <TabsContent value="parcelas" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor da parcela</Label>
                <CurrencyInput
                  value={financingData.valorParcela}
                  onChange={(v) => updateField('valorParcela', v)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parcelas totais</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={financingData.totalParcelas || ''}
                  onChange={(e) => updateField('totalParcelas', parseInt(e.target.value) || 0)}
                  placeholder="48"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Parcelas já pagas</Label>
                <Input
                  type="number"
                  min={0}
                  max={financingData.totalParcelas}
                  value={financingData.parcelasPagas || ''}
                  onChange={(e) => updateField('parcelasPagas', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Mostrar CET calculado */}
            {hasValidData && calculations.cetCalculado && calculations.cetCalculado > 0 && (
              <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">CET estimado</span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {calculations.cetCalculado.toFixed(1)}% a.a.
                </span>
              </div>
            )}
          </TabsContent>

          {/* Modo CET */}
          <TabsContent value="cet" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  CET anual (% a.a.)
                  <CETHelpDialog />
                </Label>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={financingData.cetAnual || ''}
                  onChange={(e) => updateField('cetAnual', parseFloat(e.target.value) || 0)}
                  placeholder="25,0"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  % a.a.
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Parcelas totais</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={financingData.totalParcelas || ''}
                  onChange={(e) => updateField('totalParcelas', parseInt(e.target.value) || 0)}
                  placeholder="48"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parcelas já pagas</Label>
                <Input
                  type="number"
                  min={0}
                  max={financingData.totalParcelas}
                  value={financingData.parcelasPagas || ''}
                  onChange={(e) => updateField('parcelasPagas', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Mostrar parcela calculada */}
            {parcelaEstimada > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Parcela calculada</p>
                    <p className="text-lg font-bold text-primary">{formatMoney(parcelaEstimada)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total financiado</p>
                    <p className="text-sm font-semibold">
                      {formatMoney(Math.max(0, vehicleValue - financingData.entradaValue))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {hasValidData && (
          <>
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Resumo do Financiamento
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Financiado</p>
                  <p className="font-medium">{formatMoney(calculations.valorFinanciado)}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Total já pago</p>
                  <p className="font-medium">{formatMoney(calculations.totalJaPago)}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Parcelas restantes</p>
                  <p className="font-medium">
                    {calculations.parcelasRestantes}x de {formatMoney(inputMode === 'cet' ? parcelaEstimada : financingData.valorParcela)}
                  </p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Saldo devedor</p>
                  <p className="font-medium">{formatMoney(calculations.saldoDevedor)}</p>
                </div>
              </div>

              <div className={cn(
                "p-3 rounded-lg border",
                calculations.totalJuros > 0 
                  ? "bg-expense/10 border-expense/20" 
                  : "bg-green-500/10 border-green-500/20"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total de Juros + Taxas</p>
                    <p className={cn(
                      "text-lg font-bold",
                      calculations.totalJuros > 0 ? "text-expense" : "text-green-600"
                    )}>
                      {formatMoney(calculations.totalJuros)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">CET</p>
                    <p className={cn(
                      "text-lg font-bold",
                      (calculations.cetCalculado || 0) > 0 ? "text-expense" : "text-green-600"
                    )}>
                      {(calculations.cetCalculado || 0).toFixed(1)}% a.a.
                    </p>
                  </div>
                </div>
              </div>

              {calculations.totalJuros > vehicleValue * 0.3 && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Os juros representam mais de 30% do valor do veículo. Considere quitar antecipadamente.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Alert className="py-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Capital imobilizado:</strong> {formatMoney(calculations.capitalImobilizado)} (entrada + parcelas pagas). 
                Este é o valor que será usado para calcular o custo de oportunidade.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};
