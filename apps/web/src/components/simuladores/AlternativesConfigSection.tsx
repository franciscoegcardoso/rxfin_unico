import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Smartphone, 
  CarFront, 
  HelpCircle,
  Info 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AlternativesConfigSectionProps {
  // App de mobilidade (Uber/99)
  appMonthly: number;
  onAppMonthlyChange: (value: number) => void;
  
  // Aluguel de carro
  rentalType: 'monthly' | 'daily' | 'none';
  onRentalTypeChange: (type: 'monthly' | 'daily' | 'none') => void;
  rentalMonthlyPrice: number;
  onRentalMonthlyPriceChange: (value: number) => void;
  rentalDailyPrice: number;
  onRentalDailyPriceChange: (value: number) => void;
  rentalDaysPerMonth: number;
  onRentalDaysPerMonthChange: (value: number) => void;
}

const HelpButton: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Dialog>
    <DialogTrigger asChild>
      <button 
        type="button" 
        className="p-0.5 hover:bg-muted rounded-full transition-colors"
        aria-label={`Ajuda: ${title}`}
      >
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-4 w-4 text-primary" />
          {title}
        </DialogTitle>
      </DialogHeader>
      <div className="text-sm text-muted-foreground space-y-2">
        {children}
      </div>
    </DialogContent>
  </Dialog>
);

export const AlternativesConfigSection: React.FC<AlternativesConfigSectionProps> = ({
  appMonthly,
  onAppMonthlyChange,
  rentalType,
  onRentalTypeChange,
  rentalMonthlyPrice,
  onRentalMonthlyPriceChange,
  rentalDailyPrice,
  onRentalDailyPriceChange,
  rentalDaysPerMonth,
  onRentalDaysPerMonthChange,
}) => {
  const rentalTotalMonthly = rentalType === 'monthly' 
    ? rentalMonthlyPrice 
    : rentalType === 'daily' 
      ? rentalDailyPrice * rentalDaysPerMonth 
      : 0;

  const totalAlternativeMonthly = appMonthly + rentalTotalMonthly;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Alternativas ao Carro Próprio
        </CardTitle>
        <CardDescription>
          Informe quanto você gasta (ou gastaria) com apps de mobilidade e aluguel de carro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App de Mobilidade */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">App de Mobilidade (Uber, 99, etc.)</Label>
            <HelpButton title="App de Mobilidade">
              <p>
                Informe quanto você gasta (ou estima gastar) por mês com aplicativos de transporte como Uber, 99, Cabify, etc.
              </p>
              <p className="mt-2">
                <strong>Dica:</strong> Se você não usa app de mobilidade, deixe zerado. 
                O simulador vai considerar apenas o aluguel de carro na comparação.
              </p>
              <div className="mt-3 p-2 bg-muted rounded-lg text-xs">
                <p className="font-medium mb-1">Referências de mercado:</p>
                <ul className="space-y-1">
                  <li>• Uso esporádico: R$ 200-500/mês</li>
                  <li>• Uso moderado: R$ 500-1.000/mês</li>
                  <li>• Uso intenso: R$ 1.000-2.500/mês</li>
                </ul>
              </div>
            </HelpButton>
          </div>
          <CurrencyInput 
            value={appMonthly} 
            onChange={onAppMonthlyChange}
            placeholder="R$ 0,00 (se não usa)"
          />
          {appMonthly === 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Deixe zerado se você não usa aplicativos de transporte
            </p>
          )}
        </div>

        {/* Aluguel de Carro */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CarFront className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Aluguel de Carro</Label>
            <HelpButton title="Aluguel de Carro">
              <p>
                Escolha o modelo de aluguel que mais se adequa ao seu perfil:
              </p>
              <ul className="mt-2 space-y-2">
                <li>
                  <strong>Não uso:</strong> Você não aluga carros. Apenas apps de mobilidade serão considerados.
                </li>
                <li>
                  <strong>Assinatura mensal:</strong> Planos como Localiza Meoo, Movida Mensal, Unidas Livre. Você paga um valor fixo mensal e usa o carro como se fosse seu.
                </li>
                <li>
                  <strong>Diárias avulsas:</strong> Você aluga apenas quando precisa, por exemplo para viagens ou finais de semana. Informe o valor da diária e quantos dias por mês.
                </li>
              </ul>
              <div className="mt-3 p-2 bg-muted rounded-lg text-xs">
                <p className="font-medium mb-1">Referências de mercado (2024):</p>
                <ul className="space-y-1">
                  <li>• Assinatura mensal (popular): R$ 2.000-2.500</li>
                  <li>• Assinatura mensal (SUV): R$ 3.000-4.500</li>
                  <li>• Diária avulsa (popular): R$ 100-150</li>
                  <li>• Diária avulsa (SUV): R$ 200-350</li>
                </ul>
              </div>
            </HelpButton>
          </div>

          <RadioGroup 
            value={rentalType} 
            onValueChange={(v) => onRentalTypeChange(v as 'monthly' | 'daily' | 'none')}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { value: 'none', label: 'Não uso', description: 'Só app' },
              { value: 'monthly', label: 'Mensal', description: 'Assinatura' },
              { value: 'daily', label: 'Diárias', description: 'Eventual' },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                  rentalType === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={option.value} className="sr-only" />
                <span className={cn(
                  "text-sm font-medium",
                  rentalType === option.value ? "text-primary" : "text-muted-foreground"
                )}>
                  {option.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{option.description}</span>
              </label>
            ))}
          </RadioGroup>

          {rentalType === 'monthly' && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-muted-foreground">Valor da assinatura mensal</Label>
              <CurrencyInput 
                value={rentalMonthlyPrice} 
                onChange={onRentalMonthlyPriceChange}
                placeholder="Ex: R$ 2.500,00"
              />
            </div>
          )}

          {rentalType === 'daily' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Valor da diária</Label>
                <CurrencyInput 
                  value={rentalDailyPrice} 
                  onChange={onRentalDailyPriceChange}
                  placeholder="Ex: R$ 150,00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dias por mês</Label>
                <Input 
                  type="number"
                  min={0}
                  max={30}
                  value={rentalDaysPerMonth} 
                  onChange={(e) => onRentalDaysPerMonthChange(Number(e.target.value))}
                  placeholder="Ex: 4"
                />
              </div>
            </div>
          )}

          {rentalType !== 'none' && rentalTotalMonthly > 0 && (
            <div className="p-2 rounded-lg bg-muted/50 text-sm">
              <span className="text-muted-foreground">Custo mensal de aluguel: </span>
              <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rentalTotalMonthly)}</span>
            </div>
          )}
        </div>

        {/* Total das Alternativas */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Total Mensal das Alternativas</p>
              <p className="text-xs text-muted-foreground">App + Aluguel</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAlternativeMonthly)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAlternativeMonthly * 12)}/ano
              </p>
            </div>
          </div>
        </div>

        {totalAlternativeMonthly === 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Informe pelo menos um valor (app ou aluguel) para comparar com o carro próprio.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
