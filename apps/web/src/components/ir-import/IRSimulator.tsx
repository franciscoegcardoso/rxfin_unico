import React, { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserKV } from '@/hooks/useUserKV';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Calculator,
  TrendingDown,
  Info,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { ComprovanteStats } from '@/hooks/useFiscalOrganizer';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface IRSimulatorProps {
  stats: ComprovanteStats;
}

// Tabela progressiva do IR 2024 (base para 2025)
const FAIXAS_IR = [
  { limite: 2259.20 * 12, aliquota: 0, deducao: 0 },
  { limite: 2826.65 * 12, aliquota: 0.075, deducao: 169.44 * 12 },
  { limite: 3751.05 * 12, aliquota: 0.15, deducao: 381.44 * 12 },
  { limite: 4664.68 * 12, aliquota: 0.225, deducao: 662.77 * 12 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 * 12 },
];

const LIMITE_EDUCACAO_POR_PESSOA = 3561.50;
const LIMITE_PGBL_PERCENTUAL = 0.12;
const DESCONTO_SIMPLIFICADO = 0.20;
const TETO_DESCONTO_SIMPLIFICADO = 16754.34;

const KV_KEY = 'ir-simulator-data';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatCurrencyCompact = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const calcularIR = (baseCalculo: number): number => {
  if (baseCalculo <= 0) return 0;
  
  for (const faixa of FAIXAS_IR) {
    if (baseCalculo <= faixa.limite) {
      return Math.max(0, baseCalculo * faixa.aliquota - faixa.deducao);
    }
  }
  
  const ultimaFaixa = FAIXAS_IR[FAIXAS_IR.length - 1];
  return baseCalculo * ultimaFaixa.aliquota - ultimaFaixa.deducao;
};

export const IRSimulator: React.FC<IRSimulatorProps> = ({ stats }) => {
  const isMobile = useIsMobile();
  const { value: savedData, setValue: setSavedData } = useUserKV<{
    rendaBrutaAnual: number;
    numDependentes: number;
    inssAnual: number;
    pensaoAnual: number;
  }>(KV_KEY, { rendaBrutaAnual: 0, numDependentes: 0, inssAnual: 0, pensaoAnual: 0 });

  const [rendaBrutaAnual, setRendaBrutaAnual] = useState(savedData.rendaBrutaAnual);
  const [numDependentes, setNumDependentes] = useState(savedData.numDependentes);
  const [inssAnual, setInssAnual] = useState(savedData.inssAnual);
  const [pensaoAnual, setPensaoAnual] = useState(savedData.pensaoAnual);

  // Sync from KV when loaded
  useEffect(() => {
    setRendaBrutaAnual(savedData.rendaBrutaAnual);
    setNumDependentes(savedData.numDependentes);
    setInssAnual(savedData.inssAnual);
    setPensaoAnual(savedData.pensaoAnual);
  }, [savedData]);

  // Save to KV whenever values change
  useEffect(() => {
    setSavedData({
      rendaBrutaAnual,
      numDependentes,
      inssAnual,
      pensaoAnual,
    });
  }, [rendaBrutaAnual, numDependentes, inssAnual, pensaoAnual, setSavedData]);

  const resultado = useMemo(() => {
    if (rendaBrutaAnual <= 0) return null;

    const { totalByCategoria } = stats;
    
    // Despesas dedutíveis
    const despesasSaude = totalByCategoria['saude'] || 0;
    const despesasEducacao = Math.min(
      totalByCategoria['educacao'] || 0,
      LIMITE_EDUCACAO_POR_PESSOA * (1 + numDependentes)
    );
    const despesasPrevidencia = Math.min(
      totalByCategoria['previdencia'] || 0,
      rendaBrutaAnual * LIMITE_PGBL_PERCENTUAL
    );
    const despesasProfissional = totalByCategoria['profissional'] || 0;
    
    // Dedução por dependente (valor aproximado)
    const deducaoDependentes = numDependentes * 2275.08;
    
    // Total de deduções no modelo completo
    const totalDeducoesCompleto = 
      despesasSaude + 
      despesasEducacao + 
      despesasPrevidencia + 
      despesasProfissional +
      pensaoAnual +
      inssAnual +
      deducaoDependentes;

    // Base de cálculo modelo completo
    const baseCalculoCompleto = Math.max(0, rendaBrutaAnual - totalDeducoesCompleto);
    const irCompleto = calcularIR(baseCalculoCompleto);

    // Modelo simplificado
    const descontoSimplificado = Math.min(
      rendaBrutaAnual * DESCONTO_SIMPLIFICADO,
      TETO_DESCONTO_SIMPLIFICADO
    );
    const baseCalculoSimplificado = Math.max(0, rendaBrutaAnual - descontoSimplificado);
    const irSimplificado = calcularIR(baseCalculoSimplificado);

    // Economia
    const economiaVsSimplificado = irSimplificado - irCompleto;
    const melhorModelo = economiaVsSimplificado > 0 ? 'completo' : 'simplificado';

    return {
      despesasSaude,
      despesasEducacao,
      despesasPrevidencia,
      despesasProfissional,
      pensaoAnual,
      inssAnual,
      deducaoDependentes,
      totalDeducoesCompleto,
      baseCalculoCompleto,
      irCompleto,
      descontoSimplificado,
      baseCalculoSimplificado,
      irSimplificado,
      economiaVsSimplificado,
      melhorModelo,
      aliquotaEfetiva: irCompleto > 0 ? (irCompleto / rendaBrutaAnual) * 100 : 0,
    };
  }, [rendaBrutaAnual, numDependentes, inssAnual, pensaoAnual, stats]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Simulador de Economia de IR
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Inputs */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Renda Bruta Anual *</Label>
                <CurrencyInput
                  value={rendaBrutaAnual}
                  onChange={setRendaBrutaAnual}
                  compact
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">INSS Pago (anual)</Label>
                <CurrencyInput
                  value={inssAnual}
                  onChange={setInssAnual}
                  compact
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Pensão Alimentícia (anual)</Label>
                <CurrencyInput
                  value={pensaoAnual}
                  onChange={setPensaoAnual}
                  compact
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Nº de Dependentes</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => setNumDependentes(Math.max(0, numDependentes - 1))}
                    disabled={numDependentes === 0}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-medium">{numDependentes}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => setNumDependentes(numDependentes + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Deduções utilizadas - também na esquerda quando tem resultado */}
            {resultado && resultado.totalDeducoesCompleto > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground">Deduções do modelo completo:</p>
                <div className="space-y-1 text-xs">
                  {resultado.inssAnual > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">INSS:</span>
                      <span className="font-medium">{formatCurrency(resultado.inssAnual)}</span>
                    </div>
                  )}
                  {resultado.despesasSaude > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saúde:</span>
                      <span className="font-medium">{formatCurrency(resultado.despesasSaude)}</span>
                    </div>
                  )}
                  {resultado.despesasEducacao > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Educação:</span>
                      <span className="font-medium">{formatCurrency(resultado.despesasEducacao)}</span>
                    </div>
                  )}
                  {resultado.despesasPrevidencia > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Previdência:</span>
                      <span className="font-medium">{formatCurrency(resultado.despesasPrevidencia)}</span>
                    </div>
                  )}
                  {resultado.pensaoAnual > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pensão:</span>
                      <span className="font-medium">{formatCurrency(resultado.pensaoAnual)}</span>
                    </div>
                  )}
                  {resultado.deducaoDependentes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dependentes:</span>
                      <span className="font-medium">{formatCurrency(resultado.deducaoDependentes)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t text-sm">
                  <span className="font-medium">Total Deduções:</span>
                  <span className="font-bold text-primary">{formatCurrency(resultado.totalDeducoesCompleto)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Results */}
          <div className="space-y-4">
            {resultado ? (
              <>
                {/* Resultado Principal */}
                <div className={cn(
                  "rounded-lg p-4 text-center",
                  resultado.economiaVsSimplificado > 0 
                    ? "bg-green-500/10 border border-green-500/20" 
                    : "bg-muted"
                )}>
                  {resultado.economiaVsSimplificado > 0 ? (
                    <>
                      <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                        <TrendingDown className="h-5 w-5" />
                        <span className="font-medium">Economia Estimada</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(resultado.economiaVsSimplificado)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        usando o modelo completo
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                        <Info className="h-5 w-5" />
                        <span className="font-medium">Modelo Simplificado é melhor</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Continue juntando comprovantes para inverter isso!
                      </p>
                    </>
                  )}
                </div>

                {/* Gráfico Comparativo */}
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { 
                          name: 'Completo', 
                          value: resultado.irCompleto,
                          fill: resultado.melhorModelo === 'completo' ? 'hsl(var(--chart-2))' : 'hsl(var(--muted-foreground))'
                        },
                        { 
                          name: 'Simplificado', 
                          value: resultado.irSimplificado,
                          fill: resultado.melhorModelo === 'simplificado' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                        },
                      ]}
                      layout="vertical"
                      margin={{ top: 5, right: 80, left: 5, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        hide={isMobile}
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                        width={75}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                        {[
                          { name: 'Completo', value: resultado.irCompleto },
                          { name: 'Simplificado', value: resultado.irSimplificado },
                        ].map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              (index === 0 && resultado.melhorModelo === 'completo') ||
                              (index === 1 && resultado.melhorModelo === 'simplificado')
                                ? 'hsl(142.1 76.2% 36.3%)' 
                                : 'hsl(var(--muted-foreground) / 0.3)'
                            }
                          />
                        ))}
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(value: number) => formatCurrencyCompact(value)}
                          style={{ fontSize: 11, fontWeight: 500 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Comparativo Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn(
                    "rounded-lg p-3 border",
                    resultado.melhorModelo === 'completo' && "border-green-500/50 bg-green-500/5"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Modelo Completo</span>
                      {resultado.melhorModelo === 'completo' && (
                        <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-600 px-1.5">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          Melhor
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Base: {formatCurrency(resultado.baseCalculoCompleto)}
                    </p>
                  </div>

                  <div className={cn(
                    "rounded-lg p-3 border",
                    resultado.melhorModelo === 'simplificado' && "border-primary/50 bg-primary/5"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Modelo Simplificado</span>
                      {resultado.melhorModelo === 'simplificado' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          Melhor
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Desconto: {formatCurrency(resultado.descontoSimplificado)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  * Valores estimados com base na tabela do IR 2024. Consulte um contador para valores exatos.
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                <div className="rounded-full bg-muted p-4 mb-3">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">Resultado da Simulação</p>
                <p className="text-xs mt-1">Informe sua renda anual para visualizar</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
