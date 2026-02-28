import { useState } from 'react';
import { useSubscriptionPlans, SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { usePages } from '@/hooks/usePages';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';
import { useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Crown, 
  Star, 
  Sparkles,
  Eye,
  EyeOff,
  GripVertical,
  FileText,
  Check
} from 'lucide-react';
import { PlanDialog } from './PlanDialog';
import { PlanComparisonManager } from './PlanComparisonManager';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  sem_cadastro: <Eye className="h-5 w-5" />,
  free: <Star className="h-5 w-5" />,
  basic: <Sparkles className="h-5 w-5" />,
  pro: <Crown className="h-5 w-5" />,
};

const PLAN_COLORS: Record<string, string> = {
  sem_cadastro: 'bg-muted text-muted-foreground',
  free: 'bg-blue-500/10 text-blue-600',
  basic: 'bg-amber-500/10 text-amber-600',
  pro: 'bg-purple-500/10 text-purple-600',
};

export function PlansTab() {
  const { data: plans, isLoading } = useSubscriptionPlans(true);
  const { pages } = usePages();
  const {
    deferTogglePlanActive,
    deferDeletePlan,
  } = useAdminDeferredMutations();
  
  const { getPendingValue } = useAdminPendingChanges();
  
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SubscriptionPlan | null>(null);

  const handleToggleActive = (plan: SubscriptionPlan) => {
    deferTogglePlanActive(plan);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (plan: SubscriptionPlan) => {
    setDeleteConfirm(plan);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deferDeletePlan(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const getPageCount = (allowedPages: string[]) => {
    if (allowedPages.includes('*')) return pages?.length || 'Todas';
    return allowedPages.length;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Planos de Assinatura</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os planos disponíveis e suas permissões de acesso
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-4">
        {plans?.map((plan) => (
          <Card 
            key={plan.id} 
            className={cn(
              "transition-all",
              !(getPendingValue<boolean>(plan.id, 'is_active') ?? plan.is_active) && "opacity-60"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Plan Image or Fallback Icon */}
                  <div className={cn(
                    "h-12 w-12 rounded-lg flex items-center justify-center overflow-hidden",
                    !plan.image_url && (PLAN_COLORS[plan.slug] || 'bg-muted')
                  )}>
                    {plan.image_url ? (
                      <img 
                        src={plan.image_url} 
                        alt={plan.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      PLAN_ICONS[plan.slug] || <Star className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {plan.highlight_label && (
                        <Badge variant="secondary" className="text-xs">
                          {plan.highlight_label}
                        </Badge>
                      )}
                      {!plan.is_public && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <EyeOff className="h-3 w-3" />
                          Interno
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {plan.description || 'Sem descrição'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={getPendingValue<boolean>(plan.id, 'is_active') ?? plan.is_active}
                    onCheckedChange={() => handleToggleActive(plan)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEdit(plan)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(plan)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-sm">
                {/* Monthly Pricing */}
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Preço Mensal</p>
                  <p className="font-medium">
                    {plan.price_monthly > 0 
                      ? `R$ ${plan.price_monthly.toFixed(2).replace('.', ',')}/mês`
                      : 'Grátis'
                    }
                  </p>
                </div>

                {/* Yearly Pricing */}
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Preço Anual</p>
                  <p className="font-medium">
                    {plan.price_yearly > 0 
                      ? `R$ ${plan.price_yearly.toFixed(2).replace('.', ',')}/ano`
                      : 'Grátis'
                    }
                  </p>
                  {plan.price_yearly > 0 && (
                    <p className="text-xs text-muted-foreground">
                      (R$ {(plan.price_yearly / 12).toFixed(2).replace('.', ',')}/mês)
                    </p>
                  )}
                </div>

                {/* Pages Access */}
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Páginas</p>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">
                      {plan.allowed_pages.includes('*') 
                        ? 'Acesso total' 
                        : `${getPageCount(plan.allowed_pages)} páginas`
                      }
                    </span>
                  </div>
                </div>

                {/* Slug (for dev reference) */}
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Slug (código)</p>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {plan.slug}
                  </code>
                </div>
              </div>

              {/* Allowed Pages Preview */}
              {!plan.allowed_pages.includes('*') && plan.allowed_pages.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Páginas permitidas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.allowed_pages.slice(0, 8).map((slug) => (
                      <Badge key={slug} variant="outline" className="text-xs">
                        {slug}
                      </Badge>
                    ))}
                    {plan.allowed_pages.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{plan.allowed_pages.length - 8} mais
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-8" />

      {/* Comparison Table Manager */}
      <PlanComparisonManager />

      {/* Plan Dialog */}
      <PlanDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        plan={editingPlan}
        pages={pages || []}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{deleteConfirm?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
