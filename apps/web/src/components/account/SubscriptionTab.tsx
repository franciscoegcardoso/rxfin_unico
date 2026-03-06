import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Calendar, CreditCard, Sparkles, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkspaceWithPlan {
  id: string;
  name: string;
  plan_id: string | null;
  plan_expires_at: string | null;
  subscription_plans: {
    id: string;
    name: string;
    description: string | null;
    duration_days: number;
    price_monthly: number;
    price_yearly: number | null;
    slug: string;
  } | null;
}

export const SubscriptionTab: React.FC = () => {
  const { user } = useAuth();

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['user-workspace-plan', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          plan_id,
          plan_expires_at,
          subscription_plans:plan_id(id, name, description, duration_days, price_monthly, price_yearly, slug)
        `)
        .eq('owner_id', user.id)
        .single();
      
      if (workspaceError && workspaceError.code !== 'PGRST116') {
        console.error('Error fetching workspace:', workspaceError);
        throw workspaceError;
      }
      
      return workspaceData as WorkspaceWithPlan | null;
    },
    enabled: !!user?.id,
  });

  const plan = workspace?.subscription_plans;
  const expiresAt = workspace?.plan_expires_at ? new Date(workspace.plan_expires_at) : null;
  const daysRemaining = expiresAt ? differenceInDays(expiresAt, new Date()) : 0;
  const isExpired = expiresAt ? expiresAt < new Date() : false;
  const isPro = plan?.slug === 'pro' || plan?.name?.toLowerCase().includes('pro');

  const totalDays = plan?.duration_days || 30;
  const usedDays = totalDays - daysRemaining;
  const progressPercent = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));

  if (isLoading) {
    return (
      <RXFinLoadingSpinner height="py-12" />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Current Plan Card */}
      <div className="lg:col-span-2">
        <Card className={isPro ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-background h-full' : 'h-full'}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Crown className={`h-4 w-4 ${isPro ? 'text-yellow-500' : 'text-primary'}`} />
                  Seu Plano
                </CardTitle>
                <CardDescription className="text-xs">
                  Informações da sua assinatura atual
                </CardDescription>
              </div>
              {isPro && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  PRO
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {plan ? (
              <>
                <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                      )}
                    </div>
                    {plan.price_monthly > 0 && (
                      <div className="text-right">
                        <p className="text-xl font-bold">R$ {plan.price_monthly.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">/mês</p>
                      </div>
                    )}
                  </div>

                  {expiresAt && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {isExpired ? 'Expirou em' : 'Expira em'}
                        </span>
                        <span className={isExpired ? 'text-destructive font-medium' : 'font-medium'}>
                          {format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      
                      {!isExpired && (
                        <>
                          <Progress value={progressPercent} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground text-center">
                            {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  {isExpired ? (
                    <Link to="/financeiro/planos" className="flex-1">
                      <Button size="sm" className="w-full h-9">
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        Renovar Assinatura
                      </Button>
                    </Link>
                  ) : !isPro ? (
                    <Link to="/financeiro/planos" className="flex-1">
                      <Button size="sm" className="w-full h-9 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Fazer Upgrade para PRO
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/financeiro/planos" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-9">
                        Ver Todos os Planos
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="h-14 w-14 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <Crown className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Sem plano ativo</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escolha um plano para desbloquear todos os recursos
                  </p>
                </div>
                <Link to="/financeiro/planos">
                  <Button size="sm">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Ver Planos Disponíveis
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Plan Features */}
        {plan && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Recursos Incluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {[
                  'Controle completo de receitas e despesas',
                  'Gestão de cartões de crédito',
                  'Planejamento financeiro mensal',
                  isPro && 'Relatórios avançados',
                  isPro && 'Suporte prioritário',
                  isPro && 'Funcionalidades exclusivas',
                ].filter(Boolean).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Info */}
        {plan && plan.price_monthly > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary" />
                Pagamento
              </CardTitle>
              <CardDescription className="text-xs">
                Informações de faturamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground">
                  Para gerenciar métodos de pagamento ou histórico de faturas, 
                  entre em contato com nosso suporte.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};