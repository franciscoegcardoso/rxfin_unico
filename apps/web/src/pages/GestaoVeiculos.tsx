import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { BackLink } from '@/components/shared/BackLink';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Car, Fuel, Wrench, Receipt, Trash2, Filter, Pencil, BarChart3, X, Calendar, Gauge, User } from 'lucide-react';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { useVisibility } from '@/contexts/VisibilityContext';
import { formatCompactCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFinancial } from '@/contexts/FinancialContext';
import { VehicleRecordDialog } from '@/components/veiculos/VehicleRecordDialog';
import { VehicleReports } from '@/components/veiculos/VehicleReports';
import { VehiclesSection } from '@/components/veiculos/VehiclesSection';
import { AddAssetDialog } from '@/components/bens/AddAssetDialog';
import { Asset } from '@/types/financial';
import { 
  VehicleRecord, 
  vehicleExpenseCategoryLabels,
  vehicleServiceTypeLabels,
  vehicleFuelTypeLabels,
  vehicleRecordTypeLabels,
  VehicleExpenseCategory,
  VehicleServiceType,
} from '@/types/vehicle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';

export const GestaoVeiculos: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { config, vehicleRecords, addVehicleRecord, updateVehicleRecord, removeVehicleRecord } = useFinancial();
  const vehicles = config.assets.filter(a => a.type === 'vehicle');
  const drivers = config.drivers;
  const isMobile = useIsMobile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<VehicleRecord | null>(null);
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('records');
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Handle URL action parameter to open dialog automatically
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'novo-registro') {
      setDialogOpen(true);
      setEditRecord(null);
      // Clear the URL parameter after handling
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleEditVehicle = (vehicle: Asset) => {
    setEditingAsset(vehicle);
    setAssetDialogOpen(true);
  };

  const handleAddVehicle = () => {
    setEditingAsset(null);
    setAssetDialogOpen(true);
  };

  const handleSaveRecord = (record: VehicleRecord) => {
    if (editRecord) {
      updateVehicleRecord(record.id, record);
    } else {
      addVehicleRecord(record);
    }
    setEditRecord(null);
  };

  const handleEditRecord = (record: VehicleRecord) => {
    setEditRecord(record);
    setDialogOpen(true);
  };

  const handleDeleteRecord = (id: string) => {
    setRecordToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRecord = () => {
    if (recordToDelete) {
      removeVehicleRecord(recordToDelete);
      toast.success('Registro removido');
      setRecordToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditRecord(null);
    }
  };

  // Get unique drivers from records
  const recordDrivers = [...new Set(vehicleRecords.map(r => r.driverName))];

  // Get unique categories/services from records
  const expenseCategories = [...new Set(vehicleRecords.filter(r => r.type === 'expense').map(r => r.category))];
  const serviceTypes = [...new Set(vehicleRecords.filter(r => r.type === 'service').map(r => r.serviceType))];

  const filteredRecords = vehicleRecords.filter(r => {
    if (filterVehicle !== 'all' && r.vehicleId !== filterVehicle) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterDriver !== 'all' && r.driverName !== filterDriver) return false;
    if (filterCategory !== 'all') {
      if (r.type === 'expense' && r.category !== filterCategory) return false;
      if (r.type === 'service' && r.serviceType !== filterCategory) return false;
      if (r.type === 'fuel') return false; // Filter doesn't apply to fuel
    }
    return true;
  });

  // Totals
  const totalExpenses = vehicleRecords
    .filter(r => r.type === 'expense')
    .reduce((acc, r) => acc + r.amount, 0);
  
  const totalFuel = vehicleRecords
    .filter(r => r.type === 'fuel')
    .reduce((acc, r) => acc + r.totalAmount, 0);
  
  const totalServices = vehicleRecords
    .filter(r => r.type === 'service')
    .reduce((acc, r) => acc + r.amount, 0);

  const totalGeral = totalExpenses + totalFuel + totalServices;

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'expense': return <Receipt className="h-4 w-4" />;
      case 'fuel': return <Fuel className="h-4 w-4" />;
      case 'service': return <Wrench className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const getRecordDetails = (record: VehicleRecord): string => {
    if (record.type === 'expense') {
      return vehicleExpenseCategoryLabels[record.category];
    }
    if (record.type === 'fuel') {
      return `${vehicleFuelTypeLabels[record.fuelType]} - ${record.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${record.unit === 'liter' ? 'L' : 'm³'}`;
    }
    if (record.type === 'service') {
      return vehicleServiceTypeLabels[record.serviceType];
    }
    return '';
  };

  const getRecordAmount = (record: VehicleRecord): number => {
    if (record.type === 'fuel') return record.totalAmount;
    return record.amount;
  };

  const { formatValue } = useVisibility();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <BackLink to="/bens-investimentos" label="Patrimônio" className="mb-1" />
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">Gestão de Veículos</h1>
              <VisibilityToggle />
              <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.gestaoVeiculos} />
            </div>
            <p className="text-muted-foreground">Controle despesas, abastecimentos e serviços</p>
          </div>
        </div>

        {/* Lançar despesa - mobile only (full-width) */}
        <Button 
          onClick={() => setDialogOpen(true)} 
          className="w-full md:hidden bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Lançar despesa
        </Button>

        {/* Vehicles Section - Before Summary Cards */}
        <VehiclesSection
          vehicles={vehicles}
          vehicleRecords={vehicleRecords}
          onEditVehicle={handleEditVehicle}
          onAddVehicle={handleAddVehicle}
          onAddRecord={() => setDialogOpen(true)}
        />

        {/* Summary Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-expense/5 border border-expense/20">
            <div className="h-8 w-8 rounded-lg bg-expense/10 flex items-center justify-center shrink-0">
              <Car className="h-4 w-4 text-expense" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-sm font-bold text-expense truncate">
                {formatCompactCurrency(totalGeral)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Despesas</p>
              <p className="text-sm font-bold text-foreground truncate">
                {formatCompactCurrency(totalExpenses)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Fuel className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Combustível</p>
              <p className="text-sm font-bold text-foreground truncate">
                {formatCompactCurrency(totalFuel)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Serviços</p>
              <p className="text-sm font-bold text-foreground truncate">
                {formatCompactCurrency(totalServices)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Records and Reports */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="records">
              <Receipt className="h-4 w-4" />
              Registros
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-4 mt-4">
            {/* Records Header with Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Registros</h2>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  {filteredRecords.length}
                </span>
                {/* Active filters badges */}
                {(filterVehicle !== 'all' || filterType !== 'all' || filterDriver !== 'all' || filterCategory !== 'all') && (
                  <div className="flex items-center gap-1 ml-2">
                    {filterVehicle !== 'all' && (
                      <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                        {vehicles.find(v => v.id === filterVehicle)?.name}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterVehicle('all')} />
                      </Badge>
                    )}
                    {filterType !== 'all' && (
                      <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                        {filterType === 'expense' ? 'Despesas' : filterType === 'fuel' ? 'Abastecimentos' : 'Serviços'}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterType('all'); setFilterCategory('all'); }} />
                      </Badge>
                    )}
                    {filterDriver !== 'all' && (
                      <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                        {filterDriver}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterDriver('all')} />
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={filterVehicle !== 'all' || filterType !== 'all' || filterDriver !== 'all' ? "border-primary text-primary" : ""}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Veículo</label>
                      <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todos os veículos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os veículos</SelectItem>
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                      <Select value={filterType} onValueChange={(v) => { setFilterType(v); setFilterCategory('all'); }}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todos os tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os tipos</SelectItem>
                          <SelectItem value="expense">Despesas</SelectItem>
                          <SelectItem value="fuel">Abastecimentos</SelectItem>
                          <SelectItem value="service">Serviços</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Motorista</label>
                      <Select value={filterDriver} onValueChange={setFilterDriver}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todos os motoristas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os motoristas</SelectItem>
                          {recordDrivers.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {filterType === 'expense' && expenseCategories.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Todas as categorias" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as categorias</SelectItem>
                            {expenseCategories.map((c) => (
                              <SelectItem key={c} value={c}>
                                {vehicleExpenseCategoryLabels[c]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {filterType === 'service' && serviceTypes.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Serviço</label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Todos os serviços" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os serviços</SelectItem>
                            {serviceTypes.map((s) => (
                              <SelectItem key={s} value={s}>
                                {vehicleServiceTypeLabels[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex justify-end pt-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setFilterVehicle('all');
                          setFilterType('all');
                          setFilterDriver('all');
                          setFilterCategory('all');
                        }}
                      >
                        Limpar filtros
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Records List */}
            {filteredRecords.length === 0 ? (
              <EmptyState
                icon={<Car className="h-6 w-6 text-muted-foreground" />}
                description="Nenhum registro encontrado"
                actionLabel="Adicionar primeiro registro"
                onAction={() => setDialogOpen(true)}
              />
            ) : (
              <div className="space-y-2">
                {filteredRecords.map((record) => (
                  isMobile ? (
                    // Mobile Card Layout
                    <div
                      key={record.id}
                      className="p-3 rounded-lg bg-muted/20 border border-border"
                    >
                      {/* Header: Icon, Vehicle Name, Type Badge, Amount */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {getRecordIcon(record.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded inline-block">
                              {vehicleRecordTypeLabels[record.type]}
                            </span>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{record.vehicleName}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-expense">
                            R$ {getRecordAmount(record).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {record.type === 'fuel' && (
                            <p className="text-[10px] text-muted-foreground">
                              R$ {record.pricePerUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{record.unit === 'liter' ? 'L' : 'm³'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{getRecordDetails(record)}</p>

                      {/* Info Row: Date, Odometer, Driver */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(record.date).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          {record.odometer.toLocaleString('pt-BR')} km
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{record.driverName}</span>
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-1 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => handleEditRecord(record)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-expense"
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Desktop Layout
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {getRecordIcon(record.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                              {vehicleRecordTypeLabels[record.type]}
                            </span>
                            <p className="text-xs text-muted-foreground truncate">{record.vehicleName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{getRecordDetails(record)}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <span>{record.odometer.toLocaleString('pt-BR')} km</span>
                            <span>•</span>
                            <span className="truncate">{record.driverName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-sm text-expense">
                            R$ {getRecordAmount(record).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {record.type === 'fuel' && (
                            <p className="text-[10px] text-muted-foreground">
                              R$ {record.pricePerUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{record.unit === 'liter' ? 'L' : 'm³'}
                            </p>
                          )}
                        </div>
                        <div className="flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEditRecord(record)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-expense"
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <VehicleReports records={vehicleRecords} />
          </TabsContent>
        </Tabs>
      </div>

      <VehicleRecordDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSave={handleSaveRecord}
        editRecord={editRecord}
      />

      <AddAssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        editingAsset={editingAsset}
        defaultType="vehicle"
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteRecord}
              className="bg-expense hover:bg-expense/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default GestaoVeiculos;