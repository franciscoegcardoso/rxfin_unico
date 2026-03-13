import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Car, Fuel, Wrench, Receipt, Plus, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { formatCompactCurrency } from '@/lib/utils';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
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

  // Redirect index (navigate estável no RR v6; replace: true = 1 replaceState apenas)
  useEffect(() => {
    if (!currentTab && (location.pathname === '/gestao-veiculos' || location.pathname === '/gestao-veiculos/')) {
      navigate('/gestao-veiculos/registros', { replace: true });
    }
  }, [currentTab, location.pathname]);

  // Handle URL action parameter (deps só location.search para evitar reexecuções)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'novo-registro') {
      setDialogOpen(true);
      setEditRecord(null);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname]);

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

          {/* Summary Cards — padrão bens-investimentos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <HeaderMetricCard label="Total" value={formatCompactCurrency(totalGeral)} variant="negative" icon={<Car className="h-4 w-4" />} />
            <HeaderMetricCard label="Despesas" value={formatCompactCurrency(totalExpenses)} variant="amber" icon={<Receipt className="h-4 w-4" />} />
            <HeaderMetricCard label="Combustível" value={formatCompactCurrency(totalFuel)} variant="blue" icon={<Fuel className="h-4 w-4" />} />
            <HeaderMetricCard label="Serviços" value={formatCompactCurrency(totalServices)} variant="neutral" icon={<Wrench className="h-4 w-4" />} />
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
          vehicleOnly
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
