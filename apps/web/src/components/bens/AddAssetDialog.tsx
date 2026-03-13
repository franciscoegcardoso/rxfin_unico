import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerFriendly } from '@/components/ui/date-picker-friendly';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { assetTypes, investmentTypes, financialInstitutions } from '@/data/defaultData';
import { AssetType, PropertyAdjustmentType, FuelType, RentalExpenseResponsibility, ExpenseResponsible, Asset, CompanyValuationType, CompanySector, AssetLinkedExpense, InvestmentType, PropertyMonthlyExpenses, PaymentMethod, CorporatePensionConfig } from '@/types/financial';
import { statesList } from '@/data/vehicleBenchmarks';
import { Building2, Car, TrendingUp, Package, Home, CalendarIcon, TrendingDown, Fuel, ChevronLeft, ChevronRight, Landmark, Plus, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PropertyStepProgress, PropertyStepDados, PropertyStepAluguel, PropertyStepDespesas, PropertyStepAjustes, PropertyStepResumo, PropertyStep, getNextPropertyStep, getPrevPropertyStep, isLastPropertyStep, isFirstPropertyStep } from './PropertyStepWizard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFipe } from '@/hooks/useFipe';
import { VehicleFipeForm } from '@/components/bens/VehicleFipeForm';
import { CompanyForm } from '@/components/bens/CompanyForm';
import { CorporatePensionForm } from '@/components/bens/CorporatePensionForm';
import { VehicleCostReviewStep } from '@/components/bens/VehicleCostReviewStep';
import { VehicleCostSummaryDialog } from '@/components/bens/VehicleCostSummaryDialog';
import { useFinancial } from '@/contexts/FinancialContext';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useContasPagarReceber, ContaInput } from '@/hooks/useContasPagarReceber';
import { useSeguros } from '@/hooks/useSeguros';
import { AssetInsuranceSection, AssetInsuranceData, defaultInsuranceData } from '@/components/bens/AssetInsuranceSection';
import { addMonths } from 'date-fns';

const assetIcons: Record<AssetType, React.ReactNode> = {
  property: <Building2 className="h-5 w-5" />,
  vehicle: <Car className="h-5 w-5" />,
  company: <Building2 className="h-5 w-5" />,
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

const defaultExpenseResponsibility: RentalExpenseResponsibility = {
  iptu: 'tenant',
  condominio: 'tenant',
  agua: 'tenant',
  luz: 'tenant',
  gas: 'tenant',
  seguro: 'owner',
  manutencaoOrdinaria: 'tenant',
  manutencaoExtraordinaria: 'owner',
};

const defaultPropertyMonthlyExpenses: PropertyMonthlyExpenses = {
  iptu: 0,
  condominio: 0,
  agua: 0,
  luz: 0,
  gas: 0,
  seguro: 0,
  manutencaoOrdinaria: 0,
  manutencaoExtraordinaria: 0,
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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
  propertyMonthlyExpenses: PropertyMonthlyExpenses;
  isZeroKm: boolean;
  useFipeReference: boolean;
  fipePercentage: number;
  useCustomCurve: boolean;
  initialValue: number;
  finalValue: number;
  finalDate: Date | undefined;
  vehicleState: string;
  monthlyKm: number;
  fuelConsumption: number;
  fuelType: FuelType;
  fuelPrice: number;
  mainDriverId: string;
  // Campos para venda de veículo
  isSold: boolean;
  saleDate: Date | undefined;
  saleValue: number;
  saleOdometer: number;
  purchaseOdometer: number;
  // Campos para empresa
  companyValuationType: CompanyValuationType;
  companyOwnershipPercent: number;
  companyMarketValue: number;
  companySector: CompanySector;
  companyAnnualProfit: number;
  companyCashPosition: number;
  companyCalculatedValue: number;
  // Campos para investimentos
  investmentType: InvestmentType;
  investmentInstitutionId: string;
  investmentTicker: string;
  investmentQuantity: number;
  investmentAveragePrice: number;
  // Campos para previdência corporativa
  isCorporatePension: boolean;
  corporatePensionConfig: Partial<CorporatePensionConfig>;
}

const defaultCorporatePensionConfig: Partial<CorporatePensionConfig> = {
  planType: 'CD',
  taxationType: 'EFPC',
  employeeContributionPercent: 5,
  employerMatchPercent: 100,
  employerMaxMatchPercent: 6,
  vestingPeriodMonths: 60,
  isPortable: true,
  employeeBalance: 0,
  employerBalance: 0,
};

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
  propertyMonthlyExpenses: { ...defaultPropertyMonthlyExpenses },
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
  // Venda de veículo defaults
  isSold: false,
  saleDate: undefined,
  saleValue: 0,
  saleOdometer: 0,
  purchaseOdometer: 0,
  // Empresa defaults
  companyValuationType: 'simple',
  companyOwnershipPercent: 100,
  companyMarketValue: 0,
  companySector: 'services',
  companyAnnualProfit: 0,
  companyCashPosition: 0,
  companyCalculatedValue: 0,
  // Investimentos defaults
  investmentType: 'renda_fixa',
  investmentInstitutionId: '',
  investmentTicker: '',
  investmentQuantity: 0,
  investmentAveragePrice: 0,
  // Previdência corporativa defaults
  isCorporatePension: false,
  corporatePensionConfig: { ...defaultCorporatePensionConfig },
};

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAsset?: Asset | null;
  defaultType?: AssetType; // To open directly in investment mode
  /** When true, title is "Adicionar novo veículo" and Tipo field is hidden (type is vehicle) */
  vehicleOnly?: boolean;
}

export const AddAssetDialog: React.FC<AddAssetDialogProps> = ({
  open,
  onOpenChange,
  editingAsset,
  defaultType = 'property',
  vehicleOnly = false,
}) => {
  const { config, addAsset, updateAsset } = useFinancial();
  const { addMultipleContas } = useContasPagarReceber();
  const { addSeguro } = useSeguros();
  const [newAsset, setNewAsset] = useState<NewAssetForm>(initialFormState);
  const [currentStep, setCurrentStep] = useState<'details' | 'costs'>('details');
  const [propertyStep, setPropertyStep] = useState<PropertyStep>('dados');
  const [linkedExpenses, setLinkedExpenses] = useState<AssetLinkedExpense[]>([]);
  const [tickerError, setTickerError] = useState<string | null>(null);
  const [showLinkConfirmDialog, setShowLinkConfirmDialog] = useState(false);
  const [showVehicleCostSummary, setShowVehicleCostSummary] = useState(false);
  const [pendingAssetData, setPendingAssetData] = useState<any>(null);
  const [insuranceData, setInsuranceData] = useState<AssetInsuranceData>(defaultInsuranceData);
  const fipe = useFipe();
  const stockQuote = useStockQuote();

  // Check for duplicate ticker
  const checkDuplicateTicker = useCallback((ticker: string): boolean => {
    if (!ticker) return false;
    const existingAsset = config.assets.find(
      a => a.investmentTicker?.toUpperCase() === ticker.toUpperCase() && 
           a.id !== editingAsset?.id
    );
    return !!existingAsset;
  }, [config.assets, editingAsset?.id]);

  // Handle ticker change with validation
  const handleTickerChange = async (ticker: string) => {
    const upperTicker = ticker.toUpperCase();
    setNewAsset(prev => ({ ...prev, investmentTicker: upperTicker }));
    setTickerError(null);
    stockQuote.reset();

    if (upperTicker.length >= 4) {
      if (checkDuplicateTicker(upperTicker)) {
        setTickerError('Este ticker já está cadastrado');
        return;
      }

      // For variable income types, fetch quote
      const variableIncomeTypes: InvestmentType[] = ['renda_variavel', 'fii', 'etf', 'criptoativos'];
      if (variableIncomeTypes.includes(newAsset.investmentType)) {
        const quote = await stockQuote.fetchQuote(upperTicker);
        if (quote && quote.regularMarketPrice > 0) {
          // Auto-fill name if empty
          if (!newAsset.name) {
            setNewAsset(prev => ({ ...prev, name: quote.symbol }));
          }
          // Calculate value if quantity is set
          if (newAsset.investmentQuantity > 0) {
            const totalValue = quote.regularMarketPrice * newAsset.investmentQuantity;
            setNewAsset(prev => ({ 
              ...prev, 
              value: totalValue,
              investmentAveragePrice: quote.regularMarketPrice
            }));
          }
        }
      }
    }
  };

  // Update value when quantity changes and we have a quote
  const handleQuantityChange = (quantity: number) => {
    setNewAsset(prev => {
      const newValue = stockQuote.quote 
        ? stockQuote.quote.regularMarketPrice * quantity 
        : prev.value;
      return { ...prev, investmentQuantity: quantity, value: newValue };
    });
  };

  // Reset form when dialog opens/closes or when editing different asset
  useEffect(() => {
    if (open) {
      setCurrentStep('details');
      setPropertyStep('dados');
      if (editingAsset) {
        setNewAsset({
          name: editingAsset.name,
          type: editingAsset.type,
          value: editingAsset.value,
          description: editingAsset.description || '',
          isRentalProperty: editingAsset.isRentalProperty || false,
          rentalValue: editingAsset.rentalValue || 0,
          purchaseDate: editingAsset.purchaseDate ? new Date(editingAsset.purchaseDate) : undefined,
          purchaseValue: editingAsset.purchaseValue || 0,
          propertyAdjustment: editingAsset.propertyAdjustment || 'none',
          propertyCep: editingAsset.propertyCep || '',
          propertyArea: editingAsset.propertyArea || 0,
          averageRentedMonths: editingAsset.averageRentedMonths ?? 12,
          rentAdjustmentMonth: editingAsset.rentAdjustmentMonth || 1,
          rentAdjustmentReminder: editingAsset.rentAdjustmentReminder || false,
          expenseResponsibility: editingAsset.expenseResponsibility || { ...defaultExpenseResponsibility },
          propertyMonthlyExpenses: editingAsset.propertyMonthlyExpenses || { ...defaultPropertyMonthlyExpenses },
          isZeroKm: editingAsset.isZeroKm || false,
          useFipeReference: editingAsset.vehicleAdjustment === 'fipe',
          fipePercentage: editingAsset.fipePercentage || 100,
          useCustomCurve: editingAsset.useCustomCurve || false,
          initialValue: editingAsset.initialValue || 0,
          finalValue: editingAsset.finalValue || 0,
          finalDate: editingAsset.finalDate ? new Date(editingAsset.finalDate) : undefined,
          vehicleState: editingAsset.vehicleState || 'SP',
          monthlyKm: editingAsset.monthlyKm || 1000,
          fuelConsumption: editingAsset.fuelConsumption || 10,
          fuelType: editingAsset.fuelType || 'flex',
          fuelPrice: editingAsset.fuelPrice || 5.79,
          mainDriverId: editingAsset.mainDriverId || '',
          // Vehicle sale fields
          isSold: editingAsset.isSold || false,
          saleDate: editingAsset.saleDate ? new Date(editingAsset.saleDate) : undefined,
          saleValue: editingAsset.saleValue || 0,
          saleOdometer: editingAsset.saleOdometer || 0,
          purchaseOdometer: editingAsset.purchaseOdometer || 0,
          companyValuationType: editingAsset.companyValuationType || 'simple',
          companyOwnershipPercent: editingAsset.companyOwnershipPercent ?? 100,
          companyMarketValue: editingAsset.companyMarketValue || 0,
          companySector: editingAsset.companySector || 'services',
          companyAnnualProfit: editingAsset.companyAnnualProfit || 0,
          companyCashPosition: editingAsset.companyCashPosition || 0,
          companyCalculatedValue: editingAsset.companyCalculatedValue || 0,
          // Investment fields
          investmentType: editingAsset.investmentType || 'renda_fixa',
          investmentInstitutionId: editingAsset.investmentInstitutionId || '',
          investmentTicker: editingAsset.investmentTicker || '',
          investmentQuantity: editingAsset.investmentQuantity || 0,
          investmentAveragePrice: editingAsset.investmentAveragePrice || 0,
          // Corporate pension fields
          isCorporatePension: editingAsset.isCorporatePension || false,
          corporatePensionConfig: editingAsset.corporatePensionConfig || { ...defaultCorporatePensionConfig },
        });
        setLinkedExpenses(editingAsset.linkedExpenses || []);
        
        // Initialize FIPE data if editing a vehicle with saved FIPE codes
        if (editingAsset.type === 'vehicle' && editingAsset.fipeBrandCode) {
          fipe.initializeFromSaved({
            vehicleType: editingAsset.fipeVehicleType || 'carros',
            brandCode: editingAsset.fipeBrandCode,
            modelCode: editingAsset.fipeModelCode,
            yearCode: editingAsset.fipeYearCode,
          });
        }
      } else {
        setNewAsset({ ...initialFormState, type: defaultType });
        setLinkedExpenses([]);
        setInsuranceData(defaultInsuranceData);
        fipe.reset();
        stockQuote.reset();
        setTickerError(null);
      }
    }
  }, [open, editingAsset, defaultType]);

  // Auto-fill value from FIPE when price is loaded
  useEffect(() => {
    if (newAsset.type === 'vehicle' && fipe.priceValue > 0) {
      const adjustedValue = Math.round(fipe.priceValue * (newAsset.fipePercentage / 100));
      setNewAsset(prev => ({ ...prev, value: adjustedValue }));
    }
  }, [fipe.priceValue, newAsset.fipePercentage, newAsset.type]);

  // Get FIPE full name for storage (not auto-fill name anymore)
  const fipeFullName = useMemo(() => {
    if (newAsset.type === 'vehicle' && fipe.price) {
      return `${fipe.price.Marca} ${fipe.price.Modelo} ${fipe.price.AnoModelo}`;
    }
    return '';
  }, [fipe.price, newAsset.type]);

  // Handler for linkedExpenses updates
  const handleLinkedExpensesChange = useCallback((configs: AssetLinkedExpense[]) => {
    setLinkedExpenses(configs);
  }, []);

  // Criar seguro/garantia vinculado ao ativo
  const createLinkedInsurance = async (assetId: string, assetName: string) => {
    if (!insuranceData.hasInsurance) return;

    try {
      await addSeguro.mutateAsync({
        nome: insuranceData.insuranceName || `${insuranceData.isWarranty ? 'Garantia' : 'Seguro'} ${assetName}`,
        tipo: insuranceData.insuranceType,
        seguradora: insuranceData.isWarranty 
          ? insuranceData.warrantyStore || 'Fabricante' 
          : insuranceData.insuranceCompany || 'Não informado',
        premio_mensal: insuranceData.premiumMonthly,
        premio_anual: insuranceData.premiumAnnual,
        valor_cobertura: insuranceData.coverageValue,
        franquia: insuranceData.franchise,
        data_inicio: insuranceData.startDate,
        data_fim: insuranceData.endDate,
        renovacao_automatica: insuranceData.autoRenew,
        asset_id: assetId,
        is_warranty: insuranceData.isWarranty,
        warranty_extended: insuranceData.warrantyExtended,
        warranty_extended_months: insuranceData.warrantyExtendedMonths,
        warranty_store: insuranceData.warrantyStore,
      });
      
      toast.success(
        insuranceData.isWarranty 
          ? 'Garantia vinculada ao bem!'
          : 'Seguro vinculado ao bem!'
      );
    } catch (error) {
      console.error('Erro ao criar seguro:', error);
      toast.error('Erro ao vincular seguro/garantia');
    }
  };

  // Validate details step before going to costs
  const validateDetailsStep = () => {
    if (!newAsset.name.trim()) {
      toast.error('Preencha o nome do bem/investimento');
      return false;
    }
    if (newAsset.value <= 0) {
      toast.error('Preencha um valor válido');
      return false;
    }
    return true;
  };

  // Go to next step for vehicles
  const handleNextStep = () => {
    if (validateDetailsStep()) {
      setCurrentStep('costs');
    }
  };

  // Go back to details
  const handlePrevStep = () => {
    setCurrentStep('details');
  };

  const buildAssetData = () => {
    return {
      name: newAsset.name,
      type: newAsset.type,
      value: newAsset.value,
      description: newAsset.description || undefined,
      isRentalProperty: newAsset.type === 'property' ? newAsset.isRentalProperty : undefined,
      rentalValue: newAsset.type === 'property' && newAsset.isRentalProperty && newAsset.rentalValue > 0 ? newAsset.rentalValue : undefined,
      purchaseDate: newAsset.purchaseDate ? format(newAsset.purchaseDate, 'yyyy-MM-dd') : undefined,
      purchaseValue: newAsset.purchaseValue > 0 ? newAsset.purchaseValue : undefined,
      propertyAdjustment: newAsset.type === 'property' ? newAsset.propertyAdjustment : undefined,
      propertyCep: newAsset.type === 'property' && newAsset.propertyCep ? newAsset.propertyCep : undefined,
      propertyArea: newAsset.type === 'property' && newAsset.propertyArea > 0 ? newAsset.propertyArea : undefined,
      averageRentedMonths: newAsset.type === 'property' && newAsset.isRentalProperty ? newAsset.averageRentedMonths : undefined,
      rentAdjustmentMonth: newAsset.type === 'property' && newAsset.isRentalProperty ? newAsset.rentAdjustmentMonth : undefined,
      rentAdjustmentReminder: newAsset.type === 'property' && newAsset.isRentalProperty ? newAsset.rentAdjustmentReminder : undefined,
      expenseResponsibility: newAsset.type === 'property' && newAsset.isRentalProperty ? newAsset.expenseResponsibility : undefined,
      propertyMonthlyExpenses: newAsset.type === 'property' ? newAsset.propertyMonthlyExpenses : undefined,
      isZeroKm: newAsset.type === 'vehicle' ? newAsset.isZeroKm : undefined,
      vehicleAdjustment: newAsset.type === 'vehicle' ? 'fipe' as const : undefined,
      fipePercentage: newAsset.type === 'vehicle' ? newAsset.fipePercentage : undefined,
      fipeVehicleType: newAsset.type === 'vehicle' ? fipe.vehicleType : undefined,
      fipeBrandCode: newAsset.type === 'vehicle' ? fipe.selectedBrand : undefined,
      fipeModelCode: newAsset.type === 'vehicle' ? fipe.selectedModel : undefined,
      fipeYearCode: newAsset.type === 'vehicle' ? fipe.selectedYear : undefined,
      fipeFullName: newAsset.type === 'vehicle' && fipeFullName ? fipeFullName : undefined,
      vehicleState: newAsset.type === 'vehicle' ? newAsset.vehicleState : undefined,
      monthlyKm: newAsset.type === 'vehicle' ? newAsset.monthlyKm : undefined,
      fuelConsumption: newAsset.type === 'vehicle' ? newAsset.fuelConsumption : undefined,
      fuelType: newAsset.type === 'vehicle' ? newAsset.fuelType : undefined,
      fuelPrice: newAsset.type === 'vehicle' ? newAsset.fuelPrice : undefined,
      mainDriverId: newAsset.type === 'vehicle' && newAsset.mainDriverId ? newAsset.mainDriverId : undefined,
      isSold: newAsset.type === 'vehicle' ? newAsset.isSold : undefined,
      saleDate: newAsset.type === 'vehicle' && newAsset.isSold && newAsset.saleDate ? format(newAsset.saleDate, 'yyyy-MM-dd') : undefined,
      saleValue: newAsset.type === 'vehicle' && newAsset.isSold ? newAsset.saleValue : undefined,
      saleOdometer: newAsset.type === 'vehicle' && newAsset.isSold ? newAsset.saleOdometer : undefined,
      purchaseOdometer: newAsset.type === 'vehicle' ? newAsset.purchaseOdometer : undefined,
      useCustomCurve: newAsset.type === 'property' && newAsset.propertyAdjustment === 'custom',
      initialValue: newAsset.useCustomCurve ? newAsset.initialValue : undefined,
      finalValue: newAsset.useCustomCurve ? newAsset.finalValue : undefined,
      finalDate: newAsset.useCustomCurve && newAsset.finalDate ? format(newAsset.finalDate, 'yyyy-MM-dd') : undefined,
      companyValuationType: newAsset.type === 'company' ? newAsset.companyValuationType : undefined,
      companyOwnershipPercent: newAsset.type === 'company' ? newAsset.companyOwnershipPercent : undefined,
      companyMarketValue: newAsset.type === 'company' ? newAsset.companyMarketValue : undefined,
      companySector: newAsset.type === 'company' ? newAsset.companySector : undefined,
      companyAnnualProfit: newAsset.type === 'company' ? newAsset.companyAnnualProfit : undefined,
      companyCashPosition: newAsset.type === 'company' ? newAsset.companyCashPosition : undefined,
      companyCalculatedValue: newAsset.type === 'company' ? newAsset.companyCalculatedValue : undefined,
      linkedExpenses: newAsset.type === 'vehicle' ? linkedExpenses : undefined,
      investmentType: newAsset.type === 'investment' ? newAsset.investmentType : undefined,
      investmentInstitutionId: newAsset.type === 'investment' && newAsset.investmentInstitutionId ? newAsset.investmentInstitutionId : undefined,
      investmentTicker: newAsset.type === 'investment' && newAsset.investmentTicker ? newAsset.investmentTicker : undefined,
      investmentQuantity: newAsset.type === 'investment' && newAsset.investmentQuantity > 0 ? newAsset.investmentQuantity : undefined,
      investmentAveragePrice: newAsset.type === 'investment' && newAsset.investmentAveragePrice > 0 ? newAsset.investmentAveragePrice : undefined,
    };
  };

  // Generate contas a pagar/receber for property income and expenses
  const generatePropertyFinancialEntries = async (assetId: string, assetName: string) => {
    const contasToCreate: ContaInput[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // If it's a rental property with rental value, create conta a receber
    if (newAsset.isRentalProperty && newAsset.rentalValue > 0) {
      const diaVencimento = 5; // Default day 5 for rent income
      const firstDueDate = new Date(currentYear, currentMonth, diaVencimento);
      
      contasToCreate.push({
        tipo: 'receber',
        nome: `Aluguel - ${assetName}`,
        valor: newAsset.rentalValue,
        dataVencimento: format(firstDueDate, 'yyyy-MM-dd'),
        categoria: 'Receita de Aluguel',
        formaPagamento: 'pix',
        tipoCobranca: 'recorrente',
        recorrente: true,
        diaRecorrencia: diaVencimento,
        semDataFim: true,
        observacoes: `Receita de aluguel vinculada ao imóvel: ${assetName}`,
        vinculoAtivoId: assetId,
      });
    }

    // Create contas a pagar for property expenses
    const expenseLabels: Record<string, string> = {
      iptu: 'IPTU',
      condominio: 'Condomínio',
      agua: 'Água',
      luz: 'Luz',
      gas: 'Gás',
      seguro: 'Seguro Residencial',
      manutencaoOrdinaria: 'Manutenção Ordinária',
      manutencaoExtraordinaria: 'Manutenção Extraordinária',
    };

    const expensePaymentMethods: Record<string, PaymentMethod> = {
      iptu: 'boleto',
      condominio: 'boleto',
      agua: 'boleto',
      luz: 'boleto',
      gas: 'boleto',
      seguro: 'boleto',
      manutencaoOrdinaria: 'pix',
      manutencaoExtraordinaria: 'pix',
    };

    // Only create expenses that the owner is responsible for (if rental) or all expenses (if not rental)
    for (const [key, value] of Object.entries(newAsset.propertyMonthlyExpenses)) {
      if (value <= 0) continue;
      
      // For rental properties, only create expenses where owner is responsible
      if (newAsset.isRentalProperty) {
        const responsible = newAsset.expenseResponsibility[key as keyof RentalExpenseResponsibility];
        if (responsible !== 'owner') continue;
      }

      const expenseName = expenseLabels[key] || key;
      const displayName = `${expenseName} - ${assetName}`;
      const diaVencimento = 10;
      const firstDueDate = new Date(currentYear, currentMonth, diaVencimento);

      contasToCreate.push({
        tipo: 'pagar',
        nome: displayName,
        valor: value,
        dataVencimento: format(firstDueDate, 'yyyy-MM-dd'),
        categoria: 'Moradia',
        formaPagamento: expensePaymentMethods[key] || 'boleto',
        tipoCobranca: 'recorrente',
        recorrente: true,
        diaRecorrencia: diaVencimento,
        semDataFim: true,
        observacoes: `Despesa vinculada ao imóvel: ${assetName}`,
        vinculoAtivoId: assetId,
      });
    }

    if (contasToCreate.length > 0) {
      await addMultipleContas(contasToCreate);
    }

    return contasToCreate.length;
  };

  const saveAssetWithLinkOption = async (linkToPlanning: boolean) => {
    const assetData = pendingAssetData || buildAssetData();
    const finalName = newAsset.type === 'investment' && !newAsset.name.trim() 
      ? newAsset.investmentTicker 
      : newAsset.name;

    // Generate a stable ID for the asset if creating new
    const assetId = editingAsset?.id || crypto.randomUUID();

    const dataToSave = {
      ...assetData,
      id: assetId,
      name: finalName,
      linkExpensesToPlanning: linkToPlanning,
    };

    if (editingAsset) {
      updateAsset(editingAsset.id, dataToSave);
      toast.success('Imóvel atualizado com sucesso!');
    } else {
      addAsset(dataToSave as any);
      toast.success('Imóvel adicionado com sucesso!');
    }

    // Generate financial entries if linking to planning
    if (linkToPlanning) {
      const count = await generatePropertyFinancialEntries(assetId, finalName);
      if (count > 0) {
        toast.success(`${count} lançamento(s) vinculado(s) ao fluxo financeiro!`);
      }
    }

    // Criar seguro/garantia se configurado
    if (!editingAsset && insuranceData.hasInsurance) {
      await createLinkedInsurance(assetId, finalName);
    }

    setPendingAssetData(null);
    setShowLinkConfirmDialog(false);
    onOpenChange(false);
    stockQuote.reset();
  };

  // Generate contas a pagar for vehicle expenses
  const generateVehicleContasPagar = async (assetId: string, assetName: string) => {
    const contasToCreate: ContaInput[] = [];
    const currentYear = new Date().getFullYear();
    const today = new Date();

    // Expense type to category mapping
    const expenseCategories: Record<string, string> = {
      ipva: 'Veículos',
      seguro_auto: 'Veículos',
      licenciamento: 'Veículos',
      combustivel: 'Transporte',
      manutencao_veiculo: 'Veículos',
      estacionamento: 'Transporte',
      sem_parar: 'Transporte',
    };

    const expenseNames: Record<string, string> = {
      ipva: 'IPVA',
      seguro_auto: 'Seguro Auto',
      licenciamento: 'Licenciamento/DPVAT',
      combustivel: 'Combustível',
      manutencao_veiculo: 'Manutenção Veículo',
      estacionamento: 'Estacionamento',
      sem_parar: 'Sem Parar/Pedágio',
    };

    for (const expense of linkedExpenses) {
      const categoria = expenseCategories[expense.expenseType] || 'Veículos';
      const expenseName = expenseNames[expense.expenseType] || expense.expenseType;
      const displayName = `${expenseName} - ${assetName}`;

      if (expense.frequency === 'monthly') {
        // Monthly recurring expense
        const diaVencimento = 10; // Default day 10 for monthly expenses
        const firstDueDate = new Date(currentYear, today.getMonth(), diaVencimento);
        
        contasToCreate.push({
          tipo: 'pagar',
          nome: displayName,
          valor: expense.monthlyValue,
          dataVencimento: format(firstDueDate, 'yyyy-MM-dd'),
          categoria,
          formaPagamento: expense.paymentMethod,
          tipoCobranca: 'recorrente',
          recorrente: true,
          diaRecorrencia: diaVencimento,
          semDataFim: true,
          observacoes: `Custo vinculado ao veículo: ${assetName}`,
          vinculoAtivoId: assetId,
        });
      } else if (expense.frequency === 'annual' && expense.annualMonths) {
        // Annual expense - can be single (à vista) or installments
        const installmentMonths = expense.annualMonths;
        const isInstallments = installmentMonths.length > 1;
        const grupoParcelamento = isInstallments ? crypto.randomUUID() : undefined;

        installmentMonths.forEach((month, index) => {
          // Use next occurrence of month (this year if future, next year if past)
          let year = currentYear;
          if (month < today.getMonth() + 1) {
            year = currentYear + 1;
          }
          const dueDate = new Date(year, month - 1, 10); // Day 10 of the month

          contasToCreate.push({
            tipo: 'pagar',
            nome: displayName,
            valor: expense.monthlyValue,
            dataVencimento: format(dueDate, 'yyyy-MM-dd'),
            categoria,
            formaPagamento: expense.paymentMethod,
            tipoCobranca: isInstallments ? 'parcelada' : 'unica',
            recorrente: false,
            parcelaAtual: isInstallments ? index + 1 : undefined,
            totalParcelas: isInstallments ? installmentMonths.length : undefined,
            grupoParcelamento,
            observacoes: `Custo vinculado ao veículo: ${assetName}`,
            vinculoAtivoId: assetId,
          });
        });
      }
    }

    if (contasToCreate.length > 0) {
      await addMultipleContas(contasToCreate);
    }
  };

  // Handle vehicle save with summary confirmation
  const handleVehicleSaveWithSummary = () => {
    if (!validateDetailsStep()) return;
    
    // Check if there are expenses configured
    if (linkedExpenses.length > 0) {
      setPendingAssetData(buildAssetData());
      setShowVehicleCostSummary(true);
    } else {
      // No expenses, save directly
      handleDirectVehicleSave();
    }
  };

  const handleDirectVehicleSave = () => {
    const assetData = buildAssetData();
    
    if (editingAsset) {
      updateAsset(editingAsset.id, assetData);
      toast.success('Veículo atualizado com sucesso!');
    } else {
      addAsset(assetData);
      toast.success('Veículo adicionado com sucesso!');
    }

    onOpenChange(false);
  };

  const handleVehicleSaveConfirmed = async () => {
    const assetData = pendingAssetData || buildAssetData();
    
    // Generate a stable ID for the asset if creating new
    const assetId = editingAsset?.id || crypto.randomUUID();
    
    if (editingAsset) {
      updateAsset(editingAsset.id, { ...assetData, linkExpensesToPlanning: true });
      toast.success('Veículo atualizado com sucesso!');
    } else {
      // Add asset with pre-generated ID
      addAsset({ ...assetData, id: assetId, linkExpensesToPlanning: true } as any);
      toast.success('Veículo adicionado com sucesso!');
    }

    // Generate contas a pagar with asset link
    if (linkedExpenses.length > 0) {
      await generateVehicleContasPagar(assetId, newAsset.name);
      toast.success(`${linkedExpenses.length} tipos de custo vinculados ao fluxo financeiro!`);
    }

    // Criar seguro/garantia se configurado
    if (!editingAsset && insuranceData.hasInsurance) {
      await createLinkedInsurance(assetId, newAsset.name);
    }

    setPendingAssetData(null);
    setShowVehicleCostSummary(false);
    onOpenChange(false);
  };

  const handleSaveAsset = () => {
    // For investments, ticker is required (except FGTS which has fixed ticker)
    if (newAsset.type === 'investment') {
      // FGTS has special handling - ticker is always 'FGTS'
      if (newAsset.investmentType === 'fgts') {
        // Force FGTS settings
        if (!newAsset.name.trim()) {
          setNewAsset(prev => ({ ...prev, name: 'FGTS' }));
        }
      } else {
        if (!newAsset.investmentTicker.trim()) {
          toast.error('Preencha o ticker/código do investimento');
          return;
        }
        if (checkDuplicateTicker(newAsset.investmentTicker)) {
          toast.error('Este ticker já está cadastrado');
          return;
        }
        // Use ticker as name if name is empty
        if (!newAsset.name.trim()) {
          setNewAsset(prev => ({ ...prev, name: prev.investmentTicker }));
        }
      }
    } else {
      if (!newAsset.name.trim()) {
        toast.error('Preencha o nome do bem/investimento');
        return;
      }
    }
    if (newAsset.value <= 0) {
      toast.error('Preencha um valor válido');
      return;
    }

    // For vehicles at cost step, show summary
    if (newAsset.type === 'vehicle' && currentStep === 'costs') {
      handleVehicleSaveWithSummary();
      return;
    }

    // For properties, check if there are expenses to link and show confirmation
    if (newAsset.type === 'property') {
      const hasExpensesToLink = Object.values(newAsset.propertyMonthlyExpenses).some(v => v > 0) || 
                                 (newAsset.isRentalProperty && newAsset.rentalValue > 0);
      
      if (hasExpensesToLink) {
        setPendingAssetData(buildAssetData());
        setShowLinkConfirmDialog(true);
        return;
      }
    }

    const assetData = buildAssetData();

    // Use ticker as name for investments if name is empty
    const finalName = newAsset.type === 'investment' && !newAsset.name.trim() 
      ? newAsset.investmentTicker 
      : newAsset.name;

    // Gerar ID estável para novo ativo
    const assetId = editingAsset?.id || crypto.randomUUID();

    if (editingAsset) {
      updateAsset(editingAsset.id, { ...assetData, name: finalName });
      toast.success(newAsset.type === 'investment' ? 'Investimento atualizado!' : 'Bem atualizado com sucesso!');
    } else {
      addAsset({ ...assetData, id: assetId, name: finalName } as any);
      toast.success(newAsset.type === 'investment' ? 'Investimento adicionado!' : 'Bem adicionado com sucesso!');
      
      // Criar seguro/garantia se configurado
      if (insuranceData.hasInsurance) {
        createLinkedInsurance(assetId, finalName);
      }
    }

    onOpenChange(false);
    stockQuote.reset();
  };

  const showCustomCurve = newAsset.type === 'property' && newAsset.propertyAdjustment === 'custom';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-2xl mx-3 sm:mx-auto h-[90vh] max-h-[90dvh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center justify-between">
            <span>
              {newAsset.type === 'investment' 
                ? (editingAsset ? 'Editar Investimento' : 'Novo Investimento')
                : newAsset.type === 'property'
                  ? (editingAsset ? 'Editar Imóvel' : 'Novo Imóvel')
                  : newAsset.type === 'vehicle' && vehicleOnly
                    ? (editingAsset ? 'Editar veículo' : 'Adicionar novo veículo')
                    : (editingAsset ? 'Editar Bem' : 'Novo Bem')
              }
            </span>
            {newAsset.type === 'vehicle' && (
              <div className="flex items-center gap-2 text-sm font-normal">
                <span className={cn(
                  "px-2 py-1 rounded text-xs",
                  currentStep === 'details' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  1. Dados
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  "px-2 py-1 rounded text-xs",
                  currentStep === 'costs' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  2. Custos
                </span>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {newAsset.type === 'investment' 
              ? (editingAsset ? 'Altere os dados do investimento' : 'Cadastre um novo investimento na sua carteira')
              : newAsset.type === 'property'
                ? 'Preencha as informações do imóvel'
                : (currentStep === 'details' 
                    ? (editingAsset ? 'Altere os dados do veículo' : vehicleOnly ? 'Cadastre um novo veículo no seu patrimônio.' : 'Cadastre um novo item ao seu patrimônio')
                    : 'Configure os custos do veículo para vinculação ao planejamento'
                  )
            }
          </DialogDescription>
          {newAsset.type === 'property' && (
            <div className="pt-2">
              <PropertyStepProgress
                currentStep={propertyStep}
                isRentalProperty={newAsset.isRentalProperty}
                onStepClick={setPropertyStep}
              />
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
          {/* Investment-specific simplified form */}
          {newAsset.type === 'investment' ? (
            <div className="space-y-6 py-4">
              {/* Tipo de Investimento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Investimento <span className="text-destructive">*</span></Label>
                  <Select
                    value={newAsset.investmentType}
                    onValueChange={(value: InvestmentType) => {
                      // Special handling for FGTS: auto-set Caixa and ticker
                      if (value === 'fgts') {
                        // Find or create Caixa institution link
                        const caixaInstitution = config.financialInstitutions.find(
                          fi => fi.institutionId === 'caixa'
                        );
                        setNewAsset({ 
                          ...newAsset, 
                          investmentType: value,
                          investmentTicker: 'FGTS',
                          investmentInstitutionId: caixaInstitution?.id || '',
                          investmentQuantity: 0, // FGTS has no quantity
                          name: 'FGTS'
                        });
                        setTickerError(null);
                      } else {
                        setNewAsset({ ...newAsset, investmentType: value });
                        stockQuote.reset();
                        setTickerError(null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-60">
                      {investmentTypes.map(({ value, label, description }) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground">{description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Instituição Financeira</Label>
                  {newAsset.investmentType === 'fgts' ? (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted">
                      <Landmark className="h-4 w-4 text-blue-700" />
                      <span className="text-sm">Caixa Econômica Federal</span>
                      <Badge variant="outline" className="ml-auto text-xs">Obrigatório</Badge>
                    </div>
                  ) : (
                    <Select
                      value={newAsset.investmentInstitutionId}
                      onValueChange={(value) => setNewAsset({ ...newAsset, investmentInstitutionId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover max-h-60">
                        {config.financialInstitutions.length > 0 ? (
                          config.financialInstitutions.map((fi) => {
                            const inst = financialInstitutions.find(i => i.id === fi.institutionId);
                            const name = fi.customName || inst?.name || 'Instituição';
                            return (
                              <SelectItem key={fi.id} value={fi.id}>
                                <span className="flex items-center gap-2">
                                  <Landmark className="h-4 w-4" />
                                  {name}
                                </span>
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value="__none__" disabled>
                            Nenhuma instituição cadastrada
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* FGTS Info Card */}
              {newAsset.investmentType === 'fgts' && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                    <span className="font-medium text-blue-900 dark:text-blue-200">Sobre o FGTS</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    O FGTS (Fundo de Garantia do Tempo de Serviço) é um depósito mensal feito pelo empregador 
                    correspondente a 8% do salário bruto. O saldo rende TR + 3% ao ano.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Após cadastrar, você poderá registrar os depósitos e rendimentos mensais 
                    através do menu "Gerenciar FGTS" na aba de Investimentos.
                  </p>
                </div>
              )}

              {/* Seguro com Capitalização Info Card */}
              {newAsset.investmentType === 'seguro' && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-700" />
                    <span className="font-medium text-amber-900">Seguro com Capitalização</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Este cadastro é para seguros que <strong>acumulam valor de resgate</strong>, como VGBL. 
                    O valor informado representa o saldo atual do seu investimento.
                  </p>
                  <p className="text-xs text-amber-600">
                    Para seguros de proteção (auto, vida, residencial, saúde), utilize a{' '}
                    <a 
                      href="/seguros" 
                      className="underline font-medium hover:text-amber-800"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenChange(false);
                        window.location.href = '/seguros';
                      }}
                    >
                      página de Seguros
                    </a>.
                  </p>
                </div>
              )}

              {/* Ticker com busca de cotação - Hidden for FGTS */}
              {newAsset.investmentType !== 'fgts' && (
                <div className="space-y-2">
                  <Label htmlFor="investmentTicker">
                    Ticker / Código <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        id="investmentTicker"
                        placeholder="Ex: PETR4, ITUB4, BOVA11..."
                        value={newAsset.investmentTicker}
                        onChange={(e) => handleTickerChange(e.target.value)}
                        maxLength={10}
                        className={cn(tickerError && "border-destructive")}
                      />
                      {stockQuote.isLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {stockQuote.quote && !stockQuote.isLoading && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-income" />
                      )}
                    </div>
                    {['renda_variavel', 'fii', 'etf', 'criptoativos'].includes(newAsset.investmentType) && 
                     newAsset.investmentTicker.length >= 4 && !stockQuote.quote && !stockQuote.isLoading && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleTickerChange(newAsset.investmentTicker)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {tickerError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {tickerError}
                    </p>
                  )}
                  {stockQuote.error && !tickerError && (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {stockQuote.error}
                    </p>
                  )}
                </div>
              )}

              {/* Cotação atual (quando disponível) */}
              {stockQuote.quote && (
                <div className="p-4 rounded-lg bg-income/10 border border-income/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{stockQuote.quote.shortName}</p>
                      <p className="text-xs text-muted-foreground">{stockQuote.quote.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-income">
                        {formatCurrency(stockQuote.quote.regularMarketPrice)}
                      </p>
                      <Badge 
                        variant={stockQuote.quote.regularMarketChangePercent >= 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {stockQuote.quote.regularMarketChangePercent >= 0 ? '+' : ''}
                        {stockQuote.quote.regularMarketChangePercent.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantidade e Valor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quantity - Hidden for FGTS */}
                {newAsset.investmentType !== 'fgts' && (
                  <div className="space-y-2">
                    <Label htmlFor="investmentQuantity">
                      Quantidade {stockQuote.quote ? '(cotas/ações)' : ''}
                    </Label>
                    <Input
                      id="investmentQuantity"
                      type="number"
                      placeholder="0"
                      value={newAsset.investmentQuantity || ''}
                      onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
                    />
                    {stockQuote.quote && newAsset.investmentQuantity > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Valor calculado: {formatCurrency(stockQuote.quote.regularMarketPrice * newAsset.investmentQuantity)}
                      </p>
                    )}
                  </div>
                )}

                <div className={cn("space-y-2", newAsset.investmentType === 'fgts' && "md:col-span-2")}>
                  <Label htmlFor="value">
                    {newAsset.investmentType === 'fgts' ? 'Saldo Atual' : 'Valor Total Investido'} <span className="text-destructive">*</span>
                    {stockQuote.quote && (
                      <span className="text-xs text-income ml-2">(calculado automaticamente)</span>
                    )}
                  </Label>
                  <CurrencyInput
                    id="value"
                    value={newAsset.value}
                    onChange={(value) => setNewAsset({ ...newAsset, value })}
                    placeholder="0"
                    readOnly={!!stockQuote.quote && newAsset.investmentQuantity > 0}
                    className={cn(stockQuote.quote && newAsset.investmentQuantity > 0 && "bg-muted")}
                  />
                  {newAsset.investmentType === 'fgts' && (
                    <p className="text-xs text-muted-foreground">
                      Informe seu saldo atual de FGTS (consulte o extrato no app FGTS)
                    </p>
                  )}
                </div>
              </div>

              {/* Nome (opcional para investimentos com ticker) - Simpler for FGTS */}
              {newAsset.investmentType !== 'fgts' && (
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome / Identificação <span className="text-xs text-muted-foreground">(opcional - usa o ticker se vazio)</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder={newAsset.investmentTicker || "Ex: Minha ação preferida"}
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value.slice(0, 20) })}
                    maxLength={20}
                  />
                </div>
              )}

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Informações adicionais..."
                  value={newAsset.description}
                  onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                />
              </div>
            </div>
          ) : newAsset.type === 'property' ? (
          <div className="py-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={propertyStep}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
              >
                {propertyStep === 'dados' && (
                  <PropertyStepDados
                    formData={newAsset}
                    onFormChange={(data) => setNewAsset(prev => ({ ...prev, ...data }))}
                  />
                )}
                {propertyStep === 'aluguel' && (
                  <PropertyStepAluguel
                    formData={newAsset}
                    onFormChange={(data) => setNewAsset(prev => ({ ...prev, ...data }))}
                  />
                )}
                {propertyStep === 'despesas' && (
                  <PropertyStepDespesas
                    formData={newAsset}
                    onFormChange={(data) => setNewAsset(prev => ({ ...prev, ...data }))}
                  />
                )}
                {propertyStep === 'ajustes' && (
                  <PropertyStepAjustes
                    formData={newAsset}
                    onFormChange={(data) => setNewAsset(prev => ({ ...prev, ...data }))}
                  />
                )}
                {propertyStep === 'resumo' && (
                  <PropertyStepResumo formData={newAsset} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          ) : currentStep === 'details' ? (
          <div className="space-y-6 py-4">
            {/* Dados básicos para outros tipos de bens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome / Identificação <span className="text-xs text-muted-foreground">(máx. 20 caracteres)</span></Label>
                <Input
                  id="name"
                  placeholder="Ex: Apto Centro..."
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value.slice(0, 20) })}
                  maxLength={20}
                />
              </div>

              {!vehicleOnly && (
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={newAsset.type}
                    onValueChange={(value: AssetType) => setNewAsset({
                      ...newAsset,
                      type: value,
                      isRentalProperty: false,
                      propertyAdjustment: 'none',
                      useFipeReference: true,
                      isZeroKm: false,
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {assetTypes.filter(t => t.value !== 'investment').map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            {assetIcons[value]}
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Valor Atual */}
              {newAsset.type !== 'vehicle' && (
                <div className="space-y-2">
                  <Label htmlFor="value">Valor Atual</Label>
                  <CurrencyInput
                    id="value"
                    value={newAsset.value}
                    onChange={(value) => setNewAsset({ ...newAsset, value })}
                    placeholder="0"
                  />
                </div>
              )}

              {newAsset.type === 'vehicle' && (
                <div className="space-y-2">
                  <Label htmlFor="value" className="flex items-center gap-2">
                    Valor Atual
                    <span className="text-xs text-primary font-normal">(via FIPE)</span>
                  </Label>
                  <CurrencyInput
                    id="value"
                    value={newAsset.value}
                    onChange={() => {}}
                    placeholder="Selecione marca, modelo e ano"
                    readOnly
                    className="bg-muted"
                  />
                  {newAsset.value > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Valor calculado: {newAsset.fipePercentage}% da tabela FIPE
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Informações adicionais..."
                  value={newAsset.description}
                  onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                />
              </div>
            </div>

            {/* Dados da compra */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Dados da Compra
              </h3>
              <div className={`grid grid-cols-1 gap-4 ${newAsset.type === 'vehicle' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label>Data da Compra</Label>
                  <DatePickerFriendly
                    value={newAsset.purchaseDate}
                    onChange={(date) => setNewAsset({ ...newAsset, purchaseDate: date })}
                    placeholder="DD/MM/AAAA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseValue">Valor da Compra</Label>
                  <CurrencyInput
                    id="purchaseValue"
                    value={newAsset.purchaseValue}
                    onChange={(value) => setNewAsset({ ...newAsset, purchaseValue: value })}
                    placeholder="0"
                  />
                </div>

                {newAsset.type === 'vehicle' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseOdometer">Odômetro na Compra (km)</Label>
                      <Input
                        id="purchaseOdometer"
                        type="text"
                        inputMode="numeric"
                        value={newAsset.purchaseOdometer ? newAsset.purchaseOdometer.toLocaleString('pt-BR') : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\./g, '');
                          setNewAsset({ ...newAsset, purchaseOdometer: parseInt(val) || 0 });
                        }}
                        placeholder="Ex: 0"
                        disabled={newAsset.isZeroKm}
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <Label className="text-muted-foreground font-normal">Veículo Zero KM?</Label>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 border border-border/60">
                        <span className="text-sm text-muted-foreground shrink-0">Marque se comprou novo</span>
                        <Switch
                          checked={newAsset.isZeroKm}
                          onCheckedChange={(checked) => setNewAsset({
                            ...newAsset,
                            isZeroKm: checked,
                            purchaseOdometer: checked ? 0 : newAsset.purchaseOdometer,
                          })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Seção de Seguro/Garantia - mostrar para tipos de bens que fazem sentido */}
            {['property', 'vehicle', 'valuable_objects', 'other'].includes(newAsset.type) && (
              <AssetInsuranceSection
                assetType={newAsset.type as 'property' | 'vehicle' | 'valuable_objects' | 'other'}
                assetName={newAsset.name}
                assetValue={newAsset.value}
                purchaseDate={newAsset.purchaseDate}
                data={insuranceData}
                onChange={setInsuranceData}
                compact
              />
            )}

            {/* Opções para Veículos */}
            {newAsset.type === 'vehicle' && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  Configurações do Veículo
                </h3>

                <VehicleFipeForm
                  fipe={fipe}
                  fipePercentage={newAsset.fipePercentage}
                  onFipePercentageChange={(value) => setNewAsset({ ...newAsset, fipePercentage: value })}
                  formatCurrency={formatCurrency}
                />

                <div className="space-y-4 p-4 rounded-lg bg-expense/5 border border-expense/20">
                  <h4 className="text-sm font-medium text-expense flex items-center gap-2">
                    <Fuel className="h-4 w-4" />
                    Parâmetros para Cálculo de Custos
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estado (UF) do Licenciamento</Label>
                      <Select
                        value={newAsset.vehicleState}
                        onValueChange={(value) => setNewAsset({ ...newAsset, vehicleState: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover max-h-60">
                          {statesList.map(({ uf, name, rate }) => (
                            <SelectItem key={uf} value={uf}>
                              {name} ({uf}) - IPVA {rate}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Combustível</Label>
                      <Select
                        value={newAsset.fuelType}
                        onValueChange={(value: FuelType) => setNewAsset({ ...newAsset, fuelType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="flex">Flex (Gasolina/Etanol)</SelectItem>
                          <SelectItem value="gasoline">Gasolina</SelectItem>
                          <SelectItem value="ethanol">Etanol</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthlyKm">Média de km/mês</Label>
                      <Input
                        id="monthlyKm"
                        type="number"
                        value={newAsset.monthlyKm}
                        onChange={(e) => setNewAsset({ ...newAsset, monthlyKm: parseFloat(e.target.value) || 0 })}
                        placeholder="1000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fuelConsumption">Consumo (km/l)</Label>
                      <Input
                        id="fuelConsumption"
                        type="number"
                        step="0.1"
                        value={newAsset.fuelConsumption}
                        onChange={(e) => setNewAsset({ ...newAsset, fuelConsumption: parseFloat(e.target.value) || 0 })}
                        placeholder="10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fuelPrice">Preço médio do combustível (R$/l)</Label>
                      <Input
                        id="fuelPrice"
                        type="number"
                        step="0.01"
                        value={newAsset.fuelPrice}
                        onChange={(e) => setNewAsset({ ...newAsset, fuelPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="5.79"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Motorista Principal</Label>
                      <Select
                        value={newAsset.mainDriverId}
                        onValueChange={(value) => setNewAsset({ ...newAsset, mainDriverId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o motorista principal" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {config.drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name} {driver.isOwner && '(Proprietário)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Seção de veículo vendido */}
                <div className="border rounded-lg p-4 space-y-4 border-warning/30 bg-warning/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="h-5 w-5 text-warning" />
                      <div>
                        <p className="font-medium">Este veículo foi vendido?</p>
                        <p className="text-sm text-muted-foreground">
                          Marque se você já vendeu este veículo
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={newAsset.isSold}
                      onCheckedChange={(checked) => setNewAsset({ ...newAsset, isSold: checked })}
                    />
                  </div>

                  {newAsset.isSold && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label>Data da Venda</Label>
                        <DatePickerFriendly
                          value={newAsset.saleDate}
                          onChange={(date) => setNewAsset({ ...newAsset, saleDate: date })}
                          placeholder="DD/MM/AAAA"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="saleValue">Valor da Venda</Label>
                        <CurrencyInput
                          id="saleValue"
                          value={newAsset.saleValue}
                          onChange={(value) => setNewAsset({ ...newAsset, saleValue: value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="saleOdometer">Odômetro na Venda (km)</Label>
                        <Input
                          id="saleOdometer"
                          type="text"
                          inputMode="numeric"
                          value={newAsset.saleOdometer ? newAsset.saleOdometer.toLocaleString('pt-BR') : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\./g, '');
                            setNewAsset({ ...newAsset, saleOdometer: parseInt(val) || 0 });
                          }}
                          placeholder="Ex: 45.000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Opções para Empresas */}
            {newAsset.type === 'company' && (
              <CompanyForm
                data={{
                  companyValuationType: newAsset.companyValuationType,
                  companyOwnershipPercent: newAsset.companyOwnershipPercent,
                  companyMarketValue: newAsset.companyMarketValue,
                  companySector: newAsset.companySector,
                  companyAnnualProfit: newAsset.companyAnnualProfit,
                  companyCashPosition: newAsset.companyCashPosition,
                }}
                onChange={(data) => setNewAsset(prev => ({ ...prev, ...data }))}
                onValueChange={(value, calculatedValue) => setNewAsset(prev => ({
                  ...prev,
                  value,
                  companyCalculatedValue: calculatedValue || 0,
                }))}
              />
            )}

            {/* Curva Personalizada - moved from investment section */}
            {showCustomCurve && (
              <div className="border rounded-lg p-4 space-y-4 border-primary/30 bg-primary/5">
                <h3 className="font-medium flex items-center gap-2">
                  {newAsset.finalValue >= newAsset.initialValue ? (
                    <TrendingUp className="h-4 w-4 text-income" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-expense" />
                  )}
                  Curva de {newAsset.finalValue >= newAsset.initialValue ? 'Valorização' : 'Depreciação'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Defina o valor inicial e final para criar uma curva linear ao longo do tempo
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialValue">Valor Inicial</Label>
                    <CurrencyInput
                      id="initialValue"
                      value={newAsset.initialValue}
                      onChange={(value) => setNewAsset({ ...newAsset, initialValue: value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="finalValue">Valor Final</Label>
                    <CurrencyInput
                      id="finalValue"
                      value={newAsset.finalValue}
                      onChange={(value) => setNewAsset({ ...newAsset, finalValue: value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newAsset.finalDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newAsset.finalDate ? (
                            format(newAsset.finalDate, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover" align="start">
                        <Calendar
                          mode="single"
                          selected={newAsset.finalDate}
                          onSelect={(date) => setNewAsset({ ...newAsset, finalDate: date })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {newAsset.initialValue > 0 && newAsset.finalValue > 0 && (
                  <div className="p-3 rounded-lg bg-accent/50">
                    <p className="text-sm">
                      <span className="font-medium">Variação prevista: </span>
                      <span className={newAsset.finalValue >= newAsset.initialValue ? "text-income" : "text-expense"}>
                        {formatCurrency(newAsset.finalValue - newAsset.initialValue)}
                        {' '}
                        ({((newAsset.finalValue - newAsset.initialValue) / newAsset.initialValue * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          ) : (
            <div className="py-4">
              <VehicleCostReviewStep
                vehicleValue={newAsset.value}
                vehicleState={newAsset.vehicleState}
                monthlyKm={newAsset.monthlyKm}
                fuelConsumption={newAsset.fuelConsumption}
                fuelType={newAsset.fuelType}
                fuelPrice={newAsset.fuelPrice}
                onConfigChange={handleLinkedExpensesChange}
                existingConfigs={editingAsset?.linkedExpenses}
              />
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 pt-4 border-t shrink-0 flex-col sm:flex-row gap-2">
          {/* Property wizard back button */}
          {newAsset.type === 'property' && !isFirstPropertyStep(propertyStep) && (
            <Button variant="outline" onClick={() => {
              const prev = getPrevPropertyStep(propertyStep, newAsset.isRentalProperty);
              if (prev) setPropertyStep(prev);
            }} className="mr-auto w-full sm:w-auto">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          
          {/* Vehicle costs back button */}
          {currentStep === 'costs' && newAsset.type === 'vehicle' && (
            <Button variant="outline" onClick={handlePrevStep} className="mr-auto w-full sm:w-auto">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-initial">
              Cancelar
            </Button>
            
            {/* Property wizard navigation */}
            {newAsset.type === 'property' ? (
              isLastPropertyStep(propertyStep) ? (
                <Button onClick={handleSaveAsset} className="flex-1 sm:flex-initial">
                  {editingAsset ? 'Salvar' : 'Adicionar'}
                </Button>
              ) : (
                <Button onClick={() => {
                  // Validate current step before advancing
                  if (propertyStep === 'dados' && !newAsset.name.trim()) {
                    toast.error('Preencha o nome do imóvel');
                    return;
                  }
                  const next = getNextPropertyStep(propertyStep, newAsset.isRentalProperty);
                  if (next) setPropertyStep(next);
                }} className="flex-1 sm:flex-initial">
                  Avançar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )
            ) : newAsset.type === 'vehicle' && currentStep === 'details' && !newAsset.isSold ? (
              <Button onClick={handleNextStep} className="flex-1 sm:flex-initial">
                Avançar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : newAsset.type === 'vehicle' && currentStep === 'details' && newAsset.isSold ? (
              <>
                <Button variant="outline" onClick={handleNextStep} className="flex-1 sm:flex-initial">
                  Custos
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button onClick={handleSaveAsset} className="flex-1 sm:flex-initial">
                  {editingAsset ? 'Salvar' : 'Adicionar'}
                </Button>
              </>
            ) : (
              <Button onClick={handleSaveAsset} className="flex-1 sm:flex-initial">
                {editingAsset ? 'Salvar' : 'Adicionar'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Alert Dialog for linking expenses to planning */}
      <AlertDialog open={showLinkConfirmDialog} onOpenChange={setShowLinkConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vincular ao planejamento mensal?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja vincular as receitas e despesas deste imóvel ao seu planejamento mensal? 
              Isso criará automaticamente os lançamentos correspondentes na página de planejamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => saveAssetWithLinkOption(false)}>
              Não vincular
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => saveAssetWithLinkOption(true)}>
              Sim, vincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vehicle Cost Summary Dialog */}
      <VehicleCostSummaryDialog
        open={showVehicleCostSummary}
        onOpenChange={setShowVehicleCostSummary}
        vehicleName={newAsset.name}
        linkedExpenses={linkedExpenses}
        onConfirm={handleVehicleSaveConfirmed}
        onCancel={() => setShowVehicleCostSummary(false)}
      />
    </Dialog>
  );
};
