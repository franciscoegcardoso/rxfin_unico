import React, { useEffect, useCallback, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { StockVestingConfig, StockCompensationType, VestingType, IncomeItem } from '@/types/financial';
import { useStockVestingProjection } from '@/hooks/useStockVestingProjection';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useFinancial } from '@/contexts/FinancialContext';
import { TrendingUp, Calendar, Clock, RefreshCw, Loader2, TrendingDown, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
const compensationTypeLabels: Record<StockCompensationType, { label: string; description: string }> = {
  stock_options: { label: 'Stock Options', description: 'Direito de comprar ações a preço fixo' },
  rsu: { label: 'RSU (Restricted Stock Units)', description: 'Ações concedidas após período de vesting' },
  espp: { label: 'ESPP', description: 'Plano de compra de ações para funcionários' },
  phantom_stock: { label: 'Phantom Stock', description: 'Bônus em dinheiro baseado no valor das ações' },
};

const vestingTypeLabels: Record<VestingType, { label: string; description: string }> = {
  cliff: { label: 'Cliff', description: 'Tudo veste de uma vez após o período de carência' },
  graded: { label: 'Gradual', description: 'Vesting mensal após período de cliff inicial' },
  immediate: { label: 'Imediato', description: '100% disponível na concessão' },
};

interface StockVestingFormProps {
  config: Partial<StockVestingConfig>;
  onChange: (config: Partial<StockVestingConfig>) => void;
  incomeItems: IncomeItem[];
}

export const StockVestingForm: React.FC<StockVestingFormProps> = ({
  config,
  onChange,
  incomeItems,
}) => {
  const { config: financialConfig } = useFinancial();
  const { quote, isLoading: isLoadingQuote, error: quoteError, fetchQuote, reset: resetQuote } = useStockQuote();
  const [lastFetchedTicker, setLastFetchedTicker] = useState<string | null>(null);
  
  // Get projection
  const projection = useStockVestingProjection({
    config: config as StockVestingConfig,
  });
  
  // Filter salaries that could be linked
  const salaryItems = incomeItems.filter(
    item => item.enabled && !item.isStockCompensation && !item.isAssetGenerated
  );
  
  // Auto-fetch quote when ticker changes (debounced)
  useEffect(() => {
    const ticker = config.ticker?.trim();
    if (ticker && ticker.length >= 4 && ticker !== lastFetchedTicker) {
      const timer = setTimeout(() => {
        handleFetchQuote(ticker);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [config.ticker]);
  
  // Update price when quote is fetched
  useEffect(() => {
    if (quote && quote.regularMarketPrice > 0) {
      onChange({ ...config, currentStockPrice: quote.regularMarketPrice });
      toast.success(`Cotação atualizada: ${quote.symbol} - R$ ${quote.regularMarketPrice.toFixed(2)}`);
    }
  }, [quote]);
  
  const handleFetchQuote = useCallback(async (ticker: string) => {
    setLastFetchedTicker(ticker);
    await fetchQuote(ticker);
  }, [fetchQuote]);
  
  const handleRefreshQuote = () => {
    const ticker = config.ticker?.trim();
    if (ticker && ticker.length >= 4) {
      handleFetchQuote(ticker);
    }
  };
  
  const handleChange = <K extends keyof StockVestingConfig>(
    key: K,
    value: StockVestingConfig[K]
  ) => {
    onChange({ ...config, [key]: value });
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };
  
  return (
    <div className="space-y-6">
      {/* Tipo de Compensação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Compensação</Label>
          <Select
            value={config.compensationType || 'rsu'}
            onValueChange={(value: StockCompensationType) => handleChange('compensationType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(compensationTypeLabels).map(([value, { label, description }]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex flex-col">
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Empresa</Label>
          <Input
            placeholder="Ex: Google, Meta, Nubank"
            value={config.companyName || ''}
            onChange={(e) => handleChange('companyName', e.target.value)}
          />
        </div>
      </div>
      
      {/* Ticker e Vínculo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ticker (para cotação automática)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: PETR4, VALE3, GOOGL"
              value={config.ticker || ''}
              onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRefreshQuote}
              disabled={isLoadingQuote || !config.ticker || config.ticker.length < 4}
              title="Atualizar cotação"
            >
              {isLoadingQuote ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          {quote && (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="text-muted-foreground">
                {quote.shortName} - R$ {quote.regularMarketPrice.toFixed(2)}
              </span>
              <span className={quote.regularMarketChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                {quote.regularMarketChangePercent >= 0 ? '+' : ''}
                {quote.regularMarketChangePercent.toFixed(2)}%
              </span>
            </div>
          )}
          {quoteError && (
            <div className="text-xs text-destructive">{quoteError}</div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label>Vincular ao salário (opcional)</Label>
          <Select
            value={config.linkedIncomeId || 'none'}
            onValueChange={(value) => handleChange('linkedIncomeId', value === 'none' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um salário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não vincular</SelectItem>
              {salaryItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Grant Details */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-primary" />
          Dados da Concessão (Grant)
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Data do Grant</Label>
            <Input
              type="date"
              value={config.grantDate || ''}
              onChange={(e) => handleChange('grantDate', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Quantidade de Ações</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={config.grantQuantity || ''}
              onChange={(e) => handleChange('grantQuantity', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              {config.compensationType === 'stock_options' ? 'Preço de Exercício' : 'Preço na Data'}
            </Label>
            <CurrencyInput
              value={config.grantPrice || 0}
              onChange={(value) => handleChange('grantPrice', value)}
              placeholder="R$ 0,00"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preço Atual da Ação</Label>
              {quote && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Via API
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <CurrencyInput
                value={config.currentStockPrice || 0}
                onChange={(value) => handleChange('currentStockPrice', value)}
                placeholder="R$ 0,00"
              />
              {config.ticker && config.ticker.length >= 4 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshQuote}
                  disabled={isLoadingQuote}
                  title="Buscar cotação atual"
                >
                  {isLoadingQuote ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {config.grantPrice && config.currentStockPrice && config.grantPrice > 0 && (
              <div className="flex items-center gap-1 text-xs">
                {config.currentStockPrice >= config.grantPrice ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-600">
                      +{(((config.currentStockPrice - config.grantPrice) / config.grantPrice) * 100).toFixed(1)}% desde o grant
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-600">
                      {(((config.currentStockPrice - config.grantPrice) / config.grantPrice) * 100).toFixed(1)}% desde o grant
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Quantidade Já Vestida</Label>
            <Input
              type="number"
              min="0"
              max={config.grantQuantity || 0}
              placeholder="0"
              value={config.vestedQuantity || ''}
              onChange={(e) => handleChange('vestedQuantity', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>
      
      {/* Vesting Configuration */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-primary" />
          Configuração de Vesting
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Vesting</Label>
            <Select
              value={config.vestingType || 'graded'}
              onValueChange={(value: VestingType) => handleChange('vestingType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(vestingTypeLabels).map(([value, { label, description }]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {config.vestingType !== 'immediate' && (
            <>
              <div className="space-y-2">
                <Label>Período de Cliff (meses)</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  placeholder="12"
                  value={config.cliffMonths || ''}
                  onChange={(e) => handleChange('cliffMonths', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Período Total de Vesting (meses)</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="48"
                  value={config.vestingPeriodMonths || ''}
                  onChange={(e) => handleChange('vestingPeriodMonths', parseInt(e.target.value) || 0)}
                />
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Projection Preview */}
      {projection && config.grantQuantity && config.grantDate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">Projeção de Vesting</span>
              </div>
              {config.ticker && (
                <Badge variant="outline" className="bg-background">
                  {config.ticker}
                </Badge>
              )}
            </div>
            
            {/* Progress Bars */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do Vesting</span>
                  <span className="font-medium">
                    {formatNumber(projection.totalVested)} / {formatNumber(projection.totalGranted)} ações
                  </span>
                </div>
                <Progress value={projection.vestingProgressPercent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{projection.vestingProgressPercent.toFixed(1)}% vestido</span>
                  <span>{formatNumber(projection.totalPending)} pendentes</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do Tempo</span>
                  <span className="font-medium">
                    {projection.monthsUntilFullVesting} meses restantes
                  </span>
                </div>
                <Progress value={projection.timeProgressPercent} className="h-2 bg-muted [&>div]:bg-amber-500" />
              </div>
            </div>
            
            {/* Values */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-background rounded-lg">
                <div className="text-xs text-muted-foreground">Valor Total</div>
                <div className="font-semibold text-sm">{formatCurrency(projection.estimatedTotalValue)}</div>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <div className="text-xs text-muted-foreground">Vestido</div>
                <div className="font-semibold text-sm text-green-600">{formatCurrency(projection.estimatedVestedValue)}</div>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <div className="text-xs text-muted-foreground">Pendente</div>
                <div className="font-semibold text-sm text-amber-600">{formatCurrency(projection.estimatedPendingValue)}</div>
              </div>
            </div>
            
            {/* Next Vesting Event */}
            {projection.nextVestingDate && (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Próximo vesting:</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {format(parseISO(projection.nextVestingDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(projection.nextVestingQuantity)} ações
                  </div>
                </div>
              </div>
            )}
            
            {/* Timeline Preview */}
            {projection.vestingEvents.length > 0 && projection.vestingEvents.length <= 6 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Timeline de Vesting</div>
                <div className="space-y-1">
                  {projection.vestingEvents.slice(0, 6).map((event, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between text-xs p-2 rounded ${
                        event.isVested 
                          ? 'bg-green-500/10 text-green-700' 
                          : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          event.isVested ? 'bg-green-500' : 'bg-muted-foreground'
                        }`} />
                        <span>
                          {format(parseISO(event.date), "MMM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <span>{formatNumber(event.quantity)} ações</span>
                    </div>
                  ))}
                  {projection.vestingEvents.length > 6 && (
                    <div className="text-xs text-center text-muted-foreground py-1">
                      +{projection.vestingEvents.length - 6} eventos...
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
