import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3, ArrowRight, Lightbulb, HandMetal } from 'lucide-react';
import { toast } from 'sonner';

interface StepPlanejamentoProps {
  userId: string;
  onComplete: () => void;
}

export const StepPlanejamento: React.FC<StepPlanejamentoProps> = ({ userId, onComplete }) => {
  const [foodItemId, setFoodItemId] = useState<string | null>(null);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchFoodItem = async () => {
      // Get onboarding categories to find the food item
      const { data: categories } = await supabase.rpc('get_onboarding_categories');
      if (!categories) return;

      const parsed = categories as any;
      const expenseItems = parsed?.expense ?? [];
      const foodItem = expenseItems.find((e: any) =>
        e.name?.toLowerCase().includes('alimentação') || e.category_name?.toLowerCase().includes('alimentação')
      );
      if (!foodItem) return;

      setFoodItemId(foodItem.id);

      // Get current value
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: entry } = await supabase
        .from('user_monthly_entries')
        .select('value')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .eq('item_id', foodItem.id)
        .maybeSingle();

      if (entry?.value) {
        setCurrentValue(entry.value);
        setNewValue(String(entry.value));
      }
    };
    fetchFoodItem();
  }, [userId]);

  const handleSave = async () => {
    if (!foodItemId || !newValue) return;
    setSaving(true);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { error } = await supabase.from('user_monthly_entries')
      .upsert({
        user_id: userId,
        month: currentMonth,
        item_id: foodItemId,
        entry_type: 'expense',
        value: Number(newValue),
        is_manual_override: true,
      }, { onConflict: 'user_id,month,item_id,entry_type' });

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar ajuste');
    } else {
      setSaved(true);
      toast.success('Ajuste salvo!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold">Planejamento</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            O Planejamento é onde você define o orçamento mensal. Todo lançamento que você faz — ou que a
            Pluggy captura — aparece aqui automaticamente como "realizado".
          </p>

          <p className="text-sm text-muted-foreground">
            O objetivo é manter o verde:{' '}
            <Badge variant="outline" className="text-emerald-600 border-emerald-300">realizado ≤ previsto ✅</Badge>
          </p>

          {/* Action card */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <HandMetal className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Sua vez:</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ajuste o valor previsto de Alimentação para o mês atual.
              </p>

              {foodItemId ? (
                <div className="space-y-3">
                  {currentValue > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Valor atual: R$ {currentValue.toLocaleString('pt-BR')}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Alimentação previsto:</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Ex: 800"
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        className="max-w-[200px]"
                      />
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !newValue || saved}
                      >
                        {saved ? '✓ Salvo' : 'Salvar ajuste'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Carregando item de alimentação...
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
            <span>Dica: você pode ajustar qualquer categoria diretamente na página de Planejamento depois.</span>
          </div>

          <Button onClick={onComplete} className="w-full gap-2">
            Módulo concluído
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
