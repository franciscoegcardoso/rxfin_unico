import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerFriendly } from '@/components/ui/date-picker-friendly';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { assetTypes, patrimonioAssetTypes } from '@/data/defaultData';
import { AssetType, PropertyAdjustmentType, VehicleAdjustmentType, FuelType, RentalExpenseResponsibility, ExpenseResponsible, Asset } from '@/types/financial';
import { statesList } from '@/data/vehicleBenchmarks';
import { Building2, Car, TrendingUp, Package, Plus, Trash2, Home, ChevronLeft, ChevronRight, DollarSign, CalendarIcon, TrendingDown, Percent, Pencil, Fuel, Target, Calendar as CalendarViewIcon, Landmark, Upload, PieChart, LayoutGrid, List, AlertTriangle, RotateCcw, Clock, History, Shield } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFipe } from '@/hooks/useFipe';
import { VehicleFipeForm } from '@/components/bens/VehicleFipeForm';
import { VehicleInsightsDialog } from '@/components/bens/VehicleInsightsDialog';
import { PropertyInsightsDialog } from '@/components/bens/PropertyInsightsDialog';
import { AssetCostBreakdown } from '@/components/bens/AssetCostBreakdown';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { CreditoSection } from '@/components/credito/CreditoSection';
import { AddAssetDialog } from '@/components/bens/AddAssetDialog';
import { AssetEvolutionTable } from '@/components/bens/AssetEvolutionTable';
import { InvestmentsSection } from '@/components/bens/InvestmentsSection';
import { ConsolidatedSection } from '@/components/bens/ConsolidatedSection';
import { InstitutionInvestmentTypesCard } from '@/components/bens/InstitutionInvestmentTypesCard';
import { EquityEvolutionSection } from '@/components/bens/EquityEvolutionSection';

import { AssetInsuranceBadge } from '@/components/bens/AssetInsuranceBadge';
import { AssetInsuranceReport } from '@/components/bens/AssetInsuranceReport';
import { SeguroDialog } from '@/components/seguros/SeguroDialog';
import { SegurosSection } from '@/components/seguros/SegurosSection';
import { InvestmentType } from '@/types/financial';
import { useContasPagarReceber } from '@/hooks/useContasPagarReceber';
import { useUserTrash } from '@/hooks/useUserTrash';
import { useSeguros } from '@/hooks/useSeguros';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';


const assetIcons: Record<AssetType, React.ReactNode> = {
  property: <Building2 className="h-5 w-5" />,
  vehicle: <Car className="h-5 w-5" />,
  company: <Landmark className="h-5 w-5" />,
  investment: <TrendingUp className="h-5 w-5" />,
  valuable_objects: <Package className="h-5 w-5" />,
  intellectual_property: <Package className="h-5 w-5" />,
  licenses_software: <Package className="h-5 w-5" />,
  rights: <TrendingUp className="h-5 w-5" />,
  obligations: <TrendingDown className="h-5 w-5" />,
  other: <Package className="h-5 w-5" />,
};

const propertyAdjustmentOptions: { value: PropertyAdjustmentType; label: string; description: string }[] = [
  { value: 'igpm', label: 'IGP-M', description: 'Índice Geral de Preços do Mercado' },
  { value: 'ipca', label: 'IPCA', description: 'Índice Nacional de Preços ao Consumidor Amplo' },
  { value: 'minimum_wage', label: '% Salário Mínimo', description: 'Percentual do salário mínimo' },
  { value: 'none', label: 'Sem reajuste', description: 'Valor fixo sem correção' },
  { value: 'custom', label: 'Curva personalizada', description: 'Definir valor inicial e final' },
];

const formatCurrencyBase = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year.slice(2)}`;
};

const formatYearLabel = (yearMonth: string) => {
  const [year] = yearMonth.split('-');
  return year;
};

const generateMonths = (startYear: number, numMonths: number = 24): string[] => {
  const months: string[] = [];
  const startDate = new Date(startYear, 0, 1);
  
  for (let i = 0; i < numMonths; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(month);
  }
  
  return months;
};

const generateMonthsFromDate = (startDate: Date, numMonths: number): string[] => {
  const months: string[] = [];
  const base = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  for (let i = 0; i < numMonths; i++) {
    const date = new Date(base);
    date.setMonth(base.getMonth() + i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(month);
  }

  return months;
};

const generateYearsUntil = (startYear: number, endYear: number = 2056): string[] => {
  const years: string[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(`${year}-01`); // January 1st of each year
  }
  return years;
};

const generateYearlyViewYears = (): string[] => {
  const currentYear = new Date().getFullYear();
  return generateYearsUntil(currentYear - 5, 2056); // Start 5 years back for context
};

type ViewMode = 'month' | 'year';

// Curva de depreciação típica de veículos (% do valor original por ano)
const DEPRECIATION_CURVE = [
  { year: 0, percentage: 100 },
  { year: 1, percentage: 85 },
  { year: 2, percentage: 75 },
  { year: 3, percentage: 67 },
  { year: 4, percentage: 60 },
  { year: 5, percentage: 54 },
  { year: 6, percentage: 49 },
  { year: 7, percentage: 45 },
  { year: 8, percentage: 41 },
  { year: 9, percentage: 38 },
  { year: 10, percentage: 35 },
  { year: 11, percentage: 33 },
  { year: 12, percentage: 31 },
  { year: 13, percentage: 29 },
  { year: 14, percentage: 27 },
  { year: 15, percentage: 25 },
];

const getDepreciationPercentage = (yearsFromPurchase: number): number => {
  if (yearsFromPurchase <= 0) return 100;
  if (yearsFromPurchase >= 15) return 25;
  
  const lowerYear = Math.floor(yearsFromPurchase);
  const upperYear = Math.ceil(yearsFromPurchase);
  
  if (lowerYear === upperYear) {
    return DEPRECIATION_CURVE[lowerYear].percentage;
  }
  
  const lowerPercentage = DEPRECIATION_CURVE[lowerYear].percentage;
  const upperPercentage = DEPRECIATION_CURVE[upperYear].percentage;
  const fraction = yearsFromPurchase - lowerYear;
  
  return lowerPercentage - (lowerPercentage - upperPercentage) * fraction;
};

// Calcula o valor estimado de um bem para um determinado mês
const calculateAssetValueForMonth = (
  asset: {
    type: AssetType;
    value: number;
    purchaseDate?: string;
    purchaseValue?: number;
    isZeroKm?: boolean;
    fipePercentage?: number;
    vehicleAdjustment?: 'fipe' | 'custom';
  },
  targetMonth: string
): number => {
  const targetDate = new Date(targetMonth + '-01');
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Se não tem data de compra, retorna o valor atual
  if (!asset.purchaseDate) {
    return asset.value;
  }
  
  const purchaseDate = new Date(asset.purchaseDate);
  const purchaseMonth = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;
  const purchaseValue = asset.purchaseValue || asset.value;
  
  // Se o mês alvo é antes da data de compra, retorna 0
  if (targetMonth < purchaseMonth) {
    return 0;
  }
  
  // Calcular meses entre datas
  const monthsDiff = (d1: Date, d2: Date) => {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  };
  
  if (asset.type === 'property') {
    // Para imóveis: interpolação linear entre valor de compra e valor atual
    const monthsFromPurchaseToNow = monthsDiff(purchaseDate, currentDate);
    const monthsFromPurchaseToTarget = monthsDiff(purchaseDate, targetDate);
    
    if (monthsFromPurchaseToNow <= 0) {
      return purchaseValue;
    }
    
    // Valor atual do imóvel
    const currentValue = asset.value;
    
    // Calcular taxa de valorização mensal
    const monthlyRate = (currentValue - purchaseValue) / monthsFromPurchaseToNow;
    
    // Para meses passados ou presente: interpolação
    if (monthsFromPurchaseToTarget <= monthsFromPurchaseToNow) {
      return Math.round(purchaseValue + (monthlyRate * monthsFromPurchaseToTarget));
    }
    
    // Para projeções futuras: extrapolar a mesma taxa
    return Math.round(purchaseValue + (monthlyRate * monthsFromPurchaseToTarget));
  }
  
  if (asset.type === 'vehicle') {
    // Para veículos: usar o valor FIPE atual como referência
    // e interpolar/extrapolar baseado nos dados reais (compra → atual)
    const monthsFromPurchaseToNow = monthsDiff(purchaseDate, currentDate);
    const monthsFromPurchaseToTarget = monthsDiff(purchaseDate, targetDate);
    
    // Se é zero km e está no mês da compra, retorna valor de compra
    if (asset.isZeroKm && targetMonth === purchaseMonth) {
      return purchaseValue;
    }
    
    // Valor atual do veículo (já com percentual FIPE aplicado)
    const currentValue = asset.value;
    
    // Se a compra foi no mês atual ou futuro
    if (monthsFromPurchaseToNow <= 0) {
      return targetMonth === purchaseMonth ? purchaseValue : currentValue;
    }
    
    // Calcular taxa de depreciação mensal baseada nos dados reais
    const monthlyDepreciation = (purchaseValue - currentValue) / monthsFromPurchaseToNow;
    
    // Para meses passados ou presente: interpolação
    if (monthsFromPurchaseToTarget <= monthsFromPurchaseToNow) {
      return Math.round(purchaseValue - (monthlyDepreciation * monthsFromPurchaseToTarget));
    }
    
    // Para projeções futuras: extrapolar a mesma taxa de depreciação
    const projectedValue = purchaseValue - (monthlyDepreciation * monthsFromPurchaseToTarget);
    // Não deixar o valor ficar negativo
    return Math.round(Math.max(projectedValue, currentValue * 0.2));
  }
  
  // Para outros tipos, retorna o valor atual
  return asset.value;
};

const monthOptions = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];


// Responsabilidade padrão de mercado para despesas de aluguel
const defaultExpenseResponsibility: RentalExpenseResponsibility = {
  iptu: 'tenant', // Inquilino geralmente paga
  condominio: 'tenant', // Inquilino geralmente paga
  agua: 'tenant',
  luz: 'tenant',
  gas: 'tenant',
  seguro: 'owner', // Proprietário geralmente paga
  manutencaoOrdinaria: 'tenant', // Pequenos reparos = inquilino
  manutencaoExtraordinaria: 'owner', // Reformas estruturais = proprietário
};

interface NewAssetForm {
  name: string;
  type: AssetType;
  value: number;
  description: string;
  isRentalProperty: boolean;
  rentalValue: number;
  purchaseDate: Date | undefined;
  purchaseValue: number;
  propertyAdjustment: PropertyAdjustmentType;
  propertyCep: string;
  propertyArea: number;
  averageRentedMonths: number;
  rentAdjustmentMonth: number;
  rentAdjustmentReminder: boolean;
  expenseResponsibility: RentalExpenseResponsibility;
  isZeroKm: boolean;
  useFipeReference: boolean;
  fipePercentage: number;
  useCustomCurve: boolean;
  initialValue: number;
  finalValue: number;
  finalDate: Date | undefined;
  // Campos para veículos
  vehicleState: string;
  monthlyKm: number;
  fuelConsumption: number;
  fuelType: FuelType;
  fuelPrice: number;
  mainDriverId: string;
}

const initialFormState: NewAssetForm = {
  name: '',
  type: 'investment',
  value: 0,
  description: '',
  isRentalProperty: false,
  rentalValue: 0,
  purchaseDate: undefined,
  purchaseValue: 0,
  propertyAdjustment: 'none',
  propertyCep: '',
  propertyArea: 0,
  averageRentedMonths: 12,
  rentAdjustmentMonth: 1,
  rentAdjustmentReminder: false,
  expenseResponsibility: { ...defaultExpenseResponsibility },
  isZeroKm: false,
  useFipeReference: true,
  fipePercentage: 100,
  useCustomCurve: false,
  initialValue: 0,
  finalValue: 0,
  finalDate: undefined,
  vehicleState: 'SP',
  monthlyKm: 1000,
  fuelConsumption: 10,
  fuelType: 'flex',
  fuelPrice: 5.79,
  mainDriverId: '',
};

// Interface for dependency check results
interface AssetDependencies {
  hasDependencies: boolean;
  vehicleRecords: number;
  linkedExpenses: number;
  linkedIncome: boolean;
  monthlyEntries: number;
  assetName: string;
  assetType: AssetType;
}

const BensInvestimentos: React.FC = () => {
  const { config, removeAsset, updateAssetMonthlyEntry, getAssetMonthlyEntry, vehicleRecords, addAsset } = useFinancial();
  const { isHidden, formatValue } = useVisibility();
  const { deleteContasByVinculoAtivo, getContasByVinculoAtivo, addConta } = useContasPagarReceber();
  const { trashItems, auditLogs, moveToTrash, logDeletion, restoreFromTrash, permanentlyDelete, emptyTrash, getDaysUntilExpiration, loading: trashLoading } = useUserTrash();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const formatCurrency = (value: number) => isHidden ? '••••••' : formatCurrencyBase(value);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [trashSheetOpen, setTrashSheetOpen] = useState(false);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);
  
  // Get initial tab from URL or default to 'consolidado'
  const tabParam = searchParams.get('tab');
  const validTabs = ['consolidado', 'patrimonio', 'investimentos', 'credito'] as const;
  const initialTab = validTabs.includes(tabParam as any) ? tabParam as typeof validTabs[number] : 'consolidado';
  const [mainTab, setMainTab] = useState<typeof validTabs[number]>(initialTab);
  
  const [patrimonioViewMode, setPatrimonioViewMode] = useState<'list' | 'cards'>('list');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [forceDeleteConfirmed, setForceDeleteConfirmed] = useState(false);
  const [assetDependencies, setAssetDependencies] = useState<AssetDependencies | null>(null);
  
  // Insurance dialog state
  const [seguroDialogOpen, setSeguroDialogOpen] = useState(false);
  const [seguroAssetId, setSeguroAssetId] = useState<string | undefined>(undefined);
  const { seguros } = useSeguros();
  
  // Check if asset has active insurance
  const hasActiveInsurance = (assetId: string) => {
    return seguros?.some(s => 
      s.asset_id === assetId && 
      new Date(s.data_fim) >= new Date()
    ) ?? false;
  };
  
  const handleAddSeguro = (assetId: string) => {
    setSeguroAssetId(assetId);
    setSeguroDialogOpen(true);
  };

  // Check for asset dependencies before allowing deletion
  const checkAssetDependencies = (assetId: string): AssetDependencies => {
    const asset = config.assets.find(a => a.id === assetId);
    if (!asset) {
      return {
        hasDependencies: false,
        vehicleRecords: 0,
        linkedExpenses: 0,
        linkedIncome: false,
        monthlyEntries: 0,
        assetName: '',
        assetType: 'property'
      };
    }

    // Count vehicle records linked to this asset
    const vehicleRecordCount = vehicleRecords.filter(r => r.vehicleId === assetId).length;

    // Count linked expenses
    const linkedExpenseCount = asset.linkedExpenses?.length || 0;

    // Check for linked rental income
    const hasLinkedIncome = !!(asset.rentalIncomeId && config.incomeItems.find(i => i.id === asset.rentalIncomeId));

    // Count monthly entries that reference this asset (via linked income/expenses)
    let monthlyEntryCount = 0;
    const linkedExpenseIds = asset.linkedExpenses?.map(le => le.expenseId) || [];
    
    config.monthlyEntries.forEach(entry => {
      // Check if any expense entry is linked to this asset
      if (linkedExpenseIds.includes(entry.itemId)) {
        monthlyEntryCount++;
      }
      // Check if income entry is linked to this asset
      if (asset.rentalIncomeId && entry.itemId === asset.rentalIncomeId) {
        monthlyEntryCount++;
      }
    });

    const hasDependencies = vehicleRecordCount > 0 || linkedExpenseCount > 0 || hasLinkedIncome || monthlyEntryCount > 0;

    return {
      hasDependencies,
      vehicleRecords: vehicleRecordCount,
      linkedExpenses: linkedExpenseCount,
      linkedIncome: hasLinkedIncome,
      monthlyEntries: monthlyEntryCount,
      assetName: asset.name,
      assetType: asset.type
    };
  };

  const handleDeleteAsset = (assetId: string) => {
    const dependencies = checkAssetDependencies(assetId);
    setAssetDependencies(dependencies);
    setAssetToDelete(assetId);
    setForceDeleteConfirmed(false);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAsset = async () => {
    if (assetToDelete && assetDependencies && !assetDependencies.hasDependencies) {
      const asset = config.assets.find(a => a.id === assetToDelete);
      if (asset) {
        // Move to trash instead of permanent delete
        await moveToTrash(assetToDelete, asset.type, asset as Record<string, any>, [], 'user_delete');
        await logDeletion('soft_delete', asset.type, assetToDelete, asset.name, { value: asset.value }, 0);
      }
      removeAsset(assetToDelete);
      toast.success('Item movido para a lixeira');
      setAssetToDelete(null);
      setAssetDependencies(null);
    }
    setDeleteConfirmOpen(false);
  };

  const confirmForceDeleteAsset = async () => {
    if (!assetToDelete || !forceDeleteConfirmed) return;
    
    try {
      const asset = config.assets.find(a => a.id === assetToDelete);
      
      // First collect linked contas for trash
      const linkedContas = getContasByVinculoAtivo(assetToDelete);
      const linkedContasCount = linkedContas.length;
      
      // Move asset and linked data to trash
      if (asset) {
        await moveToTrash(
          assetToDelete, 
          asset.type, 
          asset as Record<string, any>, 
          linkedContas as Record<string, any>[], 
          'force_delete'
        );
        
        // Log the force deletion for audit
        await logDeletion(
          'force_delete', 
          asset.type, 
          assetToDelete, 
          asset.name, 
          { 
            value: asset.value,
            dependencies: assetDependencies,
            linkedContasDeleted: linkedContasCount
          }, 
          linkedContasCount
        );
      }
      
      // Delete linked contas
      if (linkedContasCount > 0) {
        await deleteContasByVinculoAtivo(assetToDelete);
      }
      
      // Then remove the asset
      removeAsset(assetToDelete);
      
      toast.success('Item movido para lixeira com registros vinculados');
    } catch (error) {
      console.error('Error during force delete:', error);
      toast.error('Erro ao excluir item');
    } finally {
      setAssetToDelete(null);
      setAssetDependencies(null);
      setForceDeleteConfirmed(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleRestoreFromTrash = async (trashId: string) => {
    const restored = await restoreFromTrash(trashId);
    if (restored) {
      // Restore the asset
      addAsset(restored.asset_data as Asset);
      
      // Restore linked contas if any
      if (restored.linked_data && Array.isArray(restored.linked_data) && restored.linked_data.length > 0) {
        for (const conta of restored.linked_data) {
          // Cast to ContaInput - the linked_data should have all required fields
          const contaInput = conta as {
            tipo: 'pagar' | 'receber';
            nome: string;
            valor: number;
            dataVencimento: string;
            categoria: string;
            [key: string]: any;
          };
          if (contaInput.tipo && contaInput.nome && contaInput.valor !== undefined && contaInput.dataVencimento && contaInput.categoria) {
            await addConta({
              tipo: contaInput.tipo,
              nome: contaInput.nome,
              valor: contaInput.valor,
              dataVencimento: contaInput.dataVencimento,
              categoria: contaInput.categoria,
              formaPagamento: contaInput.formaPagamento,
              observacoes: contaInput.observacoes,
              recorrente: contaInput.recorrente,
              tipoCobranca: contaInput.tipoCobranca,
              diaRecorrencia: contaInput.diaRecorrencia,
              dataFimRecorrencia: contaInput.dataFimRecorrencia,
              semDataFim: contaInput.semDataFim,
              vinculoAtivoId: contaInput.vinculoAtivoId,
            });
          }
        }
      }
      
      toast.success('Item restaurado com sucesso');
    }
  };

  const handleEditAssetFromDialog = () => {
    if (assetToDelete) {
      const asset = config.assets.find(a => a.id === assetToDelete);
      if (asset) {
        setEditingAsset(asset);
        setIsDialogOpen(true);
      }
    }
    setDeleteConfirmOpen(false);
    setAssetToDelete(null);
    setAssetDependencies(null);
    setForceDeleteConfirmed(false);
  };

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as any)) {
      setMainTab(tabParam as typeof validTabs[number]);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setMainTab(value as typeof validTabs[number]);
    if (value !== 'consolidado') {
      setSearchParams({ tab: value });
    } else {
      setSearchParams({});
    }
  };

  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Linha do tempo começa no mês da compra mais antigo (para evitar meses "zerados" antes da compra)
  const timelineStartDate = useMemo(() => {
    const purchaseDates = config.assets
      .filter(asset => asset.purchaseDate)
      .map(asset => new Date(asset.purchaseDate!))
      .filter(d => !Number.isNaN(d.getTime()));

    if (purchaseDates.length === 0) {
      return new Date(currentDate.getFullYear(), 0, 1);
    }

    const minTime = Math.min(...purchaseDates.map(d => d.getTime()));
    const d = new Date(minTime);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [config.assets]);

  // Termina 24 meses após o mês atual
  const timelineEndDate = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    d.setMonth(d.getMonth() + 24);
    return d;
  }, [currentMonth]);

  // Monthly view months
  const allMonths = useMemo(() => {
    const totalMonths =
      (timelineEndDate.getFullYear() - timelineStartDate.getFullYear()) * 12 +
      (timelineEndDate.getMonth() - timelineStartDate.getMonth()) +
      1;

    return generateMonthsFromDate(timelineStartDate, totalMonths);
  }, [timelineStartDate, timelineEndDate]);

  // Yearly view years (from earliest asset to 2056)
  const allYears = useMemo(() => {
    const startYear = Math.min(timelineStartDate.getFullYear(), currentDate.getFullYear() - 5);
    return generateYearsUntil(startYear, 2056);
  }, [timelineStartDate]);

  // Hook de navegação com scroll
  const monthNav = useMonthNavigation({ allMonths, currentMonth });

  const isProjection = (month: string) => month > currentMonth;

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsDialogOpen(true);
  };

  const handleOpenAddDialog = (institutionId?: string, investmentType?: InvestmentType) => {
    setEditingAsset(null);
    // TODO: Pre-populate form with institutionId and investmentType if provided
    setIsDialogOpen(true);
  };

  const handleValueChange = (month: string, assetId: string, value: number) => {
    updateAssetMonthlyEntry({ month, assetId, value });
  };

  const getManualAssetEntry = (month: string, assetId: string): number | undefined => {
    return config.assetMonthlyEntries.find(e => e.month === month && e.assetId === assetId)?.value;
  };

  const getMonthlyTotal = (month: string) => {
    return config.assets.reduce((sum, asset) => {
      const manualValue = getManualAssetEntry(month, asset.id);
      const value = manualValue !== undefined ? manualValue : calculateAssetValueForMonth(asset, month);
      return sum + value;
    }, 0);
  };


  // Filtrar apenas patrimônio (excluir investimentos) e ordenar
  const patrimonioAssets = useMemo(() => {
    const assets = config.assets.filter(asset => asset.type !== 'investment');
    
    // Separar ativos e vendidos
    const activeAssets = assets.filter(a => !a.isSold);
    const soldAssets = assets.filter(a => a.isSold);
    
    // Ordenar ativos por valor (decrescente)
    activeAssets.sort((a, b) => b.value - a.value);
    
    // Ordenar vendidos por data de venda (decrescente - mais recente primeiro)
    soldAssets.sort((a, b) => {
      if (!a.saleDate && !b.saleDate) return 0;
      if (!a.saleDate) return 1;
      if (!b.saleDate) return -1;
      return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
    });
    
    // Retornar ativos primeiro, depois vendidos
    return [...activeAssets, ...soldAssets];
  }, [config.assets]);

  const totalPatrimonio = patrimonioAssets
    .filter(asset => !asset.isSold) // Apenas ativos não vendidos
    .reduce((sum, asset) => {
      // Obrigações são negativas
      if (asset.type === 'obligations') return sum - asset.value;
      return sum + asset.value;
    }, 0);

  const totalByType = patrimonioAssets.reduce((acc, asset) => {
    acc[asset.type] = (acc[asset.type] || 0) + asset.value;
    return acc;
  }, {} as Record<AssetType, number>);

  const assetsByType = useMemo(() => {
    const grouped: Record<AssetType, typeof config.assets> = {
      property: [],
      vehicle: [],
      company: [],
      investment: [],
      valuable_objects: [],
      intellectual_property: [],
      licenses_software: [],
      rights: [],
      obligations: [],
      other: [],
    };
    config.assets.forEach(asset => {
      grouped[asset.type].push(asset);
    });
    return grouped;
  }, [config.assets]);

  // Determine the default asset type based on which tab is active
  const defaultAssetType = mainTab === 'investimentos' ? 'investment' as const : 'property' as const;

  return (
    
      <div className="space-y-6">
        {/* Add Asset Dialog */}
        <AddAssetDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editingAsset={editingAsset}
          defaultType={defaultAssetType}
        />

        <PageHeader
          title="Investimentos"
          description="Gerencie seu patrimônio, consórcios e financiamentos"
          icon={<Building2 className="h-5 w-5 text-primary" />}
        >
          <VisibilityToggle />
          <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.bensInvestimentos} />
          {/* Trash Sheet */}
          <Sheet open={trashSheetOpen} onOpenChange={setTrashSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Trash2 className="h-4 w-4" />
                {trashItems.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {trashItems.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Lixeira
                </SheetTitle>
                <SheetDescription>
                  Itens excluídos nos últimos 30 dias. Restaure ou exclua permanentemente.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                {trashLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : trashItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>A lixeira está vazia</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trashItems.map((item) => {
                      const daysLeft = getDaysUntilExpiration(item.expires_at);
                      return (
                        <Card key={item.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {assetIcons[item.asset_type as AssetType] || <Package className="h-4 w-4" />}
                                <span className="font-medium truncate">
                                  {item.asset_data.name || 'Item sem nome'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Expira em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}</span>
                              </div>
                              {item.linked_data && item.linked_data.length > 0 && (
                                <div className="text-xs text-amber-600 mt-1">
                                  + {item.linked_data.length} registro(s) vinculado(s)
                                </div>
                              )}
                              <div className="text-sm font-medium mt-1">
                                {formatCurrency(item.asset_data.value || 0)}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreFromTrash(item.id)}
                                className="gap-1"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Restaurar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="gap-1">
                                    <Trash2 className="h-3 w-3" />
                                    Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O item será removido permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => permanentlyDelete(item.id)}>
                                      Excluir permanentemente
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    
                    {trashItems.length > 0 && (
                      <Button
                        variant="destructive"
                        className="w-full mt-4"
                        onClick={emptyTrash}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Esvaziar Lixeira
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
          
          {/* Audit Log Sheet */}
          <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <History className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Log de Auditoria
                </SheetTitle>
                <SheetDescription>
                  Histórico de exclusões para rastreabilidade.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                {trashLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <EmptyState
                    icon={<History className="h-6 w-6 text-muted-foreground" />}
                    description="Nenhum registro de auditoria"
                  />
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log: any) => (
                      <Card key={log.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {log.entity_name || log.entity_type}
                              </span>
                              <Badge variant={log.action === 'force_delete' ? 'destructive' : 'secondary'} className="text-[10px]">
                                {log.action === 'force_delete' ? 'Forçado' : 'Normal'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                            {log.linked_records_deleted > 0 && (
                              <div className="text-xs text-amber-600 mt-1">
                                {log.linked_records_deleted} registro(s) vinculado(s) também excluído(s)
                              </div>
                            )}
                            {log.details?.value && (
                              <div className="text-sm font-medium mt-1">
                                {formatCurrency(log.details.value)}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </PageHeader>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="consolidado" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
              <PieChart className="h-4 w-4" />
              <span>Consolidado</span>
            </TabsTrigger>
            <TabsTrigger value="patrimonio" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
              <DollarSign className="h-4 w-4" />
              <span>Patrimônio</span>
            </TabsTrigger>
            <TabsTrigger value="investimentos" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
              <TrendingUp className="h-4 w-4" />
              <span>Investimentos</span>
            </TabsTrigger>
            <TabsTrigger value="credito" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
              <Landmark className="h-4 w-4" />
              <span>Crédito</span>
            </TabsTrigger>
            <TabsTrigger value="seguros" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
              <Shield className="h-4 w-4" />
              <span>Seguros</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Consolidado */}
          <TabsContent value="consolidado" className="space-y-6 mt-4">
            <ConsolidatedSection onNavigate={handleTabChange} />
          </TabsContent>

          {/* Tab Investimentos */}
          <TabsContent value="investimentos" className="space-y-6 mt-4">
            <div className="flex items-center justify-end">
              <Button onClick={() => handleOpenAddDialog()} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Adicionar Bem/Direito
              </Button>
            </div>
            
            <InstitutionInvestmentTypesCard onAddInvestment={handleOpenAddDialog} />
            
            <InvestmentsSection 
              onAddInvestment={handleOpenAddDialog}
              onEditInvestment={handleEditAsset}
              onDeleteInvestment={handleDeleteAsset}
            />
          </TabsContent>

          <TabsContent value="patrimonio" className="space-y-6 mt-4">
            <div className="flex items-center justify-end">
              <Button onClick={() => handleOpenAddDialog()} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Adicionar Patrimônio
              </Button>
            </div>

        {/* Resumo Compacto */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 py-2 px-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="text-sm font-bold text-primary">{formatCurrency(totalPatrimonio)}</span>
          </div>
          
          <div className="hidden sm:block h-4 w-px bg-border" />
          
          {patrimonioAssetTypes.filter(t => totalByType[t.value as AssetType] > 0).map(({ value, label }) => (
            <div key={value} className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-accent/50">
                {React.cloneElement(assetIcons[value as AssetType] as React.ReactElement, { 
                  className: "h-3 w-3" 
                })}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">{label}:</span>
              <span className="text-xs font-medium">{formatCurrency(totalByType[value as AssetType] || 0)}</span>
            </div>
          ))}
        </div>

        {/* Lista de Bens */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">Meu Patrimônio</h2>
              <AssetInsuranceReport />
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={patrimonioViewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setPatrimonioViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={patrimonioViewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setPatrimonioViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {patrimonioAssets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-0">
                <EmptyState
                  icon={<Package className="h-6 w-6 text-muted-foreground" />}
                  description="Você ainda não cadastrou nenhum bem"
                  actionLabel="Adicionar primeiro item"
                  onAction={() => handleOpenAddDialog()}
                />
              </CardContent>
            </Card>
          ) : patrimonioViewMode === 'list' ? (
            /* List View */
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground text-sm">Nome</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground text-sm hidden sm:table-cell">Tipo</th>
                      <th className="text-right p-3 sm:p-4 font-medium text-muted-foreground text-sm">Valor</th>
                      <th className="text-right p-3 sm:p-4 font-medium text-muted-foreground w-16 sm:w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {patrimonioAssets.map((asset) => {
                      const isSold = asset.isSold;
                      return (
                        <tr 
                          key={asset.id} 
                          className={cn(
                            "border-b last:border-0 hover:bg-muted/30 transition-colors group",
                            isSold && "opacity-60"
                          )}
                        >
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={cn(
                                "p-1.5 sm:p-2 rounded-lg shrink-0",
                                isSold ? "bg-muted-foreground/10" : "bg-accent"
                              )}>
                                {React.cloneElement(assetIcons[asset.type] as React.ReactElement, { 
                                  className: "h-4 w-4 sm:h-5 sm:w-5" 
                                })}
                              </div>
                              <div className="min-w-0">
                                <p className={cn(
                                  "font-medium text-sm sm:text-base truncate",
                                  isSold && "text-muted-foreground"
                                )}>
                                  {asset.name}
                                </p>
                                {isSold && (
                                  <span className="text-[10px] sm:text-xs font-normal text-expense bg-expense/10 px-1 sm:px-1.5 py-0.5 rounded inline-block mt-0.5">
                                    Vendido
                                  </span>
                                )}
{/* Show type and insurance badge below name on mobile */}
                                <div className="flex items-center gap-1.5 sm:hidden">
                                  <span className="text-xs text-muted-foreground">
                                    {assetTypes.find(t => t.value === asset.type)?.label}
                                  </span>
                                  <AssetInsuranceBadge assetId={asset.id} assetName={asset.name} showUninsured={['property', 'vehicle', 'valuable_objects'].includes(asset.type) && !isSold} />
                                </div>
                              </div>
                            </div>
                          </td>
<td className="p-3 sm:p-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {assetTypes.find(t => t.value === asset.type)?.label}
                              </span>
                              <AssetInsuranceBadge assetId={asset.id} assetName={asset.name} showUninsured={['property', 'vehicle', 'valuable_objects'].includes(asset.type) && !isSold} />
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-right">
                            <span className={cn(
                              "font-semibold text-sm sm:text-base whitespace-nowrap",
                              isSold ? "text-muted-foreground" : "text-primary"
                            )}>
                              {formatCurrency(isSold && asset.saleValue ? asset.saleValue : asset.value)}
                            </span>
                          </td>
                          <td className="p-2 sm:p-4">
                            <div className="flex justify-end gap-0.5 sm:gap-1">
                              {asset.type === 'property' && (
                                <PropertyInsightsDialog property={asset} />
                              )}
                              {asset.type === 'vehicle' && (
                                <VehicleInsightsDialog vehicle={asset} />
                              )}
                              {/* Add insurance button for property/vehicle without active insurance */}
                              {(asset.type === 'property' || asset.type === 'vehicle') && !isSold && !hasActiveInsurance(asset.id) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:text-amber-300"
                                  onClick={() => handleAddSeguro(asset.id)}
                                  title="Adicionar Seguro"
                                >
                                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                onClick={() => handleEditAsset(asset)}
                              >
                                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={() => handleDeleteAsset(asset.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patrimonioAssets.map((asset) => {
                const isSold = asset.isSold;
                return (
                  <Card 
                    key={asset.id} 
                    className={cn(
                      "group hover:shadow-md transition-shadow relative overflow-hidden",
                      isSold && "bg-gradient-to-br from-muted/30 to-muted/10 border-muted-foreground/10 opacity-75"
                    )}
                  >
                    {isSold && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-expense bg-expense/10 border border-expense/30 px-2 py-1 rounded">
                          Vendido
                        </span>
                      </div>
                    )}
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isSold ? "bg-muted-foreground/10" : "bg-accent"
                          )}>
                            {assetIcons[asset.type]}
                          </div>
                          <div>
                            <h3 className={cn(
                              "font-semibold",
                              isSold && "text-muted-foreground"
                            )}>{asset.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {assetTypes.find(t => t.value === asset.type)?.label}
                            </p>
                            {asset.description && (
                              <p className="text-xs text-muted-foreground mt-1">{asset.description}</p>
                            )}
                            {asset.purchaseDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Compra: {format(new Date(asset.purchaseDate), 'dd/MM/yyyy')}
                                {asset.purchaseValue && ` - ${formatCurrency(asset.purchaseValue)}`}
                              </p>
                            )}
                            {isSold && asset.saleDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Venda: {format(new Date(asset.saleDate), 'dd/MM/yyyy')}
                                {asset.saleValue && ` - ${formatCurrency(asset.saleValue)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={cn("flex gap-1", isSold && "mt-6")}>
                          {asset.type === 'property' && (
                            <PropertyInsightsDialog property={asset} />
                          )}
                          {asset.type === 'vehicle' && (
                            <VehicleInsightsDialog vehicle={asset} />
                          )}
                          {/* Add insurance button for property/vehicle without active insurance */}
                          {(asset.type === 'property' || asset.type === 'vehicle') && !isSold && !hasActiveInsurance(asset.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:text-amber-300"
                              onClick={() => handleAddSeguro(asset.id)}
                              title="Adicionar Seguro"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditAsset(asset)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => handleDeleteAsset(asset.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <p className={cn(
                          "text-2xl font-bold",
                          isSold ? "text-muted-foreground" : "text-primary"
                        )}>
                          {formatCurrency(isSold && asset.saleValue ? asset.saleValue : asset.value)}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {/* Insurance/Warranty Badge */}
                          <AssetInsuranceBadge assetId={asset.id} assetName={asset.name} showLabel size="md" showUninsured={['property', 'vehicle', 'valuable_objects'].includes(asset.type) && !isSold} />
                          
                          {asset.isRentalProperty && !isSold && (
                            <>
                              <span className="inline-flex items-center gap-1 text-xs text-income bg-income/10 px-2 py-1 rounded">
                                <Home className="h-3 w-3" />
                                Gera aluguel
                              </span>
                              {asset.rentAdjustmentMonth && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  <CalendarIcon className="h-3 w-3" />
                                  Reajuste: {monthOptions.find(m => m.value === asset.rentAdjustmentMonth)?.label}
                                </span>
                              )}
                              {asset.rentAdjustmentReminder && (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                                  🔔 Lembrete ativo
                                </span>
                              )}
                            </>
                          )}
                          {asset.isZeroKm && !isSold && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                              <Car className="h-3 w-3" />
                              Zero KM
                            </span>
                          )}
                          {asset.propertyAdjustment && asset.propertyAdjustment !== 'none' && !isSold && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              <TrendingUp className="h-3 w-3" />
                              {propertyAdjustmentOptions.find(o => o.value === asset.propertyAdjustment)?.label}
                            </span>
                          )}
                          {asset.vehicleAdjustment === 'fipe' && asset.fipePercentage && !isSold && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              <Percent className="h-3 w-3" />
                              {asset.fipePercentage}% FIPE
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Custos e Receitas por Bem */}
        <AssetCostBreakdown assets={config.assets} />

        {/* Evolução Patrimonial - Visão Anual */}
        <EquityEvolutionSection />
          </TabsContent>

          {/* Tab Crédito - Agrupa Consórcios e Financiamentos */}
          <TabsContent value="credito" className="space-y-6 mt-4">
            <CreditoSection />
          </TabsContent>

          <TabsContent value="seguros" className="space-y-6 mt-4">
            <SegurosSection />
          </TabsContent>

        </Tabs>
      </div>

      {/* Confirmation Dialog for Asset Deletion */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => {
        setDeleteConfirmOpen(open);
        if (!open) {
          setAssetToDelete(null);
          setAssetDependencies(null);
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {assetDependencies?.hasDependencies ? (
                <>
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Exclusão não permitida
                </>
              ) : (
                'Confirmar exclusão'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {assetDependencies?.hasDependencies ? (
                  <>
                    <p>
                      O item <strong>"{assetDependencies.assetName}"</strong> possui registros vinculados e não pode ser excluído diretamente.
                    </p>
                    
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium text-foreground">Dependências encontradas:</p>
                      <ul className="text-sm space-y-1">
                        {assetDependencies.vehicleRecords > 0 && (
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {assetDependencies.vehicleRecords} registro(s) de veículo na Gestão de Veículos
                          </li>
                        )}
                        {assetDependencies.linkedExpenses > 0 && (
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {assetDependencies.linkedExpenses} despesa(s) vinculada(s) ao planejamento
                          </li>
                        )}
                        {assetDependencies.linkedIncome && (
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Receita de aluguel vinculada
                          </li>
                        )}
                        {assetDependencies.monthlyEntries > 0 && (
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {assetDependencies.monthlyEntries} lançamento(s) mensal(is)
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="text-sm font-medium text-primary mb-2">💡 Recomendação</p>
                      <p className="text-sm text-muted-foreground">
                        {assetDependencies.assetType === 'vehicle' ? (
                          <>
                            Em vez de excluir, considere <strong>marcar o veículo como vendido</strong>. 
                            Isso preserva todo o histórico de registros e permite análises futuras de custo total de propriedade.
                          </>
                        ) : assetDependencies.assetType === 'property' ? (
                          <>
                            Em vez de excluir, considere <strong>marcar o imóvel como vendido</strong>. 
                            Isso mantém o histórico de receitas e despesas para fins de análise patrimonial.
                          </>
                        ) : (
                          <>
                            Para manter a integridade dos dados, primeiro remova ou desvincule todos os registros associados, 
                            ou considere <strong>inativar</strong> este item em vez de excluí-lo.
                          </>
                        )}
                      </p>
                    </div>

                    {/* Force Delete Option */}
                    <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Exclusão Forçada</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ao forçar a exclusão, todos os dados vinculados (contas a pagar/receber, receitas de aluguel) 
                            serão <strong>permanentemente excluídos</strong>. Isso pode afetar seu planejamento financeiro.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="force-delete"
                          checked={forceDeleteConfirmed}
                          onCheckedChange={(checked) => setForceDeleteConfirmed(checked === true)}
                        />
                        <label 
                          htmlFor="force-delete" 
                          className="text-sm text-muted-foreground cursor-pointer select-none"
                        >
                          Estou ciente e quero forçar a exclusão
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>
                    Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {assetDependencies?.hasDependencies ? (
              <>
                <AlertDialogCancel className="sm:flex-1">Fechar</AlertDialogCancel>
                <Button 
                  onClick={handleEditAssetFromDialog}
                  variant="outline"
                  className="sm:flex-1 gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  {assetDependencies.assetType === 'vehicle' || assetDependencies.assetType === 'property' 
                    ? 'Marcar como Vendido' 
                    : 'Editar Item'}
                </Button>
                <Button 
                  onClick={confirmForceDeleteAsset}
                  disabled={!forceDeleteConfirmed}
                  variant="destructive"
                  className="sm:flex-1 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Mesmo Assim
                </Button>
              </>
            ) : (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDeleteAsset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Seguro Dialog */}
      <SeguroDialog
        open={seguroDialogOpen}
        onOpenChange={setSeguroDialogOpen}
        preSelectedAssetId={seguroAssetId}
      />
    
  );
};

export default BensInvestimentos;
