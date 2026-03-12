import React, { useMemo } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useProjectionLineParams, type ProjectionIndex } from '@/hooks/useProjectionLineParams';
import { useAnnualClosings } from '@/hooks/useAnnualClosings';
import { usePatrimonyProjection } from '@/hooks/usePatrimonyProjection';
import { Patrimony30YearsTable } from '@/components/planejamento/Patrimony30YearsTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, RotateCcw, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';

// ─── Dados históricos (espelhados de PlanejamentoAnual.tsx) ───────────────────

const historicalData: Record<number, { ipca: number; igpm: number; ibovespa: number; cdi: number }> = {
  2010: { ipca: 5.91, igpm: 11.32, ibovespa: 1.04, cdi: 9.75 },
  2011: { ipca: 6.50, igpm: 5.10, ibovespa: -18.11, cdi: 11.60 },
  2012: { ipca: 5.84, igpm: 7.82, ibovespa: 7.40, cdi: 8.40 },
  2013: { ipca: 5.91, igpm: 5.51, ibovespa: -15.50, cdi: 8.06 },
  2014: { ipca: 6.41, igpm: 3.69, ibovespa: -2.91, cdi: 10.81 },
  2015: { ipca: 10.67, igpm: 10.54, ibovespa: -13.31, cdi: 13.24 },
  2016: { ipca: 6.29, igpm: 7.17, ibovespa: 38.93, cdi: 14.00 },
  2017: { ipca: 2.95, igpm: -0.52, ibovespa: 26.86, cdi: 9.93 },
  2018: { ipca: 3.75, igpm: 7.55, ibovespa: 15.03, cdi: 6.42 },
  2019: { ipca: 4.31, igpm: 7.30, ibovespa: 31.58, cdi: 5.97 },
  2020: { ipca: 4.52, igpm: 23.14, ibovespa: 2.92, cdi: 2.76 },
  2021: { ipca: 10.06, igpm: 17.78, ibovespa: -11.93, cdi: 4.42 },
  2022: { ipca: 5.79, igpm: 5.45, ibovespa: 4.69, cdi: 12.39 },
  2023: { ipca: 4.62, igpm: -3.18, ibovespa: 22.28, cdi: 13.04 },
  2024: { ipca: 4.83, igpm: 6.54, ibovespa: -10.36, cdi: 10.87 },
};

const AVERAGE_YEARS = 5;

function calcAverage(index: 'ipca' | 'igpm' | 'ibovespa' | 'cdi'): number {
  const years = Object.keys(historicalData).map(Number).sort((a, b) => b - a).slice(0, AVERAGE_YEARS);
  return years.reduce((acc, y) => acc + historicalData[y][index], 0) / AVERAGE_YEARS;
}

const INDEX_AVERAGES: Record<ProjectionIndex, number> = {
  ipca:     calcAverage('ipca'),
  igpm:     calcAverage('igpm'),
  cdi:      calcAverage('cdi'),
  ibovespa: calcAverage('ibovespa'),
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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">
            Projeção {CURRENT_YEAR} → {CURRENT_YEAR + PROJECTION_HORIZON - 1}
          </p>
          <p className="text-xs text-muted-foreground">
            Clique no ⚙ de cada linha para ajustar o índice e spread.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] gap-1 cursor-default">
                  <Info className="h-3 w-3" />
                  Médias {AVERAGE_YEARS}a
                  {' '}IPCA {INDEX_AVERAGES.ipca.toFixed(1)}%
                  {' '}CDI {INDEX_AVERAGES.cdi.toFixed(1)}%
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-60">
                Taxas médias dos últimos {AVERAGE_YEARS} anos usadas como base nas projeções.
                Ajuste o spread de cada linha conforme sua expectativa.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={resetToDefaults}
            disabled={paramsLoading}
          >
            <RotateCcw className="h-3 w-3" />
            Resetar
          </Button>
        </div>
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
            onUpdateLine={updateLine}
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
