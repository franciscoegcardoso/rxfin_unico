import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useAuth } from '@/contexts/AuthContext';
import { buildCheckoutUrl } from '@/utils/checkoutUrl';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
  requiredPlan?: string;
}

const FALLBACK_FEATURES: Record<string, string[]> = {
  starter: [
    'Gestão de veículos',
    'Planejamento anual',
    'Meu IR',
    'Pacotes de orçamento',
  ],
  pro: [
    'Planejamento mensal completo',
    'Projeção financeira de 30 anos',
    'Gestão de lançamentos e fluxo',
    'Pacotes de orçamento',
  ],
  premium: [
    'Acesso total a todos os recursos',
    'Integrações bancárias',
    'Simuladores avançados',
    'Suporte prioritário',
  ],
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onOpenChange,
  featureName = 'esta funcionalidade',
  requiredPlan = 'Pro',
}) => {
  const { data: plans } = useSubscriptionPlans();
  const { user } = useAuth();

  const targetPlan = plans?.find(p =>
    p.slug.toLowerCase() === requiredPlan.toLowerCase() ||
    p.name.toLowerCase().includes(requiredPlan.toLowerCase())
  );

  const features: string[] =
    targetPlan?.features && targetPlan.features.length > 0
      ? targetPlan.features
      : FALLBACK_FEATURES[requiredPlan.toLowerCase()] || FALLBACK_FEATURES.pro;

  // Prioritize yearly monthly equivalent for better perceived value
  const yearlyMonthly = targetPlan?.price_yearly && targetPlan.price_yearly > 0
    ? targetPlan.price_yearly / 12
    : null;
  const displayPrice = yearlyMonthly ?? targetPlan?.price_monthly ?? null;
  const priceLabel = displayPrice
    ? `R$ ${displayPrice.toFixed(2).replace('.', ',')}/mês`
    : null;

  const handleUpgrade = () => {
    const checkoutUrl = targetPlan?.checkout_url;
    if (checkoutUrl) {
      const urlWithEmail = buildCheckoutUrl(checkoutUrl, user?.email);
      window.open(urlWithEmail, '_blank');
    } else {
      window.location.href = '/financeiro/planos';
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Recurso Bloqueado</DialogTitle>
          <DialogDescription className="text-base">
            O seu plano atual não inclui acesso a <strong>{featureName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-semibold">
                Plano {targetPlan?.name || requiredPlan}
              </span>
              {priceLabel && (
                <span className="ml-auto text-sm font-medium text-primary">
                  {priceLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Faça upgrade e desbloqueie:
            </p>
            <ul className="space-y-2 text-sm">
              {features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleUpgrade}
            className="w-full gap-2"
            size="lg"
          >
            <Crown className="h-4 w-4" />
            Assinar Agora
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Pagamento seguro processado via Pagar.me
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};