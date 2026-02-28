import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';

interface ChallengeSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ChallengeSlider({ value, onChange, disabled }: ChallengeSliderProps) {
  const isReduction = value < 0;
  const isIncrease = value > 0;
  
  const getChallengeLabel = () => {
    if (value === 0) return 'Sem desafio';
    if (value < 0) return `Reduzir ${Math.abs(value)}%`;
    return `Aumentar ${value}%`;
  };

  const getChallengeType = () => {
    if (value <= -10) return { label: 'Ousado', color: 'text-income' };
    if (value < 0) return { label: 'Moderado', color: 'text-amber-500' };
    if (value === 0) return { label: 'Neutro', color: 'text-muted-foreground' };
    if (value <= 10) return { label: 'Flexível', color: 'text-amber-500' };
    return { label: 'Conservador', color: 'text-expense' };
  };

  const challengeType = getChallengeType();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-muted-foreground" />
          Desafio Global
        </Label>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold",
            isReduction && "text-income",
            isIncrease && "text-expense",
            !isReduction && !isIncrease && "text-muted-foreground"
          )}>
            {getChallengeLabel()}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full bg-muted", challengeType.color)}>
            {challengeType.label}
          </span>
        </div>
      </div>

      <div className="relative pt-2 pb-6">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={-20}
          max={20}
          step={1}
          disabled={disabled}
          className="w-full"
        />
        <div className="absolute -bottom-1 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <TrendingDown className="h-3 w-3 text-income" />
            -20%
          </span>
          <span>-10%</span>
          <span className="font-medium text-foreground">0%</span>
          <span>+10%</span>
          <span className="flex items-center gap-0.5">
            +20%
            <TrendingUp className="h-3 w-3 text-expense" />
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {isReduction 
          ? `A meta será ${Math.abs(value)}% menor que a média histórica, incentivando economia.`
          : isIncrease 
            ? `A meta será ${value}% maior que a média histórica, oferecendo mais flexibilidade.`
            : 'A meta seguirá exatamente a média histórica calculada.'}
      </p>
    </div>
  );
}
