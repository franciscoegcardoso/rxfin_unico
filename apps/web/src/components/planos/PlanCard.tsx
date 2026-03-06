import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, CreditCard, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { motion } from 'framer-motion';

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Star,
  basic: Sparkles,
  pro: Zap,
};

export type BillingPeriod = 'monthly' | 'yearly';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSelect: (checkoutUrl: string | null, isFree: boolean) => void;
  index: number;
  billingPeriod: BillingPeriod;
}

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export const PlanCard: React.FC<PlanCardProps> = ({ 
  plan, 
  isCurrentPlan, 
  onSelect,
  index,
  billingPeriod,
}) => {
  const Icon = PLAN_ICONS[plan.slug] || Star;
  const isPro = plan.slug === 'pro';
  const isPopular = !!plan.highlight_label;

  // --- Price logic based on billing period ---
  const isMonthly = billingPeriod === 'monthly';
  const mainPrice = isMonthly
    ? plan.price_monthly
    : plan.price_yearly > 0 ? plan.price_yearly / 12 : 0;

  const originalPrice = plan.has_promo
    ? isMonthly
      ? plan.original_price_monthly
      : plan.original_price_yearly
        ? plan.original_price_yearly / 12
        : null
    : null;

  const checkoutUrl = isMonthly ? plan.checkout_url : plan.checkout_url_yearly;

  // Savings badge (yearly only, comparing monthly equiv to monthly price)
  const savingsPercent = !isMonthly && plan.price_monthly > 0 && plan.price_yearly > 0
    ? Math.round(((plan.price_monthly - plan.price_yearly / 12) / plan.price_monthly) * 100)
    : null;

  const discountPercent = originalPrice && originalPrice > mainPrice
    ? Math.round(((originalPrice - mainPrice) / originalPrice) * 100)
    : null;

  const priceParts = mainPrice > 0 ? formatBRL(mainPrice).split(',') : ['0', '00'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="h-full"
    >
      <Card 
        className={cn(
          "relative flex flex-col h-full transition-all duration-300",
          isPro 
            ? "border-2 border-primary bg-gradient-to-b from-primary/5 to-transparent shadow-xl shadow-primary/10 scale-[1.02] z-10" 
            : "border-border hover:border-primary/30 hover:shadow-lg",
          isCurrentPlan && "ring-2 ring-primary ring-offset-2"
        )}
      >
        {/* Promo Banner */}
        {plan.has_promo && plan.discount_reason && !isCurrentPlan && (
          <div className="absolute -top-0 left-0 right-0 bg-gradient-to-r from-destructive to-orange-500 text-white text-xs font-bold py-2 text-center rounded-t-xl animate-pulse">
            🔥 {plan.discount_reason}
            {discountPercent && ` — ${discountPercent}% OFF`}
          </div>
        )}

        {/* Popular Badge */}
        {isPro && !isCurrentPlan && !plan.has_promo && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-1 text-xs font-bold shadow-lg">
              ⭐ MAIS POPULAR
            </Badge>
          </div>
        )}

        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
            ✓ Plano Atual
          </Badge>
        )}

        <CardHeader className={cn(
          "text-center pb-4",
          plan.has_promo && plan.discount_reason && !isCurrentPlan && "pt-10"
        )}>
          <div className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 overflow-hidden",
            !plan.image_url && (isPro 
              ? "bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30" 
              : isCurrentPlan 
                ? "bg-primary/20" 
                : "bg-muted")
          )}>
            {plan.image_url ? (
              <img 
                src={plan.image_url} 
                alt={plan.name} 
                className="h-full w-full object-contain"
              />
            ) : (
              <Icon className={cn(
                "h-8 w-8",
                isPro ? "text-primary-foreground" : isCurrentPlan ? "text-primary" : "text-muted-foreground"
              )} />
            )}
          </div>
          <CardTitle className={cn("text-2xl font-bold", isPro && "text-primary")}>
            {plan.name}
          </CardTitle>
          <CardDescription className="text-sm min-h-[40px]">
            {plan.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Price Section */}
          <div className="text-center mb-6 p-4 rounded-xl bg-muted/30">
            {/* Savings badge for yearly */}
            {savingsPercent !== null && savingsPercent > 0 && (
              <Badge className="mb-2 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                Economize {savingsPercent}%
              </Badge>
            )}

            {/* Original price (crossed out) */}
            {originalPrice && originalPrice > mainPrice && (
              <p className="text-lg text-muted-foreground line-through mb-1">
                R$ {formatBRL(originalPrice)}
              </p>
            )}
            
            {/* Current price */}
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-lg text-muted-foreground">R$</span>
              <p className={cn(
                "font-sans font-bold tracking-tight leading-none tabular-nums text-[40px] md:text-[48px]",
                plan.has_promo ? "text-green-600 dark:text-green-400" : "text-foreground"
              )}>
                {priceParts[0]}
              </p>
              {mainPrice > 0 && (
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold text-foreground">
                    ,{priceParts[1]}
                  </span>
                  <span className="text-xs text-muted-foreground">/mês</span>
                </div>
              )}
            </div>
            
            {mainPrice === 0 && (
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Gratuito para sempre
              </p>
            )}

            {/* Yearly billing details */}
            {!isMonthly && plan.price_yearly > 0 && (
              <div className="mt-3 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  12x de R$ {formatBRL(plan.price_yearly / 12)}
                </p>
                <p className="text-xs text-muted-foreground">
                  cobrado R$ {formatBRL(plan.price_yearly)}/ano
                </p>
              </div>
            )}
          </div>

          {/* Features */}
          {plan.features && plan.features.length > 0 && (
            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map((feature, idx) => (
                <motion.li 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    isPro ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Check className={cn(
                      "h-3 w-3",
                      isPro ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </motion.li>
              ))}
            </ul>
          )}

          {/* Modules count */}
          <div className="text-center text-sm text-muted-foreground mb-4 py-2 border-t border-border/50">
            {plan.allowed_pages.includes('*') 
              ? <span className="font-medium text-primary">✨ Acesso completo a tudo</span>
              : <span>{plan.allowed_pages.length} módulos inclusos</span>
            }
          </div>

          {/* Action Button */}
          {isCurrentPlan ? (
            <Button disabled className="w-full h-12" variant="outline">
              <Check className="h-4 w-4 mr-2" />
              Seu Plano Atual
            </Button>
          ) : (
            <Button 
              onClick={() => onSelect(checkoutUrl, plan.price_monthly === 0)}
              className={cn(
                "w-full h-12 font-bold text-base transition-all duration-300",
                isPro || plan.has_promo
                  ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl hover:scale-[1.02]" 
                  : "hover:scale-[1.02]"
              )}
              variant={isPro || plan.has_promo ? "default" : "outline"}
              size="lg"
            >
              {plan.price_monthly === 0 ? (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Começar Grátis
                </>
              ) : checkoutUrl ? (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {plan.has_promo ? 'Aproveitar Oferta' : 'Assinar Agora'}
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Contratar
                </>
              )}
            </Button>
          )}

          {/* Trial notice */}
          {plan.price_monthly > 0 && !isCurrentPlan && (
            <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              7 dias grátis para testar
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
