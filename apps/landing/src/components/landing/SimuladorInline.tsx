import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trackCTAClick } from '@/lib/tracking';

const APP_URL = 'https://app.rxfin.com.br';
const FIPE_ANALYSIS_URL = `${APP_URL}/simuladores/veiculos/simulador-fipe`;
const CUSTO_MENSAL_FATOR = 0.018;

function formatBRL(value: number): string {
  if (value <= 0) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export const SimuladorInline: React.FC = () => {
  const [rawInput, setRawInput] = useState('');
  const valor = useMemo(() => {
    const num = rawInput.replace(/\D/g, '');
    return num ? parseInt(num, 10) : 0;
  }, [rawInput]);

  const custoMensal = useMemo(() => Math.round(valor * CUSTO_MENSAL_FATOR), [valor]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '');
    setRawInput(v);
  };

  return (
    <motion.div
      className="rounded-2xl border border-primary/20 bg-primary/10 p-6 mb-8"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-foreground">Experimente agora, sem cadastro</h3>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">
              Gratuito
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Qual é o valor do seu veículo? Estime o custo mensal operacional (IPVA + seguro + manutenção média).
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Valor do veículo (R$)</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 80000"
                value={rawInput}
                onChange={handleInputChange}
                className="rounded-lg border border-input bg-background px-4 py-2.5 text-base w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>
            {valor > 0 && (
              <div className="flex items-baseline gap-2 text-primary font-semibold">
                <span className="text-muted-foreground font-normal text-sm">~</span>
                {formatBRL(custoMensal)}
                <span className="text-sm font-normal text-muted-foreground">/mês em custos operacionais</span>
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <a
            href={FIPE_ANALYSIS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCTAClick('simulador_inline_ver_analise', FIPE_ANALYSIS_URL)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Ver análise completa
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
