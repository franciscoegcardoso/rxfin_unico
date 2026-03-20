import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing, fontSize } from '@/constants/tokens';

const PAGE_SIZE = 20;
const ITEM_HEIGHT = 72;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_type: 'receita' | 'despesa' | 'credit_expense';
  transaction_date: string;
  category_name: string | null;
}

export default function LancamentosScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery({
    queryKey: ['transactions-list', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      // full-range intencional — sem pruning (lista paginada por transaction_date)
      const { data: rows, error } = await supabase
        .from('transactions')
        .select('id, description, amount, transaction_type, transaction_date, category_name')
        .eq('user_id', user!.id)
        .order('transaction_date', { ascending: false })
        .range(pageParam as number, (pageParam as number) + PAGE_SIZE - 1);

      if (error) throw error;
      return (rows || []).map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        transaction_type: t.transaction_type,
        transaction_date: t.transaction_date,
        category_name: t.category_name ?? null,
      })) as Transaction[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.flat().length : undefined,
    enabled: !!user?.id,
  });

  const allTransactions = data?.pages.flat() ?? [];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(
    ({ item, index }: { item: Transaction; index: number }) => (
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            height: ITEM_HEIGHT,
          }}
        >
          <View style={{ flex: 1, marginRight: spacing[3] }}>
            <Text
              style={{ fontSize: fontSize.base, fontFamily: 'Inter_500Medium', color: theme.textPrimary }}
              numberOfLines={1}
            >
              {item.description}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 2 }}>
              <Text style={{ fontSize: fontSize.xs, color: theme.textMuted }}>{formatDate(item.transaction_date)}</Text>
              {item.category_name && (
                <Badge variant="default" size="sm">
                  {item.category_name}
                </Badge>
              )}
            </View>
          </View>
          <Text
            style={{
              fontSize: fontSize.base,
              fontFamily: 'Inter_600SemiBold',
              color: item.transaction_type === 'receita' ? colors.finance.income : colors.finance.expense,
            }}
          >
            {item.transaction_type === 'receita' ? '+' : '-'}
            {formatCurrency(Math.abs(item.amount))}
          </Text>
        </View>
        <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: spacing[4] }} />
      </View>
    ),
    [theme]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={{ flex: 1 }}>
          <ScreenHeader title="Lançamentos" />

          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
            </View>
          ) : allTransactions.length === 0 ? (
            <View style={{ flex: 1, padding: spacing[4] }}>
              <EmptyState
                title="Nenhum lançamento"
                description="Seus lançamentos do Open Finance aparecerão aqui."
              />
            </View>
          ) : (
            <Card variant="default" padding="none" style={{ margin: spacing[4], flex: 1 }}>
              <FlatList
                data={allTransactions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT + 1,
                  offset: (ITEM_HEIGHT + 1) * index,
                  index,
                })}
                onEndReached={() => hasNextPage && fetchNextPage()}
                onEndReachedThreshold={0.3}
                {...({
                  refreshControl: (
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={colors.brand.primary}
                    />
                  ),
                } as any)}
                ListFooterComponent={
                  isFetchingNextPage ? (
                    <ActivityIndicator color={colors.brand.primary} style={{ padding: spacing[4] }} />
                  ) : null
                }
                contentContainerStyle={{ paddingBottom: spacing[8] }}
                showsVerticalScrollIndicator={false}
                windowSize={10}
                maxToRenderPerBatch={10}
              />
            </Card>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
