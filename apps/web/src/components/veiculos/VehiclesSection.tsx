import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Car, Plus, Calendar, Gauge, DollarSign, Clock, TrendingDown, TrendingUp, Pencil, ChevronRight, ChevronDown } from 'lucide-react';
import { Asset } from '@/types/financial';
import { VehicleRecord } from '@/types/vehicle';
import { useVisibility } from '@/contexts/VisibilityContext';
import { differenceInMonths, format } from 'date-fns';
import { VehicleBrandLogo } from './VehicleBrandLogo';
import { AssetLinkedSegurosSection } from '@/components/bens/AssetLinkedSegurosSection';

interface VehiclesSectionProps {
  vehicles: Asset[];
  vehicleRecords: VehicleRecord[];
  onEditVehicle: (vehicle: Asset) => void;
  onAddVehicle: () => void;
  onAddRecord?: () => void;
}

export const VehiclesSection: React.FC<VehiclesSectionProps> = ({
  vehicles,
  vehicleRecords,
  onEditVehicle,
  onAddVehicle,
  onAddRecord,
}) => {
  const { formatValue } = useVisibility();
  const [selectedVehicle, setSelectedVehicle] = useState<Asset | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeVehicles = vehicles.filter(v => !v.isSold);
  const soldVehicles = vehicles.filter(v => v.isSold);

  // Calculate total km for a vehicle - prioritize odometer data from asset, fallback to records
  const getTotalKm = (vehicle: Asset) => {
    // If we have sale odometer and purchase odometer, use them
    if (vehicle.saleOdometer && vehicle.purchaseOdometer !== undefined) {
      return vehicle.saleOdometer - vehicle.purchaseOdometer;
    }
    // For active vehicles, use records to calculate km driven
    const records = vehicleRecords.filter(r => r.vehicleId === vehicle.id);
    if (records.length === 0) {
      // If we have purchase odometer but no records, return 0
      if (vehicle.purchaseOdometer !== undefined) return 0;
      return null;
    }
    const maxOdometer = Math.max(...records.map(r => r.odometer));
    const minOdometer = vehicle.purchaseOdometer ?? Math.min(...records.map(r => r.odometer));
    return maxOdometer - minOdometer;
  };

  // Calculate ownership duration
  const getOwnershipDuration = (vehicle: Asset) => {
    if (!vehicle.purchaseDate) return null;
    
    const purchaseDate = new Date(vehicle.purchaseDate);
    const endDate = vehicle.saleDate ? new Date(vehicle.saleDate) : new Date();
    
    const months = differenceInMonths(endDate, purchaseDate);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      if (remainingMonths === 0) return 'Novo';
      return `${remainingMonths}m`;
    }
    if (remainingMonths === 0) {
      return `${years}a`;
    }
    return `${years}a ${remainingMonths}m`;
  };

  // Calculate profit/loss (depreciation or appreciation)
  const getProfitLoss = (vehicle: Asset) => {
    if (!vehicle.purchaseValue || !vehicle.saleValue) return null;
    return vehicle.saleValue - vehicle.purchaseValue;
  };

  // Calculate depreciation/appreciation percentage
  const getDepreciationPercent = (vehicle: Asset) => {
    if (!vehicle.purchaseValue || !vehicle.saleValue || vehicle.purchaseValue === 0) return null;
    const diff = vehicle.saleValue - vehicle.purchaseValue;
    return (diff / vehicle.purchaseValue) * 100;
  };

  // Calculate cost per km
  const getCostPerKm = (vehicle: Asset) => {
    const totalKm = getTotalKm(vehicle);
    const profitLoss = getProfitLoss(vehicle);
    if (!totalKm || totalKm === 0 || profitLoss === null) return null;
    // Return depreciation per km (positive value means loss per km)
    return Math.abs(profitLoss) / totalKm;
  };

  const handleCardClick = (vehicle: Asset) => {
    setSelectedVehicle(vehicle);
    setDetailsOpen(true);
  };

  const handleEdit = () => {
    if (selectedVehicle) {
      setDetailsOpen(false);
      onEditVehicle(selectedVehicle);
    }
  };

  // Compact card for list view
  const CompactVehicleCard = ({ vehicle, isSold = false }: { vehicle: Asset; isSold?: boolean }) => {
    const ownershipDuration = getOwnershipDuration(vehicle);

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${isSold ? 'opacity-70' : ''}`}
        onClick={() => handleCardClick(vehicle)}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <VehicleBrandLogo 
            fipeFullName={vehicle.fipeFullName} 
            size="md" 
            isSold={isSold} 
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{vehicle.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {ownershipDuration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {ownershipDuration}
                </span>
              )}
              <Badge 
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  isSold 
                    ? 'border-expense/50 bg-expense/10 text-expense' 
                    : 'border-income/50 bg-income/10 text-income'
                }`}
              >
                {isSold ? 'Vendido' : 'Ativo'}
              </Badge>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    );
  };

  // Details sheet content
  const VehicleDetailsSheet = () => {
    if (!selectedVehicle) return null;
    
    const isSold = selectedVehicle.isSold;
    const totalKm = getTotalKm(selectedVehicle);
    const ownershipDuration = getOwnershipDuration(selectedVehicle);
    const profitLoss = isSold ? getProfitLoss(selectedVehicle) : null;
    const depreciationPercent = isSold ? getDepreciationPercent(selectedVehicle) : null;
    const costPerKm = isSold ? getCostPerKm(selectedVehicle) : null;

    return (
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-hidden flex flex-col">
          <SheetHeader className="pb-4 flex-shrink-0">
            <SheetTitle className="flex items-center gap-3">
              <VehicleBrandLogo 
                fipeFullName={selectedVehicle.fipeFullName} 
                size="lg" 
                isSold={isSold}
                className="rounded-xl"
              />
              <div className="text-left">
                <span className="block">{selectedVehicle.name}</span>
                <Badge 
                  variant="outline"
                  className={`text-xs mt-1 ${
                    isSold 
                      ? 'border-expense/50 bg-expense/10 text-expense' 
                      : 'border-income/50 bg-income/10 text-income'
                  }`}
                >
                  {isSold ? 'Vendido' : 'Ativo'}
                </Badge>
              </div>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-6">
            {/* FIPE Name */}
            {selectedVehicle.fipeFullName && (
              <div className="text-sm text-muted-foreground">
                {selectedVehicle.fipeFullName}
              </div>
            )}

            {/* Value */}
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {isSold ? 'Valor de Venda' : 'Valor Atual'}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatValue(isSold && selectedVehicle.saleValue ? selectedVehicle.saleValue : selectedVehicle.value)}
              </p>
            </div>

            {/* Info list */}
            <div className="space-y-3">
              {/* Purchase date */}
              {selectedVehicle.purchaseDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data da Compra
                  </span>
                  <span className="font-medium">{format(new Date(selectedVehicle.purchaseDate), 'dd/MM/yyyy')}</span>
                </div>
              )}

              {/* Sale date for sold vehicles */}
              {isSold && selectedVehicle.saleDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data da Venda
                  </span>
                  <span className="font-medium">{format(new Date(selectedVehicle.saleDate), 'dd/MM/yyyy')}</span>
                </div>
              )}

              {/* Ownership duration */}
              {ownershipDuration && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tempo de Posse
                  </span>
                  <span className="font-medium">{ownershipDuration}</span>
                </div>
              )}

              {/* Total km */}
              {totalKm !== null && totalKm > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Km Rodados
                  </span>
                  <span className="font-medium">{totalKm.toLocaleString('pt-BR')} km</span>
                </div>
              )}

              {/* Purchase value */}
              {selectedVehicle.purchaseValue && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor de Compra
                  </span>
                  <span className="font-medium">{formatValue(selectedVehicle.purchaseValue)}</span>
                </div>
              )}
            </div>

            {/* Profit/Loss and depreciation for sold vehicles */}
            {isSold && profitLoss !== null && (
              <div className="space-y-3">
                {/* Main result card */}
                <div className={`p-4 rounded-lg ${profitLoss >= 0 ? 'bg-income/10' : 'bg-expense/10'}`}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    {profitLoss >= 0 ? 'Valorização' : 'Depreciação'}
                  </p>
                  <div className={`flex items-center gap-2 text-xl font-bold ${
                    profitLoss >= 0 ? 'text-income' : 'text-expense'
                  }`}>
                    {profitLoss >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    <span>{formatValue(Math.abs(profitLoss))}</span>
                    {depreciationPercent !== null && (
                      <span className="text-sm font-normal">
                        ({depreciationPercent >= 0 ? '+' : ''}{depreciationPercent.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="grid grid-cols-2 gap-2">
                  {ownershipDuration && (
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground">Tempo de Posse</p>
                      <p className="font-semibold text-foreground">{ownershipDuration}</p>
                    </div>
                  )}
                  {totalKm !== null && totalKm > 0 && (
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground">Km Rodados</p>
                      <p className="font-semibold text-foreground">{totalKm.toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                  {costPerKm !== null && (
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground">Custo por Km</p>
                      <p className="font-semibold text-foreground">
                        R$ {costPerKm.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {ownershipDuration && profitLoss !== null && (
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground">
                        {profitLoss >= 0 ? 'Valorização' : 'Depreciação'}/Mês
                      </p>
                      <p className={`font-semibold ${profitLoss >= 0 ? 'text-income' : 'text-expense'}`}>
                        {formatValue(Math.abs(profitLoss) / Math.max(differenceInMonths(
                          new Date(selectedVehicle.saleDate!), 
                          new Date(selectedVehicle.purchaseDate!)
                        ), 1))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Linked Seguros and Warranties */}
            <AssetLinkedSegurosSection 
              assetId={selectedVehicle.id}
              assetName={selectedVehicle.name}
              assetType="vehicle"
              variant="inline"
              showAddButton={!isSold}
            />

            {/* Edit button */}
            <Button onClick={handleEdit} className="w-full" variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Editar Configurações
            </Button>
          </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
              <h3 className="font-semibold text-foreground">Veículos Cadastrados</h3>
              <Badge variant="secondary" className="text-xs">{activeVehicles.length}</Badge>
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            {onAddRecord && (
              <Button onClick={onAddRecord} size="sm" className="hidden md:inline-flex bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1" />
                Lançar despesa
              </Button>
            )}
            <Button onClick={onAddVehicle} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Cadastrar novo veículo
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          {/* Vehicles grid */}
          {vehicles.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-border">
              <Car className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum veículo cadastrado</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-3"
                onClick={onAddVehicle}
              >
                <Plus className="h-4 w-4 mr-1" />
                Cadastrar veículo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeVehicles.map((vehicle) => (
                <CompactVehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
              {soldVehicles.map((vehicle) => (
                <CompactVehicleCard key={vehicle.id} vehicle={vehicle} isSold />
              ))}
            </div>
          )}
        </CollapsibleContent>

        {/* Details Sheet */}
        <VehicleDetailsSheet />
      </div>
    </Collapsible>
  );
};
