import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, TrendingDown, Shield, FileText, Fuel, Wrench, Car, Bike, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trackCTAClick } from '@/lib/tracking';
import {
  fetchFipeBrands,
  fetchFipeModels,
  fetchFipeYears,
  fetchFipePrice,
  fetchFipeHistory,
  type VehicleType,
  type FipeBrand,
  type FipeModel,
  type FipeYear,
  type FipePrice,
  type HistoryPoint,
} from '@/lib/fipeLandingApi';
import { LandingBrandSelect } from './LandingBrandSelect';
import { LandingSearchableSelect } from './LandingSearchableSelect';
import { cn } from '@/lib/utils';

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'carros', label: 'Carros', icon: Car },
  { value: 'motos', label: 'Motos', icon: Bike },
  { value: 'caminhoes', label: 'Caminhões', icon: Truck },
];

const APP_URL = 'https://app.rxfin.com.br';
const FIPE_ANALYSIS_URL = `${APP_URL}/simuladores/veiculos/simulador-fipe`;
const CUSTO_MENSAL_FATOR = 0.018;

/** Percentuais do custo mensal total (soma = 1) para exibição na prévia */
const CUSTO_LINHAS = [
  { key: 'depreciacao', label: 'Depreciação', pct: 0.35, icon: TrendingDown },
  { key: 'seguro', label: 'Seguro', pct: 0.25, icon: Shield },
  { key: 'ipva', label: 'IPVA', pct: 0.1, icon: FileText },
  { key: 'combustivel', label: 'Combustível', pct: 0.15, icon: Fuel },
  { key: 'manutencao', label: 'Manutenção', pct: 0.15, icon: Wrench },
] as const;

function formatBRL(value: number): string {
  if (value <= 0) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formato compacto para eixo Y (ex: 90 → "90k") */
function formatYAxis(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

/** Extrai valor numérico do campo Valor da FIPE (ex: "R$ 85.000,00" -> 85000) */
function parseFipeValor(valorStr: string): number {
  const num = valorStr.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(num) || 0;
}

/** Gráfico de depreciação com eixo Y legível, grade e rótulos no eixo X */
function DepreciationChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.price);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin || 1;
  const pad = { t: 12, r: 12, b: 28, l: 52 };
  const w = 320;
  const h = 160;
  const x0 = pad.l;
  const y0 = pad.t;
  const gw = w - pad.l - pad.r;
  const gh = h - pad.t - pad.b;

  const toX = (i: number) => x0 + (i / (points.length - 1)) * gw;
  const toY = (v: number) => y0 + gh - ((v - dataMin) / range) * gh;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.price)}`)
    .join(' ');

  const numYTicks = 5;
  const yTicks: number[] = [];
  for (let i = 0; i <= numYTicks; i++) {
    const v = dataMin + (range * i) / numYTicks;
    yTicks.push(Math.round(v));
  }

  const numXTicks = 5;
  const xTickIndices: number[] = [];
  for (let i = 0; i <= numXTicks; i++) {
    const idx = Math.round((i / numXTicks) * (points.length - 1));
    xTickIndices.push(idx);
  }
  const uniqX = [...new Set(xTickIndices)].sort((a, b) => a - b);

  return (
    <div className="w-full max-w-[320px] mx-auto">
      <p className="text-xs font-medium text-muted-foreground mb-1">Histórico FIPE (depreciação)</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[160px]" preserveAspectRatio="xMidYMid meet">
        {/* Grid horizontal */}
        {yTicks.slice(1, -1).map((v, i) => {
          const y = toY(v);
          return (
            <line
              key={i}
              x1={x0}
              y1={y}
              x2={x0 + gw}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeDasharray="2 2"
              strokeWidth={1}
            />
          );
        })}
        {/* Eixo Y: rótulos */}
        {yTicks.map((v, i) => {
          const y = toY(v);
          return (
            <g key={i}>
              <text
                x={x0 - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                className="fill-muted-foreground"
              >
                {formatYAxis(v)}
              </text>
            </g>
          );
        })}
        {/* Linha do gráfico */}
        <path
          d={pathD}
          fill="none"
          stroke="hsl(161,79%,35%)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(p.price)}
            r="3"
            fill="hsl(161,79%,35%)"
          />
        ))}
        {/* Eixo X: rótulos (vários pontos) */}
        {uniqX.map((idx) => {
          const p = points[idx];
          if (!p) return null;
          return (
            <text
              key={idx}
              x={toX(idx)}
              y={h - 6}
              textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
              fontSize="9"
              fill="currentColor"
              className="fill-muted-foreground"
            >
              {p.monthLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export const SimuladorInline: React.FC = () => {
  const [brands, setBrands] = useState<FipeBrand[]>([]);
  const [models, setModels] = useState<FipeModel[]>([]);
  const [years, setYears] = useState<FipeYear[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [price, setPrice] = useState<FipePrice | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingBrands(true);
    fetchFipeBrands()
      .then((data) => { if (!cancelled) setBrands(data); })
      .finally(() => { if (!cancelled) setLoadingBrands(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setSelectedModel('');
    setSelectedYear('');
    setYears([]);
    setPrice(null);
    setHistory([]);
    if (!selectedBrand) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setLoadingModels(true);
    fetchFipeModels(selectedBrand)
      .then((data) => { if (!cancelled) setModels(data); })
      .finally(() => { if (!cancelled) setLoadingModels(false); });
    return () => { cancelled = true; };
  }, [selectedBrand]);

  useEffect(() => {
    setSelectedYear('');
    setPrice(null);
    setHistory([]);
    if (!selectedBrand || !selectedModel) {
      setYears([]);
      return;
    }
    let cancelled = false;
    setLoadingYears(true);
    fetchFipeYears(selectedBrand, selectedModel)
      .then((data) => { if (!cancelled) setYears(data); })
      .finally(() => { if (!cancelled) setLoadingYears(false); });
    return () => { cancelled = true; };
  }, [selectedBrand, selectedModel]);

  useEffect(() => {
    setPrice(null);
    setHistory([]);
    if (!selectedBrand || !selectedModel || !selectedYear) return;
    let cancelled = false;
    setLoadingPrice(true);
    fetchFipePrice(vehicleType, selectedBrand, selectedModel, selectedYear)
      .then((p) => {
        if (cancelled || !p) return p;
        setPrice(p);
        return fetchFipeHistory(p.CodigoFipe, p.AnoModelo);
      })
      .then((h) => {
        if (!cancelled && Array.isArray(h)) setHistory(h);
      })
      .catch(() => { if (!cancelled) setPrice(null); })
      .finally(() => { if (!cancelled) setLoadingPrice(false); });
    return () => { cancelled = true; };
  }, [vehicleType, selectedBrand, selectedModel, selectedYear]);

  const priceValue = useMemo(
    () => (price ? parseFipeValor(price.Valor) : 0),
    [price]
  );
  const custoMensal = useMemo(
    () => Math.round(priceValue * CUSTO_MENSAL_FATOR),
    [priceValue]
  );

  const custoLinhas = useMemo(() => {
    if (custoMensal <= 0) return [];
    return CUSTO_LINHAS.map(({ key, label, pct, icon: Icon }) => ({
      key,
      label,
      valor: Math.round(custoMensal * pct),
      icon: Icon,
    }));
  }, [custoMensal]);

  return (
    <motion.div
      className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 mb-8 shadow-sm"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Prévia do Simulador FIPE</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha tipo, marca, modelo e ano. Veja o valor FIPE, a depreciação e o custo mensal estimado.
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">
            Gratuito
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-foreground mb-2">Tipo de veículo</span>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map(({ value: vt, label, icon: Icon }) => (
                <button
                  key={vt}
                  type="button"
                  onClick={() => setVehicleType(vt)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    vehicleType === vt
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Marca</span>
              <LandingBrandSelect
                value={selectedBrand}
                onValueChange={setSelectedBrand}
                fipeBrands={brands}
                loading={loadingBrands}
                disabled={loadingBrands}
                placeholder="Selecione a marca"
                searchPlaceholder="Buscar marca..."
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Modelo</span>
              <LandingSearchableSelect
                value={selectedModel}
                onValueChange={setSelectedModel}
                options={models.map((m) => ({ value: String(m.codigo), label: m.nome }))}
                disabled={!selectedBrand || loadingModels}
                loading={loadingModels}
                placeholder="Selecione o modelo"
                searchPlaceholder="Buscar modelo..."
                emptyMessage="Nenhum modelo encontrado."
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Ano</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={loadingYears || !selectedModel}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">{loadingYears ? 'Carregando…' : 'Selecione o ano'}</option>
              {years.map((y) => (
                <option key={y.codigo} value={y.codigo}>{y.nome}</option>
              ))}
            </select>
          </label>
        </div>

        {loadingPrice && selectedBrand && selectedModel && selectedYear && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Consultando valor FIPE e histórico…</span>
          </div>
        )}

        {!loadingPrice && price && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-primary/20">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Valor FIPE</p>
                <p className="text-2xl font-bold text-primary">{price.Valor}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {price.Marca} {price.Modelo} · {price.MesReferencia}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Custos operacionais (estimativa mensal)
                </p>
                <p className="text-lg font-semibold text-foreground mb-3">
                  ~ {formatBRL(custoMensal)} <span className="text-muted-foreground font-normal text-base">/mês</span>
                </p>
                <ul className="space-y-2">
                  {custoLinhas.map(({ key, label, valor, icon: Icon }) => (
                    <li key={key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 text-primary/70" />
                        {label}
                      </span>
                      <span className="font-medium tabular-nums">{formatBRL(valor)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              {history.length >= 2 ? (
                <DepreciationChart points={history} />
              ) : (
                <p className="text-sm text-muted-foreground py-8">Histórico não disponível para este veículo.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <a
            href={FIPE_ANALYSIS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCTAClick('simulador_inline_ver_analise', FIPE_ANALYSIS_URL)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Ver análise completa
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        </div>
      </div>
    </motion.div>
  );
};
