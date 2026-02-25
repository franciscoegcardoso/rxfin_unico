import React from 'react';
import { Building2, Car, Landmark, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { AssetType, PropertyAdjustmentType } from '@/types/financial';

export const assetIcons: Record<AssetType, React.ReactNode> = {
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

export const formatCurrencyBase = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const propertyAdjustmentOptions: { value: PropertyAdjustmentType; label: string; description: string }[] = [
  { value: 'igpm', label: 'IGP-M', description: 'Índice Geral de Preços do Mercado' },
  { value: 'ipca', label: 'IPCA', description: 'Índice Nacional de Preços ao Consumidor Amplo' },
  { value: 'minimum_wage', label: '% Salário Mínimo', description: 'Percentual do salário mínimo' },
  { value: 'none', label: 'Sem reajuste', description: 'Valor fixo sem correção' },
  { value: 'custom', label: 'Curva personalizada', description: 'Definir valor inicial e final' },
];

export const monthOptions = [
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

export interface AssetDependencies {
  hasDependencies: boolean;
  vehicleRecords: number;
  linkedExpenses: number;
  linkedIncome: boolean;
  monthlyEntries: number;
  assetName: string;
  assetType: AssetType;
}

export const VALID_TABS = ['consolidado', 'patrimonio', 'investimentos', 'credito', 'seguros'] as const;
export type BensTab = typeof VALID_TABS[number];
