import { createContext, useContext } from 'react';
import { Asset, AssetType, InvestmentType } from '@/types/financial';

export interface BensInvestimentosContextType {
  /** Opens AddAssetDialog. Optional defaultAssetType pre-selects the asset type (e.g. 'company', 'intellectual_property', 'obligations'). */
  handleOpenAddDialog: (institutionId?: string, investmentType?: InvestmentType, defaultAssetType?: AssetType) => void;
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
