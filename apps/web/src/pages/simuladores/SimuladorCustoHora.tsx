import React, { useEffect, useMemo, useState } from 'react';
import { SimulatorLayout } from '@/components/simulators/SimulatorLayout';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from '@/lib/simulatorSession';
import { ResultCard } from '@/components/simulators/ResultCard';
import { SimulatorCTA } from '@/components/simulators/SimulatorCTA';
import { CurrencyInput } from '@/components/simulators/CurrencyInput';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const SALARIO_MINIMO_HORA = 1412 / 220; // ~6,42

export default function SimuladorCustoHora() {
  const [rendaBruta, setRendaBruta] = useState(0);
  const [horasSemana, setHorasSemana] = useState(40);
  const [diasUteis, setDiasUteis] = useState(22);
  const [deslocamentoMinDia, setDeslocamentoMinDia] = useState(60);
  const [custoDeslocamento, setCustoDeslocamento] = useState(0);
  const [custosProfissionais, setCustosProfissionais] = useState(0);
  const [investimentoFormacao, setInvestimentoFormacao] = useState(0);

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    supabase
      .from('page_views')
      .insert({ page: '/simulador-custo-hora', session_id: sessionId })
      .then(() => {});
  }, []);

  const result = useMemo(() => {
    const horasTrabalhoMes = (horasSemana || 0) * (52.1429 / 12);
    const horasDeslocamentoMes = ((deslocamentoMinDia || 0) * (diasUteis || 0)) / 60;
    const horasEfetivasMes = horasTrabalhoMes + horasDeslocamentoMes;
    const rendaLiquida =
      (rendaBruta || 0) -
      (custoDeslocamento || 0) -
      (custosProfissionais || 0) -
      (investimentoFormacao || 0);
    const valorHora = horasEfetivasMes > 0 ? rendaLiquida / horasEfetivasMes : 0;

    const custoDeslocamentoEmHoras = horasDeslocamentoMes * valorHora;
    const deslocamentoMetade = ((deslocamentoMinDia || 0) / 2) * (diasUteis || 0) / 60;
    const horasEfetivasSemMetade = horasTrabalhoMes + deslocamentoMetade;
    const valorHoraSeMetadeDeslocamento =
      horasEfetivasSemMetade > 0 ? rendaLiquida / horasEfetivasSemMetade : 0;

    return {
      horasEfetivasMes,
      rendaLiquida,
      valorHora,
      custoDeslocamentoEmHoras,
      valorHoraSeMetadeDeslocamento,
    };
  }, [
    rendaBruta,
    horasSemana,
    diasUteis,
    deslocamentoMinDia,
    custoDeslocamento,
    custosProfissionais,
    investimentoFormacao,
  ]);

  const hasResult = rendaBruta > 0 && horasSemana > 0;

  return (
    <SimulatorLayout
      title="Quanto vale sua hora?"
      subtitle="Descubra o valor real da sua hora considerando todos os seus custos fixos."
    >
      <Card className="bg-card shadow-lg rounded-2xl border border-border">
        <CardContent className="p-6 space-y-4">
          <CurrencyInput
            label="Renda mensal bruta (R$)"
            value={rendaBruta}
            onChange={setRendaBruta}
            placeholder="Ex: 8000"
          />
          <div className="space-y-2">
            <Label>Horas trabalhadas por semana</Label>
            <Input
              type="number"
              min={1}
              max={168}
              value={horasSemana}
              onChange={(e) => setHorasSemana(Math.max(0, Number(e.target.value) || 0))}
              placeholder="40"
            />
          </div>
          <div className="space-y-2">
            <Label>Dias úteis trabalhados por mês</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={diasUteis}
              onChange={(e) => setDiasUteis(Math.max(0, Number(e.target.value) || 0))}
              placeholder="22"
            />
          </div>
          <div className="space-y-2">
            <Label>Tempo de deslocamento ida+volta (min/dia)</Label>
            <Input
              type="number"
              min={0}
              max={600}
              value={deslocamentoMinDia}
              onChange={(e) => setDeslocamentoMinDia(Math.max(0, Number(e.target.value) || 0))}
              placeholder="60"
            />
          </div>
          <CurrencyInput
            label="Custo mensal deslocamento (combustível/transporte)"
            value={custoDeslocamento}
            onChange={setCustoDeslocamento}
          />
          <CurrencyInput
            label="Custos profissionais mensais (roupa, alimentação fora, etc.)"
            value={custosProfissionais}
            onChange={setCustosProfissionais}
          />
          <CurrencyInput
            label="Investimento em formação mensal (cursos, MBA)"
            value={investimentoFormacao}
            onChange={setInvestimentoFormacao}
          />
        </CardContent>
      </Card>

      {hasResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <ResultCard
            icon={<Clock className="h-8 w-8 text-primary" />}
            label="Sua hora vale"
            value={formatCurrency(result.valorHora)}
            valueClassName="text-3xl font-bold text-green-700 dark:text-green-400"
          />
          <Card className="bg-card shadow-lg rounded-2xl border border-border">
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Horas efetivas/mês: <strong className="text-foreground">{result.horasEfetivasMes.toFixed(1)} h</strong>
                {' '}(trabalho + deslocamento)
              </p>
              <p className="text-sm text-muted-foreground">
                Renda líquida efetiva: <strong className="text-foreground">{formatCurrency(result.rendaLiquida)}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Valor hora = renda líquida ÷ horas efetivas = <strong className="text-foreground">{formatCurrency(result.valorHora)}</strong>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-lg rounded-2xl border border-border">
            <CardContent className="p-6 space-y-2">
              <p className="text-sm">
                Seu tempo de deslocamento custa{' '}
                <strong className="text-foreground">{formatCurrency(result.custoDeslocamentoEmHoras)}/mês</strong> em horas.
              </p>
              <p className="text-sm">
                Se seu deslocamento fosse metade, sua hora valeria{' '}
                <strong className="text-green-700 dark:text-green-400">{formatCurrency(result.valorHoraSeMetadeDeslocamento)}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Salário mínimo/hora (ref.): {formatCurrency(SALARIO_MINIMO_HORA)} · Seu valor: {formatCurrency(result.valorHora)} ({(result.valorHora / SALARIO_MINIMO_HORA).toFixed(1)}x).
              </p>
            </CardContent>
          </Card>
          <SimulatorCTA title="Organize suas finanças para aumentar o valor da sua hora" href="/signup" />
        </div>
      )}
    </SimulatorLayout>
  );
}
