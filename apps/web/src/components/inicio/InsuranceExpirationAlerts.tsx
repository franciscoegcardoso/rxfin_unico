import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSeguros } from '@/hooks/useSeguros';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useFeaturePreferences } from '@/hooks/useFeaturePreferences';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  AlertTriangle, 
  ChevronRight,
  Car,
  Home,
  Heart,
  Stethoscope,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsuranceType, insuranceTypeLabels } from '@/types/seguro';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const insuranceIcons: Record<InsuranceType, React.ElementType> = {
  auto: Car,
  residencial: Home,
  vida: Heart,
  saude: Stethoscope,
  odontologico: Stethoscope,
  viagem: Shield,
  empresarial: Shield,
  pet: Shield,
  celular: Shield,
  bike: Shield,
  rc_profissional: Shield,
  garantia_estendida: Shield,
  outro: Shield,
};

export const InsuranceExpirationAlerts: React.FC = () => {
  const { proximosVencer, segurosVencidos, isLoading } = useSeguros();
  const { isHidden } = useVisibility();
  const { isFeatureEnabled } = useFeaturePreferences();
  const navigate = useNavigate();

  // Don't show if seguros feature is disabled
  if (!isFeatureEnabled('seguros')) return null;

  // Não mostrar se estiver carregando ou não tiver alertas
  if (isLoading) return null;
  
  const totalAlerts = proximosVencer.length + segurosVencidos.length;
  if (totalAlerts === 0) return null;

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getDaysUntilExpiration = (dataFim: string) => {
    return differenceInDays(parseISO(dataFim), new Date());
  };

  const getUrgencyBadge = (dataFim: string) => {
    const days = getDaysUntilExpiration(dataFim);
    
    if (days < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Vencido há {Math.abs(days)} dias
        </Badge>
      );
    } else if (days <= 7) {
      return (
        <Badge variant="destructive" className="text-xs">
          {days === 0 ? 'Vence hoje!' : `Vence em ${days} dias`}
        </Badge>
      );
    } else if (days <= 15) {
      return (
        <Badge className="bg-amber-500 text-white text-xs">
          Vence em {days} dias
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="text-xs">
          Vence em {days} dias
        </Badge>
      );
    }
  };

  // Combinar e ordenar por urgência (mais urgentes primeiro)
  const allAlerts = [...segurosVencidos, ...proximosVencer].sort((a, b) => {
    return parseISO(a.data_fim).getTime() - parseISO(b.data_fim).getTime();
  }).slice(0, 3); // Mostrar apenas os 3 mais urgentes

  return (
    <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Seguros a Vencer</h3>
              <p className="text-xs text-muted-foreground">
                {totalAlerts} {totalAlerts === 1 ? 'apólice precisa' : 'apólices precisam'} de atenção
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/seguros')}
            className="text-xs h-7"
          >
            Ver todos
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div className="space-y-2">
          {allAlerts.map((seguro) => {
            const IconComponent = insuranceIcons[seguro.tipo] || Shield;
            const isExpired = getDaysUntilExpiration(seguro.data_fim) < 0;
            
            return (
              <div 
                key={seguro.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  isExpired 
                    ? "bg-destructive/10 border border-destructive/20" 
                    : "bg-background/80"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconComponent className={cn(
                    "h-4 w-4 shrink-0",
                    isExpired ? "text-destructive" : "text-amber-600"
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{seguro.nome}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(parseISO(seguro.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="hidden sm:inline">
                        • {formatCurrency(seguro.premio_anual)}/ano
                      </span>
                    </div>
                  </div>
                </div>
                {getUrgencyBadge(seguro.data_fim)}
              </div>
            );
          })}
        </div>

        {totalAlerts > 3 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            + {totalAlerts - 3} {totalAlerts - 3 === 1 ? 'outro alerta' : 'outros alertas'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
