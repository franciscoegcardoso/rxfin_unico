import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator,
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

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
}
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

interface HomeDashboard {
  month: string;
  user: { first_name: string; plan_slug: string; is_demo: boolean };
  month_summary: {
    total_income: number; total_expense: number; balance: number;
    income_received: number; expense_paid: number; expense_pending: number;
    count_total: number; count_overdue: number;
  };
  credit_cards: Array<{ id: string; card_name: string; total_value: number; due_date: string; status: string; paid_amount: number }>;
  bank_balance: number;
  upcoming_bills: Array<{ id: string; description: string; amount: number; transaction_date: string; category_name: string | null }>;
}

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data, isLoading, refetch } = useQuery<HomeDashboard>({
    queryKey: ['home-dashboard', user?.id, currentMonth],
    queryFn: async () => {
      const { data: r, error } = await supabase.rpc('get_home_dashboard', { p_month: currentMonth });
      if (error) throw error;
      return r as HomeDashboard;
    },
    enabled: !!user?.id,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const s = data?.month_summary;
  const firstName = data?.user?.first_name ?? profile?.full_name?.split(' ')[0] ?? 'você';
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand.primary} />}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[2] }}>
            <View>
              <Text style={{ fontSize: fontSize.lg, fontFamily: 'Inter_700Bold', color: theme.textPrimary }}>Olá, {firstName}! 👋</Text>
              <Text style={{ fontSize: fontSize.sm, color: theme.textSecondary, textTransform: 'capitalize' }}>{monthLabel}</Text>
            </View>
            <Avatar name={profile?.full_name ?? ''} size="md" />
          </View>

          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
            </View>
          ) : (
            <View style={{ padding: spacing[4], gap: spacing[4] }}>
              {/* Receitas / Despesas */}
              <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                <Card variant="default" padding="md" style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: spacing[1] }}>RECEITAS</Text>
                  <Text style={{ fontSize: fontSize.lg, fontFamily: 'Inter_700Bold', color: colors.finance.income }}>{formatBRL(s?.total_income ?? 0)}</Text>
                </Card>
                <Card variant="default" padding="md" style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: spacing[1] }}>DESPESAS</Text>
                  <Text style={{ fontSize: fontSize.lg, fontFamily: 'Inter_700Bold', color: colors.finance.expense }}>{formatBRL(s?.total_expense ?? 0)}</Text>
                </Card>
              </View>

              {/* Saldo */}
              <Card variant="brand" padding="md">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: fontSize.sm, color: theme.textSecondary, fontFamily: 'Inter_500Medium' }}>Saldo do mês</Text>
                    {(s?.count_overdue ?? 0) > 0 && (
                      <Text style={{ fontSize: fontSize.xs, color: colors.status.warning, fontFamily: 'Inter_500Medium', marginTop: 2 }}>
                        {s!.count_overdue} vencida{s!.count_overdue > 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: fontSize.xl, fontFamily: 'Inter_700Bold', color: (s?.balance ?? 0) >= 0 ? colors.finance.income : colors.finance.expense }}>
                    {formatBRL(s?.balance ?? 0)}
                  </Text>
                </View>
              </Card>

              {/* Saldo bancário */}
              {(data?.bank_balance ?? 0) > 0 && (
                <Card variant="default" padding="md">
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: fontSize.sm, color: theme.textSecondary, fontFamily: 'Inter_500Medium' }}>Saldo em conta</Text>
                    <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold', color: theme.textPrimary }}>{formatBRL(data!.bank_balance)}</Text>
                  </View>
                </Card>
              )}

              {/* Cartões */}
              {(data?.credit_cards?.length ?? 0) > 0 && (
                <View>
                  <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold', color: theme.textPrimary, marginBottom: spacing[3] }}>Cartões de crédito</Text>
                  <Card variant="default" padding="none">
                    {data!.credit_cards.map((c, i) => (
                      <View key={c.id}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
                          <View style={{ flex: 1, marginRight: spacing[3] }}>
                            <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_500Medium', color: theme.textPrimary }} numberOfLines={1}>{c.card_name}</Text>
                            <Text style={{ fontSize: fontSize.xs, color: theme.textMuted }}>Vence {formatDate(c.due_date)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold', color: colors.finance.expense }}>{formatBRL(c.total_value)}</Text>
                            <Badge variant={c.status === 'paid' ? 'success' : c.status === 'overdue' ? 'error' : 'warning'} size="sm">
                              {c.status === 'paid' ? 'Pago' : c.status === 'overdue' ? 'Vencido' : 'Pendente'}
                            </Badge>
                          </View>
                        </View>
                        {i < data!.credit_cards.length - 1 && <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: spacing[4] }} />}
                      </View>
                    ))}
                  </Card>
                </View>
              )}

              {/* Próximas contas */}
              {(data?.upcoming_bills?.length ?? 0) > 0 && (
                <View>
                  <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold', color: theme.textPrimary, marginBottom: spacing[3] }}>Próximas contas (7 dias)</Text>
                  <Card variant="default" padding="none">
                    {data!.upcoming_bills.map((b, i) => (
                      <View key={b.id}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
                          <View style={{ flex: 1, marginRight: spacing[3] }}>
                            <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_500Medium', color: theme.textPrimary }} numberOfLines={1}>{b.description}</Text>
                            <Text style={{ fontSize: fontSize.xs, color: theme.textMuted }}>{formatDate(b.transaction_date)}{b.category_name ? ` · ${b.category_name}` : ''}</Text>
                          </View>
                          <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold', color: colors.finance.expense }}>{formatBRL(b.amount)}</Text>
                        </View>
                        {i < data!.upcoming_bills.length - 1 && <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: spacing[4] }} />}
                      </View>
                    ))}
                  </Card>
                </View>
              )}

              {!data?.month_summary && <EmptyState title="Sem dados este mês" description="Conecte seu banco ou adicione lançamentos para ver o resumo." />}
            </View>
          )}
          <View style={{ height: spacing[8] }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
