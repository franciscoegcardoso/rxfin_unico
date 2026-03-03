import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, AlertTriangle, Info, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConsorcioData {
  valorCarta: number;
  totalParcelas: number;
  parcelasPagas: number;
  valorParcela: number;
  taxaAdmTotal: number; // % sobre carta
  fundoReserva: number; // % sobre carta
  contemplado: boolean;
  mesesAteContemplacao: number; // meses desde início até contemplação (se contemplado)
  mesesAteContemplacaoEsperada: number; // previsão de quando será contemplado (se não contemplado)
}

export interface ConsorcioCalculations {
  totalAPagar: number;
  totalTaxas: number; // custo administrativo total
  capitalImobilizado: number;
  parcelasRestantes: number;
  // Custo do período sem o bem (pagou mas não tinha o carro)
  mesesSemBem: number;
  valorPagoSemBem: number;
  // Para projeção: quando o bem estará disponível
  mesesAteBem: number; // 0 se já contemplado, senão a previsão
}

interface ConsorcioDataCardProps {
  vehicleValue: number;
  consorcioData: ConsorcioData;
  onConsorcioDataChange: (data: ConsorcioData) => void;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const calculateConsorcio = (vehicleValue: number, data: ConsorcioData): ConsorcioCalculations => {
  const { 
    valorCarta, totalParcelas, parcelasPagas, valorParcela, 
    taxaAdmTotal, fundoReserva, contemplado, mesesAteContemplacao,
    mesesAteContemplacaoEsperada 
  } = data;
  
  const totalAPagar = totalParcelas * valorParcela;
  const valorCartaBase = valorCarta > 0 ? valorCarta : vehicleValue;
  const totalTaxas = (valorCartaBase * (taxaAdmTotal + fundoReserva)) / 100;
  
  // Capital imobilizado = parcelas pagas (dinheiro que já saiu do bolso)
  const capitalImobilizado = parcelasPagas * valorParcela;
  const parcelasRestantes = Math.max(0, totalParcelas - parcelasPagas);
  
  // Meses pagando sem ter o bem
  // Se contemplado: meses até contemplação
  // Se não contemplado: todas as parcelas pagas até agora
  const mesesSemBem = contemplado 
    ? Math.min(mesesAteContemplacao, parcelasPagas) 
    : parcelasPagas;
  
  const valorPagoSemBem = mesesSemBem * valorParcela;
  
  // Meses até ter o bem (para projeção futura)
  // Se já contemplado: 0 (já tem o carro)
  // Se não contemplado: estimativa de meses restantes até contemplação
  const mesesAteBem = contemplado 
    ? 0 
    : Math.max(0, mesesAteContemplacaoEsperada - parcelasPagas);

  return {
    totalAPagar,
    totalTaxas,
    capitalImobilizado,
    parcelasRestantes,
    mesesSemBem,
    valorPagoSemBem,
    mesesAteBem,
  };
};

export const ConsorcioDataCard: React.FC<ConsorcioDataCardProps> = ({
  vehicleValue,
  consorcioData,
  onConsorcioDataChange,
}) => {
  const calculations = calculateConsorcio(vehicleValue, consorcioData);
  const hasValidData = consorcioData.totalParcelas > 0 && consorcioData.valorParcela > 0;

  const updateField = <K extends keyof ConsorcioData>(field: K, value: ConsorcioData[K]) => {
    onConsorcioDataChange({ ...consorcioData, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Dados do Consórcio
        </CardTitle>
        <CardDescription>
          Informe os detalhes para calcular o custo real incluindo o período sem o bem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valor da carta */}
        <div className="space-y-1.5">
          <Label className="text-xs">Valor da carta de crédito</Label>
          <CurrencyInput
            value={consorcioData.valorCarta}
            onChange={(v) => updateField('valorCarta', v)}
            placeholder={formatMoney(vehicleValue)}
          />
          <p className="text-[10px] text-muted-foreground">Se não informado, usa o valor do veículo</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor da parcela</Label>
            <CurrencyInput
              value={consorcioData.valorParcela}
              onChange={(v) => updateField('valorParcela', v)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Parcelas totais</Label>
            <Input
              type="number"
              min={1}
              max={240}
              value={consorcioData.totalParcelas || ''}
              onChange={(e) => updateField('totalParcelas', parseInt(e.target.value) || 0)}
              placeholder="60"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Parcelas já pagas</Label>
            <Input
              type="number"
              min={0}
              max={consorcioData.totalParcelas}
              value={consorcioData.parcelasPagas || ''}
              onChange={(e) => updateField('parcelasPagas', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Taxa adm. total (%)</Label>
            <Input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={consorcioData.taxaAdmTotal || ''}
              onChange={(e) => updateField('taxaAdmTotal', parseFloat(e.target.value) || 0)}
              placeholder="15"
            />
          </div>
        </div>

        {/* Status de contemplação */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              {consorcioData.contemplado ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-amber-600" />
              )}
              Contemplado?
            </Label>
            <Switch 
              checked={consorcioData.contemplado} 
              onCheckedChange={(v) => updateField('contemplado', v)} 
            />
          </div>
          
          {consorcioData.contemplado ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Meses até a contemplação</Label>
              <Input
                type="number"
                min={1}
                max={consorcioData.parcelasPagas}
                value={consorcioData.mesesAteContemplacao || ''}
                onChange={(e) => updateField('mesesAteContemplacao', parseInt(e.target.value) || 0)}
                placeholder="Quantos meses pagou antes de ser contemplado"
              />
              <p className="text-[10px] text-muted-foreground">
                Durante esse período você pagou mas não tinha o carro
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Previsão de contemplação (mês)</Label>
                <Input
                  type="number"
                  min={consorcioData.parcelasPagas + 1}
                  max={consorcioData.totalParcelas}
                  value={consorcioData.mesesAteContemplacaoEsperada || ''}
                  onChange={(e) => updateField('mesesAteContemplacaoEsperada', parseInt(e.target.value) || 0)}
                  placeholder={`Ex: ${Math.min(consorcioData.parcelasPagas + 12, consorcioData.totalParcelas)}`}
                />
                <p className="text-[10px] text-muted-foreground">
                  Em qual mês você espera ser contemplado? (lance ou sorteio)
                </p>
              </div>
              
              {calculations.mesesAteBem > 0 && (
                <Alert className="py-2 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-xs text-purple-700 dark:text-purple-400">
                    Ainda faltam <strong>{calculations.mesesAteBem} meses</strong> até você ter o veículo. 
                    Durante esse período, você não terá custos de carro (IPVA, seguro, combustível).
                  </AlertDescription>
                </Alert>
              )}
              
              <Alert className="py-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                  Você está pagando {consorcioData.parcelasPagas > 0 ? `há ${consorcioData.parcelasPagas} meses ` : ''}
                  sem ter o veículo. Todo esse valor é custo de oportunidade "puro".
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {hasValidData && (
          <>
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Resumo do Consórcio
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Total a pagar</p>
                  <p className="font-medium">{formatMoney(calculations.totalAPagar)}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Total em taxas</p>
                  <p className="font-medium">{formatMoney(calculations.totalTaxas)}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Já pago</p>
                  <p className="font-medium">{formatMoney(calculations.capitalImobilizado)}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Restante</p>
                  <p className="font-medium">{calculations.parcelasRestantes}x de {formatMoney(consorcioData.valorParcela)}</p>
                </div>
              </div>

              {/* Destaque: período sem o bem */}
              <div className={cn(
                "p-3 rounded-lg border",
                "bg-amber-500/10 border-amber-500/20"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Período sem o bem
                    </p>
                    <p className="text-lg font-bold text-amber-600">
                      {calculations.mesesSemBem} meses
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Pago nesse período</p>
                    <p className="text-lg font-bold text-amber-600">
                      {formatMoney(calculations.valorPagoSemBem)}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Esse valor representa dinheiro que saiu do bolso sem você ter o benefício do veículo.
                </p>
              </div>
            </div>

            <Alert className="py-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Custo de oportunidade dobrado:</strong> No consórcio, enquanto você não é contemplado, 
                perde o rendimento do dinheiro E não tem o carro. Após contemplação, o custo é similar ao financiamento.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};
