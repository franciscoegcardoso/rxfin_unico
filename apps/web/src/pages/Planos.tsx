import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Check, Crown, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { useUserPlan } from '@/hooks/useUserPlan';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

interface PlanPublic {
  name?: string;
  slug?: string;
  description?: string | null;
  price_monthly?: number;
  price_yearly?: number;
  features?: string[] | null;
  is_active?: boolean;
  highlight_label?: string | null;
  checkout_url?: string | null;
  original_price_monthly?: number | null;
  has_promo?: boolean;
}

export default function Planos() {
  const { user } = useAuth();
  const { data: profileData } = useProfileSettings();
  const { data: userPlanView } = useUserPlan();
  /** v_user_plan + fallback do RPC de perfil (plan_slug explícito). */
  const currentPlanSlug = user
    ? (userPlanView?.plan_slug ?? profileData?.profile?.plan_slug ?? 'free')
    : null;

  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .rpc('get_subscription_plans_public', {})
      .then(({ data: result, error: rpcError }) => {
        if (rpcError) setError(rpcError.message);
        else setPlans(Array.isArray(result) ? (result as PlanPublic[]) : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
          <h1 className="text-2xl font-bold">Escolha seu plano</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Escolha seu plano</h1>

        <SectionErrorBoundary fallbackTitle="Planos e assinatura">
        {plans.length === 0 ? (
          <p className="text-muted-foreground">Nenhum plano disponível.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.filter((p) => p.is_active !== false).map((plan) => {
              const isCurrent = !!user && currentPlanSlug === plan.slug;
              return (
                <Card
                  key={plan.slug ?? plan.name}
                  className="rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col"
                >
                  <CardHeader className="p-0 pb-4 flex flex-row items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-lg text-foreground">{plan.name ?? plan.slug}</h2>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {plan.highlight_label && (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-0">
                          {plan.highlight_label}
                        </Badge>
                      )}
                      {plan.has_promo && (
                        <Badge variant="secondary" className="rounded-full">Promoção</Badge>
                      )}
                      {isCurrent && (
                        <Badge className="bg-green-600 text-white border-0">Plano Atual</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(plan.price_monthly ?? 0)}
                      </span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>
                    {plan.has_promo && plan.original_price_monthly != null && (
                      <p className="text-sm text-muted-foreground line-through mt-0.5">
                        {formatCurrency(plan.original_price_monthly)}
                      </p>
                    )}
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="mt-4 space-y-2 flex-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-6">
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Crown className="h-4 w-4 mr-2" />
                          Atual
                        </Button>
                      ) : plan.checkout_url ? (
                        <Button asChild className="w-full gap-2">
                          <a
                            href={plan.checkout_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Assinar
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          Em breve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </SectionErrorBoundary>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Plano renova automaticamente. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
