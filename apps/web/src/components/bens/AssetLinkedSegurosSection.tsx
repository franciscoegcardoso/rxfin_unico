import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSeguros } from '@/hooks/useSeguros';
import { Insurance, InsuranceType, insuranceTypeLabels } from '@/types/seguro';
import { SeguroDialog } from '@/components/seguros/SeguroDialog';
import { 
  Shield, 
  ShieldCheck, 
  Pencil, 
  Trash2, 
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Car,
  Home,
  Heart,
  Stethoscope,
  Smile,
  Plane,
  Building2,
  Dog,
  Smartphone,
  Bike,
  Briefcase,
} from 'lucide-react';
import { format, parseISO, differenceInDays, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const insuranceIcons: Record<InsuranceType, React.ElementType> = {
  auto: Car,
  residencial: Home,
  vida: Heart,
  saude: Stethoscope,
  odontologico: Smile,
  viagem: Plane,
  empresarial: Building2,
  pet: Dog,
  celular: Smartphone,
  bike: Bike,
  rc_profissional: Briefcase,
  garantia_estendida: ShieldCheck,
  outro: Shield,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface AssetLinkedSegurosSectionProps {
  assetId: string;
  assetName: string;
  assetType?: string;
  variant?: 'card' | 'inline';
  showAddButton?: boolean;
}

export const AssetLinkedSegurosSection: React.FC<AssetLinkedSegurosSectionProps> = ({
  assetId,
  assetName,
  assetType,
  variant = 'card',
  showAddButton = true,
}) => {
  const { seguros, deleteSeguro } = useSeguros();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSeguro, setSelectedSeguro] = useState<Insurance | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Get seguros linked to this asset
  const linkedSeguros = seguros.filter(s => s.asset_id === assetId);

  // Separate warranties and insurances
  const warranties = linkedSeguros.filter(s => s.is_warranty);
  const insurances = linkedSeguros.filter(s => !s.is_warranty);

  const handleEditClick = (seguro: Insurance) => {
    setSelectedSeguro(seguro);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (seguro: Insurance) => {
    setSelectedSeguro(seguro);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSeguro) return;
    await deleteSeguro.mutateAsync(selectedSeguro.id);
    setDeleteConfirmOpen(false);
    setSelectedSeguro(null);
  };

  const getStatusInfo = (seguro: Insurance) => {
    const today = new Date();
    const endDate = parseISO(seguro.data_fim);
    const daysUntilExpiry = differenceInDays(endDate, today);
    
    if (isPast(endDate)) {
      return { 
        status: 'expired', 
        label: 'Vencido', 
        color: 'text-destructive bg-destructive/10 border-destructive/30',
        icon: XCircle
      };
    } else if (daysUntilExpiry <= 30) {
      return { 
        status: 'expiring', 
        label: `Vence em ${daysUntilExpiry}d`, 
        color: 'text-amber-600 bg-amber-100 border-amber-300',
        icon: AlertTriangle
      };
    } else {
      return { 
        status: 'active', 
        label: 'Ativo', 
        color: 'text-income bg-income/10 border-income/30',
        icon: CheckCircle2
      };
    }
  };

  const renderSeguroItem = (seguro: Insurance, isWarranty: boolean) => {
    const statusInfo = getStatusInfo(seguro);
    const StatusIcon = statusInfo.icon;
    const TypeIcon = isWarranty ? ShieldCheck : insuranceIcons[seguro.tipo] || Shield;

    return (
      <div
        key={seguro.id}
        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${isWarranty ? 'bg-primary/10' : 'bg-accent'}`}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{seguro.nome}</p>
              <Badge 
                variant="outline" 
                className={`text-xs ${statusInfo.color} flex items-center gap-1`}
              >
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
              {isWarranty ? (
                <>
                  <span className="flex items-center gap-1">
                    {seguro.warranty_store || 'Loja'}
                  </span>
                  {seguro.warranty_extended && (
                    <>
                      <span>•</span>
                      <span className="text-primary">
                        Estendida +{seguro.warranty_extended_months}m
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span>{seguro.seguradora}</span>
                  <span>•</span>
                  <span>{insuranceTypeLabels[seguro.tipo]}</span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(seguro.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
            {!isWarranty && seguro.premio_mensal > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(seguro.premio_mensal)}/mês • Cobertura: {formatCurrency(seguro.valor_cobertura)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleEditClick(seguro)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => handleDeleteClick(seguro)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  if (linkedSeguros.length === 0 && !showAddButton) {
    return null;
  }

  const content = (
    <>
      {/* Warranties Section */}
      {warranties.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>Garantias</span>
            <Badge variant="secondary" className="text-xs ml-1">{warranties.length}</Badge>
          </div>
          {warranties.map(seguro => renderSeguroItem(seguro, true))}
        </div>
      )}

      {/* Insurances Section */}
      {insurances.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <Shield className="h-3 w-3" />
            <span>Seguros</span>
            <Badge variant="secondary" className="text-xs ml-1">{insurances.length}</Badge>
          </div>
          {insurances.map(seguro => renderSeguroItem(seguro, false))}
        </div>
      )}

      {/* Empty state with add button */}
      {linkedSeguros.length === 0 && showAddButton && (
        <div className="text-center py-4 bg-muted/20 rounded-lg border border-dashed border-border">
          <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Nenhum seguro ou garantia vinculado
          </p>
        </div>
      )}

      {/* Add button */}
      {showAddButton && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Seguro ou Garantia
        </Button>
      )}
    </>
  );

  return (
    <>
      {variant === 'card' ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Seguros e Garantias
              </CardTitle>
              {linkedSeguros.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {linkedSeguros.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {content}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {content}
        </div>
      )}

      {/* Edit Dialog */}
      <SeguroDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        seguro={selectedSeguro}
        preSelectedAssetId={assetId}
      />

      {/* Add Dialog */}
      <SeguroDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        preSelectedAssetId={assetId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir {selectedSeguro?.is_warranty ? 'Garantia' : 'Seguro'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{selectedSeguro?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
