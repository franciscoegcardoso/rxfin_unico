import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calculator, TrendingUp, Percent, Wallet, CircleDollarSign, Info } from 'lucide-react';
import { CompanyValuationType, CompanySector, COMPANY_SECTOR_MULTIPLIERS } from '@/types/financial';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CompanyFormData {
  companyValuationType: CompanyValuationType;
  companyOwnershipPercent: number;
  companyMarketValue: number;
  companySector: CompanySector;
  companyAnnualProfit: number;
  companyCashPosition: number;
}

interface CompanyFormProps {
  data: CompanyFormData;
  onChange: (data: Partial<CompanyFormData>) => void;
  onValueChange: (value: number, calculatedValue?: number) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CompanyForm: React.FC<CompanyFormProps> = ({
  data,
  onChange,
  onValueChange,
}) => {
  // Cálculo do valuation por múltiplos
  const calculatedValuation = useMemo(() => {
    if (data.companyValuationType !== 'calculated') return null;
    
    const sectorInfo = COMPANY_SECTOR_MULTIPLIERS[data.companySector] || COMPANY_SECTOR_MULTIPLIERS.other;
    const multiplier = sectorInfo.multiplier;
    
    // Enterprise Value = Lucro Líquido * Múltiplo
    const enterpriseValue = data.companyAnnualProfit * multiplier;
    
    // Equity Value = Enterprise Value + Caixa - Dívidas
    // companyCashPosition: positivo = caixa, negativo = dívida
    const equityValue = enterpriseValue + data.companyCashPosition;
    
    return {
      enterpriseValue,
      equityValue: Math.max(0, equityValue),
      multiplier,
      sectorLabel: sectorInfo.label,
    };
  }, [data.companyValuationType, data.companySector, data.companyAnnualProfit, data.companyCashPosition]);

  // Valor da participação do usuário
  const userShareValue = useMemo(() => {
    let companyTotalValue = 0;
    
    if (data.companyValuationType === 'simple') {
      companyTotalValue = data.companyMarketValue;
    } else if (calculatedValuation) {
      companyTotalValue = calculatedValuation.equityValue;
    }
    
    return Math.round(companyTotalValue * (data.companyOwnershipPercent / 100));
  }, [data.companyValuationType, data.companyMarketValue, calculatedValuation, data.companyOwnershipPercent]);

  // Atualiza o valor do ativo quando relevantes mudam
  React.useEffect(() => {
    const calculatedValue = data.companyValuationType === 'calculated' ? calculatedValuation?.equityValue : undefined;
    onValueChange(userShareValue, calculatedValue);
  }, [userShareValue, calculatedValuation?.equityValue, data.companyValuationType]);

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        Configurações da Empresa
      </h3>

      {/* Campos Comuns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyOwnershipPercent" className="flex items-center gap-2">
            <Percent className="h-3 w-3" />
            Minha Participação (%)
          </Label>
          <Input
            id="companyOwnershipPercent"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={data.companyOwnershipPercent || ''}
            onChange={(e) => {
              const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
              onChange({ companyOwnershipPercent: val });
            }}
            placeholder="Ex: 25"
          />
          <p className="text-xs text-muted-foreground">
            Percentual de participação societária
          </p>
        </div>
      </div>

      {/* Segmented Control - Método de Valoração */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          Método de Valoração
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p><strong>Simplificado:</strong> Informe diretamente o valor de mercado estimado.</p>
                <p className="mt-1"><strong>Calculado:</strong> Use múltiplos de mercado para estimar o valuation.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        
        <div className="flex rounded-lg border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => onChange({ companyValuationType: 'simple' })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              data.companyValuationType === 'simple'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Cadastro</span> Simplificado
          </button>
          <button
            type="button"
            onClick={() => onChange({ companyValuationType: 'calculated' })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              data.companyValuationType === 'calculated'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Valuation <span className="hidden sm:inline">Calculado</span>
          </button>
        </div>
      </div>

      {/* Modo Simplificado */}
      {data.companyValuationType === 'simple' && (
        <div className="space-y-4 p-4 rounded-lg bg-accent/30 border border-accent">
          <div className="space-y-2">
            <Label htmlFor="companyMarketValue" className="flex items-center gap-2">
              <CircleDollarSign className="h-3 w-3" />
              Valor de Mercado Estimado (100% da empresa)
            </Label>
            <CurrencyInput
              id="companyMarketValue"
              value={data.companyMarketValue}
              onChange={(value) => onChange({ companyMarketValue: value })}
              placeholder="R$ 0"
            />
            <p className="text-xs text-muted-foreground">
              Informe o valor total da empresa. Sua participação será calculada automaticamente.
            </p>
          </div>

          {data.companyMarketValue > 0 && data.companyOwnershipPercent > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor da sua participação</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(userShareValue)}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Wallet className="h-3 w-3" />
                    Manual
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modo Calculado */}
      {data.companyValuationType === 'calculated' && (
        <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companySector">Setor de Atuação</Label>
              <Select
                value={data.companySector}
                onValueChange={(value: CompanySector) => onChange({ companySector: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {Object.entries(COMPANY_SECTOR_MULTIPLIERS).map(([key, { label, multiplier }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{label}</span>
                        <Badge variant="outline" className="text-xs">
                          {multiplier}x
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Múltiplo EV/EBITDA médio do setor
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyAnnualProfit">Lucro Líquido Anual (LTM)</Label>
              <CurrencyInput
                id="companyAnnualProfit"
                value={data.companyAnnualProfit}
                onChange={(value) => onChange({ companyAnnualProfit: value })}
                placeholder="R$ 0"
              />
              <p className="text-xs text-muted-foreground">
                Últimos 12 meses (Last Twelve Months)
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyCashPosition" className="flex items-center gap-2">
                Caixa Líquido / Dívidas
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>Positivo:</strong> Caixa disponível (soma ao valor)</p>
                      <p><strong>Negativo:</strong> Dívidas líquidas (subtrai do valor)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <CurrencyInput
                id="companyCashPosition"
                value={data.companyCashPosition}
                onChange={(value) => onChange({ companyCashPosition: value })}
                placeholder="R$ 0"
              />
              <p className="text-xs text-muted-foreground">
                Ajuste de balanço: Caixa (+) ou Dívidas (use valor negativo)
              </p>
            </div>
          </div>

          {/* Card de Feedback do Cálculo */}
          {calculatedValuation && data.companyAnnualProfit > 0 && (
            <Card className="border-income/30 bg-income/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Valuation Estimado
                    </p>
                    <p className="text-2xl font-bold text-income">
                      {formatCurrency(calculatedValuation.equityValue)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1 bg-income/10 text-income border-income/30">
                    <Calculator className="h-3 w-3" />
                    Calculado
                  </Badge>
                </div>

                <div className="pt-2 border-t border-income/20 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lucro x Múltiplo ({calculatedValuation.multiplier}x)</span>
                    <span>{formatCurrency(calculatedValuation.enterpriseValue)}</span>
                  </div>
                  {data.companyCashPosition !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {data.companyCashPosition > 0 ? '(+) Caixa' : '(-) Dívidas'}
                      </span>
                      <span className={data.companyCashPosition > 0 ? 'text-income' : 'text-expense'}>
                        {formatCurrency(Math.abs(data.companyCashPosition))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-1 border-t border-dashed">
                    <span>= Valor da Empresa (100%)</span>
                    <span>{formatCurrency(calculatedValuation.equityValue)}</span>
                  </div>
                </div>

                {data.companyOwnershipPercent > 0 && (
                  <div className="pt-3 border-t border-income/20">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Sua participação ({data.companyOwnershipPercent}%)
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(userShareValue)}
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground pt-2 border-t border-income/20">
                  <strong>Metodologia:</strong> Com base no lucro de {formatCurrency(data.companyAnnualProfit)} e 
                  setor de {calculatedValuation.sectorLabel} (múltiplo {calculatedValuation.multiplier}x), 
                  sua empresa vale aproximadamente {formatCurrency(calculatedValuation.equityValue)}.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
