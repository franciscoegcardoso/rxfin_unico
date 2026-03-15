import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing, fontSize } from '@/constants/tokens';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const { theme } = useTheme();
  const clamped = Math.min(Math.max(pct, 0), 100);
  const isOver = pct > 100;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}>
      <View style={{
        height: '100%',
        width: `${clamped}%`,
        borderRadius: 4,
        backgroundColor: isOver ? colors.status.error : color,
      }} />
    </View>
  );
}

interface MonthlyGoalsData {
  month: string;
  goals: {
    income_goal: number | null;
    expense_goal: number | null;
    savings_goal: number | null;
    credit_card_goal: number | null;
    challenge_percent: number | null;
  } | null;
  actuals: {
    income: number;
    expense: number;
    credit_card: number;
    savings: number;
  };
  progress: {
    income_pct: number;
    expense_pct: number;
    days_remaining: number;
    days_in_month: number;
  };
}

export default function PlanejamentoScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthLabel = new Date().toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric',
  });

  const { data, isLoading, refetch } = useQuery<MonthlyGoalsData>({
    queryKey: ['monthly-goals', user?.id, currentMonth],
    queryFn: async () => {
      const { data: result, error } = await supabase.rpc('get_monthly_goals', {
        p_month: currentMonth,
      });
      if (error) throw error;
      return result as MonthlyGoalsData;
    },
    enabled: !!user?.id,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const hasGoals = data?.goals != null;
  const daysRemaining = data?.progress?.days_remaining ?? 0;
  const daysInMonth = data?.progress?.days_in_month ?? 30;
  const daysPct = daysInMonth > 0
    ? Math.round(((daysInMonth - daysRemaining) / daysInMonth) * 100)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={{ flex: 1 }}>
          <ScreenHeader title="Planejamento" />
          <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand.primary}
            />
          }
        >
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
            </View>
          ) : (
            <View style={{ padding: spacing[4], gap: spacing[4] }}>

              {/* Progresso do mês */}
              <Card variant="brand" padding="md">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{
                      fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold',
                      color: theme.textPrimary, textTransform: 'capitalize',
                    }}>
                      {monthLabel}
                    </Text>
                    <Text style={{ fontSize: fontSize.sm, color: theme.textSecondary, marginTop: 2 }}>
                      {daysRemaining > 0
                        ? `${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} restante${daysRemaining > 1 ? 's' : ''}`
                        : 'Mês encerrado'}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: fontSize['2xl'], fontFamily: 'Inter_700Bold',
                    color: colors.brand.accent,
                  }}>
                    {daysPct}%
                  </Text>
                </View>
                <View style={{ marginTop: spacing[3] }}>
                  <ProgressBar pct={daysPct} color={colors.brand.accent} />
                </View>
              </Card>

              {!hasGoals ? (
                <EmptyState
                  title="Sem metas definidas"
                  description={`Acesse o RXFin no computador para definir suas metas de ${monthLabel}.`}
                />
              ) : (
                <>
                  {/* Meta de receitas */}
                  {data!.goals!.income_goal != null && (
                    <Card variant="default" padding="md">
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                        <Text style={{
                          fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold',
                          color: theme.textPrimary,
                        }}>
                          Receitas
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{
                            fontSize: fontSize.base, fontFamily: 'Inter_700Bold',
                            color: colors.finance.income,
                          }}>
                            {formatBRL(data!.actuals.income)}
                          </Text>
                          <Text style={{ fontSize: fontSize.xs, color: theme.textMuted }}>
                            meta: {formatBRL(data!.goals!.income_goal!)}
                          </Text>
                        </View>
                      </View>
                      <ProgressBar pct={data!.progress.income_pct} color={colors.finance.income} />
                      <Text style={{
                        fontSize: fontSize.xs, color: theme.textMuted,
                        marginTop: spacing[1], textAlign: 'right',
                      }}>
                        {data!.progress.income_pct}%
                      </Text>
                    </Card>
                  )}

                  {/* Meta de despesas */}
                  {data!.goals!.expense_goal != null && (
                    <Card variant="default" padding="md">
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                        <Text style={{
                          fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold',
                          color: theme.textPrimary,
                        }}>
                          Despesas
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{
                            fontSize: fontSize.base, fontFamily: 'Inter_700Bold',
                            color: data!.progress.expense_pct > 100
                              ? colors.status.error
                              : colors.finance.expense,
                          }}>
                            {formatBRL(data!.actuals.expense)}
                          </Text>
                          <Text style={{ fontSize: fontSize.xs, color: theme.textMuted }}>
                            meta: {formatBRL(data!.goals!.expense_goal!)}
                          </Text>
                        </View>
                      </View>
                      <ProgressBar pct={data!.progress.expense_pct} color={colors.finance.expense} />
                      <Text style={{
                        fontSize: fontSize.xs,
                        color: data!.progress.expense_pct > 100
                          ? colors.status.error
                          : theme.textMuted,
                        marginTop: spacing[1], textAlign: 'right',
                      }}>
                        {data!.progress.expense_pct}%
                        {data!.progress.expense_pct > 100 ? ' — acima da meta' : ''}
                      </Text>
                    </Card>
                  )}

                  {/* Meta de economia */}
                  {data!.goals!.savings_goal != null && (
                    <Card variant="default" padding="md">
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{
                          fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold',
                          color: theme.textPrimary,
                        }}>
                          Economia
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{
                            fontSize: fontSize.base, fontFamily: 'Inter_700Bold',
                            color: colors.brand.primary,
                          }}>
                            {formatBRL(data!.actuals.savings)}
                          </Text>
                          <Text style={{ fontSize: fontSize.xs, color: theme.textMuted }}>
                            meta: {formatBRL(data!.goals!.savings_goal!)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  )}

                  {/* Meta cartão */}
                  {data!.goals!.credit_card_goal != null && (
                    <Card variant="default" padding="md">
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{
                          fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold',
                          color: theme.textPrimary,
                        }}>
                          Cartão de crédito
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{
                            fontSize: fontSize.base, fontFamily: 'Inter_700Bold',
                            color: colors.finance.expense,
                          }}>
                            {formatBRL(data!.actuals.credit_card)}
                          </Text>
                          <Text style={{ fontSize: fontSize.xs, color: theme.textMuted }}>
                            meta: {formatBRL(data!.goals!.credit_card_goal!)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  )}
                </>
              )}
            </View>
          )}

          <View style={{ height: spacing[8] }} />
        </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}
