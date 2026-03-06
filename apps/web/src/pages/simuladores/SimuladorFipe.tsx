import React, { useEffect, useState, useMemo } from 'react';
import { useFipe } from '@/hooks/useFipe';
import { formatFipeYearName } from '@/hooks/useFipe';
import { SimulatorLayout } from '@/components/simulators/SimulatorLayout';
import { ResultCard } from '@/components/simulators/ResultCard';
import { SimulatorCTA } from '@/components/simulators/SimulatorCTA';
import { CurrencyInput } from '@/components/simulators/CurrencyInput';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from '@/lib/simulatorSession';
import { cn } from '@/lib/utils';

const VEHICLE_TYPES = [
  { value: 'carros' as const, label: 'Carro', num: 1 },
  { value: 'motos' as const, label: 'Moto', num: 2 },
  { value: 'caminhoes' as const, label: 'Caminhão', num: 3 },
];

export default function SimuladorFipe() {
  const [ctaClicked, setCtaClicked] = useState(false);
  const {
    vehicleType,
    setVehicleType,
    brands,
    models,
    years,
    selectedBrand,
    selectedModel,
    selectedYear,
    setSelectedBrand,
    setSelectedModel,
    setSelectedYear,
    price,
    priceValue,
    loading,
    error,
  } = useFipe();

  // Cost of ownership state (editable)
  const [ipvaMonthly, setIpvaMonthly] = useState(0);
  const [seguroMonthly, setSeguroMonthly] = useState(0);
  const [combustivel, setCombustivel] = useState(0);
  const [manutencao, setManutencao] = useState(0);
  const [estacionamento, setEstacionamento] = useState(0);
  const [lavagem, setLavagem] = useState(0);
  const [depreciacaoMensal, setDepreciacaoMensal] = useState(0);
  const [kmPorMes, setKmPorMes] = useState<number | ''>('');

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    supabase
      .from('page_views')
      .insert({ page: '/simuladores/veiculos/simulador-fipe', session_id: sessionId })
      .then(() => {});
  }, []);

  // Default cost estimates when FIPE price is set
  useEffect(() => {
    if (priceValue <= 0) return;
    const ipvaYear = priceValue * 0.035;
    setIpvaMonthly(ipvaYear / 12);
    setSeguroMonthly((priceValue * 0.05) / 12);
  }, [priceValue]);

  const totalMensal = useMemo(
    () =>
      ipvaMonthly +
      seguroMonthly +
      combustivel +
      manutencao +
      estacionamento +
      lavagem +
      depreciacaoMensal,
    [
      ipvaMonthly,
      seguroMonthly,
      combustivel,
      manutencao,
      estacionamento,
      lavagem,
      depreciacaoMensal,
    ]
  );
  const custoPorKm =
    typeof kmPorMes === 'number' && kmPorMes > 0 ? totalMensal / kmPorMes : null;

  const handleCtaClick = () => {
    if (ctaClicked) return;
    setCtaClicked(true);
    const sessionId = getSessionId();
    if (!sessionId) return;
    supabase
      .from('conversion_events')
      .insert({
        event_type: 'simulator_cta',
        page: '/simuladores/veiculos/simulador-fipe',
        session_id: sessionId,
      })
      .then(() => {});
  };

  return (
    <SimulatorLayout
      title="Valor FIPE e Custo Real de Propriedade"
      subtitle="Descubra o valor de mercado do seu veículo e quanto realmente custa mantê-lo."
    >
      {/* Step 1 — Selecionar veículo */}
      <Card className="bg-card shadow-lg rounded-xl sm:rounded-2xl border border-border w-full min-w-0">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <Label className="text-sm font-medium">Tipo</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {VEHICLE_TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={vehicleType === t.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVehicleType(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select
                value={selectedBrand || undefined}
                onValueChange={setSelectedBrand}
                disabled={loading.brands}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.codigo} value={String(b.codigo)}>
                      {b.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select
                value={selectedModel || undefined}
                onValueChange={setSelectedModel}
                disabled={!selectedBrand || loading.models}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.codigo} value={String(m.codigo)}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select
                value={selectedYear || undefined}
                onValueChange={setSelectedYear}
                disabled={!selectedModel || loading.years}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.codigo} value={y.codigo}>
                      {formatFipeYearName(y.nome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Resultado */}
      {price && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <ResultCard
            icon={<Car className="h-8 w-8 text-primary" />}
            label="Valor FIPE"
            value={price.Valor}
            valueClassName="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-400"
          />
          <Card className="bg-white dark:bg-card shadow-lg rounded-xl sm:rounded-2xl border-2 border-border w-full min-w-0">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Custo de propriedade (mensal)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {price.Marca} {price.Modelo} · Código FIPE {price.CodigoFipe} · Ref. {price.MesReferencia}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <CurrencyInput label="IPVA (3,5% FIPE/12)" value={ipvaMonthly} onChange={setIpvaMonthly} />
                <CurrencyInput label="Seguro (estimativa)" value={seguroMonthly} onChange={setSeguroMonthly} />
                <CurrencyInput label="Combustível (R$/mês)" value={combustivel} onChange={setCombustivel} />
                <CurrencyInput label="Manutenção (R$/mês)" value={manutencao} onChange={setManutencao} />
                <CurrencyInput label="Estacionamento (R$/mês)" value={estacionamento} onChange={setEstacionamento} />
                <CurrencyInput label="Lavagem (R$/mês)" value={lavagem} onChange={setLavagem} />
                <CurrencyInput label="Depreciação mensal (estimada)" value={depreciacaoMensal} onChange={setDepreciacaoMensal} />
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground">Total mensal</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalMensal)}</p>
              </div>
              <div className="mt-2">
                <Label className="text-sm">Quilômetros por mês (opcional)</Label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={kmPorMes === '' ? '' : kmPorMes}
                  onChange={(e) => {
                    const v = e.target.value;
                    setKmPorMes(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Ex: 1000"
                />
                {custoPorKm != null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Custo por km: {formatCurrency(custoPorKm)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3 — CTA */}
          <SimulatorCTA
            title="Quer controlar todos os custos do seu veículo automaticamente?"
            href="/signup"
            onClick={handleCtaClick}
          />
        </div>
      )}
    </SimulatorLayout>
  );
}
