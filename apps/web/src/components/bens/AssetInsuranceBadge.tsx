import React, { useMemo, useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSeguros } from '@/hooks/useSeguros';
import { Insurance } from '@/types/seguro';
import { cn } from '@/lib/utils';
import { AssetLinkedSegurosSection } from './AssetLinkedSegurosSection';

interface AssetInsuranceBadgeProps {
  assetId: string;
  assetName?: string;
  showLabel?: boolean;
  showUninsured?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

interface InsuranceStatus {
  active: Insurance[];
  expiring: Insurance[];
  expired: Insurance[];
  warranties: Insurance[];
  total: number;
}

export const AssetInsuranceBadge: React.FC<AssetInsuranceBadgeProps> = ({
  assetId,
  assetName,
  showLabel = false,
  showUninsured = false,
  size = 'sm',
  className,
}) => {
  const { seguros } = useSeguros();
  const [sheetOpen, setSheetOpen] = useState(false);

  const status = useMemo((): InsuranceStatus => {
    const linkedSeguros = seguros.filter(s => s.asset_id === assetId);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const active: Insurance[] = [];
    const expiring: Insurance[] = [];
    const expired: Insurance[] = [];
    const warranties: Insurance[] = [];

    linkedSeguros.forEach(seguro => {
      const endDate = new Date(seguro.data_fim);
      const startDate = new Date(seguro.data_inicio);

      if (seguro.is_warranty) {
        warranties.push(seguro);
      }

      if (endDate < today) {
        expired.push(seguro);
      } else if (endDate <= thirtyDaysFromNow) {
        expiring.push(seguro);
      } else if (startDate <= today) {
        active.push(seguro);
      }
    });

    return {
      active,
      expiring,
      expired,
      warranties,
      total: linkedSeguros.length,
    };
  }, [seguros, assetId]);

  // Show "uninsured" badge for insurable assets
  if (status.total === 0) {
    if (!showUninsured) return null;
    
    const uninsuredIconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    const uninsuredBadgePadding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
    const uninsuredTextSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                uninsuredBadgePadding,
                uninsuredTextSize,
                'border-muted-foreground/30 bg-muted/50 text-muted-foreground',
                'cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity',
                className
              )}
              onClick={(e) => {
                e.stopPropagation();
                setSheetOpen(true);
              }}
            >
              <ShieldX className={uninsuredIconSize} />
              {showLabel && <span>Sem seguro</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            <p className="text-xs">Sem seguro ativo. Clique para adicionar.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const badgePadding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  // Determine primary status
  let StatusIcon = ShieldCheck;
  let statusColor = 'border-income/50 bg-income/10 text-income';
  let statusLabel = 'Protegido';

  if (status.expired.length > 0 && status.active.length === 0 && status.expiring.length === 0) {
    StatusIcon = ShieldX;
    statusColor = 'border-expense/50 bg-expense/10 text-expense';
    statusLabel = 'Vencido';
  } else if (status.expiring.length > 0) {
    StatusIcon = ShieldAlert;
    statusColor = 'border-amber-500/50 bg-amber-500/10 text-amber-600';
    statusLabel = 'Vencendo';
  }

  const tooltipContent = (
    <div className="space-y-1.5 text-xs">
      {status.active.length > 0 && (
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3 w-3 text-income" />
          <span>{status.active.length} seguro(s) ativo(s)</span>
        </div>
      )}
      {status.expiring.length > 0 && (
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3 w-3 text-amber-500" />
          <span>{status.expiring.length} vencendo em breve</span>
        </div>
      )}
      {status.expired.length > 0 && (
        <div className="flex items-center gap-2">
          <ShieldX className="h-3 w-3 text-expense" />
          <span>{status.expired.length} vencido(s)</span>
        </div>
      )}
      {status.warranties.length > 0 && (
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-blue-500" />
          <span>{status.warranties.length} garantia(s)</span>
        </div>
      )}
      <div className="pt-1 border-t border-white/20 text-[10px] opacity-75">
        Clique para ver detalhes
      </div>
    </div>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                badgePadding,
                textSize,
                statusColor,
                'cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity',
                className
              )}
              onClick={(e) => {
                e.stopPropagation();
                setSheetOpen(true);
              }}
            >
              <StatusIcon className={iconSize} />
              {showLabel && <span>{statusLabel}</span>}
              {status.total > 1 && <span className="font-semibold">{status.total}</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguros e Garantias
            </SheetTitle>
            <SheetDescription>
              {assetName ? `Proteções vinculadas a ${assetName}` : 'Proteções vinculadas a este bem'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AssetLinkedSegurosSection 
              assetId={assetId} 
              assetName={assetName || 'Bem'} 
              variant="inline"
              showAddButton
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
