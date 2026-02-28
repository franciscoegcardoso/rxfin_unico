import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BudgetPackage {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  budget_goal: number | null;
  has_budget_goal: boolean;
  category_id: string;
  category_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetPackageTransaction {
  id: string;
  package_id: string;
  user_id: string;
  transaction_type: string;
  description: string;
  amount: number;
  payment_method: string | null;
  responsible_person_id: string | null;
  responsible_person_name: string | null;
  transaction_date: string;
  created_at: string;
}

export interface PackageInput {
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  budget_goal?: number | null;
  has_budget_goal: boolean;
  category_id: string;
  category_name: string;
}

export interface TransactionInput {
  package_id: string;
  transaction_type: string;
  description: string;
  amount: number;
  payment_method?: string | null;
  responsible_person_id?: string | null;
  responsible_person_name?: string | null;
  transaction_date: string;
}

export const useBudgetPackages = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<BudgetPackage[]>([]);
  const [transactions, setTransactions] = useState<BudgetPackageTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    if (!user) {
      setPackages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('budget_packages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPackages(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (packageId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('budget_package_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (packageId) {
        query = query.eq('package_id', packageId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [user]);

  const addPackage = async (input: PackageInput): Promise<BudgetPackage | null> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('budget_packages')
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description,
          start_date: input.start_date,
          end_date: input.end_date,
          budget_goal: input.has_budget_goal ? input.budget_goal : null,
          has_budget_goal: input.has_budget_goal,
          category_id: input.category_id,
          category_name: input.category_name,
          status: 'active',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setPackages(prev => [data, ...prev]);
      toast.success('Pacote criado com sucesso!');
      return data;
    } catch (err: any) {
      toast.error('Erro ao criar pacote: ' + err.message);
      return null;
    }
  };

  const updatePackage = async (id: string, updates: Partial<PackageInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('budget_packages')
        .update({
          ...updates,
          budget_goal: updates.has_budget_goal === false ? null : updates.budget_goal,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setPackages(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ));
      toast.success('Pacote atualizado!');
      return true;
    } catch (err: any) {
      toast.error('Erro ao atualizar pacote: ' + err.message);
      return false;
    }
  };

  const deletePackage = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('budget_packages')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setPackages(prev => prev.filter(p => p.id !== id));
      toast.success('Pacote removido!');
      return true;
    } catch (err: any) {
      toast.error('Erro ao remover pacote: ' + err.message);
      return false;
    }
  };

  const addTransaction = async (input: TransactionInput): Promise<BudgetPackageTransaction | null> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('budget_package_transactions')
        .insert({
          user_id: user.id,
          package_id: input.package_id,
          transaction_type: input.transaction_type,
          description: input.description,
          amount: input.amount,
          payment_method: input.payment_method,
          responsible_person_id: input.responsible_person_id,
          responsible_person_name: input.responsible_person_name,
          transaction_date: input.transaction_date,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setTransactions(prev => [data, ...prev]);
      toast.success('Lançamento adicionado!');
      return data;
    } catch (err: any) {
      toast.error('Erro ao adicionar lançamento: ' + err.message);
      return null;
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('budget_package_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Lançamento removido!');
      return true;
    } catch (err: any) {
      toast.error('Erro ao remover lançamento: ' + err.message);
      return false;
    }
  };

  const getPackageStats = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    const pkgTransactions = transactions.filter(t => t.package_id === packageId);
    
    const totalSpent = pkgTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalIncome = pkgTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const byPaymentMethod = pkgTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((acc, t) => {
        const method = t.payment_method || 'outros';
        acc[method] = (acc[method] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const byPerson = pkgTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((acc, t) => {
        const person = t.responsible_person_name || 'Não atribuído';
        acc[person] = (acc[person] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const budgetRemaining = pkg?.has_budget_goal && pkg?.budget_goal 
      ? Number(pkg.budget_goal) - totalSpent 
      : null;

    const budgetPercentage = pkg?.has_budget_goal && pkg?.budget_goal 
      ? (totalSpent / Number(pkg.budget_goal)) * 100 
      : null;

    return {
      totalSpent,
      totalIncome,
      netBalance: totalIncome - totalSpent,
      byPaymentMethod,
      byPerson,
      budgetRemaining,
      budgetPercentage,
      transactionCount: pkgTransactions.length,
    };
  };

  return {
    packages,
    transactions,
    loading,
    error,
    addPackage,
    updatePackage,
    deletePackage,
    addTransaction,
    deleteTransaction,
    fetchTransactions,
    getPackageStats,
    refetch: fetchPackages,
  };
};
