import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Car, Fuel, Wrench, Receipt, Plus, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BackLink } from '@/components/shared/BackLink';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { formatCompactCurrency } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { VehicleRecordDialog } from '@/components/veiculos/VehicleRecordDialog';
import { VehiclesSection } from '@/components/veiculos/VehiclesSection';
import { AddAssetDialog } from '@/components/bens/AddAssetDialog';
import { Asset } from '@/types/financial';
import { VehicleRecord } from '@/types/vehicle';
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
import { GestaoVeiculosContext } from '@/contexts/GestaoVeiculosContext';

const VALID_TABS = ['registros', 'relatorios'] as const;
type GestaoTab = typeof VALID_TABS[number];

const GestaoVeiculosLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, vehicleRecords, addVehicleRecord, updateVehicleRecord, removeVehicleRecord } = useFinancial();
  const vehicles = config.assets.filter(a => a.type === 'vehicle');
  const { formatValue } = useVisibility();

  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || '';
  const currentTab = (VALID_TABS as readonly string[]).includes(pathSegment) ? pathSegment : '';

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<VehicleRecord | null>(null);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Redirect index
  useEffect(() => {
    if (!currentTab && (location.pathname === '/gestao-veiculos' || location.pathname === '/gestao-veiculos/')) {
      navigate('/gestao-veiculos/registros', { replace: true });
    }
  }, [currentTab, location.pathname, navigate]);

  // Handle URL action parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'novo-registro') {
      setDialogOpen(true);
      setEditRecord(null);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate, location.pathname]);

  const handleTabChange = (value: string) => {
    navigate(`/gestao-veiculos/${value}`);
  };

  const handleEditVehicle = useCallback((vehicle: Asset) => {
    setEditingAsset(vehicle);
    setAssetDialogOpen(true);
  }, []);

  const handleAddVehicle = useCallback(() => {
    setEditingAsset(null);
    setAssetDialogOpen(true);
  }, []);

  const handleSaveRecord = (record: VehicleRecord) => {
    if (editRecord) {
      updateVehicleRecord(record.id, record);
    } else {
      addVehicleRecord(record);
    }
    setEditRecord(null);
  };

  const openRecordDialog = useCallback((record?: VehicleRecord) => {
    setEditRecord(record || null);
    setDialogOpen(true);
  }, []);

  const handleDeleteRecord = useCallback((id: string) => {
    setRecordToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteRecord = () => {
    if (recordToDelete) {
      removeVehicleRecord(recordToDelete);
      toast.success('Registro removido');
      setRecordToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  // Totals
  const totalExpenses = vehicleRecords.filter(r => r.type === 'expense').reduce((acc, r) => acc + r.amount, 0);
  const totalFuel = vehicleRecords.filter(r => r.type === 'fuel').reduce((acc, r) => acc + r.totalAmount, 0);
  const totalServices = vehicleRecords.filter(r => r.type === 'service').reduce((acc, r) => acc + r.amount, 0);
  const totalGeral = totalExpenses + totalFuel + totalServices;

  const contextValue = useMemo(() => ({
    vehicles,
    vehicleRecords,
    openRecordDialog,
    handleDeleteRecord,
    handleEditVehicle,
    handleAddVehicle,
  }), [vehicles, vehicleRecords, openRecordDialog, handleDeleteRecord, handleEditVehicle, handleAddVehicle]);

  return (
    <GestaoVeiculosContext.Provider value={contextValue}>
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

          {/* Mobile CTA */}
          <Button onClick={() => setDialogOpen(true)} className="w-full md:hidden bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Lançar despesa
          </Button>

          <VehiclesSection
            vehicles={vehicles}
            vehicleRecords={vehicleRecords}
            onEditVehicle={handleEditVehicle}
            onAddVehicle={handleAddVehicle}
            onAddRecord={() => setDialogOpen(true)}
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-expense/5 border border-expense/20">
              <div className="h-8 w-8 rounded-lg bg-expense/10 flex items-center justify-center shrink-0">
                <Car className="h-4 w-4 text-expense" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-sm font-bold text-expense truncate">{formatCompactCurrency(totalGeral)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Despesas</p>
                <p className="text-sm font-bold text-foreground truncate">{formatCompactCurrency(totalExpenses)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Fuel className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Combustível</p>
                <p className="text-sm font-bold text-foreground truncate">{formatCompactCurrency(totalFuel)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Serviços</p>
                <p className="text-sm font-bold text-foreground truncate">{formatCompactCurrency(totalServices)}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={currentTab || 'registros'} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="registros">
                <Receipt className="h-4 w-4" />
                Registros
              </TabsTrigger>
              <TabsTrigger value="relatorios">
                <BarChart3 className="h-4 w-4" />
                Relatórios
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Outlet />
        </div>

        <VehicleRecordDialog
          open={dialogOpen}
          onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditRecord(null); }}
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
              <AlertDialogAction onClick={confirmDeleteRecord} className="bg-expense hover:bg-expense/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppLayout>
    </GestaoVeiculosContext.Provider>
  );
};

export default GestaoVeiculosLayout;
