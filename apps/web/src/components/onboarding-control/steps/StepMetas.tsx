import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, ArrowRight, HandMetal, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface StepMetasProps {
  userId: string;
  onComplete: () => void;
}

const GOAL_OPTIONS = [
  'Montar reserva de emergência',
  'Quitar uma dívida',
  'Fazer uma viagem',
  'Comprar algo importante',
];

export const StepMetas: React.FC<StepMetasProps> = ({ userId, onComplete }) => {
  const [selectedGoal, setSelectedGoal] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('2026-12');
  const [monthlyMargin, setMonthlyMargin] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchMargin = async () => {
      const { data } = await supabase.rpc('calculate_milestone_identity', { p_user_id: userId });
      if (data && typeof data === 'object') {
        setMonthlyMargin((data as any).monthly_margin ?? 0);
      }
    };
    fetchMargin();
  }, [userId]);

  const goalName = selectedGoal === 'other' ? customGoal : selectedGoal;
  const parsedTarget = Number(targetValue) || 0;
  const monthsNeeded = parsedTarget > 0 && monthlyMargin && monthlyMargin > 0
    ? Math.ceil(parsedTarget / monthlyMargin)
    : null;

  const handleCreate = async () => {
    if (!goalName || !parsedTarget) return;
    setSaving(true);
    const { error } = await supabase.from('user_goals').insert({
      user_id: userId,
      name: goalName,
      target_amount: parsedTarget,
      deadline: `${targetDate}-01`,
      current_amount: 0,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro ao criar meta');
    } else {
      setSaved(true);
      toast.success('Meta criada!');
    }
  };

  // Generate deadline options
  const deadlineOptions = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    deadlineOptions.push({ value: val, label });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold">Metas</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Metas são o motor da disciplina. O RXFin compara automaticamente seu realizado com a meta e te avisa quando está saindo do caminho.
          </p>

          {/* Action card */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <HandMetal className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Sua vez:</span>
              </div>
              <p className="text-sm text-muted-foreground">Crie uma meta pessoal para este ano.</p>

              <div className="space-y-3">
                <Label className="text-sm font-medium">O que você quer alcançar?</Label>
                <RadioGroup value={selectedGoal} onValueChange={setSelectedGoal} className="space-y-2">
                  {GOAL_OPTIONS.map(opt => (
                    <div key={opt} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={opt} disabled={saved} />
                      <Label htmlFor={opt} className="text-sm cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" disabled={saved} />
                    <Label htmlFor="other" className="text-sm cursor-pointer">Outro:</Label>
                    {selectedGoal === 'other' && (
                      <Input
                        placeholder="Descreva sua meta"
                        value={customGoal}
                        onChange={e => setCustomGoal(e.target.value)}
                        className="max-w-[200px] h-8"
                        disabled={saved}
                      />
                    )}
                  </div>
                </RadioGroup>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Valor da meta: R$</Label>
                    <Input
                      type="number"
                      placeholder="5000"
                      value={targetValue}
                      onChange={e => setTargetValue(e.target.value)}
                      disabled={saved}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Prazo:</Label>
                    <Select value={targetDate} onValueChange={setTargetDate} disabled={saved}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {deadlineOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {monthsNeeded !== null && monthlyMargin !== null && monthlyMargin > 0 && parsedTarget > 0 && (
                  <div className="flex items-start gap-2 text-xs bg-primary/5 rounded-lg p-3">
                    <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                    <span>
                      Com sua margem de R$ {monthlyMargin.toLocaleString('pt-BR')}/mês,
                      você alcança em ~{monthsNeeded} {monthsNeeded === 1 ? 'mês' : 'meses'}.
                    </span>
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={saving || !goalName || !parsedTarget || saved}
                >
                  {saved ? '✓ Meta criada' : 'Criar meta'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button onClick={onComplete} className="w-full gap-2">
            Módulo concluído
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
