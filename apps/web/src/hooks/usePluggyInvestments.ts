import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PluggyInvestment {
  id: string;
  user_id: string;
  connection_id: string;
  pluggy_investment_id: string;
  type: string | null;
  subtype: string | null;
  name: string;
  code: string | null;
  balance: number;
  currency_code: string | null;
  fixed_annual_rate: number | null;
  due_date: string | null;
  issuer: string | null;
  rate: number | null;
  rate_type: string | null;
  index_name: string | null;
  last_month_rate: number | null;
  last_twelve_months_rate: number | null;
  quantity: number | null;
  unit_value: number | null;
  // Enriched fields
  connector_name?: string;
  user_name?: string;
}

export type InvestmentCategory = 'Renda Fixa' | 'Ações' | 'Fundos' | 'FIIs' | 'ETFs' | 'Outros';

export interface InvestmentCategoryData {
  category: InvestmentCategory;
  totalBalance: number;
  items: PluggyInvestment[];
  allocationPercent: number;
  avgLastMonthRate: number | null;
  avgLast12MonthsRate: number | null;
}

export interface InvestmentFilters {
  userId: string | null;
  institution: string | null;
  category: InvestmentCategory | null;
}

export interface FilterOption {
  value: string;
  label: string;
}

function categorizeInvestment(inv: PluggyInvestment): InvestmentCategory {
  const type = inv.type?.toUpperCase() || '';
  const subtype = inv.subtype?.toUpperCase() || '';

  if (type === 'FIXED_INCOME') return 'Renda Fixa';
  if (type === 'EQUITY') {
    if (subtype === 'REAL_ESTATE_FUND') return 'FIIs';
    return 'Ações';
  }
  if (type === 'ETF') return 'ETFs';
  if (type === 'MUTUAL_FUND') return 'Fundos';

  // Fallback by subtype
  if (['CDB', 'LCI', 'LCA', 'DEBENTURE', 'TREASURY'].some(s => subtype.includes(s))) return 'Renda Fixa';
  if (['STOCK', 'BDR'].includes(subtype)) return 'Ações';
  if (subtype === 'REAL_ESTATE_FUND') return 'FIIs';
  if (subtype === 'ETF') return 'ETFs';
  if (subtype.includes('FUND')) return 'Fundos';

  return 'Outros';
}

function computeAvgRate(items: PluggyInvestment[], field: 'last_month_rate' | 'last_twelve_months_rate'): number | null {
  const valid = items.filter(i => i[field] != null);
  if (valid.length === 0) return null;
  const totalBalance = valid.reduce((s, i) => s + i.balance, 0);
  if (totalBalance === 0) return null;
  return valid.reduce((s, i) => s + (i[field]! * i.balance), 0) / totalBalance;
}

export function usePluggyInvestments() {
  const [investments, setInvestments] = useState<PluggyInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<InvestmentFilters>({
    userId: null,
    institution: null,
    category: null,
  });

  const fetchInvestments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch investments
      const { data: invData, error: invError } = await supabase
        .from('pluggy_investments')
        .select('*')
        .order('balance', { ascending: false });

      if (invError) throw invError;

      // Fetch connections for institution names
      const { data: connData } = await supabase
        .from('pluggy_connections')
        .select('id, connector_name, user_id')
        .is('deleted_at', null);

      // Fetch profiles for user names
      const userIds = [...new Set((invData || []).map(i => i.user_id))];
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const connMap = new Map((connData || []).map(c => [c.id, c]));
      const profileMap = new Map((profileData || []).map(p => [p.id, p.full_name]));

      const items: PluggyInvestment[] = (invData || []).map(inv => {
        const conn = connMap.get(inv.connection_id);
        return {
          ...inv,
          connector_name: conn?.connector_name || undefined,
          user_name: profileMap.get(inv.user_id) || undefined,
        } as PluggyInvestment;
      });

      setInvestments(items);
    } catch (error) {
      console.error('Error fetching pluggy investments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  // Filter options derived from data
  const filterOptions = useMemo(() => {
    const users: FilterOption[] = [];
    const institutions: FilterOption[] = [];
    const categorySet = new Set<InvestmentCategory>();

    const seenUsers = new Set<string>();
    const seenInst = new Set<string>();

    investments.forEach(inv => {
      if (!seenUsers.has(inv.user_id)) {
        seenUsers.add(inv.user_id);
        users.push({ value: inv.user_id, label: inv.user_name || 'Usuário' });
      }
      const instName = inv.connector_name;
      if (instName && !seenInst.has(instName)) {
        seenInst.add(instName);
        institutions.push({ value: instName, label: instName });
      }
      categorySet.add(categorizeInvestment(inv));
    });

    const categoryOrder: InvestmentCategory[] = ['Renda Fixa', 'Ações', 'Fundos', 'FIIs', 'ETFs', 'Outros'];
    const categories: FilterOption[] = categoryOrder
      .filter(c => categorySet.has(c))
      .map(c => ({ value: c, label: c }));

    return { users, institutions, categories };
  }, [investments]);

  // Filtered investments
  const filteredInvestments = useMemo(() => {
    return investments.filter(inv => {
      if (filters.userId && inv.user_id !== filters.userId) return false;
      if (filters.institution && inv.connector_name !== filters.institution) return false;
      if (filters.category && categorizeInvestment(inv) !== filters.category) return false;
      return true;
    });
  }, [investments, filters]);

  // Categories from filtered data
  const { categories, totalBalance } = useMemo(() => {
    const grouped: Record<InvestmentCategory, PluggyInvestment[]> = {
      'Renda Fixa': [],
      'Ações': [],
      'Fundos': [],
      'FIIs': [],
      'ETFs': [],
      'Outros': [],
    };

    filteredInvestments.forEach(inv => {
      const cat = categorizeInvestment(inv);
      grouped[cat].push(inv);
    });

    const total = filteredInvestments.reduce((s, i) => s + i.balance, 0);

    const categoryOrder: InvestmentCategory[] = ['Renda Fixa', 'Ações', 'Fundos', 'FIIs', 'ETFs', 'Outros'];
    const cats: InvestmentCategoryData[] = categoryOrder
      .filter(cat => grouped[cat].length > 0)
      .map(cat => ({
        category: cat,
        totalBalance: grouped[cat].reduce((s, i) => s + i.balance, 0),
        items: grouped[cat],
        allocationPercent: total > 0 ? (grouped[cat].reduce((s, i) => s + i.balance, 0) / total) * 100 : 0,
        avgLastMonthRate: computeAvgRate(grouped[cat], 'last_month_rate'),
        avgLast12MonthsRate: computeAvgRate(grouped[cat], 'last_twelve_months_rate'),
      }));

    return { categories: cats, totalBalance: total };
  }, [filteredInvestments]);

  const hasActiveFilters = filters.userId !== null || filters.institution !== null || filters.category !== null;

  return {
    investments: filteredInvestments,
    allInvestments: investments,
    categories,
    totalBalance,
    isLoading,
    refetch: fetchInvestments,
    filters,
    setFilters,
    filterOptions,
    hasActiveFilters,
  };
}
// sync
