import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Sparkles, CircleCheck, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getIconComponent } from '@/lib/iconMap';
import { SimulatorDetailDialog } from './SimulatorDetailDialog';
import type { CardConfig, CategoryConfig } from './simulatorCategories';

type StatusType = 'available' | 'new' | 'coming_soon';

interface SimulatorFeatureCardProps {
  config: CardConfig;
  path?: string;
  iconName?: string | null;
  isComingSoon: boolean;
  isNew?: boolean;
  categoryColor?: CategoryConfig['color'];
  onNavigate?: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const STATUS_BADGE: Record<StatusType, { label: string; variant: 'success' | 'warning' | 'default'; icon: React.ElementType }> = {
  available: { label: 'Disponível', variant: 'success', icon: CircleCheck },
  new: { label: 'Novo', variant: 'default', icon: Sparkles },
  coming_soon: { label: 'Em breve', variant: 'warning', icon: Rocket },
};

export const SimulatorFeatureCard: React.FC<SimulatorFeatureCardProps> = ({
  config,
  path,
  iconName,
  isComingSoon,
  isNew,
  categoryColor,
  onNavigate,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const IconComponent = getIconComponent(iconName);
  const isFeatured = config.featured && !isComingSoon;

  const status: StatusType = isComingSoon ? 'coming_soon' : isNew ? 'new' : 'available';
  const badge = STATUS_BADGE[status];
  const BadgeIcon = badge.icon;

  const iconBg = categoryColor?.iconBg || 'bg-primary/10';
  const iconText = categoryColor?.iconText || 'text-primary';

  const handleInfoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(true);
  };

  /* ─── Mobile: vertical card ─── */
  const mobileCard = (
    <Card className={`transition-all duration-200 ${
      isComingSoon
        ? 'opacity-60'
        : 'hover:shadow-md hover:border-primary/25 cursor-pointer'
    }`}>
      <CardContent className="flex flex-col p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <IconComponent className={`h-5 w-5 ${iconText} ${isComingSoon ? 'opacity-50' : ''}`} />
          </div>
          <Badge variant={badge.variant} className="flex items-center gap-1 text-[10px] shrink-0 px-2 py-0.5">
            <BadgeIcon className="h-3 w-3" />
            {badge.label}
          </Badge>
        </div>
        <h3 className={`text-sm font-semibold leading-snug mb-1 ${isComingSoon ? 'text-muted-foreground' : 'text-foreground'}`}>
          {config.title}
        </h3>
        {config.bullets && config.bullets.length > 0 && (
          <p className={`text-xs leading-relaxed mb-3 ${isComingSoon ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
            {config.bullets[0]}
          </p>
        )}
        <div className="flex items-center gap-2 mt-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground px-3"
            onClick={handleInfoClick}
          >
            <Info className="h-3.5 w-3.5" />
            Saiba mais
          </Button>
          {!isComingSoon && (
            <Button size="sm" className="h-8 text-xs gap-1.5 ml-auto px-3 min-w-[160px] justify-center" asChild>
              <Link to={path || '#'} onClick={onNavigate}>
                {config.buttonLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  /* ─── Desktop: horizontal row ─── */
  const desktopRow = (
    <div className={`group relative flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200 ${
      isComingSoon
        ? 'opacity-50 border-border bg-muted/30'
        : isFeatured
          ? 'border-primary/25 bg-primary/[0.03] hover:border-primary/40 hover:bg-primary/[0.06] hover:shadow-md hover:shadow-primary/5'
          : 'border-border bg-card hover:border-primary/25 hover:bg-accent/50 hover:shadow-sm'
    }`}>
      <div className={`shrink-0 rounded-lg flex items-center justify-center h-10 w-10 ${iconBg}`}>
        <IconComponent className={`${iconText} h-[18px] w-[18px] ${isComingSoon ? 'opacity-50' : ''}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className={`text-sm font-semibold leading-snug truncate ${
            isComingSoon ? 'text-muted-foreground' : 'text-foreground'
          }`}>
            {config.title}
          </h3>
          <Badge variant={badge.variant} className="flex items-center gap-1 text-[9px] shrink-0 px-1.5 py-0">
            <BadgeIcon className="h-2.5 w-2.5" />
            {badge.label}
          </Badge>
        </div>
        {config.bullets && config.bullets.length > 0 && (
          <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
            {config.bullets[0]}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground px-3"
          onClick={handleInfoClick}
        >
          <Info className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Saiba mais</span>
        </Button>
        {isComingSoon ? (
          <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">Em breve</span>
        ) : (
          <Button size="sm" className="h-8 text-xs gap-1.5 whitespace-nowrap px-3 min-w-[160px] justify-center">
            {config.buttonLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  const dialog = (
    <SimulatorDetailDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      config={config}
      iconName={iconName}
      categoryColor={categoryColor}
      isComingSoon={isComingSoon}
      onNavigate={onNavigate}
    />
  );

  if (isComingSoon) {
    return (
      <motion.div variants={cardVariants}>
        <div className="lg:hidden h-full">{mobileCard}</div>
        <div className="hidden lg:block">{desktopRow}</div>
        {dialog}
      </motion.div>
    );
  }

  return (
    <motion.div variants={cardVariants}>
      <div className="lg:hidden h-full">{mobileCard}</div>
      <Link to={path || '#'} onClick={onNavigate} className="hidden lg:block">
        {desktopRow}
      </Link>
      {dialog}
    </motion.div>
  );
};
