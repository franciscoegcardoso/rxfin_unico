/**
 * Conteúdo do relatório FIPE para exportação em PDF.
 * Renderizado em container oculto para captura com html-to-image.
 * Inclui rótulos de dados nos gráficos para melhor leitura no PDF.
 */
import React, { forwardRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatShort = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return formatMoney(value);
};

export interface OwnershipExportItem {
  key: string;
  label: string;
  monthlyValue: number;
  annualValue: number;
}

export interface FipePdfReportData {
  analysisDate: string;
  // Valor FIPE
  fipeValue: string;
  vehicleName: string;
  referenceMonth: string;
  monthlyVariation?: number;
  category?: string;
  codigoFipe: string;
  anoModelo: string;
  combustivel: string;
  // Quanto custa
  ownershipTotalMonthly: number;
  ownershipTotalAnnual: number;
  ownershipItems: OwnershipExportItem[];
  opportunityCostNote?: string;
  // Histórico FIPE
  historyValor0km: number;
  historyValorAtual: number;
  /** Depreciação total desde 0km (ex.: -15.6%) */
  historyTotalDepreciacaoPct: number;
  /** Taxa anualizada % a.a. (ex.: -4.8%) */
  historyPctDepreciacao: number;
  historyChartData: Array<{ date: string; monthLabel: string; price: number }>;
  historyPeriodLabel?: string;
  // Análise de Safra
  cohortModelYears: number[];
  cohortCalendarYears: number[];
  cohortCells: Array<{ modelYear: number; calendarYear: number; price: number }>;
  cohortModelName?: string;
  cohortFipeCode?: string;
  // Preço por ano
  yearPrices: Array<{ year: string; yearLabel: string; displayYear: string; price: number }>;
  selectedYear?: string;
  // Histórico 0km
  zeroKmData: Array<{ modelYear: number; price: number; variation?: number }>;
}

interface FipePdfReportContentProps {
  data: FipePdfReportData;
}

/** Layout compacto para caber em uma única página A4 ao escalar. */
export const FipePdfReportContent = forwardRef<HTMLDivElement, FipePdfReportContentProps>(
  function FipePdfReportContent({ data }, ref) {
    const totalAnnual = data.ownershipItems.reduce((s, i) => s + i.annualValue, 0);
    const ownershipWithPct = data.ownershipItems.map((item) => ({
      ...item,
      pct: totalAnnual > 0 ? (item.annualValue / totalAnnual) * 100 : 0,
    }));

    // Dados para gráfico de pizza (custos anuais)
    const pieData = data.ownershipItems
      .filter((i) => i.annualValue > 0)
      .map((i) => ({ name: i.label, value: i.annualValue }));

    const COLORS = [
      '#059669', '#7c3aed', '#1e40af', '#be185d', '#ea580c',
      '#ca8a04', '#0d9488', '#6b7280',
    ];

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900"
        style={{
          width: 794,
          fontFamily: 'system-ui, sans-serif',
          padding: 8,
          fontSize: 10,
        }}
      >
        {/* Header: identidade visual RXFin */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="RXFin"
              className="h-10 w-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const next = (e.target as HTMLImageElement).nextElementSibling;
                if (next) (next as HTMLElement).style.display = 'block';
              }}
            />
            <span className="text-lg font-bold text-gray-900" style={{ display: 'none' }}>
              RXFin
            </span>
            <span className="text-sm text-gray-500">app.rxfin.com.br</span>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div className="font-medium">Data da análise</div>
            <div>{data.analysisDate}</div>
          </div>
        </div>

        {/* 1. Valor FIPE */}
        <div className="border border-gray-200 rounded p-2 mb-2">
          <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">
            Valor FIPE
          </div>
          <div className="text-lg font-bold text-gray-900">{data.fipeValue}</div>
          <div className="font-semibold text-gray-800 text-[10px] mt-0.5">{data.vehicleName}</div>
          <div className="text-[9px] text-gray-600">Mês ref.: {data.referenceMonth}</div>
          {data.monthlyVariation != null && (
            <div
              className={`text-sm font-medium mt-1 ${
                data.monthlyVariation >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {data.monthlyVariation >= 0 ? '+' : ''}
              {data.monthlyVariation.toFixed(2)}% variação mensal
            </div>
          )}
          {data.category && (
            <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {data.category.replace(/_/g, ' ')}
            </span>
          )}
          <div className="mt-2 pt-2 border-t border-gray-100 text-[9px] text-gray-600 space-y-0.5">
            <div>
              <span className="font-medium text-gray-700">Código FIPE:</span> {data.codigoFipe}
            </div>
            <div>
              <span className="font-medium text-gray-700">Ano/Modelo:</span> {data.anoModelo}
            </div>
            <div>
              <span className="font-medium text-gray-700">Combustível:</span> {data.combustivel}
            </div>
          </div>
        </div>

        {/* 2. Quanto custa */}
        <div className="border border-gray-200 rounded p-2 mb-2">
          <div className="text-[10px] font-semibold text-gray-900 mb-1">Quanto custa ter esse carro?</div>
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded">
            <span className="text-sm font-bold text-gray-900">{formatMoney(data.ownershipTotalMonthly)}/mês</span>
            <span className="text-sm font-bold text-gray-900">{formatMoney(data.ownershipTotalAnnual)}/ano</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {pieData.length > 0 && (
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={18}
                      outerRadius={32}
                      paddingAngle={1}
                      dataKey="value"
                      nameKey="name"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-0.5 font-medium text-gray-700">CATEGORIA</th>
                  <th className="text-right py-0.5 font-medium text-gray-700">VALOR</th>
                  <th className="text-right py-0.5 font-medium text-gray-700">%</th>
                </tr>
              </thead>
              <tbody>
                {ownershipWithPct.map((item) => (
                  <tr key={item.key} className="border-b border-gray-100">
                    <td className="py-0.5 text-gray-800">{item.label}</td>
                    <td className="text-right py-0.5 font-medium">{formatMoney(item.annualValue)}</td>
                    <td className="text-right py-0.5 text-gray-600">{item.pct.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 font-semibold">
                  <td className="py-0.5 text-gray-900">Total</td>
                  <td className="text-right py-0.5">{formatMoney(data.ownershipTotalAnnual)}</td>
                  <td className="text-right py-0.5">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          {data.opportunityCostNote && (
            <p className="mt-1 text-[8px] text-gray-500 leading-tight">Nota: {data.opportunityCostNote.slice(0, 120)}…</p>
          )}
        </div>

        {/* 3. Histórico FIPE */}
        <div className="border border-gray-200 rounded p-2 mb-2">
          <div className="text-[10px] font-semibold text-gray-900 mb-1">
            Histórico FIPE
            {data.historyPeriodLabel && (
              <span className="text-gray-500 font-normal ml-2">{data.historyPeriodLabel}</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className="p-1.5 bg-amber-50 border border-amber-200 rounded text-center">
              <div className="text-[8px] text-amber-800 uppercase">Valor 0km</div>
              <div className="text-xs font-bold text-amber-900">{formatShort(data.historyValor0km)}</div>
            </div>
            <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
              <div className="text-[8px] text-gray-600 uppercase">Valor Atual</div>
              <div className="text-xs font-bold text-gray-900">{formatShort(data.historyValorAtual)}</div>
              <div className="text-[9px] text-red-600">{data.historyTotalDepreciacaoPct.toFixed(1)}% dep.</div>
            </div>
            <div className="p-1.5 bg-gray-50 border border-gray-200 rounded text-center">
              <div className="text-[8px] text-gray-600 uppercase">% a.a.</div>
              <div className="text-xs font-bold text-red-600">{data.historyPctDepreciacao.toFixed(1)}%</div>
            </div>
          </div>
          {data.historyChartData.length > 0 && (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.historyChartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => formatShort(v)}
                    domain={['auto', 'auto']}
                    width={48}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v)}
                    labelFormatter={(l) => l}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Histórico"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#059669' }}
                  >
                    <LabelList
                      dataKey="price"
                      position="top"
                      formatter={(v: number) => formatShort(v)}
                      style={{ fontSize: 9, fill: '#374151' }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-0.5 text-[8px] text-gray-500">Série histórica FIPE.</p>
        </div>

        {/* 4. Análise de Safra */}
        {data.cohortModelYears.length > 0 && data.cohortCalendarYears.length > 0 && (
          <div className="border border-gray-200 rounded p-2 mb-2">
            <div className="text-[10px] font-semibold text-gray-900 mb-1">Análise de Safra</div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[8px] border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 p-0.5 text-left font-medium">Ano</th>
                    {data.cohortCalendarYears.map((y) => (
                      <th key={y} className="border border-gray-200 p-0.5 text-center font-medium">{y}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cohortModelYears.map((my) => (
                    <tr key={my}>
                      <td className="border border-gray-200 p-0.5 font-medium">{my}</td>
                      {data.cohortCalendarYears.map((cy) => {
                        const cell = data.cohortCells.find((c) => c.modelYear === my && c.calendarYear === cy);
                        return (
                          <td key={cy} className="border border-gray-200 p-0.5 text-right">
                            {cell ? formatShort(cell.price) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Preço por ano */}
        {data.yearPrices.length > 0 && (
          <div className="border border-gray-200 rounded p-2 mb-2">
            <div className="text-[10px] font-semibold text-gray-900 mb-1">Preço por ano/modelo</div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.yearPrices}
                  margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="displayYear"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => formatShort(v)}
                    width={48}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="price" name="Valor FIPE" fill="#059669" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="price"
                      position="top"
                      formatter={(v: number) => formatShort(v)}
                      style={{ fontSize: 9, fill: '#374151' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 6. Histórico 0 km */}
        {data.zeroKmData.length > 0 && (
          <div className="border border-gray-200 rounded p-2 mb-2">
            <div className="text-[10px] font-semibold text-gray-900 mb-1">Histórico preço 0 km</div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.zeroKmData}
                  margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="modelYear"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => formatShort(v)}
                    width={48}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Valor 0 km"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#059669' }}
                  >
                    <LabelList
                      dataKey="price"
                      position="top"
                      formatter={(v: number) => formatShort(v)}
                      style={{ fontSize: 9, fill: '#374151' }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  }
);
