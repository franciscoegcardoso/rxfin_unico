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
  sectionRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
}

export const FipePdfReportContent = forwardRef<HTMLDivElement, FipePdfReportContentProps>(
  function FipePdfReportContent({ data, sectionRefs }, ref) {
    const setRef = (key: string) => (el: HTMLDivElement | null) => {
      if (sectionRefs.current) sectionRefs.current[key] = el;
    };

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
        className="bg-white text-gray-900 p-4 space-y-6"
        style={{ width: 800, fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Header: identidade visual RXFin */}
        <div
          ref={setRef('header')}
          className="flex items-center justify-between border-b border-gray-200 pb-3 mb-2"
        >
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
        <div ref={setRef('valorFipe')} className="border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Valor FIPE
          </div>
          <div className="text-2xl font-bold text-gray-900">{data.fipeValue}</div>
          <div className="font-semibold text-gray-800 mt-1">{data.vehicleName}</div>
          <div className="text-sm text-gray-600 mt-1">Mês de referência: {data.referenceMonth}</div>
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
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
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

        {/* 2. Quanto custa ter esse carro? */}
        <div ref={setRef('quantoCusta')} className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-2">
            Quanto custa ter esse carro?
          </div>
          <div className="text-xs text-gray-600 mb-3">
            Distribuição de custos mensais e anuais, custo de oportunidade e personalização de
            parâmetros.
          </div>
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-2xl font-bold text-gray-900">
                {formatMoney(data.ownershipTotalMonthly)}
              </span>
              <span className="text-sm text-gray-500 ml-1">/mês</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">
                {formatMoney(data.ownershipTotalAnnual)}
              </span>
              <span className="text-sm text-gray-500 ml-1">/ano</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pieData.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-700">CATEGORIA</th>
                    <th className="text-right py-2 font-medium text-gray-700">VALOR</th>
                    <th className="text-right py-2 font-medium text-gray-700">%</th>
                  </tr>
                </thead>
                <tbody>
                  {ownershipWithPct.map((item) => (
                    <tr key={item.key} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-800">{item.label}</td>
                      <td className="text-right py-1.5 font-medium">
                        {formatMoney(item.annualValue)}
                      </td>
                      <td className="text-right py-1.5 text-gray-600">
                        {item.pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 font-semibold">
                    <td className="py-2 text-gray-900">Total</td>
                    <td className="text-right py-2">{formatMoney(data.ownershipTotalAnnual)}</td>
                    <td className="text-right py-2">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {data.opportunityCostNote && (
            <p className="mt-3 text-[10px] text-gray-500 leading-relaxed">
              Nota: {data.opportunityCostNote}
            </p>
          )}
        </div>

        {/* 3. Histórico FIPE */}
        <div ref={setRef('historicoFipe')} className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-2">
            Histórico FIPE
            {data.historyPeriodLabel && (
              <span className="text-gray-500 font-normal ml-2">{data.historyPeriodLabel}</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-[10px] text-amber-800 uppercase font-medium">Valor 0km</div>
              <div className="text-lg font-bold text-amber-900">
                {formatShort(data.historyValor0km)}
              </div>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-[10px] text-gray-600 uppercase font-medium">Valor Atual</div>
              <div className="text-lg font-bold text-gray-900">
                {formatShort(data.historyValorAtual)}
              </div>
              <div className="text-xs text-red-600 font-medium mt-0.5">
                {data.historyTotalDepreciacaoPct.toFixed(1)}% depreciação
              </div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-[10px] text-gray-600 uppercase font-medium">% Depreciação a.a.</div>
              <div className="text-lg font-bold text-red-600">
                {data.historyPctDepreciacao.toFixed(1)}%
              </div>
            </div>
          </div>
          {data.historyChartData.length > 0 && (
            <div className="h-64">
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
          <p className="mt-2 text-[10px] text-gray-500">Série histórica FIPE.</p>
        </div>

        {/* 4. Análise de Safra */}
        {data.cohortModelYears.length > 0 && data.cohortCalendarYears.length > 0 && (
          <div ref={setRef('analiseSafra')} className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-1">
              Análise de Safra (Depreciação por Ano Calendário)
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Valores em R$ (milhares). {data.cohortModelName && `${data.cohortModelName}. `}
              {data.cohortFipeCode && `Código FIPE: ${data.cohortFipeCode}.`}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 p-1.5 text-left font-medium">Ano Modelo</th>
                    {data.cohortCalendarYears.map((y) => (
                      <th
                        key={y}
                        className="border border-gray-200 p-1.5 text-center font-medium"
                      >
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cohortModelYears.map((my) => (
                    <tr key={my}>
                      <td className="border border-gray-200 p-1.5 font-medium">{my}</td>
                      {data.cohortCalendarYears.map((cy) => {
                        const cell = data.cohortCells.find(
                          (c) => c.modelYear === my && c.calendarYear === cy
                        );
                        return (
                          <td
                            key={cy}
                            className="border border-gray-200 p-1.5 text-right"
                          >
                            {cell ? formatShort(cell.price) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-gray-500">
              * Valores na coluna Y-1 (negrito) = preço 0 km no lançamento. Demais = depreciação
              como usado.
            </p>
          </div>
        )}

        {/* 5. Preço atual por ano/modelo */}
        {data.yearPrices.length > 0 && (
          <div ref={setRef('precoPorAno')} className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-1">
              Preço atual por ano/modelo de fabricação
            </div>
            <div className="text-xs text-gray-600 mb-3">
              Valores FIPE atuais para cada ano de fabricação.
            </div>
            <div className="h-56">
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

        {/* 6. Histórico de preço 0 km */}
        {data.zeroKmData.length > 0 && (
          <div ref={setRef('historico0km')} className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-1">
              Histórico de preço deste modelo 0 km
            </div>
            <div className="text-xs text-gray-600 mb-3">
              Valor do veículo 0 km no lançamento de cada ano/modelo.
            </div>
            <div className="h-56">
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
            <p className="mt-2 text-[10px] text-gray-500">
              Cada ponto representa o preço FIPE do veículo 0 km em Dezembro do ano anterior ao
              ano/modelo.
            </p>
          </div>
        )}
      </div>
    );
  }
);
