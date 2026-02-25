import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, ChevronRight, Target, TrendingDown } from 'lucide-react';
import { useBudgetPackages } from '@/hooks/useBudgetPackages';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useFeaturePreferences } from '@/hooks/useFeaturePreferences';
import { format, isWithinInterval, parseISO, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export const PackagesSummaryCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const { isFeatureEnabled } = useFeaturePreferences();
  const { packages, transactions, loading, getPackageStats } = useBudgetPackages();

  // Don't show if pacotes-orcamento feature is disabled
  if (!isFeatureEnabled('pacotes-orcamento')) return null;

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Filter only active packages (in progress)
  const activePackages = packages.filter(pkg => {
    const today = new Date();
    const startDate = parseISO(pkg.start_date);
    const endDate = parseISO(pkg.end_date);
    return isWithinInterval(today, { start: startDate, end: endDate });
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-muted-foreground text-sm">Carregando pacotes...</div>
        </CardContent>
      </Card>
    );
  }

  // Don't show card if no active packages
  if (activePackages.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Pacotes Ativos
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pacotes-orcamento" className="flex items-center gap-1">
              Ver todos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activePackages.slice(0, 3).map(pkg => {
          const stats = getPackageStats(pkg.id);
          
          return (
            <div key={pkg.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{pkg.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {pkg.category_name}
                  </Badge>
                </div>
                <span className="text-sm font-medium">
                  {formatCurrency(stats.totalSpent)}
                </span>
              </div>
              
              {pkg.has_budget_goal && pkg.budget_goal ? (
                <div className="space-y-1">
                  <Progress 
                    value={Math.min(stats.budgetPercentage || 0, 100)} 
                    className={`h-2 ${stats.budgetPercentage && stats.budgetPercentage > 100 ? '[&>div]:bg-destructive' : ''}`}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Meta: {formatCurrency(Number(pkg.budget_goal))}
                    </span>
                    <span className={stats.budgetPercentage && stats.budgetPercentage > 100 ? 'text-destructive' : ''}>
                      {stats.budgetPercentage?.toFixed(0)}% usado
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3" />
                  <span>{stats.transactionCount} lançamentos</span>
                </div>
              )}
            </div>
          );
        })}
        
        {activePackages.length > 3 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{activePackages.length - 3} pacote(s) ativo(s)
          </p>
        )}
      </CardContent>
    </Card>
  );
};
