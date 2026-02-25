import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Puzzle, Lock } from 'lucide-react';
import { useFeaturePreferences, AVAILABLE_FEATURES, FeatureDefinition } from '@/hooks/useFeaturePreferences';
import { usePageAvailability } from '@/hooks/usePageAvailability';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/iconMap';

const categoryLabels: Record<string, string> = {
  financeiro: 'Financeiro',
  planejamento: 'Planejamento',
  gestao: 'Gestão',
};

const categoryColors: Record<string, string> = {
  financeiro: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  planejamento: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  gestao: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

interface FeatureCardProps {
  feature: FeatureDefinition & { isEnabled: boolean };
  onToggle: (slug: string, enabled: boolean) => void;
  isToggling: boolean;
  togglingSlug: string | null;
  isAvailable: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onToggle, isToggling, togglingSlug, isAvailable }) => {
  const IconComponent = getIconComponent(feature.icon);
  const isThisToggling = isToggling && togglingSlug === feature.slug;
  const isDisabled = !isAvailable || isToggling;

  const cardContent = (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border transition-all duration-200",
        !isAvailable
          ? "bg-muted/30 border-border/40 opacity-60"
          : feature.isEnabled
            ? "bg-card border-border"
            : "bg-muted/20 border-border/50 opacity-70",
        isThisToggling && "opacity-60"
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors relative",
          !isAvailable
            ? "bg-muted text-muted-foreground"
            : feature.isEnabled
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
        )}
      >
        <IconComponent className="h-4 w-4" />
        {!isAvailable && (
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/20 flex items-center justify-center">
            <Lock className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="font-medium text-xs text-foreground">{feature.name}</h4>
          {!isAvailable ? (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted-foreground/10 text-muted-foreground">
              Em breve
            </Badge>
          ) : (
            <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0", categoryColors[feature.category])}>
              {categoryLabels[feature.category]}
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {feature.description}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        {isThisToggling && (
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
        )}
        <Switch
          checked={isAvailable ? feature.isEnabled : false}
          onCheckedChange={(checked) => onToggle(feature.slug, checked)}
          disabled={isDisabled}
          className="scale-90"
        />
      </div>
    </div>
  );

  if (!isAvailable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Este módulo ainda não está disponível</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
};

export const ActiveModulesSection: React.FC = () => {
  const { featuresWithState, toggleFeature, isToggling, isLoading } = useFeaturePreferences();
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  // Collect all routes from features to check availability
  const allRoutes = useMemo(
    () => AVAILABLE_FEATURES.flatMap(f => f.routes),
    []
  );
  const { isRouteAvailable, isLoading: availabilityLoading } = usePageAvailability(allRoutes);

  const handleToggle = (slug: string, enabled: boolean) => {
    setTogglingSlug(slug);
    toggleFeature(
      { featureSlug: slug, isEnabled: enabled },
      {
        onSettled: () => setTogglingSlug(null),
      }
    );
  };

  const isFeatureAvailable = (feature: FeatureDefinition): boolean => {
    // A feature is available if ALL its routes are available
    return feature.routes.every(route => isRouteAvailable(route));
  };

  if (isLoading || availabilityLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Puzzle className="h-4 w-4 text-primary" />
            Módulos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const availableFeatures = featuresWithState.filter(f => isFeatureAvailable(f));
  const enabledCount = availableFeatures.filter(f => f.isEnabled).length;
  const totalAvailable = availableFeatures.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Puzzle className="h-4 w-4 text-primary" />
              </div>
              Módulos Ativos
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Personalize sua experiência ativando os módulos que você usa
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isToggling && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </span>
            )}
            <Badge variant="outline" className="text-[10px] shrink-0">
              {enabledCount}/{totalAvailable}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {featuresWithState.map((feature) => (
            <FeatureCard
              key={feature.slug}
              feature={feature}
              onToggle={handleToggle}
              isToggling={isToggling}
              togglingSlug={togglingSlug}
              isAvailable={isFeatureAvailable(feature)}
            />
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          Módulos desativados não aparecem no menu, mas seus dados são mantidos.
        </p>
      </CardContent>
    </Card>
  );
};
