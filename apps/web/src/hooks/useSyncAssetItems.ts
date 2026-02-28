import { useCallback } from 'react';
import { Asset, IncomeItem, ExpenseItem, IncomeMethod, PaymentMethod, ExpenseType, AssetLinkedExpense } from '@/types/financial';

interface SyncResult {
  incomeItems: IncomeItem[];
  expenseItems: ExpenseItem[];
}

// Mapeia tipos de despesa vinculada para categoria
const expenseTypeToCategory: Record<AssetLinkedExpense['expenseType'], { category: string; categoryId: string; expenseType: ExpenseType }> = {
  ipva: { category: 'Veículo', categoryId: 'veiculo', expenseType: 'fixed_essential' },
  seguro_auto: { category: 'Veículo', categoryId: 'veiculo', expenseType: 'fixed_essential' },
  combustivel: { category: 'Veículo', categoryId: 'veiculo', expenseType: 'variable_essential' },
  manutencao_veiculo: { category: 'Veículo', categoryId: 'veiculo', expenseType: 'variable_essential' },
  licenciamento: { category: 'Veículo', categoryId: 'veiculo', expenseType: 'fixed_essential' },
  estacionamento: { category: 'Veículo', categoryId: 'veiculo', expenseType: 'variable_essential' },
  sem_parar: { category: 'Veículo', categoryId: 'veiculo', expenseType: 'variable_essential' },
  iptu: { category: 'Moradia', categoryId: 'moradia', expenseType: 'fixed_essential' },
  condominio: { category: 'Moradia', categoryId: 'moradia', expenseType: 'fixed_essential' },
  seguro_residencial: { category: 'Moradia', categoryId: 'moradia', expenseType: 'fixed_essential' },
  agua: { category: 'Moradia', categoryId: 'moradia', expenseType: 'variable_essential' },
  luz: { category: 'Moradia', categoryId: 'moradia', expenseType: 'variable_essential' },
  manutencao_imovel: { category: 'Moradia', categoryId: 'moradia', expenseType: 'variable_non_essential' },
};

// Nomes amigáveis para tipos de despesa
const expenseTypeLabels: Record<AssetLinkedExpense['expenseType'], string> = {
  ipva: 'IPVA',
  seguro_auto: 'Seguro Auto',
  combustivel: 'Combustível',
  manutencao_veiculo: 'Manutenção',
  licenciamento: 'Licenciamento',
  estacionamento: 'Estacionamento',
  sem_parar: 'Sem Parar / Pedágio',
  iptu: 'IPTU',
  condominio: 'Condomínio',
  seguro_residencial: 'Seguro Residencial',
  agua: 'Água',
  luz: 'Energia Elétrica',
  manutencao_imovel: 'Manutenção',
};

export function useSyncAssetItems() {
  /**
   * Sincroniza itens de receita/despesa com ativos, garantindo relação 1:1
   * - Cria itens faltantes para ativos que precisam
   * - Remove itens órfãos quando ativo é deletado
   * - Atualiza valores default quando configuração do ativo muda
   */
  const syncAssetItems = useCallback((
    assets: Asset[],
    currentIncomeItems: IncomeItem[],
    currentExpenseItems: ExpenseItem[]
  ): SyncResult => {
    const newIncomeItems: IncomeItem[] = [...currentIncomeItems];
    const newExpenseItems: ExpenseItem[] = [...currentExpenseItems];
    
    // Track processed asset-generated items
    const processedIncomeIds = new Set<string>();
    const processedExpenseIds = new Set<string>();

    assets.forEach(asset => {
      // 1. Imóveis para aluguel - criar receita de aluguel (se linkExpensesToPlanning = true)
      if (asset.type === 'property' && asset.isRentalProperty && asset.linkExpensesToPlanning) {
        const existingIncome = newIncomeItems.find(
          i => i.sourceAssetId === asset.id || i.id === asset.rentalIncomeId
        );
        
        if (existingIncome) {
          // Update existing
          const idx = newIncomeItems.findIndex(i => i.id === existingIncome.id);
          newIncomeItems[idx] = {
            ...existingIncome,
            name: `Aluguel - ${asset.name}`,
            sourceAssetId: asset.id,
            isAssetGenerated: true,
            defaultValue: asset.rentalValue || 0,
          };
          processedIncomeIds.add(existingIncome.id);
        } else if (!asset.rentalIncomeId) {
          // Create new rental income
          const newIncomeId = `rental-${asset.id}-${Date.now()}`;
          newIncomeItems.push({
            id: newIncomeId,
            name: `Aluguel - ${asset.name}`,
            enabled: true,
            method: 'net' as IncomeMethod,
            sourceAssetId: asset.id,
            isAssetGenerated: true,
            defaultValue: asset.rentalValue || 0,
          });
          processedIncomeIds.add(newIncomeId);
        }
      }

      // 2. Imóveis - criar despesas vinculadas (se linkExpensesToPlanning = true)
      if (asset.type === 'property' && asset.linkExpensesToPlanning && asset.propertyMonthlyExpenses) {
        const expenseMapping: Record<string, { category: string; categoryId: string; expenseType: ExpenseType; name: string }> = {
          iptu: { category: 'Moradia', categoryId: 'moradia', expenseType: 'fixed_essential', name: 'IPTU' },
          condominio: { category: 'Moradia', categoryId: 'moradia', expenseType: 'fixed_essential', name: 'Condomínio' },
          agua: { category: 'Moradia', categoryId: 'moradia', expenseType: 'variable_essential', name: 'Água' },
          luz: { category: 'Moradia', categoryId: 'moradia', expenseType: 'variable_essential', name: 'Energia Elétrica' },
          gas: { category: 'Moradia', categoryId: 'moradia', expenseType: 'variable_essential', name: 'Gás' },
          seguro: { category: 'Moradia', categoryId: 'moradia', expenseType: 'fixed_essential', name: 'Seguro Residencial' },
          manutencaoOrdinaria: { category: 'Moradia', categoryId: 'moradia', expenseType: 'variable_non_essential', name: 'Manutenção Ordinária' },
          manutencaoExtraordinaria: { category: 'Moradia', categoryId: 'moradia', expenseType: 'variable_non_essential', name: 'Manutenção Extraordinária' },
        };

        Object.entries(asset.propertyMonthlyExpenses).forEach(([expenseKey, value]) => {
          if (value <= 0) return; // Ignora despesas com valor zero
          
          // Verifica se o responsável é o proprietário (owner) - só cria se for responsabilidade do dono
          const responsibilityKey = expenseKey as keyof typeof asset.expenseResponsibility;
          const isOwnerResponsibility = asset.expenseResponsibility?.[responsibilityKey] === 'owner';
          
          // Se é imóvel alugado e a despesa é do inquilino, não cria no planejamento do proprietário
          if (asset.isRentalProperty && !isOwnerResponsibility) return;

          const mappingInfo = expenseMapping[expenseKey];
          if (!mappingInfo) return;

          const existingExpense = newExpenseItems.find(
            e => e.sourceAssetId === asset.id && e.name.includes(mappingInfo.name)
          );

          if (existingExpense) {
            const idx = newExpenseItems.findIndex(e => e.id === existingExpense.id);
            newExpenseItems[idx] = {
              ...existingExpense,
              name: `${mappingInfo.name} - ${asset.name}`,
              sourceAssetId: asset.id,
              isAssetGenerated: true,
              defaultValue: value,
            };
            processedExpenseIds.add(existingExpense.id);
          } else {
            const newExpenseId = `property-expense-${asset.id}-${expenseKey}-${Date.now()}`;
            newExpenseItems.push({
              id: newExpenseId,
              name: `${mappingInfo.name} - ${asset.name}`,
              categoryId: mappingInfo.categoryId,
              category: mappingInfo.category,
              expenseType: mappingInfo.expenseType,
              enabled: true,
              isRecurring: true,
              paymentMethod: 'boleto' as PaymentMethod,
              sourceAssetId: asset.id,
              isAssetGenerated: true,
              defaultValue: value,
              frequency: 'monthly',
            });
            processedExpenseIds.add(newExpenseId);
          }
        });
      }

      // 2. Empresas - criar receita de dividendos se houver lucro
      if (asset.type === 'company' && asset.companyAnnualProfit && asset.companyAnnualProfit > 0) {
        const existingDividend = newIncomeItems.find(
          i => i.sourceAssetId === asset.id && i.name.includes('Dividendos')
        );
        
        const monthlyDividend = (asset.companyAnnualProfit * (asset.companyOwnershipPercent || 100) / 100) / 12;
        
        if (existingDividend) {
          const idx = newIncomeItems.findIndex(i => i.id === existingDividend.id);
          newIncomeItems[idx] = {
            ...existingDividend,
            name: `Dividendos - ${asset.name}`,
            defaultValue: monthlyDividend,
          };
          processedIncomeIds.add(existingDividend.id);
        } else {
          const newIncomeId = `dividend-${asset.id}-${Date.now()}`;
          newIncomeItems.push({
            id: newIncomeId,
            name: `Dividendos - ${asset.name}`,
            enabled: true,
            method: 'net' as IncomeMethod,
            sourceAssetId: asset.id,
            isAssetGenerated: true,
            defaultValue: monthlyDividend,
          });
          processedIncomeIds.add(newIncomeId);
        }
      }

      // 3. Despesas vinculadas ao ativo
      if (asset.linkedExpenses && asset.linkedExpenses.length > 0) {
        asset.linkedExpenses.forEach(linkedExpense => {
          const existingExpense = newExpenseItems.find(
            e => e.id === linkedExpense.expenseId || 
                 (e.sourceAssetId === asset.id && e.name.includes(expenseTypeLabels[linkedExpense.expenseType]))
          );
          
          const categoryInfo = expenseTypeToCategory[linkedExpense.expenseType];
          
          if (existingExpense) {
            const idx = newExpenseItems.findIndex(e => e.id === existingExpense.id);
            newExpenseItems[idx] = {
              ...existingExpense,
              name: `${expenseTypeLabels[linkedExpense.expenseType]} - ${asset.name}`,
              sourceAssetId: asset.id,
              isAssetGenerated: true,
              defaultValue: linkedExpense.monthlyValue,
              frequency: linkedExpense.frequency,
              annualMonths: linkedExpense.annualMonths,
            };
            processedExpenseIds.add(existingExpense.id);
          } else {
            const newExpenseId = `asset-expense-${asset.id}-${linkedExpense.expenseType}-${Date.now()}`;
            newExpenseItems.push({
              id: newExpenseId,
              name: `${expenseTypeLabels[linkedExpense.expenseType]} - ${asset.name}`,
              categoryId: categoryInfo.categoryId,
              category: categoryInfo.category,
              expenseType: categoryInfo.expenseType,
              enabled: true,
              isRecurring: linkedExpense.frequency === 'monthly',
              paymentMethod: 'boleto' as PaymentMethod,
              sourceAssetId: asset.id,
              isAssetGenerated: true,
              defaultValue: linkedExpense.monthlyValue,
              frequency: linkedExpense.frequency,
              annualMonths: linkedExpense.annualMonths,
            });
            processedExpenseIds.add(newExpenseId);
          }
        });
      }
    });

    // Remove orphaned asset-generated items (where asset was deleted or linkExpensesToPlanning disabled for properties)
    const assetIds = new Set(assets.map(a => a.id));
    const linkedPropertyIds = new Set(
      assets
        .filter(a => a.type === 'property' && a.linkExpensesToPlanning)
        .map(a => a.id)
    );
    
    const filteredIncomeItems = newIncomeItems.filter(item => {
      if (!item.isAssetGenerated || !item.sourceAssetId) return true;
      if (!assetIds.has(item.sourceAssetId)) return false;
      
      // For property-generated items, check if linkExpensesToPlanning is still true
      const asset = assets.find(a => a.id === item.sourceAssetId);
      if (asset?.type === 'property' && !asset.linkExpensesToPlanning) {
        return false;
      }
      return true;
    });
    
    const filteredExpenseItems = newExpenseItems.filter(item => {
      if (!item.isAssetGenerated || !item.sourceAssetId) return true;
      if (!assetIds.has(item.sourceAssetId)) return false;
      
      // For property-generated items, check if linkExpensesToPlanning is still true
      const asset = assets.find(a => a.id === item.sourceAssetId);
      if (asset?.type === 'property' && !asset.linkExpensesToPlanning) {
        return false;
      }
      return true;
    });

    return {
      incomeItems: filteredIncomeItems,
      expenseItems: filteredExpenseItems,
    };
  }, []);

  /**
   * Obtém o valor default de uma despesa vinculada a um ativo para um mês específico
   */
  const getAssetExpenseDefaultValue = useCallback((
    expenseItem: ExpenseItem,
    month: string
  ): number => {
    if (!expenseItem.isAssetGenerated || !expenseItem.defaultValue) {
      return 0;
    }

    // Para despesas mensais, retorna o valor default
    if (expenseItem.frequency === 'monthly' || !expenseItem.frequency) {
      return expenseItem.defaultValue;
    }

    // Para despesas anuais, verifica se é o mês de pagamento
    const monthNum = parseInt(month.split('-')[1]);
    if (expenseItem.annualMonths?.includes(monthNum)) {
      return expenseItem.defaultValue;
    }

    return 0;
  }, []);

  /**
   * Obtém o valor default de uma receita vinculada a um ativo para um mês específico
   */
  const getAssetIncomeDefaultValue = useCallback((
    incomeItem: IncomeItem,
    _month: string // unused but kept for API consistency
  ): number => {
    if (!incomeItem.isAssetGenerated || !incomeItem.defaultValue) {
      return 0;
    }
    return incomeItem.defaultValue;
  }, []);

  return {
    syncAssetItems,
    getAssetExpenseDefaultValue,
    getAssetIncomeDefaultValue,
  };
}
