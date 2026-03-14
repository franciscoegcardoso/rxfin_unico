import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing, fontSize } from '@/constants/tokens';

interface MonthlySummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

interface RecentTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_name: string | null;
  date: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery<MonthlySummary>({
    queryKey: ['monthly-summary', user?.id, currentMonth],
    queryFn: async () => {
      const startDate = `${currentMonth}-01`;
      const endDate = new Date(
        new Date(startDate).getFullYear(),
        new Date(startDate).getMonth() + 1,
        0
      )
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user!.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_deleted', false);

      if (error) throw error;

      const totalIncome = (data || []).filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
      const totalExpense = (data || []).filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
      return {
        total_income: totalIncome,
        total_expense: totalExpense,
        balance: totalIncome - totalExpense,
      };
    },
    enabled: !!user?.id,
  });

  const { data: recent, isLoading: loadingRecent, refetch: refetchRecent } = useQuery<RecentTransaction[]>({
    queryKey: ['recent-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, description, amount, type, date, categories(name)')
        .eq('user_id', user!.id)
        .eq('is_deleted', false)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        category_name: t.categories?.name ?? null,
      }));
    },
    enabled: !!user?.id,
  });

  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchRecent()]);
    setRefreshing(false);
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'você';
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.primary}
          />
        }
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[4],
            paddingTop: spacing[4],
            paddingBottom: spacing[2],
          }}
        >
          <View>
            <Text style={{ fontSize: fontSize.lg, fontFamily: 'Inter_700Bold', color: theme.textPrimary }}>
              Olá, {firstName}! 👋
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: theme.textSecondary, textTransform: 'capitalize' }}>
              {monthLabel}
            </Text>
          </View>
          <Avatar name={profile?.full_name ?? ''} size="md" />
        </View>

        <View style={{ padding: spacing[4], gap: spacing[4] }}>
          {loadingSummary ? (
            <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.brand.primary} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              <Card variant="default" padding="md" style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: fontSize.xs,
                    color: theme.textMuted,
                    fontFamily: 'Inter_500Medium',
                    marginBottom: spacing[1],
                  }}
                >
                  RECEITAS
                </Text>
                <Text style={{ fontSize: fontSize.lg, fontFamily: 'Inter_700Bold', color: colors.finance.income }}>
                  {formatCurrency(summary?.total_income ?? 0)}
                </Text>
              </Card>
              <Card variant="default" padding="md" style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: fontSize.xs,
                    color: theme.textMuted,
                    fontFamily: 'Inter_500Medium',
                    marginBottom: spacing[1],
                  }}
                >
                  DESPESAS
                </Text>
                <Text style={{ fontSize: fontSize.lg, fontFamily: 'Inter_700Bold', color: colors.finance.expense }}>
                  {formatCurrency(summary?.total_expense ?? 0)}
                </Text>
              </Card>
            </View>
          )}

          {!loadingSummary && summary && (
            <Card variant="brand" padding="md">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.base, color: theme.textSecondary, fontFamily: 'Inter_500Medium' }}>
                  Saldo do mês
                </Text>
                <Text
                  style={{
                    fontSize: fontSize.xl,
                    fontFamily: 'Inter_700Bold',
                    color: summary.balance >= 0 ? colors.finance.income : colors.finance.expense,
                  }}
                >
                  {formatCurrency(summary.balance)}
                </Text>
              </View>
            </Card>
          )}

          <View>
            <Text
              style={{
                fontSize: fontSize.base,
                fontFamily: 'Inter_600SemiBold',
                color: theme.textPrimary,
                marginBottom: spacing[3],
              }}
            >
              Últimos lançamentos
            </Text>

            {loadingRecent ? (
              <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: spacing[6] }} />
            ) : !recent || recent.length === 0 ? (
              <Card variant="default" padding="none">
                <EmptyState title="Nenhum lançamento" description="Seus lançamentos aparecerão aqui." />
              </Card>
            ) : (
              <Card variant="default" padding="none">
                {recent.map((t, idx) => (
                  <View key={t.id}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: spacing[4],
                        paddingVertical: spacing[3],
                      }}
                    >
                      <View style={{ flex: 1, marginRight: spacing[3] }}>
                        <Text
                          style={{ fontSize: fontSize.base, fontFamily: 'Inter_500Medium', color: theme.textPrimary }}
                          numberOfLines={1}
                        >
                          {t.description}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 2 }}>
                          <Text style={{ fontSize: fontSize.xs, color: theme.textMuted }}>{formatDate(t.date)}</Text>
                          {t.category_name && (
                            <Badge variant="default" size="sm">
                              {t.category_name}
                            </Badge>
                          )}
                        </View>
                      </View>
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontFamily: 'Inter_600SemiBold',
                          color: t.type === 'income' ? colors.finance.income : colors.finance.expense,
                        }}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(t.amount))}
                      </Text>
                    </View>
                    {idx < recent.length - 1 && (
                      <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: spacing[4] }} />
                    )}
                  </View>
                ))}
              </Card>
            )}
          </View>
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}
