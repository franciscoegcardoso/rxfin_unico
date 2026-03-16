import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, ArrowRight, HandMetal, CheckCircle2, ExternalLink } from 'lucide-react';

interface StepCartaoProps {
  userId: string;
  onComplete: () => void;
}

export const StepCartao: React.FC<StepCartaoProps> = ({ userId, onComplete }) => {
  const navigate = useNavigate();
  const [billValue, setBillValue] = useState<number | null>(null);
  const [hasBills, setHasBills] = useState<boolean | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: bills } = await supabase
        .from('credit_card_bills')
        .select('total_value, due_date, status')
        .eq('user_id', userId)
        .gte('due_date', `${currentMonth}-01`)
        .order('due_date', { ascending: true })
        .limit(1);

      if (bills && bills.length > 0) {
        setBillValue(bills[0].total_value);
        setHasBills(true);
      } else {
        setHasBills(false);
      }
    };
    fetchBill();
  }, [userId]);

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-purple-500" />
            </div>
            <h2 className="text-xl font-bold">Cartão de Crédito</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            O cartão de crédito é onde mora o perigo: parcelamentos se acumulam sem você perceber.
            Aqui você vê exatamente quanto do seu futuro já está comprometido.
          </p>

          {/* Action card */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <HandMetal className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Sua vez:</span>
              </div>

              {hasBills === true && billValue !== null ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Verifique se o valor da sua fatura atual está correto.
                  </p>
                  <div className="text-center py-3">
                    <p className="text-xs text-muted-foreground">Fatura atual</p>
                    <p className="text-2xl font-bold text-foreground">{formatMoney(billValue)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={confirmed ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => setConfirmed(true)}
                      disabled={confirmed}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {confirmed ? 'Confirmado' : 'Está correto'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => navigate('/movimentacoes/cartao-credito')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ajustar
                    </Button>
                  </div>
                </div>
              ) : hasBills === false ? (
                <p className="text-sm text-muted-foreground italic">
                  Você ainda não tem faturas registradas. Quando adicionar, elas aparecem aqui automaticamente.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Carregando...</p>
              )}
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
