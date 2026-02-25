import { createContext, useContext } from 'react';
import { Asset, InvestmentType } from '@/types/financial';

export interface BensInvestimentosContextType {
  handleOpenAddDialog: (institutionId?: string, investmentType?: InvestmentType) => void;
  handleEditAsset: (asset: Asset) => void;
  handleDeleteAsset: (assetId: string) => void;
  handleAddSeguro: (assetId: string) => void;
  hasActiveInsurance: (assetId: string) => boolean;
  formatCurrency: (value: number) => string;
}

export const BensInvestimentosContext = createContext<BensInvestimentosContextType | null>(null);

export const useBensInvestimentos = () => {
  const context = useContext(BensInvestimentosContext);
  if (!context) {
    throw new Error('useBensInvestimentos must be used within BensInvestimentosProvider');
  }
  return context;
};
