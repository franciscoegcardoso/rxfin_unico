import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOnboardingV2Store, type OnboardingPersona } from '@/store/onboardingV2Store';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { cn } from '@/lib/utils';

const PERSONAS: { id: OnboardingPersona; emoji: string; title: string; subtitle: string }[] = [
  { id: 'dividas', emoji: '💳', title: 'Sair das dívidas', subtitle: 'Quitar e reorganizar o que devo' },
  { id: 'patrimonio', emoji: '📈', title: 'Crescer meu patrimônio', subtitle: 'Investir e acumular bens' },
  { id: 'dia_a_dia', emoji: '📅', title: 'Organizar o dia a dia', subtitle: 'Controlar gastos e orçamento' },
  { id: 'ir', emoji: '📄', title: 'Preparar meu IR', subtitle: 'Declaração sem stress' },
];

export function Step0Persona() {
  const [selected, setSelected] = useState<OnboardingPersona | null>(null);
  const { setPersona, advanceStep, isSaving } = useOnboardingV2Store();

  const handleContinue = async () => {
    if (selected == null) return;
    await setPersona(selected);
    await advanceStep(0);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-2">
        Qual é seu principal objetivo financeiro agora?
      </h2>
      <p className="text-muted-foreground text-center text-sm mb-8">
        Escolha a opção que mais combina com você.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-10">
        {PERSONAS.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={cn(
                'rounded-xl border-2 p-4 sm:p-5 text-left transition-all duration-200',
                'hover:bg-[hsl(var(--color-surface-sunken))]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected
                  ? 'border-primary bg-[hsl(var(--primary)/0.1)] scale-[1.02] shadow-md'
                  : 'border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-card))]',
              )}
            >
              <span className="text-2xl sm:text-3xl block mb-2" aria-hidden>
                {p.emoji}
              </span>
              <span className="font-semibold text-foreground block text-sm sm:text-base">
                {p.title}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground mt-0.5 block">
                {p.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          disabled={selected == null || isSaving}
          className="min-w-[180px] bg-[hsl(var(--primary))] text-primary-foreground hover:opacity-90"
        >
          {isSaving ? (
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
