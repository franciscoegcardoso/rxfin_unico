import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { Button } from '@/components/ui/button';
import { Plus, Car, Fuel, Wrench, Receipt, Trash2, Filter, Pencil, BarChart3, X, Calendar, Gauge, User, TrendingUp, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { useVisibility } from '@/contexts/VisibilityContext';
import { formatCompactCurrency, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
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
import { useVehicleDashboard } from '@/hooks/useVehicleDashboard';

export const GestaoVeiculos: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { config, vehicleRecords, addVehicleRecord, updateVehicleRecord, removeVehicleRecord } = useFinancial();
  const { data: vehicleDashboardData, error: vehicleDashboardError } = useVehicleDashboard();
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
        <PageHeader
          icon={Car}
          title="Gestão de Veículos"
          subtitle="Veículos cadastrados, combustível e manutenção"
          actions={
            <>
              <VisibilityToggle />
              <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.gestaoVeiculos} />
            </>
          }
        />
        {vehicleDashboardError && (
          <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{vehicleDashboardError}</p>
          </Card>
        )}
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

        {/* Summary Cards — padrão bens-investimentos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <HeaderMetricCard label="Total" value={formatCompactCurrency(totalGeral)} variant="negative" icon={<Car className="h-4 w-4" />} />
          <HeaderMetricCard label="Despesas" value={formatCompactCurrency(totalExpenses)} variant="amber" icon={<Receipt className="h-4 w-4" />} />
          <HeaderMetricCard label="Combustível" value={formatCompactCurrency(totalFuel)} variant="blue" icon={<Fuel className="h-4 w-4" />} />
          <HeaderMetricCard label="Serviços" value={formatCompactCurrency(totalServices)} variant="neutral" icon={<Wrench className="h-4 w-4" />} />
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

            {/* Tabela de registros (estrutura do antigo Histórico de Registros) */}
            {filteredRecords.length === 0 ? (
              <EmptyState
                icon={<Car className="h-6 w-6 text-muted-foreground" />}
                description="Nenhum registro encontrado"
                actionLabel="Adicionar primeiro registro"
                onAction={() => setDialogOpen(true)}
              />
            ) : (
              <Card className="rounded-[14px] border border-border/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/30">
                        <th className="px-4 py-3 text-left font-medium">Data</th>
                        <th className="px-4 py-3 text-left font-medium">Tipo</th>
                        <th className="px-4 py-3 text-left font-medium">Veículo</th>
                        <th className="px-4 py-3 text-right font-medium">Custo</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Detalhes</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground w-20">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...filteredRecords]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((record) => {
                          const dateStr = format(new Date(record.date), 'dd/MM/yyyy');
                          const isFuel = record.type === 'fuel';
                          const tipoLabel = record.type === 'fuel' ? 'Combustível' : record.type === 'service' ? 'Manutenção' : 'Despesa';
                          const displayName = record.vehicleName.length > 30 ? record.vehicleName.slice(0, 27) + '…' : record.vehicleName;
                          return (
                            <tr key={record.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                              <td className="px-4 py-3 text-muted-foreground">{dateStr}</td>
                              <td className="px-4 py-3">
                                {isFuel ? (
                                  <Badge className="bg-green-600 text-white border-0 hover:bg-green-600">Combustível</Badge>
                                ) : (
                                  <Badge className="bg-blue-600 text-white border-0 hover:bg-blue-600">{tipoLabel}</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 truncate max-w-[180px]" title={record.vehicleName}>{displayName}</td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(getRecordAmount(record))}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <span className="block truncate max-w-[200px]" title={getRecordDetails(record)}>{getRecordDetails(record) || '—'}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditRecord(record)} aria-label="Editar registro">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-expense" onClick={() => handleDeleteRecord(record.id)} aria-label="Excluir registro">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </Card>
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