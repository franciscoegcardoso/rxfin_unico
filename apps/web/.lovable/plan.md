

# Plano de Execucao Final Consolidado — Onboarding v3

Incorpora todos os ajustes discutidos: gamificacao de jornada, modo demo com dados ficticios, protecao contra escrita, CLS prevention, filtro visual demo, Higher-Order Hook pattern, e modo hibrido pos-Bloco A.

---

## Estado Atual

```text
Componentes:  Onboarding.tsx (10 steps) + Onboarding2.tsx (profile form)
Persistencia: profiles.onboarding_completed (bool unico)
Roteamento:   useAuthRedirect.ts → isPending guard → Index.tsx
Draft:        Nenhum — estado vive em React state, perde-se ao recarregar
Demo Mode:    Nao existe
```

---

## Fase 0 — Infraestrutura DB (Sprint 1, Passo 1)

### 0.1 Migration SQL

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_phase text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS onboarding_control_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_control_phase text NOT NULL DEFAULT 'not_started';

-- Migracao legado
UPDATE profiles
SET onboarding_phase = 'completed',
    onboarding_control_done = true,
    onboarding_control_phase = 'completed'
WHERE onboarding_completed = true;
```

Valores `onboarding_phase`: `not_started`, `started`, `block_a_done`, `block_b_done`, `block_c_done`, `completed`
Valores `onboarding_control_phase`: `not_started`, `started`, `planejamento_done`, `fluxo_done`, `cartao_done`, `metas_done`, `patrimonio_done`, `completed`

### 0.2 Atualizar types.ts com 3 novos campos em profiles

### 0.3 Novos event_types em ai_onboarding_events

---

## Fase 0.5 — Dados Demo (Sprint 1, Passo 2)

### 0.5.1 Criar `src/data/demoData.ts`

Dados ficticios centralizados para perfil renda media (~R$ 8.500/mes):
- `demoIncomes`: salario, freelance, investimentos
- `demoExpenses`: moradia, alimentacao, transporte, lazer, saude
- `demoAssets`: imovel, carro, investimentos (CDB, acoes)
- `demoDebts`: financiamento imobiliario, cartao
- `demoCashFlow`: fluxo mensal dos ultimos 6 meses
- `demoGoals`: metas ficticias (reserva emergencia, viagem)
- `demoPatrimonio`: patrimonio liquido consolidado

Dados **nunca inseridos no banco** — retornados pelos hooks em memoria.

---

## Fase 1 — Gate Duplo + Demo Mode + Draft Store (Sprint 1, Passos 3-5)

### 1.1 Criar `useDemoMode.ts` (Passo 3)

**Arquivo:** `src/hooks/useDemoMode.ts`

- Le `onboarding_phase` de profiles (mesma query do checkpoint)
- **Modo Demo ativo quando `onboarding_phase` NOT IN ('block_b_done', 'block_c_done', 'completed')`**
  - Isso implementa o "Modo Hibrido": demo permanece ate o usuario completar pelo menos o Bloco B (Patrimonio), evitando dashboard vazio apos Bloco A
- Retorna `{ isDemoMode: boolean }`

### 1.2 Criar `DemoDataBanner.tsx` + Protecao CLS (Passo 4)

**Arquivo:** `src/components/shared/DemoDataBanner.tsx`

- Faixa vermelha/alaranjada **position: sticky, top: 0, z-50**
- **CLS Prevention**: `AppLayout.tsx` reserva espaco fixo (48px) no topo quando `isDemoMode === true` via classe condicional no `<main>`, em vez de inserir banner dinamicamente
- Texto: "⚠️ Estes sao dados ficticios para voce conhecer a ferramenta"
- CTA proeminente: "COMECAR SEU RAIO-X FINANCEIRO AGORA!" → `/onboarding`
- **Botao de minimizar** (X ou chevron): ao minimizar, banner colapsa para barra fina (8px) com apenas o CTA visivel, salvo em `sessionStorage` para nao reaparecer expandido na mesma sessao
- Responsivo: texto compacto em mobile, CTA ocupa largura total

**Arquivo:** `src/components/layout/AppLayout.tsx`

- Renderizar `<DemoDataBanner />` antes do `<TopNavbar />`
- Classe condicional: `pt-[calc(4rem+48px)]` quando demo ativo (banner expandido), `pt-[calc(4rem+8px)]` quando minimizado, `pt-16` quando inativo

### 1.3 Protecao contra Escrita (ReadOnly Mode) (Passo 4)

Criar `useDemoGuard.ts`:

```typescript
export function useDemoGuard() {
  const { isDemoMode } = useDemoMode();
  
  const guardMutation = (action: () => void) => {
    if (isDemoMode) {
      toast.error("Voce esta no modo demonstracao. Complete o Raio-X para editar seus dados reais.");
      return;
    }
    action();
  };
  
  return { isDemoMode, guardMutation };
}
```

Aplicar nos hooks de mutacao principais:
- `useLancamentosRealizados` (addLancamento, updateLancamento, deleteLancamento)
- Hooks de income/expense (create, update, delete)
- Hooks de patrimonio (create, update, delete)
- Hooks de metas (create, update, delete)

### 1.4 Higher-Order Hook Pattern para Dados (Passo 5)

Em vez de `if (isDemoMode)` em 50 arquivos, criar wrapper pattern:

```typescript
// src/hooks/useDataWithDemo.ts
export function useDataWithDemo<T>(
  queryResult: { data: T | undefined; isLoading: boolean },
  demoFallback: T
) {
  const { isDemoMode } = useDemoMode();
  
  if (isDemoMode) {
    return { data: demoFallback, isLoading: false, isDemo: true };
  }
  
  return { ...queryResult, isDemo: false };
}
```

Hooks afetados (aplicar wrapper):
- Hook do dashboard principal (graficos de receita/despesa)
- Hook de planejamento
- Hook de patrimonio
- Hook de fluxo de caixa
- Hook de metas

### 1.5 Filtro Visual Demo

Quando `isDemoMode === true`:
- Graficos (Recharts): aplicar `opacity: 0.7` + marca d'agua "DEMO" via custom label
- Tabelas: badge "DEMO" discreto no header
- Cards de resumo: borda pontilhada em vez de solida
- Isso garante que o usuario nunca confunda dados demo com dados reais

### 1.6 Refatorar `useAuthRedirect.ts`

- Buscar `onboarding_phase`, `onboarding_control_done`, `onboarding_control_phase`
- Query com `staleTime: 0`, guard com `isPending`
- Anti-loop: comparar `location.pathname` antes de redirecionar
- Logica:
  ```text
  if (isLoading || isPending) → loading state (NUNCA redirecionar)
  if (onboarding_phase != 'completed') → /onboarding (mas liberar dashboard com demo mode)
  else if (onboarding_control_done == false && dias < 7) → /onboarding-control
  else → dashboard
  ```
- **Ajuste critico**: usuarios com `onboarding_phase != 'completed'` NAO sao forcados ao onboarding — eles veem o dashboard com dados demo + banner. O onboarding e iniciado apenas pelo CTA do banner ou navegacao explicita.

### 1.7 Criar `useOnboardingCheckpoint.ts`

- `currentPhase`, `currentControlPhase`
- `currentLevel` derivado: not_started/started=0, block_a_done=1, block_b_done=2, block_c_done=3, completed=4
- `advancePhase(newPhase)`, `advanceControlPhase(newPhase)`, `registerEvent(type, metadata)`

### 1.8 Criar `useOnboardingDraft.ts`

- Draft via `user_kv_store` com chave `onboarding_draft`
- Interface: `{ currentBlock, currentStep, data, flushedIds, updatedAt }`
- `saveDraft(stepKey, data)`: debounce 2s
- `flushToRealTables(stepKey)`: UPSERT idempotente via `flushedIds` — nunca cria duplicatas
- `restoreDraft()`, `clearDraft()`

### 1.9 Atualizar Index.tsx, AuthCallback.tsx, MagicLinkHandler.tsx

---

## Fase 2 — Bloco A: Identidade + Gamificacao (Sprint 2)

### 2.1 Criar `OnboardingWizardV3.tsx`

Container principal. Usa `JourneyMap` no topo, `LevelBadge` no header. Draft auto-save. Botao "Continuar depois" em todas as telas.

### 2.2 Criar `JourneyMap.tsx`

Mapa visual da jornada com 4 niveis conectados. Destino final (Crown/Dominio Total) sempre visivel. Responsivo: horizontal desktop, vertical mobile.

```text
Desktop:
  [★ Identidade] ——→ [★ Patrimonio] ——→ [● Fluxo] ——→ [🔒 Dominio Total]
    Nivel 1            Nivel 2           Nivel 3          Nivel 4

Mobile (vertical):
  🔒 DOMINIO TOTAL ← destino sempre visivel
  |
  ○ Fluxo Real ← voce esta aqui
  |
  ★ Patrimonio ← concluido
  |
  ★ Identidade ← concluido
```

### 2.3 Criar `ConquestCard.tsx`

Card de conquista nos marcos. Confetti (canvas-confetti). Badge progressivo (bronze→prata→ouro→diamante). Preview do proximo nivel. Insight de valor (aritmetica local).

### 2.4 Criar `LevelBadge.tsx`

Badge persistente no header do wizard. Nivel atual + barra de XP parcial.

### 2.5 Etapa 0 — Boas-vindas com Destino Visivel

Adaptar OnboardingWelcome: "Voce viu dados ficticios. Agora vamos substituir pelos seus dados reais."
Card "Sua Jornada" com os 4 niveis e destino final.

### 2.6 Etapas 1-3

Tipo de conta (reutilizar OnboardingWelcome), Receitas (OnboardingIncome + valor medio mensal), Despesas (OnboardingExpenses + review por categoria). Draft auto-save.

### 2.7 Marco de Valor A + Raio-X Preliminar

ConquestCard nivel 1: "Identidade Financeira Mapeada!"
Metricas: receita, despesas, poupanca.
Insight: "Se poupar R$ X/mes a 12% a.a., em 5 anos = R$ Y"
Preview: "No Nivel 2 voce vai mapear tudo que tem e deve"
`advancePhase('block_a_done')`

**Nota**: Apos Bloco A, `isDemoMode` continua ativo (so desativa em block_b_done). Dashboard mostra mix de dados reais (receitas/despesas) + demo (patrimonio/fluxo). Banner permanece.

---

## Fase 3 — Bloco B: Patrimonio (Sprint 3)

### 3.1 Etapa 4 — Instituicoes financeiras + Async Pluggy

Se sync em andamento: icone do Bloco B na JourneyMap vira spinner com selo "Sincronizando..."
Reutilizar polling do SyncStatusBadge (5s).
Usuario continua preenchendo etapas 5-9 enquanto sync roda.

### 3.2-3.7 Etapas 5-10A

IR (skip), Veiculos (reutilizar OnboardingVehicles), Consorcios, Validacao patrimonio, Seguros, Visao geral bens.

### 3.8 Marco de Valor B

ConquestCard nivel 2: "Patrimonio Mapeado!"
UX de saida Pluggy: "Aguardar sync (~30s)" ou "Continuar com dados parciais". Nunca bloquear.
`advancePhase('block_b_done')`

**Nota**: Apos block_b_done, `isDemoMode` desativa. Dashboard mostra dados reais. Banner desaparece.

---

## Fase 4 — Bloco C: Fluxo de Caixa Real (Sprint 4)

### 4.1 Trilho Pluggy vs Manual
### 4.2-4.4 Etapas 10B-12 + Micro-marco
### 4.5 Marco de Valor C

ConquestCard nivel 3: "Fluxo de Caixa Mapeado!"
Fallback de IA: dados brutos se endpoint falhar + retry 30s.
`advancePhase('block_c_done')`

---

## Fase 5 — Bloco D: Dominio Total (Sprint 5)

### 5.1 Etapa 13 — Raio-X completo (fallback UI se IA falhar)
### 5.2-5.3 Metas anuais e mensais
### 5.4 Marco de Valor D — DOMINIO TOTAL

ConquestCard nivel 4: Crown dourado, confetti extendido, badge diamante.
`onboarding_completed = true`, `onboarding_phase = 'completed'`
CTA: transicao para Fluxo B2.

---

## Fase 6 — Fluxo B2: Maestria (Sprint 6)

Rota `/onboarding-control`, container `OnboardingControlWizard.tsx`.
5 modulos com tour guiado + "Learn by Doing" opcional (skip se usuario ja tem dados).
Projecao 30 anos como grand finale.
`onboarding_control_done = true`.
Liberacao D+7 com banner se nao completar.

---

## Fase 7 — Ativacao + Limpeza (Sprint 7)

Recuperacao de abandono (n8n): emails D+1, D+3, D+7.
Banner persistente para B2 incompleto.
Deprecar Onboarding.tsx, Onboarding2.tsx, OnboardingComplete.tsx.
Lazy loading dos blocos. Responsividade mobile.

---

## Arquivos — Criados

| Arquivo | Descricao |
|---------|-----------|
| `src/data/demoData.ts` | Dados ficticios centralizados |
| `src/hooks/useDemoMode.ts` | Flag de modo demo derivada de onboarding_phase |
| `src/hooks/useDemoGuard.ts` | Protecao contra escrita em modo demo |
| `src/hooks/useDataWithDemo.ts` | Higher-Order Hook para injetar dados demo |
| `src/components/shared/DemoDataBanner.tsx` | Banner vermelho + CTA + minimizar |
| `src/hooks/useOnboardingCheckpoint.ts` | Phase + level management + events |
| `src/hooks/useOnboardingDraft.ts` | Draft store + flush idempotente |
| `src/components/onboarding/OnboardingWizardV3.tsx` | Container principal |
| `src/components/onboarding/JourneyMap.tsx` | Mapa visual da jornada |
| `src/components/onboarding/ConquestCard.tsx` | Card de conquista nos marcos |
| `src/components/onboarding/LevelBadge.tsx` | Badge de nivel no header |
| `src/components/onboarding/OnboardingControlWizard.tsx` | Container B2 |
| `src/components/onboarding/blocks/BlockA.tsx` | Etapas 0-3 + Marco A |
| `src/components/onboarding/blocks/BlockB.tsx` | Etapas 4-10A + Marco B |
| `src/components/onboarding/blocks/BlockC.tsx` | Etapas 10B-12 + Marco C |
| `src/components/onboarding/blocks/BlockD.tsx` | Etapas 13-16 + Marco D |

## Arquivos — Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useAuthRedirect.ts` | Gate duplo + anti-loop + staleTime:0 |
| `src/components/layout/AppLayout.tsx` | Banner demo + reserva de espaco CLS |
| `src/pages/Index.tsx` | Liberar dashboard com demo mode |
| `src/pages/AuthCallback.tsx` | resolveRedirectRoute com novos campos |
| `src/components/auth/MagicLinkHandler.tsx` | Gate duplo |
| `src/App.tsx` | Rota /onboarding-control |
| `src/integrations/supabase/types.ts` | 3 novos campos em profiles |
| Hooks de mutacao (lancamentos, income, expense, patrimonio) | Guard isDemoMode |
| Hooks de leitura (dashboard, planejamento, patrimonio, fluxo) | Wrapper useDataWithDemo |

## Ordem de Implementacao na Sprint 1

| Passo | Entrega | Dependencia |
|-------|---------|-------------|
| 1 | Migration SQL (onboarding_phase, control_done, control_phase) | Nenhuma |
| 2 | demoData.ts (dados ficticios) | Nenhuma |
| 3 | useDemoMode.ts | Passo 1 |
| 4 | DemoDataBanner.tsx + useDemoGuard.ts + AppLayout.tsx (CLS) | Passo 3 |
| 5 | useDataWithDemo.ts + ajuste nos hooks de leitura/mutacao | Passo 2 + 3 |
| 6 | useAuthRedirect.ts (gate duplo anti-loop) | Passo 1 |
| 7 | useOnboardingCheckpoint.ts + useOnboardingDraft.ts | Passo 1 |
| 8 | Index.tsx, AuthCallback.tsx, MagicLinkHandler.tsx | Passo 6 |

## Sprints Completos

| Sprint | Entrega |
|--------|---------|
| S1 | Fase 0 + Fase 0.5 + Fase 1 (migration + demo mode + gate + hooks) |
| S2 | Fase 2 (Bloco A + JourneyMap + ConquestCard + LevelBadge) |
| S3 | Fase 3 (Bloco B + async Pluggy + desativacao demo) |
| S4 | Fase 4 (Bloco C + fallback IA) |
| S5 | Fase 5 (Bloco D + Dominio Total) |
| S6 | Fase 6 (B2 maestria) |
| S7 | Fase 7 (ativacao + limpeza) |

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| CLS no banner | Espaco reservado fixo no AppLayout + minimizar suave |
| Escrita em modo demo | useDemoGuard bloqueia mutacoes com toast |
| Confusao demo vs real | Filtro visual (opacity, borda pontilhada, badge DEMO) |
| Dashboard vazio pos-Bloco A | Modo Hibrido: demo ativo ate block_b_done |
| Loop de redirecionamento | Anti-loop: pathname + isPending + staleTime:0 |
| Duplicidade no flush | flushedIds + UPSERT idempotente |
| Perda de progresso | Draft auto-save via user_kv_store |
| Pluggy bloqueando fluxo | "Continuar com dados parciais" |
| Falha da IA | Fallback UI com dados brutos + retry 30s |
| Usuarios legados | Migration: onboarding_completed=true → phase=completed |
| Bundle pesado | React.lazy por bloco |
| Fadiga | Conquistas visuais + destino final visivel + "Continuar depois" |
| if(isDemoMode) espalhado | Higher-Order Hook useDataWithDemo centraliza logica |

