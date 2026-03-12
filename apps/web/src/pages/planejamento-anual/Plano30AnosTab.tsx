import React, { useMemo } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useProjectionLineParams, type ProjectionIndex } from '@/hooks/useProjectionLineParams';
import { useAnnualClosings } from '@/hooks/useAnnualClosings';
import { usePatrimonyProjection } from '@/hooks/usePatrimonyProjection';
import { Patrimony30YearsTable } from '@/components/planejamento/Patrimony30YearsTable';
import { ProjectionParamsPanel } from '@/components/planejamento/ProjectionParamsPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';
import { calculateAverageIndex } from '@/data/economicIndices';
import { useVehicleDepreciation } from '@/hooks/useVehicleDepreciation';

const AVERAGE_YEARS = 5;

const INDEX_AVERAGES: Record<ProjectionIndex, number> = {
  ipca:     calculateAverageIndex('ipca',     AVERAGE_YEARS),
  igpm:     calculateAverageIndex('igpm',     AVERAGE_YEARS),
  cdi:      calculateAverageIndex('cdi',      AVERAGE_YEARS),
  ibovespa: calculateAverageIndex('ibovespa', AVERAGE_YEARS),
  custom:   0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const PROJECTION_HORIZON = 30;

const generateYears = (from: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => from + i);

const formatCurrencyBase = (value: number): string => {
  if (value === 0) return '–';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// ─── Componente ───────────────────────────────────────────────────────────────

export const Plano30AnosTab: React.FC = () => {
  const { config, getMonthlyEntry } = useFinancial();
  const { isHidden } = useVisibility();
  const { getLancamentosByMonth, isMonthConsolidated } = useLancamentosRealizados();

  const { params, updateLine, resetToDefaults, isLoading: paramsLoading } = useProjectionLineParams();
  const { closings } = useAnnualClosings();
  const { depreciationMap } = useVehicleDepreciation({ assets: config.assets });

  const years = useMemo(
    () => generateYears(CURRENT_YEAR, PROJECTION_HORIZON),
    []
  );

  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return formatCurrencyBase(value);
  };

  const enabledIncomeItems = config.incomeItems.filter(i => i.enabled);
  const enabledExpenseItems = config.expenseItems.filter(i => i.enabled);

  const baseAnnuals = useMemo(() => {
    let income = 0, expense = 0;

    for (let month = 1; month <= 12; month++) {
      const monthStr = `${CURRENT_YEAR}-${String(month).padStart(2, '0')}`;

      if (isMonthConsolidated(monthStr)) {
        income += getLancamentosByMonth(monthStr)
          .filter(l => l.tipo === 'receita')
          .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
        expense += getLancamentosByMonth(monthStr)
          .filter(l => l.tipo === 'despesa' && !isBillPaymentTransaction(l))
          .reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
      } else {
        enabledIncomeItems.forEach(item => {
          const val = getMonthlyEntry(monthStr, item.id, 'income');
          income += val === 0 && item.isAssetGenerated && item.defaultValue ? item.defaultValue : val;
        });
        enabledExpenseItems.forEach(item => {
          const val = getMonthlyEntry(monthStr, item.id, 'expense');
          if (val === 0 && item.isAssetGenerated && item.defaultValue) {
            if (item.frequency === 'annual' && item.annualMonths) {
              if (item.annualMonths.includes(month)) expense += item.defaultValue;
            } else {
              expense += item.defaultValue;
            }
          } else {
            expense += val;
          }
        });
      }
    }

    return { income: income || 120_000, expense: expense || 96_000 };
  }, [CURRENT_YEAR, isMonthConsolidated, getLancamentosByMonth, getMonthlyEntry, enabledIncomeItems, enabledExpenseItems]);

  const getManualEntry = (month: string, assetId: string): number | undefined =>
    config.assetMonthlyEntries?.find(e => e.month === month && e.assetId === assetId)?.value;

  const patrimonyProjection = usePatrimonyProjection({
    assets: config.assets,
    getManualEntry,
    projectionRate: INDEX_AVERAGES.ipca + 2,
    currentMonth,
    vehicleDepreciationMap: depreciationMap,
  });

  const basePatrimony = useMemo(() => {
    const dec = `${CURRENT_YEAR}-12`;
    return patrimonyProjection.getMonthlyTotals(dec);
  }, [CURRENT_YEAR, patrimonyProjection]);

  const patrimonyLineKeys = ['property', 'vehicle', 'investment', 'company', 'others'] as const;

  const milestones = useMemo(() => {
    const baseByKey = {
      property:   basePatrimony.totalProperties,
      vehicle:    basePatrimony.totalVehicles,
      investment: basePatrimony.totalInvestments,
      company:    basePatrimony.totalCompanies,
      others:     basePatrimony.totalOthers,
    };
    return [10, 20, 30].map(n => {
      const year = CURRENT_YEAR + n;
      let patrimony = 0;
      for (const key of patrimonyLineKeys) {
        const rate = (params[key].index === 'custom'
          ? (params[key].customRate ?? 0)
          : INDEX_AVERAGES[params[key].index]) + params[key].spread;
        const base = baseByKey[key];
        patrimony += Math.round(base * Math.pow(1 + rate / 100, n));
      }
      return { label: `+${n} anos (${year})`, patrimony };
    });
  }, [params, basePatrimony.totalProperties, basePatrimony.totalVehicles, basePatrimony.totalInvestments, basePatrimony.totalCompanies, basePatrimony.totalOthers]);

  return (
    <div className="space-y-5">

      <div className="space-y-0.5">
        <p className="text-sm font-semibold">
          Projeção {CURRENT_YEAR} → {CURRENT_YEAR + PROJECTION_HORIZON - 1}
        </p>
        <p className="text-xs text-muted-foreground">
          Ajuste os parâmetros de cada linha no painel abaixo.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {milestones.map(({ label, patrimony }) => (
          <Card key={label} className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(patrimony)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProjectionParamsPanel
        params={params}
        updateLine={updateLine}
        resetToDefaults={resetToDefaults}
        indexAverages={INDEX_AVERAGES}
        isLoading={paramsLoading}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Projeção 30 Anos
          </CardTitle>
          <CardDescription className="text-xs">
            Linhas com ✓ usam dados reais de fechamento.
            Projeções futuras: base atual × taxa composta por linha.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:px-4 sm:pb-4 overflow-hidden">
          <Patrimony30YearsTable
            years={years}
            currentYear={CURRENT_YEAR}
            params={params}
            baseIncome={baseAnnuals.income}
            baseExpense={baseAnnuals.expense}
            basePatrimony={{
              property:   basePatrimony.totalProperties,
              vehicle:    basePatrimony.totalVehicles,
              investment: basePatrimony.totalInvestments,
              company:    basePatrimony.totalCompanies,
              others:     basePatrimony.totalOthers,
              grandTotal: basePatrimony.grandTotal,
            }}
            indexAverages={INDEX_AVERAGES}
            closings={closings}
            formatCurrency={formatCurrencyBase}
            isHidden={isHidden}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <strong className="text-primary">Como funciona: </strong>
          Cada linha usa um índice base (média {AVERAGE_YEARS} anos) + spread configurável.
          Projeção composta ano a ano. Fechamentos reais (✓) substituem a projeção quando disponíveis.
          Parâmetros salvos automaticamente na sua conta.
        </CardContent>
      </Card>
    </div>
  );
};
