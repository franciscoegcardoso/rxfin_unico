import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Crown, Diamond, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StepGrandFinaleProps {
  userId: string;
  onComplete: () => void;
}

interface MasteryData {
  scenario_a_30y: number;
  scenario_a_label: string;
  scenario_b_30y: number;
  scenario_b_label: string;
  difference: number;
  extra_monthly_needed: number;
  net_worth_current: number;
  monthly_margin: number;
}

export const StepGrandFinale: React.FC<StepGrandFinaleProps> = ({ userId, onComplete }) => {
  const navigate = useNavigate();
  const [mastery, setMastery] = useState<MasteryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMastery = async () => {
      const { data } = await supabase.rpc('calculate_milestone_mastery', { p_user_id: userId });
      if (data && typeof data === 'object') {
        setMastery(data as any);
      }
      setLoading(false);
    };
    fetchMastery();
  }, [userId]);

  // Confetti on mount
  useEffect(() => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    const t1 = setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } }), 1000);
    const t2 = setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } }), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Golden gradient background card */}
      <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-200 dark:border-amber-800">
        <CardContent className="p-6 sm:p-8 space-y-6 text-center">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-3xl">
              🏆💎👑
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              DOMÍNIO TOTAL!
            </h1>
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 gap-1">
              <Diamond className="h-3 w-3" />
              Diamante
              <Crown className="h-3 w-3" />
            </Badge>
          </div>

          <p className="text-muted-foreground text-sm">
            Sua projeção financeira de 30 anos:
          </p>

          {loading ? (
            <div className="py-8 text-muted-foreground text-sm">Calculando projeção...</div>
          ) : mastery ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">
                      {mastery.scenario_a_label || 'Cenário A — Padrão atual'}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {formatMoney(mastery.scenario_a_30y)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 dark:border-amber-800 bg-primary/5">
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">
                      {mastery.scenario_b_label || 'Cenário B — Seguindo suas metas'}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {formatMoney(mastery.scenario_b_30y)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {mastery.difference > 0 && (
                <p className="text-sm text-muted-foreground">
                  A diferença de <span className="font-semibold text-foreground">{formatMoney(mastery.difference)}</span> começa com{' '}
                  <span className="font-semibold text-foreground">{formatMoney(mastery.extra_monthly_needed)}/mês</span> a mais de investimento.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              Não foi possível calcular a projeção. Configure mais dados para ver sua projeção completa.
            </p>
          )}

          <div className="border-t pt-6 space-y-3">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Você completou toda a jornada! 🎉</p>
              <p className="text-sm text-muted-foreground">
                Seu Raio-X Financeiro está 100% configurado e suas ferramentas de controle estão prontas.
              </p>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium">💎 No Premium: projeção personalizada com IA</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/financeiro/planos')}
                    >
                      Ver planos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={onComplete}
                    >
                      Continuar gratuito
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button size="lg" onClick={onComplete} className="w-full gap-2">
            Ir para o Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
