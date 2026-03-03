import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, ArrowRight, HandMetal, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface StepFluxoProps {
  userId: string;
  onComplete: () => void;
}

export const StepFluxo: React.FC<StepFluxoProps> = ({ userId, onComplete }) => {
  const [hasPluggy, setHasPluggy] = useState<boolean | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Alimentação');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const init = async () => {
      // Check Pluggy
      const { count } = await supabase
        .from('pluggy_connections' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      setHasPluggy((count ?? 0) > 0);

      // Get categories
      const { data: cats } = await supabase.rpc('get_onboarding_categories');
      if (cats) {
        const parsed = cats as any;
        const expenses = parsed?.expense ?? [];
        setCategories(expenses.map((e: any) => ({ id: e.category_id || e.id, name: e.category_name || e.name })));
      }
    };
    init();
  }, [userId]);

  const handleAdd = async () => {
    if (!descricao || !valor) return;
    setSaving(true);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().split('T')[0];
    const categoryId = categories.find(c => c.name === categoria)?.id ?? null;
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      source_type: 'manual',
      description: descricao,
      transaction_type: 'despesa',
      amount: Number(valor),
      transaction_date: today,
      reference_month: currentMonth,
      payment_date: today,
      category_name: categoria,
      category_id: categoryId,
      notes: null,
      payment_method: null,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro ao adicionar lançamento');
    } else {
      setSaved(true);
      toast.success('Lançamento adicionado!');
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
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold">Fluxo Financeiro</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            O Fluxo é o extrato completo da sua vida financeira. Quanto mais completo, mais preciso o seu Raio-X.
          </p>

          {hasPluggy === true && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4" />
              Seus lançamentos já chegam automaticamente via Open Finance.
            </div>
          )}

          {hasPluggy === false && (
            <p className="text-sm text-muted-foreground">
              Adicione seus lançamentos manualmente para manter o controle em dia.
            </p>
          )}

          {/* Action card */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <HandMetal className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Sua vez:</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Adicione um lançamento rápido. Pode ser algo simples: um café, uber, etc.
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Descrição:</Label>
                  <Input
                    placeholder="Ex: Café da manhã"
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    disabled={saved}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Valor: R$</Label>
                    <Input
                      type="number"
                      placeholder="15"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      disabled={saved}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Categoria:</Label>
                    <Select value={categoria} onValueChange={setCategoria} disabled={saved}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length > 0 ? (
                          categories.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Alimentação">Alimentação</SelectItem>
                            <SelectItem value="Transporte">Transporte</SelectItem>
                            <SelectItem value="Lazer">Lazer</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={saving || !descricao || !valor || saved}
                >
                  {saved ? '✓ Adicionado' : 'Adicionar lançamento'}
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
