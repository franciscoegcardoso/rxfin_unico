import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Circle, HelpCircle, Info } from 'lucide-react';
import {
  parseTireSize,
  calculateTireCostPerKm,
  estimateTirePrice,
  formatTireCostLabel,
  TIRE_PRICE_ESTIMATES,
  TREADWEAR_BY_CATEGORY,
  TireCostEstimate,
} from '@/utils/tireEstimator';

interface TireCostCalculatorProps {
  defaultRim?: number;
  onCostCalculated?: (cost: TireCostEstimate) => void;
  compact?: boolean;
}

export function TireCostCalculator({ 
  defaultRim = 16, 
  onCostCalculated,
  compact = false 
}: TireCostCalculatorProps) {
  const [tireSize, setTireSize] = useState(`205/55 R${defaultRim}`);
  const [treadwear, setTreadwear] = useState(TREADWEAR_BY_CATEGORY.touring);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [useCustomPrice, setUseCustomPrice] = useState(false);

  const parsedTire = useMemo(() => parseTireSize(tireSize), [tireSize]);
  
  const rim = parsedTire?.rim ?? defaultRim;
  
  const estimate = useMemo(() => {
    const cost = calculateTireCostPerKm(
      rim,
      treadwear,
      useCustomPrice ? (customPrice ?? undefined) : undefined
    );
    onCostCalculated?.(cost);
    return cost;
  }, [rim, treadwear, customPrice, useCustomPrice, onCostCalculated]);

  const priceRange = TIRE_PRICE_ESTIMATES[rim] || TIRE_PRICE_ESTIMATES[16];

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pneus</span>
          <Badge variant="outline" className="text-xs">
            R{rim}"
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Custo mensal:</span>
            <span className="ml-2 font-medium">
              {estimate.custoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Por 100km:</span>
            <span className="ml-2 font-medium">
              {estimate.custoPor100Km.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Circle className="h-4 w-4" />
          Calculadora de Custo de Pneu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Medida do Pneu */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            Medida do pneu
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Ex: 205/55 R16</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    205 = largura (mm), 55 = perfil (%), R16 = aro (pol)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            value={tireSize}
            onChange={(e) => setTireSize(e.target.value)}
            placeholder="205/55 R16"
            className="h-8 text-sm"
          />
          {parsedTire && (
            <p className="text-xs text-muted-foreground">
              Detectado: Aro {parsedTire.rim}", Largura {parsedTire.width}mm, Perfil {parsedTire.profile}%
            </p>
          )}
        </div>

        {/* Treadwear */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            Treadwear (durabilidade)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Índice de desgaste do pneu. Quanto maior, mais dura.</p>
                  <ul className="text-xs mt-1 space-y-0.5">
                    <li>200-300: Esportivo (alta aderência)</li>
                    <li>400-500: Passeio (equilibrado)</li>
                    <li>500-700: Econômico (maior duração)</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[treadwear]}
              onValueChange={([v]) => setTreadwear(v)}
              min={200}
              max={700}
              step={20}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12 text-right">{treadwear}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Durabilidade estimada: {estimate.durabilidadeKm.toLocaleString('pt-BR')} km
          </p>
        </div>

        {/* Preço */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Preço unitário estimado</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setUseCustomPrice(!useCustomPrice)}
            >
              {useCustomPrice ? 'Usar estimativa' : 'Informar preço'}
            </Button>
          </div>
          
          {useCustomPrice ? (
            <Input
              type="number"
              value={customPrice ?? ''}
              onChange={(e) => setCustomPrice(e.target.value ? Number(e.target.value) : null)}
              placeholder="Preço do pneu"
              className="h-8 text-sm"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {estimate.precoUnitarioEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <Badge variant="secondary" className="text-xs">
                Estimativa Aro {rim}"
              </Badge>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Faixa de mercado: {priceRange.min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
            {' - '}
            {priceRange.max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        {/* Resultados */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            Custos Calculados
            <Badge variant="outline" className={
              estimate.custoMensal < 50 ? 'bg-green-50 text-green-700 border-green-200' :
              estimate.custoMensal < 80 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              'bg-red-50 text-red-700 border-red-200'
            }>
              {formatTireCostLabel(estimate.custoMensal)}
            </Badge>
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Custo do Jogo</p>
              <p className="text-lg font-semibold">
                {estimate.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-muted-foreground">
                4 pneus + R$ 250 montagem
              </p>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
              <p className="text-xs text-muted-foreground">Custo "Invisível"</p>
              <p className="text-lg font-semibold text-primary">
                {estimate.custoPor100Km.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-muted-foreground">a cada 100 km</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo mensal:</span>
              <span className="font-medium">
                {estimate.custoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo anual:</span>
              <span className="font-medium">
                {estimate.custoAnual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog wrapper for use in simulator
export function TireCostHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Circle className="h-5 w-5" />
            Como calculamos o custo de pneus
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-1">Fórmula de Cálculo</h4>
            <div className="bg-muted rounded-lg p-3 space-y-1 font-mono text-xs">
              <p>Durabilidade = Treadwear × 140 km</p>
              <p>Custo Total = (Preço × 4) + R$ 250</p>
              <p>Custo/km = Custo Total ÷ Durabilidade</p>
              <p>Custo Mensal = Custo/km × 1.250 km</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-1">O que é Treadwear?</h4>
            <p className="text-muted-foreground">
              Índice de desgaste padronizado. Um pneu com TW 400 dura aproximadamente 
              o dobro de um com TW 200.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-1">Estimativa de Preços por Aro</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="font-medium">Aro</div>
              <div className="font-medium">Econômico</div>
              <div className="font-medium">Médio</div>
              <div className="font-medium">Premium</div>
              {[14, 16, 17, 18, 20].map(rim => (
                <>
                  <div key={`rim-${rim}`}>{rim}"</div>
                  <div key={`min-${rim}`}>R$ {TIRE_PRICE_ESTIMATES[rim]?.min}</div>
                  <div key={`avg-${rim}`}>R$ {TIRE_PRICE_ESTIMATES[rim]?.avg}</div>
                  <div key={`max-${rim}`}>R$ {TIRE_PRICE_ESTIMATES[rim]?.max}</div>
                </>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
            <p className="text-blue-700 dark:text-blue-300">
              <strong>Dica:</strong> Pneus de aro grande (18"+) custam significativamente mais 
              e geralmente têm menor durabilidade por serem mais esportivos.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
