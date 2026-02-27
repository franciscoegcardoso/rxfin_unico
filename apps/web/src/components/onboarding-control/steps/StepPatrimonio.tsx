import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ArrowRight, HandMetal } from 'lucide-react';
import { toast } from 'sonner';

interface StepPatrimonioProps {
  userId: string;
  onComplete: () => void;
}

interface AssetInfo {
  id: string;
  name: string;
  value: number;
  type: string;
}

export const StepPatrimonio: React.FC<StepPatrimonioProps> = ({ userId, onComplete }) => {
  const [asset, setAsset] = useState<AssetInfo | null>(null);
  const [hasAssets, setHasAssets] = useState<boolean | null>(null);
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchAsset = async () => {
      const { data: assets } = await supabase
        .from('user_assets')
        .select('id, name, value, type')
        .eq('user_id', userId)
        .order('value', { ascending: false })
        .limit(1);

      if (assets && assets.length > 0) {
        setAsset(assets[0]);
        setNewValue(String(assets[0].value));
        setHasAssets(true);
      } else {
        setHasAssets(false);
      }
    };
    fetchAsset();
  }, [userId]);

  const handleUpdate = async () => {
    if (!asset || !newValue) return;
    setSaving(true);
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Update asset value
    await supabase.from('user_assets')
      .update({ value: Number(newValue) })
      .eq('id', asset.id);

    setSaving(false);
    setSaved(true);
    toast.success('Valor atualizado!');
  };

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
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-cyan-500" />
            </div>
            <h2 className="text-xl font-bold">Patrimônio</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            O Patrimônio é a visão de longo prazo. Enquanto o Planejamento cuida do mês,
            aqui você acompanha se está construindo riqueza ou só pagando contas.
          </p>

          {/* Action card */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <HandMetal className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Sua vez:</span>
              </div>

              {hasAssets === true && asset ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Atualize o valor do seu principal investimento para o mês atual.
                  </p>
                  <div className="text-sm">
                    <span className="font-medium">{asset.name}:</span>{' '}
                    <span className="text-muted-foreground">{formatMoney(asset.value)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Valor atualizado: R$</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        className="max-w-[200px]"
                        disabled={saved}
                      />
                      <Button
                        size="sm"
                        onClick={handleUpdate}
                        disabled={saving || !newValue || saved}
                      >
                        {saved ? '✓ Atualizado' : 'Atualizar'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : hasAssets === false ? (
                <p className="text-sm text-muted-foreground italic">
                  Você ainda não cadastrou investimentos. Pode fazer isso depois em Patrimônio.
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
