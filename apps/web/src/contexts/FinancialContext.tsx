import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { FinancialConfig, IncomeItem, ExpenseItem, FinancialGoal, PaymentMethod, IncomeMethod, Asset, MonthlyEntry, SharedPerson, UserProfile, UserFinancialInstitution, AssetMonthlyEntry, AssetLinkedExpense, Driver, ProjectionDefaults } from '@/types/financial';
import { VehicleRecord } from '@/types/vehicle';
import { financialInstitutions } from '@/data/defaultData';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { setUserKVValue, getUserKVValue } from '@/hooks/useUserKV';
import { dbIncomeToAppIncome, dbExpenseToAppExpense } from '@/hooks/useUserParameters';
import { useUserDreams } from '@/hooks/useUserDreams';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useUserMonthlyEntries } from '@/hooks/useUserMonthlyEntries';
import { useUserAssetMonthlyEntries } from '@/hooks/useUserAssetMonthlyEntries';
import { useUserSharedPersons } from '@/hooks/useUserSharedPersons';
import { useUserFinancialInstitutions } from '@/hooks/useUserFinancialInstitutions';
import { useUserDrivers } from '@/hooks/useUserDrivers';
import { useUserVehicleRecords } from '@/hooks/useUserVehicleRecords';

interface FinancialContextType {
  config: FinancialConfig;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  setAccountType: (type: 'individual' | 'shared', options?: { transferToOwner?: boolean }) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  toggleIncomeItem: (id: string) => void;
  updateIncomeMethod: (id: string, method: IncomeMethod) => void;
  updateIncomeResponsible: (id: string, personId: string | undefined) => void;
  updateIncomeItem: (id: string, updates: Partial<IncomeItem>) => void;
  removeIncomeItem: (id: string) => void;
  hasIncomeItemDependencies: (id: string) => boolean;
  toggleExpenseItem: (id: string) => void;
  updateExpensePaymentMethod: (id: string, method: PaymentMethod) => void;
  updateExpenseRecurring: (id: string, isRecurring: boolean) => void;
  updateExpenseResponsible: (id: string, personId: string | undefined) => void;
  updateExpenseItem: (id: string, updates: Partial<ExpenseItem>) => void;
  removeExpenseItem: (id: string) => void;
  hasExpenseItemDependencies: (id: string) => boolean;
  addExpenseItem: (item: Omit<ExpenseItem, 'id'>) => void;
  addExpenseItemWithAssetLink: (item: Omit<ExpenseItem, 'id'>, assetId: string, linkedExpense: Omit<AssetLinkedExpense, 'expenseId'>) => void;
  addIncomeItem: (item: Omit<IncomeItem, 'id'>) => void;
  addDream: (dream: Omit<FinancialGoal, 'id'>) => void;
  updateDream: (id: string, updates: Partial<FinancialGoal>) => void;
  removeDream: (id: string) => void;
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  linkExpenseToAsset: (assetId: string, linkedExpense: AssetLinkedExpense) => void;
  unlinkExpenseFromAsset: (assetId: string, expenseId: string) => void;
  getAssetProjectedExpense: (assetId: string, month: string, expenseType: AssetLinkedExpense['expenseType']) => number;
  addSharedPerson: (name: string, email?: string) => void;
  updateSharedPerson: (id: string, updates: Partial<SharedPerson>) => void;
  removeSharedPerson: (id: string) => void;
  updateMonthlyEntry: (entry: Omit<MonthlyEntry, 'isProjection'> & { isManualOverride?: boolean }) => void;
  updateMonthlyEntries: (entries: Array<Omit<MonthlyEntry, 'isProjection'>>) => void;
  getMonthlyEntry: (month: string, itemId: string, type: 'income' | 'expense') => number;
  isEntryManualOverride: (month: string, itemId: string, type: 'income' | 'expense') => boolean;
  addFinancialInstitution: (institution: Omit<UserFinancialInstitution, 'id'>) => void;
  updateFinancialInstitution: (id: string, updates: Partial<UserFinancialInstitution>) => void;
  removeFinancialInstitution: (id: string) => void;
  updateAssetMonthlyEntry: (entry: AssetMonthlyEntry) => void;
  getAssetMonthlyEntry: (month: string, assetId: string) => number;
  addDriver: (name: string, email?: string, isOwner?: boolean) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  removeDriver: (id: string) => void;
  vehicleRecords: VehicleRecord[];
  addVehicleRecord: (record: VehicleRecord) => void;
  updateVehicleRecord: (id: string, record: VehicleRecord) => void;
  removeVehicleRecord: (id: string) => void;
  isOnboardingComplete: boolean;
  completeOnboarding: () => void;
  updateProjectionDefaults: (updates: Partial<ProjectionDefaults>) => void;
  initializeOnboardingDefaults: (incomeItems: IncomeItem[], expenseItems: ExpenseItem[]) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);


const getDefaultConfig = (): FinancialConfig => ({
  accountType: 'individual',
  userProfile: { firstName: '', lastName: '', email: '', birthDate: '' },
  sharedWith: [],
  incomeItems: [],
  expenseItems: [],
  goals: [],
  assets: [],
  monthlyEntries: [],
  assetMonthlyEntries: [],
  financialInstitutions: [],
  drivers: [],
  projectionDefaults: undefined,
});

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prevUserId = useRef<string | null>(null);

  // Local state only for things not yet in Supabase or UI-only
  const [localConfig, setLocalConfig] = useState<Pick<FinancialConfig, 'accountType' | 'userProfile' | 'projectionDefaults' | 'incomeItems' | 'expenseItems'>>({
    accountType: 'individual',
    userProfile: { firstName: '', lastName: '', email: '', birthDate: '' },
    projectionDefaults: undefined,
    incomeItems: [],
    expenseItems: [],
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [onboardingCheckedFromDb, setOnboardingCheckedFromDb] = useState(false);

  // ===== SUPABASE HOOKS =====
  const dreamsHook = useUserDreams();
  const assetsHook = useUserAssets();
  const monthlyEntriesHook = useUserMonthlyEntries();
  const assetMonthlyEntriesHook = useUserAssetMonthlyEntries();
  const sharedPersonsHook = useUserSharedPersons();
  const financialInstitutionsHook = useUserFinancialInstitutions();
  const driversHook = useUserDrivers();
  const vehicleRecordsHook = useUserVehicleRecords();

  // ===== COMPOSITE CONFIG (merges local + Supabase data) =====
  const config: FinancialConfig = {
    accountType: localConfig.accountType,
    userProfile: localConfig.userProfile,
    projectionDefaults: localConfig.projectionDefaults,
    incomeItems: localConfig.incomeItems,
    expenseItems: localConfig.expenseItems,
    sharedWith: sharedPersonsHook.sharedPersons,
    dreams: dreamsHook.dreams,
    assets: assetsHook.assets,
    monthlyEntries: monthlyEntriesHook.monthlyEntries,
    assetMonthlyEntries: assetMonthlyEntriesHook.assetMonthlyEntries,
    financialInstitutions: financialInstitutionsHook.institutions,
    drivers: driversHook.drivers,
  };

  // USER DATA ISOLATION
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (currentUserId !== prevUserId.current) {
      console.log('[DATA ISOLATION] User changed:', prevUserId.current, '->', currentUserId);
      queryClient.clear();
      if (currentUserId) {
        // Load projectionDefaults from Supabase KV
        getUserKVValue<{ projectionDefaults?: ProjectionDefaults }>( currentUserId, 'financialConfigPrefs').then(prefs => {
          if (prefs?.projectionDefaults) {
            setLocalConfig(prev => ({
              ...prev,
              projectionDefaults: prefs.projectionDefaults,
            }));
          }
        });

        // Load onboarding step from Supabase KV
        getUserKVValue<number>(currentUserId, 'onboardingStep').then(step => {
          if (step !== null) setCurrentStep(step);
        });

        // Load account_type from profiles
        supabase
          .from('profiles')
          .select('account_type')
          .eq('id', currentUserId)
          .single()
          .then(({ data }) => {
            if (data?.account_type) {
              setLocalConfig(prev => ({
                ...prev,
                accountType: (data.account_type as 'individual' | 'shared') || 'individual',
              }));
            }
          });

        // onboarding_completed lives in onboarding_state; use RPC get_user_profile_settings
        supabase
          .rpc('get_user_profile_settings')
          .then(({ data }) => {
            const profile = (data as { profile?: { onboarding_completed?: boolean | null } | null })?.profile;
            setIsOnboardingComplete(profile?.onboarding_completed === true);
            setOnboardingCheckedFromDb(true);
          })
          .catch(() => setOnboardingCheckedFromDb(true));
      } else {
        setLocalConfig({
          accountType: 'individual',
          userProfile: { firstName: '', lastName: '', email: '', birthDate: '' },
          projectionDefaults: undefined,
          incomeItems: [],
          expenseItems: [],
        });
        setCurrentStep(0);
        setIsOnboardingComplete(false);
      }
      prevUserId.current = currentUserId;
    }
  }, [user?.id, queryClient]);

  // Load income/expense items from database (falls back to defaults if user has none)
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;
    const loadUserItems = async () => {
      try {
        const [incomeRes, expenseRes] = await Promise.all([
          supabase.from('user_income_items' as any).select('*').eq('user_id', userId).order('order_index'),
          supabase.from('user_expense_items' as any).select('*').eq('user_id', userId).order('category_id, order_index'),
        ]);
        if (cancelled) return;
        const incomeItems = incomeRes.data ? (incomeRes.data as any[]).map(dbIncomeToAppIncome) : [];
        const expenseItems = expenseRes.data ? (expenseRes.data as any[]).map(dbExpenseToAppExpense) : [];

        // If user has items, use them
        if (incomeItems.length > 0 || expenseItems.length > 0) {
          setLocalConfig(prev => ({
            ...prev,
            incomeItems: incomeItems.length > 0 ? incomeItems : prev.incomeItems,
            expenseItems: expenseItems.length > 0 ? expenseItems : prev.expenseItems,
          }));
        } else {
          // Fallback: load active default items so all users see parameters
          const [defaultIncomeRes, defaultExpenseRes] = await Promise.all([
            supabase.from('default_income_items').select('*').eq('is_active', true).order('order_index'),
            supabase.from('default_expense_items').select('*').eq('is_active', true).order('category_id, order_index'),
          ]);
          if (cancelled) return;
          const defaultIncome: IncomeItem[] = (defaultIncomeRes.data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            enabled: item.enabled_by_default,
            method: item.method as IncomeMethod,
            isStockCompensation: item.is_stock_compensation || false,
            isSystemDefault: true,
          }));
          const defaultExpense: ExpenseItem[] = (defaultExpenseRes.data || []).map((item: any) => ({
            id: item.id,
            categoryId: item.category_id,
            category: item.category_name,
            name: item.name,
            expenseType: item.expense_type,
            expenseNature: item.expense_nature,
            recurrenceType: item.recurrence_type,
            isRecurring: item.is_recurring,
            enabled: item.enabled_by_default,
            paymentMethod: item.payment_method,
            isSystemDefault: true,
          }));
          if (defaultIncome.length > 0 || defaultExpense.length > 0) {
            setLocalConfig(prev => ({
              ...prev,
              incomeItems: defaultIncome.length > 0 ? defaultIncome : prev.incomeItems,
              expenseItems: defaultExpense.length > 0 ? defaultExpense : prev.expenseItems,
            }));
          }
        }
      } catch (error) {
        console.error('[FinancialContext] Error loading user items from DB:', error);
      }
    };
    loadUserItems();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Save UI-only preferences to Supabase KV
  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) return;
    const prefsToSave = {
      projectionDefaults: localConfig.projectionDefaults,
    };
    setUserKVValue(userId, 'financialConfigPrefs', prefsToSave).catch(() => {});
  }, [localConfig.projectionDefaults, user?.id]);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) return;
    setUserKVValue(userId, 'onboardingStep', currentStep).catch(() => {});
  }, [currentStep, user?.id]);

  // ===== INCOME/EXPENSE (still local state, loaded from DB) =====
  const setAccountType = (type: 'individual' | 'shared', options?: { transferToOwner?: boolean }) => {
    setLocalConfig(prev => {
      let newConfig = { ...prev, accountType: type };
      if (type === 'individual' && options?.transferToOwner) {
        const owner = sharedPersonsHook.sharedPersons.find(p => p.isOwner);
        const ownerId = owner?.id || 'owner';
        const nonOwnerIds = new Set(sharedPersonsHook.sharedPersons.filter(p => !p.isOwner).map(p => p.id));
        newConfig.incomeItems = prev.incomeItems.map(item => {
          if (item.responsiblePersonId && nonOwnerIds.has(item.responsiblePersonId)) {
            return { ...item, responsiblePersonId: ownerId };
          }
          return item;
        });
        newConfig.expenseItems = prev.expenseItems.map(item => {
          if (item.responsiblePersonId && nonOwnerIds.has(item.responsiblePersonId)) {
            return { ...item, responsiblePersonId: ownerId };
          }
          return item;
        });
      }
      return newConfig;
    });

    // Persist account_type to Supabase
    if (user?.id) {
      supabase
        .from('profiles')
        .update({ account_type: type } as any)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('[FinancialContext] Error saving account_type:', error);
        });
    }
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setLocalConfig(prev => {
      const newProfile = { ...prev.userProfile, ...profile };
      if (profile.firstName !== undefined) {
        // Also sync the owner person in sharedPersons
        const existingOwner = sharedPersonsHook.sharedPersons.find(p => p.isOwner);
        if (profile.firstName.trim()) {
          if (existingOwner) {
            sharedPersonsHook.updatePerson.mutate({ id: existingOwner.id, updates: { name: profile.firstName.trim() } });
          } else {
            sharedPersonsHook.addPerson.mutate({ name: profile.firstName.trim(), isOwner: true });
          }
        }
      }
      return { ...prev, userProfile: newProfile };
    });
  };

  const toggleIncomeItem = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      incomeItems: prev.incomeItems.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item),
    }));
  };

  const updateIncomeMethod = (id: string, method: IncomeMethod) => {
    setLocalConfig(prev => ({
      ...prev,
      incomeItems: prev.incomeItems.map(item => item.id === id ? { ...item, method } : item),
    }));
  };

  const updateIncomeResponsible = (id: string, personId: string | undefined) => {
    setLocalConfig(prev => ({
      ...prev,
      incomeItems: prev.incomeItems.map(item => item.id === id ? { ...item, responsiblePersonId: personId } : item),
    }));
  };

  const updateIncomeItem = (id: string, updates: Partial<IncomeItem>) => {
    setLocalConfig(prev => ({
      ...prev,
      incomeItems: prev.incomeItems.map(item => item.id === id ? { ...item, ...updates } : item),
    }));
  };

  const addIncomeItem = (item: Omit<IncomeItem, 'id'>) => {
    const ownerPerson = sharedPersonsHook.sharedPersons.find(p => p.isOwner);
    const newItem: IncomeItem = {
      ...item,
      id: `custom-${Date.now()}`,
      isSystemDefault: false,
      responsiblePersonId: item.responsiblePersonId ?? ownerPerson?.id,
    };
    setLocalConfig(prev => ({ ...prev, incomeItems: [...prev.incomeItems, newItem] }));
  };

  const removeIncomeItem = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      incomeItems: prev.incomeItems.filter(item => item.id !== id),
    }));
    monthlyEntriesHook.deleteByItemId.mutate({ itemId: id, type: 'income' });
  };

  const hasIncomeItemDependencies = (id: string): boolean => {
    return monthlyEntriesHook.monthlyEntries.some(
      entry => entry.itemId === id && entry.type === 'income' && entry.value > 0
    );
  };

  const toggleExpenseItem = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      expenseItems: prev.expenseItems.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item),
    }));
  };

  const updateExpensePaymentMethod = (id: string, method: PaymentMethod) => {
    setLocalConfig(prev => ({
      ...prev,
      expenseItems: prev.expenseItems.map(item => item.id === id ? { ...item, paymentMethod: method } : item),
    }));
  };

  const updateExpenseRecurring = (id: string, isRecurring: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      expenseItems: prev.expenseItems.map(item => item.id === id ? { ...item, isRecurring } : item),
    }));
  };

  const updateExpenseResponsible = (id: string, personId: string | undefined) => {
    setLocalConfig(prev => ({
      ...prev,
      expenseItems: prev.expenseItems.map(item => item.id === id ? { ...item, responsiblePersonId: personId } : item),
    }));
  };

  const updateExpenseItem = (id: string, updates: Partial<ExpenseItem>) => {
    setLocalConfig(prev => ({
      ...prev,
      expenseItems: prev.expenseItems.map(item => item.id === id ? { ...item, ...updates } : item),
    }));
  };

  const addExpenseItem = (item: Omit<ExpenseItem, 'id'>) => {
    const ownerPerson = sharedPersonsHook.sharedPersons.find(p => p.isOwner);
    const newItem: ExpenseItem = {
      ...item,
      id: `custom-${Date.now()}`,
      isSystemDefault: false,
      responsiblePersonId: item.responsiblePersonId ?? ownerPerson?.id,
    };
    setLocalConfig(prev => ({ ...prev, expenseItems: [...prev.expenseItems, newItem] }));
  };

  const removeExpenseItem = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      expenseItems: prev.expenseItems.filter(item => item.id !== id),
    }));
    monthlyEntriesHook.deleteByItemId.mutate({ itemId: id, type: 'expense' });
  };

  const hasExpenseItemDependencies = (id: string): boolean => {
    return monthlyEntriesHook.monthlyEntries.some(
      entry => entry.itemId === id && entry.type === 'expense' && entry.value > 0
    );
  };

  const addExpenseItemWithAssetLink = (
    item: Omit<ExpenseItem, 'id'>,
    assetId: string,
    linkedExpense: Omit<AssetLinkedExpense, 'expenseId'>
  ) => {
    const newExpenseId = `asset-expense-${Date.now()}`;
    const newItem: ExpenseItem = { ...item, id: newExpenseId };
    setLocalConfig(prev => ({ ...prev, expenseItems: [...prev.expenseItems, newItem] }));
    // Update asset's linkedExpenses
    const asset = assetsHook.assets.find(a => a.id === assetId);
    if (asset) {
      const existingLinked = asset.linkedExpenses || [];
      const filtered = existingLinked.filter(le => le.expenseType !== linkedExpense.expenseType);
      assetsHook.updateAsset.mutate({
        id: assetId,
        updates: { linkedExpenses: [...filtered, { ...linkedExpense, expenseId: newExpenseId }] },
      });
    }
  };

  // ===== DREAMS (Supabase) =====
  const addDream = (dream: Omit<FinancialGoal, 'id'>) => {
    dreamsHook.addDream.mutate(dream, {
      onSuccess: () => toast.success('Sonho adicionado'),
    });
  };

  const updateDream = (id: string, updates: Partial<FinancialGoal>) => {
    dreamsHook.updateDream.mutate({ id, updates }, {
      onSuccess: () => toast.success('Sonho atualizado'),
    });
  };

  const removeDream = (id: string) => {
    dreamsHook.removeDream.mutate(id, {
      onSuccess: () => toast.success('Sonho removido'),
    });
  };

  // ===== ASSETS (Supabase) =====
  const addAsset = (asset: Omit<Asset, 'id'>) => {
    if (asset.type === 'property' && asset.isRentalProperty) {
      const rentalIncomeId = `rental-${Date.now()}`;
      assetsHook.addAsset.mutate({ ...asset, rentalIncomeId }, {
        onSuccess: () => toast.success('Bem adicionado'),
      });
      addIncomeItem({
        name: `Aluguel - ${asset.name}`,
        enabled: true,
        method: 'net' as IncomeMethod,
      });
    } else {
      assetsHook.addAsset.mutate(asset, {
        onSuccess: () => toast.success('Bem adicionado'),
      });
    }
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    assetsHook.updateAsset.mutate({ id, updates });
  };

  const removeAsset = (id: string) => {
    const asset = assetsHook.assets.find(a => a.id === id);
    if (asset?.rentalIncomeId) {
      removeIncomeItem(asset.rentalIncomeId);
    }
    const linkedExpenseIds = asset?.linkedExpenses?.map(le => le.expenseId) || [];
    linkedExpenseIds.forEach(eid => removeExpenseItem(eid));
    assetsHook.removeAsset.mutate(id, {
      onSuccess: () => toast.success('Bem removido'),
    });
  };

  const linkExpenseToAsset = (assetId: string, linkedExpense: AssetLinkedExpense) => {
    const asset = assetsHook.assets.find(a => a.id === assetId);
    if (!asset) return;
    const existingLinked = asset.linkedExpenses || [];
    const filtered = existingLinked.filter(le => le.expenseType !== linkedExpense.expenseType);
    assetsHook.updateAsset.mutate({
      id: assetId,
      updates: { linkedExpenses: [...filtered, linkedExpense] },
    });
  };

  const unlinkExpenseFromAsset = (assetId: string, expenseId: string) => {
    const asset = assetsHook.assets.find(a => a.id === assetId);
    if (!asset) return;
    assetsHook.updateAsset.mutate({
      id: assetId,
      updates: { linkedExpenses: (asset.linkedExpenses || []).filter(le => le.expenseId !== expenseId) },
    });
    removeExpenseItem(expenseId);
  };

  const getAssetProjectedExpense = (assetId: string, month: string, expenseType: AssetLinkedExpense['expenseType']): number => {
    const asset = assetsHook.assets.find(a => a.id === assetId);
    if (!asset || !asset.linkedExpenses) return 0;
    const linked = asset.linkedExpenses.find(le => le.expenseType === expenseType);
    if (!linked) return 0;
    if (linked.frequency === 'monthly') return linked.monthlyValue;
    const monthNum = parseInt(month.split('-')[1]);
    if (linked.annualMonths?.includes(monthNum)) return linked.monthlyValue;
    return 0;
  };

  // ===== SHARED PERSONS (Supabase) =====
  const addSharedPerson = (name: string, email?: string) => {
    if (sharedPersonsHook.sharedPersons.length >= 5) return;
    sharedPersonsHook.addPerson.mutate({ name, email }, {
      onSuccess: () => toast.success('Pessoa adicionada'),
    });
  };

  const updateSharedPerson = (id: string, updates: Partial<SharedPerson>) => {
    sharedPersonsHook.updatePerson.mutate({ id, updates });
  };

  const removeSharedPerson = (id: string) => {
    sharedPersonsHook.removePerson.mutate(id, {
      onSuccess: () => toast.success('Pessoa removida'),
    });
    // Clear responsible person from income/expense items
    setLocalConfig(prev => ({
      ...prev,
      incomeItems: prev.incomeItems.map(item =>
        item.responsiblePersonId === id ? { ...item, responsiblePersonId: undefined } : item
      ),
      expenseItems: prev.expenseItems.map(item =>
        item.responsiblePersonId === id ? { ...item, responsiblePersonId: undefined } : item
      ),
    }));
  };

  // ===== MONTHLY ENTRIES (Supabase) =====
  const updateMonthlyEntry = (entry: Omit<MonthlyEntry, 'isProjection'> & { isManualOverride?: boolean }) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isProjection = entry.month > currentMonth;
    monthlyEntriesHook.upsertEntry.mutate({
      month: entry.month,
      itemId: entry.itemId,
      type: entry.type,
      value: entry.value,
      isProjection,
      isManualOverride: entry.isManualOverride ?? (isProjection ? true : undefined),
    });
  };

  const updateMonthlyEntries = (entries: Array<Omit<MonthlyEntry, 'isProjection'>>) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const fullEntries: MonthlyEntry[] = entries.map(e => ({
      month: e.month,
      itemId: e.itemId,
      type: e.type,
      value: e.value,
      isProjection: e.month > currentMonth,
      isManualOverride: false,
    }));
    monthlyEntriesHook.upsertEntries.mutate(fullEntries);
  };

  const getMonthlyEntry = (month: string, itemId: string, type: 'income' | 'expense'): number => {
    return monthlyEntriesHook.getEntry(month, itemId, type);
  };

  const isEntryManualOverride = (month: string, itemId: string, type: 'income' | 'expense'): boolean => {
    return monthlyEntriesHook.isManualOverride(month, itemId, type);
  };

  // ===== FINANCIAL INSTITUTIONS (Supabase) =====
  const addFinancialInstitution = (institution: Omit<UserFinancialInstitution, 'id'>) => {
    const defaultInst = financialInstitutions.find(i => i.id === institution.institutionId);
    const institutionName = institution.customName || defaultInst?.name || 'Nova Instituição';

    financialInstitutionsHook.addInstitution.mutate(institution, {
      onSuccess: (newId) => {
        if (institution.hasInvestments) {
          const assetName = `Saldo ${institutionName}`;
          const existingAsset = assetsHook.assets.find(a => a.name === assetName && a.type === 'investment');
          if (!existingAsset) {
            assetsHook.addAsset.mutate({
              name: assetName,
              type: 'investment',
              value: 0,
              description: `Saldo total na ${institutionName}`,
              investmentType: 'aplicacao_financeira',
              investmentInstitutionId: newId,
            });
          }
        }
      },
    });
  };

  const updateFinancialInstitution = (id: string, updates: Partial<UserFinancialInstitution>) => {
    financialInstitutionsHook.updateInstitution.mutate({ id, updates });
  };

  const removeFinancialInstitution = (id: string) => {
    financialInstitutionsHook.removeInstitution.mutate(id);
    // Clear linked assets
    assetsHook.assets
      .filter(a => a.investmentInstitutionId === id)
      .forEach(a => {
        assetsHook.updateAsset.mutate({ id: a.id, updates: { investmentInstitutionId: undefined } });
      });
  };

  // ===== ASSET MONTHLY ENTRIES (Supabase) =====
  const updateAssetMonthlyEntry = (entry: AssetMonthlyEntry) => {
    assetMonthlyEntriesHook.upsertEntry.mutate(entry);
  };

  const getAssetMonthlyEntry = (month: string, assetId: string): number => {
    return assetMonthlyEntriesHook.getEntry(month, assetId);
  };

  // ===== DRIVERS (Supabase) =====
  const addDriver = (name: string, email?: string, isOwner?: boolean) => {
    if (driversHook.drivers.length >= 5) return;
    driversHook.addDriver.mutate({ name, email, isOwner }, {
      onSuccess: () => toast.success('Motorista adicionado'),
    });
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    driversHook.updateDriver.mutate({ id, updates });
  };

  const removeDriver = (id: string) => {
    driversHook.removeDriver.mutate(id, {
      onSuccess: () => toast.success('Motorista removido'),
    });
  };

  // ===== VEHICLE RECORDS (Supabase) =====
  const addVehicleRecord = (record: VehicleRecord) => {
    vehicleRecordsHook.addRecord.mutate(record, {
      onSuccess: () => toast.success('Registro adicionado'),
    });
  };

  const updateVehicleRecord = (id: string, record: VehicleRecord) => {
    vehicleRecordsHook.updateRecord.mutate({ id, record }, {
      onSuccess: () => toast.success('Registro atualizado'),
    });
  };

  const removeVehicleRecord = (id: string) => {
    vehicleRecordsHook.removeRecord.mutate(id, {
      onSuccess: () => toast.success('Registro removido'),
    });
  };

  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    // Supabase is updated by the onboarding flow itself (markOnboardingComplete)
    // No localStorage needed - Supabase is the source of truth
  };

  const updateProjectionDefaults = (updates: Partial<ProjectionDefaults>) => {
    setLocalConfig(prev => ({
      ...prev,
      projectionDefaults: { ...prev.projectionDefaults, ...updates } as ProjectionDefaults,
    }));
  };

  const initializeOnboardingDefaults = useCallback((incomeItems: IncomeItem[], expenseItems: ExpenseItem[]) => {
    setLocalConfig(prev => {
      const shouldInitIncome = prev.incomeItems.length === 0;
      const shouldInitExpense = prev.expenseItems.length === 0;
      if (!shouldInitIncome && !shouldInitExpense) return prev;
      return {
        ...prev,
        incomeItems: shouldInitIncome ? incomeItems : prev.incomeItems,
        expenseItems: shouldInitExpense ? expenseItems : prev.expenseItems,
      };
    });
  }, []);

  return (
    <FinancialContext.Provider
      value={{
        config,
        currentStep,
        setCurrentStep,
        setAccountType,
        updateUserProfile,
        toggleIncomeItem,
        updateIncomeMethod,
        updateIncomeResponsible,
        updateIncomeItem,
        removeIncomeItem,
        hasIncomeItemDependencies,
        toggleExpenseItem,
        updateExpensePaymentMethod,
        updateExpenseRecurring,
        updateExpenseResponsible,
        updateExpenseItem,
        removeExpenseItem,
        hasExpenseItemDependencies,
        addExpenseItem,
        addExpenseItemWithAssetLink,
        addIncomeItem,
        addDream,
        updateDream,
        removeDream,
        addAsset,
        updateAsset,
        removeAsset,
        linkExpenseToAsset,
        unlinkExpenseFromAsset,
        getAssetProjectedExpense,
        addSharedPerson,
        updateSharedPerson,
        removeSharedPerson,
        updateMonthlyEntry,
        updateMonthlyEntries,
        getMonthlyEntry,
        isEntryManualOverride,
        addFinancialInstitution,
        updateFinancialInstitution,
        removeFinancialInstitution,
        updateAssetMonthlyEntry,
        getAssetMonthlyEntry,
        addDriver,
        updateDriver,
        removeDriver,
        vehicleRecords: vehicleRecordsHook.vehicleRecords,
        addVehicleRecord,
        updateVehicleRecord,
        removeVehicleRecord,
        isOnboardingComplete,
        completeOnboarding,
        updateProjectionDefaults,
        initializeOnboardingDefaults,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = (): FinancialContextType => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
