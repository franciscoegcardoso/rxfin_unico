import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { MoneyInput } from '@/components/ui/money-input';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Wallet, 
  Trophy, 
  PiggyBank,
  Sparkles,
  Battery,
  Sun,
  Wrench
} from 'lucide-react';
import { motion } from 'framer-motion';

interface MakeOrPayModuleProps {
  realHourlyRate: number;
}

export const MakeOrPayModule: React.FC<MakeOrPayModuleProps> = ({ realHourlyRate }) => {
  // Inputs
  const [paymentCost, setPaymentCost] = useState<number>(0);
  const [myTimeHours, setMyTimeHours] = useState<number>(2);
  const [transactionCostHours, setTransactionCostHours] = useState<number>(0.5);
  
  // Special adjustments
  const [isWeekend, setIsWeekend] = useState(false);
  const [satisfactionLevel, setSatisfactionLevel] = useState(50); // 0-100

  // Calculations
  const calculations = useMemo(() => {
    // Leisure premium: 20% extra if weekend
    const leisurePremium = isWeekend ? 1.20 : 1.0;
    const adjustedHourlyRate = realHourlyRate * leisurePremium;

    // Satisfaction multiplier: 0 = very hard (1.5x cost), 100 = enjoyable (0.5x cost)
    // Maps 0-100 to 1.5-0.5
    const satisfactionMultiplier = 1.5 - (satisfactionLevel / 100);

    // Total time cost if I do it myself
    const totalMyTime = myTimeHours + transactionCostHours;
    const perceivedTimeCost = totalMyTime * satisfactionMultiplier;
    
    // Cost in money if I do it myself
    const myTimeCostMoney = perceivedTimeCost * adjustedHourlyRate;

    // Difference
    const difference = paymentCost - myTimeCostMoney;
    const shouldPay = difference < 0;
    
    // Time gained or money saved
    const timeGained = shouldPay ? totalMyTime : 0;
    const moneySaved = !shouldPay ? paymentCost : 0;
    const moneySpentExtra = shouldPay ? Math.abs(difference) : 0;

    return {
      adjustedHourlyRate,
      leisurePremium,
      satisfactionMultiplier,
      totalMyTime,
      perceivedTimeCost,
      myTimeCostMoney,
      difference,
      shouldPay,
      timeGained,
      moneySaved,
      moneySpentExtra
    };
  }, [realHourlyRate, paymentCost, myTimeHours, transactionCostHours, isWeekend, satisfactionLevel]);

  const getSatisfactionLabel = (value: number) => {
    if (value <= 20) return { label: 'Detesto', emoji: '😫', color: 'text-red-500' };
    if (value <= 40) return { label: 'Difícil', emoji: '😓', color: 'text-orange-500' };
    if (value <= 60) return { label: 'Neutro', emoji: '😐', color: 'text-slate-500' };
    if (value <= 80) return { label: 'Ok', emoji: '🙂', color: 'text-emerald-500' };
    return { label: 'Adoro', emoji: '😍', color: 'text-emerald-600' };
  };

  const satisfactionInfo = getSatisfactionLabel(satisfactionLevel);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="text-center p-4 bg-muted/30 rounded-xl">
        <Wrench className="h-8 w-8 mx-auto mb-2 text-primary" />
        <h3 className="font-semibold text-lg">Faço ou Pago?</h3>
        <p className="text-sm text-muted-foreground">
          Descubra se vale mais a pena fazer você mesmo ou pagar alguém
        </p>
      </div>

      {/* Inputs Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Payment Cost */}
        <Card>
          <CardContent className="pt-4">
            <Label className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Custo para pagar alguém
            </Label>
            <MoneyInput
              value={paymentCost}
              onChange={setPaymentCost}
              placeholder="R$ 0,00"
            />
          </CardContent>
        </Card>

        {/* My Time */}
        <Card>
          <CardContent className="pt-4">
            <Label className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Tempo que EU levaria (horas)
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={myTimeHours}
              onChange={(e) => setMyTimeHours(parseFloat(e.target.value) || 0)}
              className="text-lg"
            />
          </CardContent>
        </Card>

        {/* Transaction Costs */}
        <Card className="sm:col-span-2">
          <CardContent className="pt-4">
            <Label className="flex items-center gap-2 mb-2">
              <Battery className="h-4 w-4 text-muted-foreground" />
              Custos de transação (deslocamento, retrabalho, etc.)
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[transactionCostHours]}
                onValueChange={(v) => setTransactionCostHours(v[0])}
                min={0}
                max={5}
                step={1 / 60}
                className="flex-1"
              />
              <span className="text-sm font-medium w-20 text-right">
                {Math.floor(transactionCostHours)}h{String(Math.round((transactionCostHours % 1) * 60)).padStart(2, '0')}min
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Special Adjustments */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Ajustes Especiais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Weekend Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-sm">Valor do Lazer</p>
                <p className="text-xs text-muted-foreground">
                  Fim de semana? +20% no valor da sua hora
                </p>
              </div>
            </div>
            <Switch
              checked={isWeekend}
              onCheckedChange={setIsWeekend}
            />
          </div>

          {/* Satisfaction Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Satisfação com a tarefa</Label>
              <Badge variant="outline" className={satisfactionInfo.color}>
                {satisfactionInfo.emoji} {satisfactionInfo.label}
              </Badge>
            </div>
            <Slider
              value={[satisfactionLevel]}
              onValueChange={(v) => setSatisfactionLevel(v[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Detesto 😫</span>
              <span>Neutro 😐</span>
              <span>Adoro 😍</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Tarefas que você detesta custam mais energia mental
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Breakdown */}
      <Card className="bg-muted/20">
        <CardContent className="pt-4 space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Análise de Custo</h4>
          
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Sua hora ajustada:</span>
              <span className="font-medium">
                R$ {calculations.adjustedHourlyRate.toFixed(2)}
                {isWeekend && <span className="text-amber-500 ml-1">(+20%)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tempo total (tarefa + transação):</span>
              <span className="font-medium">{calculations.totalMyTime.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span>Multiplicador de dificuldade:</span>
              <span className="font-medium">×{calculations.satisfactionMultiplier.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Custo percebido (fazer):</span>
              <span className="font-bold text-primary">
                R$ {calculations.myTimeCostMoney.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Custo para pagar:</span>
              <span className="font-bold">R$ {paymentCost.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verdict */}
      {paymentCost > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={`border-2 ${
            calculations.shouldPay 
              ? 'border-emerald-500 bg-emerald-500/5' 
              : 'border-amber-500 bg-amber-500/5'
          }`}>
            <CardContent className="pt-6 pb-6 text-center">
              {calculations.shouldPay ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                    <Trophy className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-600 mb-2">
                    PAGUE! Tempo é Vida.
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Você ganha <span className="font-bold text-emerald-600">
                      {calculations.timeGained.toFixed(1)} horas
                    </span> de vida livre
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Investimento extra: R$ {calculations.moneySpentExtra.toFixed(2)}
                  </div>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
                    <PiggyBank className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-amber-600 mb-2">
                    FAÇA! Economia Inteligente.
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Você economiza <span className="font-bold text-amber-600">
                      R$ {calculations.moneySaved.toFixed(2)}
                    </span>
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Tempo investido: {calculations.totalMyTime.toFixed(1)}h
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {paymentCost === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Informe o custo para pagar alguém para ver o veredito</p>
        </div>
      )}
    </div>
  );
};
