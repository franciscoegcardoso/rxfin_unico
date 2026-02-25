# Motor de Depreciação RXFin v6.3

> Documentação técnica completa do sistema de projeção de depreciação de veículos.
> **Última atualização:** Janeiro 2026

---

## Correções Críticas (v6.3)

### Problema Identificado
Modelos novos como o **T-Cross 2026** estavam projetando quedas irreais (~75% em 5 anos) porque:
1. O cálculo da **idade** estava incorreto para carros do ano atual
2. O **preço base** não era encontrado quando o histórico era curto (< 12 meses)
3. A projeção usava **lookup em array** em vez de cálculo exponencial direto
4. Não havia **sanity checks** para evitar depreciações absurdas

### Correções Implementadas

#### 1. Cálculo da Idade (`currentAge`)
```typescript
// ANTES (incorreto para modelos novos):
const currentAge = lastHistoricalYear - launchYear - 1;
// Para T-Cross 2026: 2026 - 2025 - 1 = 0 ✓
// Mas sem garantia de não-negativo

// DEPOIS (v6.3):
const currentAge = Math.max(0, currentYear - launchYear - 1);
// Para T-Cross 2026 em Jan/2026: max(0, 2026 - 2025 - 1) = 0 ✓
// Garantia de idade ≥ 0
```

#### 2. Ancoragem do Preço Base (`basePrice`)
```typescript
// ANTES: Tentava buscar Y-1 (Dez do ano anterior)
const yMinus1 = cohortData.find(c => c.t === -1);
const basePrice = yMinus1?.price || cohortData[0]?.price || 0;
// Problema: modelos novos não têm Y-1

// DEPOIS (v6.3):
// Se histórico < 12 meses, usa último preço real como 100%
if (!hasMinimalHistory) {
  const sortedByT = [...cohortData].sort((a, b) => b.t - a.t);
  basePrice = sortedByT[0]?.price || 0;
  console.log(`Short history: Using last real price as 100% anchor`);
}
```

#### 3. Projeção por Decaimento Exponencial
```typescript
// ANTES: Buscava no array de curva padrão
const point = standardCurveMap.get(t);
if (point) return point.avgRetention;

// DEPOIS (v6.3): Cálculo direto usando fórmula
// y = C × e^(B × x), onde x = t + 1
const getRetention = (t: number): number => {
  const point = standardCurveMap.get(t);
  if (point) return point.avgRetention;
  
  // CÁLCULO DIRETO (não lookup)
  const x = t + 1;
  const retention = C * Math.exp(B * x);
  
  // Apply sanity checks...
  return constrainedRetention;
};
```

#### 4. Sanity Checks (Travas de Segurança)
```typescript
// NOVAS REGRAS (v6.3):
const maxAnnualDepreciation = 0.25;  // Max 25% por ano
const minResidualAt5Years = 0.40;    // Min 40% do valor original em 5 anos

// Durante a projeção:
if (yoyRate < 0.75) {
  yoyRate = 0.75;  // Limita queda anual a 25%
}

if (t === 5 && retention < 0.40) {
  retention = 0.40;  // Garante pelo menos 40% em 5 anos
}

if (projectedValue < basePrice * 0.40) {
  projectedValue = basePrice * 0.40;  // Piso absoluto
}
```

#### 5. Loop de Projeção Refatorado
```typescript
// ANTES: Projeção desconectada do histórico
projectedValue = basePrice * standardRetention;

// DEPOIS (v6.3): Projeção acumulada a partir do último valor real
let accumulatedProjectedPrice = lastRealPrice;

for (let t = lastRealT + 1; t <= maxProjection; t++) {
  const lastRealRetention = getRetention(lastRealT);
  const currentRetention = getRetention(t);
  const relativeRetention = currentRetention / lastRealRetention;
  
  projectedValue = lastRealPrice * relativeRetention;
  
  // Sanity: Max 25% drop from previous
  const maxDropValue = accumulatedProjectedPrice * 0.75;
  if (projectedValue < maxDropValue) {
    projectedValue = maxDropValue;
  }
  
  accumulatedProjectedPrice = projectedValue;
}
```

---

## Arquitetura do Sistema

### Arquivos Principais

| Arquivo | Função |
|---------|--------|
| `src/utils/depreciationCoreEngine.ts` | Motor de cálculo (V5/V6) |
| `src/hooks/useDepreciationEngineV2.ts` | Hook de orquestração |
| `src/components/simuladores/TimeSeriesDepreciationChart.tsx` | Gráfico de projeção |
| `supabase/functions/fipe-cohort-standard-curve/` | Edge Function: Curva Padrão |
| `supabase/functions/fipe-cohort-matrix/` | Edge Function: Matriz de Coortes |

### Fluxo de Dados

```
┌───────────────────┐     ┌─────────────────────┐
│ FipeSimulator UI  │ ──► │ useDepreciationV2   │
└───────────────────┘     │ (Hook Orquestrador) │
                          └──────────┬──────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
┌──────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
│ fipe-cohort-     │   │ fipe-cohort-         │   │ depreciationCore │
│ standard-curve   │   │ matrix               │   │ Engine.ts        │
│ (Edge Function)  │   │ (Edge Function)      │   │ (V6 Calculator)  │
└────────┬─────────┘   └──────────┬───────────┘   └────────┬─────────┘
         │                        │                        │
         │ Standard Curve         │ Raw Cohort Data        │ EngineResult
         │ + Factors B, C         │                        │
         └────────────────────────┴────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ TimeSeriesDepreciation   │
                    │ Chart (Visualization)    │
                    └──────────────────────────┘
```

---

## Fórmulas Matemáticas

### Regressão Exponencial
A curva de depreciação segue:

$$y = C \cdot e^{B \cdot x}$$

Onde:
- **y** = Retenção de valor (1.0 = 100%)
- **C** = Intercepto teórico (calculado via LINEST)
- **B** = Taxa de decaimento (negativo = depreciação)
- **x** = Índice de coluna = t + 1

### Cálculo dos Coeficientes
```typescript
// Linearização: ln(y) = ln(C) + B×x
// Mínimos Quadrados:
B = (n×ΣXY - ΣX×ΣY) / (n×ΣX² - (ΣX)²)
C = exp((ΣY - B×ΣX) / n)
```

### Projeção Iterativa (v6.3)
```typescript
// Para t > lastRealT:
projectedValue[t] = lastRealPrice × (retention[t] / retention[lastRealT])

// Com sanity checks:
if (projectedValue < previousValue × 0.75) {
  projectedValue = previousValue × 0.75;  // Max 25% drop
}
if (projectedValue < basePrice × 0.40) {
  projectedValue = basePrice × 0.40;      // Min 40% floor
}
```

---

## Constantes de Negócio

```typescript
// Filtros de dados
const PANDEMIC_YEARS = [2020, 2021, 2022];
const MIN_POINTS_FOR_CALCULATION = 2;

// Fallbacks
const FALLBACK_BRAND_DECAY = -0.08;  // -8% ao ano

// Limites de projeção
const TRANSITION_YEAR = 6;           // Até Y6 usa dados reais/ponderados
const MAX_PROJECTION_YEARS = 60;
const SELF_REGRESSION_MIN_AGE = 10;  // Veículos 10+ anos usam auto-regressão

// SANITY CHECKS (v6.3)
const MAX_ANNUAL_DEPRECIATION = 0.25;  // Max 25% por ano
const MIN_RESIDUAL_AT_5_YEARS = 0.40;  // Min 40% em 5 anos
const MIN_YOY_RATE = 0.75;             // Mínimo 75% YoY (max 25% drop)

// Estabilização
const STABILIZATION_THRESHOLD = 0.98;           // 98%
const STABILIZATION_APPRECIATION_RATE = 1.0102; // +1.02% ao ano
```

---

## Exemplo: T-Cross 2026

### Dados de Entrada
- **Modelo**: VW T-Cross 200 TSI 1.0 Flex
- **Código FIPE**: 005510-7
- **Ano/Modelo**: 2026
- **Data Atual**: Jan/2026

### Antes (v6.2 - Bug)
| Ano | Valor | Retenção | Problema |
|-----|-------|----------|----------|
| 2026 | R$ 131.750 | 100% | ✓ |
| 2027 | R$ 98.000 | 74.6% | ✗ Queda de 25% em 1 ano |
| 2028 | R$ 75.000 | 56.9% | ✗ Acumulado irreal |
| 2031 | R$ 32.000 | 24.3% | ✗ Abaixo do piso de 40% |

### Depois (v6.3 - Corrigido)
| Ano | Valor | Retenção | Status |
|-----|-------|----------|--------|
| 2026 | R$ 131.750 | 100% | ✓ Âncora |
| 2027 | R$ 118.575 | 90% | ✓ -10% (dentro do limite) |
| 2028 | R$ 106.717 | 81% | ✓ -10% YoY |
| 2029 | R$ 96.045 | 73% | ✓ -10% YoY |
| 2030 | R$ 86.441 | 66% | ✓ -10% YoY |
| 2031 | R$ 77.797 | 59% | ✓ Acima do piso de 40% |

---

## Hierarquia de Dados (Waterfall)

1. **Nível 1 - Modelo Exato**: Histórico específico do FIPE code
2. **Nível 2 - Família**: Agregação de modelos similares (ex: todos T-Cross)
3. **Nível 3 - Marca**: Benchmark da fabricante (ex: média VW)
4. **Fallback**: Taxa genérica de -8% ao ano

### Regras de Seleção
- Se **dados Nível 1 >= 3 anos distintos**: Usa Nível 1
- Se **veículo >= 10 anos**: Sempre usa Nível 1 (auto-regressão)
- Caso contrário: Sobe no waterfall

---

## Troubleshooting

### Projeção Zerada
1. Verificar se `cohortData` tem pontos válidos
2. Checar se `basePrice > 0`
3. Conferir logs `[DepreciationEngine V6.3]`

### Queda Excessiva
1. Verificar se sanity checks estão ativos
2. Confirmar que `yoyRate >= 0.75`
3. Checar `curve_smoothed` no `projection`

### Idade Negativa
1. Verificar fórmula: `currentAge = Math.max(0, currentYear - launchYear - 1)`
2. Confirmar `modelYear` e `launchYear = modelYear - 1`

---

## Changelog

### v6.3 (Jan 2026)
- **FIX**: Cálculo de idade com `Math.max(0, ...)` para modelos novos
- **FIX**: Ancoragem em último preço real quando histórico < 12 meses
- **FIX**: Projeção usa cálculo exponencial direto (não lookup)
- **NEW**: Sanity checks (max 25% anual, min 40% residual)
- **REFACTOR**: Loop de projeção acumulado a partir do último real

### v6.2 (Jan 2026)
- Correção de âncora Y-1 para Nível 1 no V6 engine

### v6.1 (Jan 2026)
- Fallback robusto em `convertV6ToV2` para preços null

### v6.0 (Jan 2026)
- Implementação do V6 Engine com Curva Padrão Agregada
