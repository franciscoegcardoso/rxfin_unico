import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnboardingV2Store, type OnboardingPersona } from '@/store/onboardingV2Store';
import { supabase } from '@/integrations/supabase/client';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const RENDA_OPCOES = [
  { value: 'lt_2k', label: '< R$2k' },
  { value: '2k_5k', label: 'R$2k–5k' },
  { value: '5k_10k', label: 'R$5k–10k' },
  { value: '10k_20k', label: 'R$10k–20k' },
  { value: 'gt_20k', label: '> R$20k' },
] as const;

const FASE_OPCOES = [
  { value: 'iniciando', label: 'Iniciando' },
  { value: 'construindo', label: 'Construindo' },
  { value: 'consolidando', label: 'Consolidando' },
  { value: 'aposentadoria', label: 'Aposentadoria' },
] as const;

const PERSONA_LABELS: Record<OnboardingPersona, string> = {
  dividas: 'Sair das dívidas',
  patrimonio: 'Crescer patrimônio',
  dia_a_dia: 'Organizar dia a dia',
  ir: 'Preparar meu IR',
};

export interface Step1IdentidadeProps {
  onContinue: () => void;
}

export function Step1Identidade({ onContinue }: Step1IdentidadeProps) {
  const { persona, advanceStep, isSaving } = useOnboardingV2Store();
  const [rendaFaixa, setRendaFaixa] = useState<string>('');
  const [faseVida, setFaseVida] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const canContinue = rendaFaixa && faseVida;
  const busy = isSaving || saving;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await (supabase as any)
          .from('user_kv_store')
          .upsert(
            {
              user_id: authUser.id,
              key: 'onboarding_identity',
              value: { renda_faixa: rendaFaixa, fase_vida: faseVida },
            },
            { onConflict: 'user_id,key' }
          );
      }
      await advanceStep(1);
      onContinue();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-2">
        Identidade financeira
      </h2>
      <p className="text-muted-foreground text-center text-sm mb-6">
        Algumas informações para personalizar sua experiência.
      </p>

      {persona != null && (
        <div className="flex justify-center mb-6">
          <Badge variant="secondary" className="bg-[hsl(var(--primary)/0.12)] text-primary border-[hsl(var(--color-border-default))]">
            Objetivo: {PERSONA_LABELS[persona]}
          </Badge>
        </div>
      )}

      <div className="space-y-6 mb-10">
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            Faixa de renda mensal
          </label>
          <Select value={rendaFaixa} onValueChange={setRendaFaixa}>
            <SelectTrigger className="w-full border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-card))]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {RENDA_OPCOES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            Fase de vida
          </label>
          <Select value={faseVida} onValueChange={setFaseVida}>
            <SelectTrigger className="w-full border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-card))]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {FASE_OPCOES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          disabled={!canContinue || busy}
          className={cn(
            'min-w-[180px] bg-[hsl(var(--primary))] text-primary-foreground hover:opacity-90',
          )}
        >
          {busy ? (
            <>
              <RXFinLoadingSpinner size={16} variant="inline" />
              <span className="ml-2">Salvando...</span>
            </>
          ) : (
            'Continuar →'
          )}
        </Button>
      </div>
    </div>
  );
}
