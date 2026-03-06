# C3A — Análise do Dashboard (Inicio.tsx) e Plano de Migração

## 1. Hooks de dados utilizados

| Hook | Retorno | Uso no dashboard |
|------|---------|-------------------|
| `useFinancial()` | `{ config }` (expenseItems, etc.) | Metas por categoria (config.expenseItems) |
| `useAuth()` | `{ user }` | Nome, avatar, user.id para fetch |
| `useVisibility()` | `{ isHidden }` | Ocultar valores monetários (••••••) |
| `useTour()` | `{ hasCompletedTour, startTour }` | Auto-início do tour para novos usuários |
| `useFeaturePreferences()` | `{ isFeatureEnabled }` | Feature flag `metas-mensais` |
| `useDemoMode()` | `{ isDemoMode }` | Envolver cards em DemoCardWrapper |
| `useOnboardingCheckpoint()` | `{ currentPhase, controlDone }` | Banner de controle pós-onboarding |
| `useHomeDashboard(currentMonth)` | `{ data, loading, error, refetch }` | RPC get_home_dashboard: user, month_summary, budget_composition, credit_cards, insurance_alerts |
| `useMonthlyGoals()` | `{ goals, getGoalByMonth }` | Metas mensais e gasto vs meta por categoria |
| `useLancamentosRealizados()` | `{ lancamentos }` | Fallback de saldo, categoryGoals, transações do mês |
| `useIsMobile()` | `boolean` | Escolha entre layout mobile (coluna) e desktop (grid) |

---

## 2. Componentes filhos importados

| Componente | O que renderiza |
|------------|------------------|
| `AppLayout` | Wrapper com TopNavbar, MobileBottomNav, footer; conteúdo da página |
| `BudgetInsightsSummary` | Card de insights de orçamento (resumo do mês, preocupações, oportunidades) |
| `PackagesSummaryCard` | Resumo de pacotes/assinaturas (só desktop) |
| `InsuranceExpirationAlerts` | Alertas de vencimento de seguros |
| `MobileHomeHero` | Hero mobile: saudação + saldo (só mobile) |
| `OnboardingInsightCard` | Card de insight pós-onboarding (quando demo mode) |
| `DemoBadge` | Badge “Demo” em canto do card |
| `ControlOnboardingBanner` | Banner “control onboarding” quando currentPhase === 'completed' && !controlDone |
| `MonthSummaryCard` | Resumo do mês: receitas, despesas, saldo (usa useLancamentosRealizados) |
| `ExpensesStatusCard` | Despesas realizadas vs em aberto (contas a pagar) |
| `CreditCardSpendingCard` | Gasto com cartão de crédito no mês |
| `BudgetCompositionCard` | Composição do orçamento (treemap/barras) |
| `PendingCategorizationCard` | Lançamentos pendentes de categorização |
| `UpcomingEventsCard` | Próximos eventos (vencimentos, etc.) |
| `EconomicIndicators` | Indicadores econômicos (só quando !isDemoMode) |
| `VisibilityToggle` | Botão olho para ocultar/mostrar valores |

Componentes locais (definidos no próprio Inicio.tsx):

- `CategoryGoalItem` — linha categoria + barra de progresso (gasto vs meta)
- `DemoCardWrapper` — envolve filhos em borda tracejada + DemoBadge quando isDemoMode

---

## 3. Cores hardcoded, classes não-token e estilos inline

### Cores hardcoded / não-token

- **Receitas:** `bg-green-500/10`, `text-green-600` → migrar para `bg-income/10`, `text-income`
- **Despesas:** `bg-red-500/10`, `text-red-600` → `bg-expense/10`, `text-expense`
- **Saldo (positivo/negativo):** `text-green-600` / `text-red-600` → `text-income` / `text-expense`
- **Lançamentos (ícone):** `bg-blue-500/10`, `text-blue-600` → manter semântico (ex.: `bg-muted`, `text-muted-foreground`) ou token secundário
- **Cartões de crédito (badges):** `bg-green-600`, `bg-red-600`, `bg-amber-500` → `bg-primary`, `bg-destructive`, `bg-warning` ou tokens equivalentes
- **Alertas seguros:** `border-amber-500/50`, `bg-amber-500/10`, `text-amber-600` → `border-warning`, `bg-warning/10`, `text-warning` (se existir) ou manter amber com token
- **Barras por categoria:** `CATEGORY_COLORS` com hex + `style={{ backgroundColor: color }}` → preferir tokens ou variáveis CSS por categoria

### Classes Tailwind não-token

- `rounded-[14px]` → `rounded-xl` (consistência)
- `border-border/80` → `border-border`
- Uso de `text-primary` no saldo (desktop view) em um trecho; restante já mistura green/red

### Estilos inline

- Barras “Despesas por Categoria”: `style={{ width: `${pct}%`, backgroundColor: color }}` → manter apenas se necessário; cor preferir via classe/token.

---

## 4. Proposta de nova estrutura (sem alterar dados/hooks)

- **BalanceCard** (novo): saldo em destaque + variação % + toggle ocultar/mostrar. Props: balance, variationPercent, variationValue, period. Consome apenas props; dados vêm do Inicio (monthSummary + cálculo de variação).
- **QuickActions** (novo): grid 2x2 (mobile) / 4 em linha (desktop): Lançar, Ver Extrato, Investimentos, Relatório. Só navegação.
- **Seção de alertas**: card único (conta vencida, meta próxima, seguros) — reutilizar `InsuranceExpirationAlerts` + `UpcomingEventsCard` ou agrupar em um card “Alertas” com tokens.
- **Lista “Transações recentes”**: novo componente de apresentação que recebe `items: Array<{ id, categoria, nome, valor, data, tipo }>` e exibe as últimas 5; dados vêm de `lancamentos` no Inicio.
- **Gráfico de fluxo (30 dias)**: se existir componente no projeto, reutilizar; senão, placeholder (card “Fluxo — últimos 30 dias” com link para /fluxo-caixa ou gráfico futuro).
- **Metas rápidas (top 3)**: barras de progresso das 3 primeiras metas ativas; dados de `categoryGoals` no Inicio.
- Manter: `MobileHomeHero`, `MonthSummaryCard`, `ExpensesStatusCard`, `CreditCardSpendingCard`, `BudgetCompositionCard`, `PendingCategorizationCard`, `BudgetInsightsSummary`, `EconomicIndicators`, `PackagesSummaryCard`, `OnboardingInsightCard`, `ControlOnboardingBanner`, `DemoCardWrapper`, `CategoryGoalItem` (ou mover para componente “CategoryGoalsCard”).
- **Layout**: mobile = coluna única (BalanceCard → QuickActions → Alertas → Transações recentes → Fluxo). Desktop = grid 2 colunas: col-esq = BalanceCard + QuickActions + Transações recentes; col-dir = Alertas + Fluxo + Metas rápidas (top 3).

---

## 5. Ordem de implementação recomendada

1. **C3B**
   - Criar `BalanceCard.tsx` (apresentação; props tipadas).
   - Criar `QuickActions.tsx` (grid 4 ações, navegação).
2. **C3C**
   - Refatorar `Inicio.tsx`:
     - Manter todos os hooks e lógica (monthSummary, categoryGoals, dashboardData, etc.).
     - Trocar hero desktop por `BalanceCard` + `QuickActions`.
     - Adicionar seção “Transações recentes” (últimas 5 de `lancamentos`).
     - Adicionar card/placeholder “Fluxo (30 dias)”.
     - Desktop: grid 2 colunas (esq: saldo + quick actions + recentes; dir: alertas + fluxo + metas top 3).
     - Mobile: coluna única na ordem acima.
     - Loading: envolver seções em `Skeleton` quando `dashboardLoading` ou dados ainda não prontos.
     - Substituir todas as cores hardcoded por tokens (income, expense, card, border, muted, foreground).
     - Valores monetários em Syne bold onde fizer sentido, com `text-income` / `text-expense`.
     - Datas em pt-BR com `Intl.DateTimeFormat('pt-BR')`.
   - Não alterar `MobileHomeHero` (manter onde está no fluxo mobile).

---

## 6. Resumo

- **Hooks:** 11 hooks; principal fonte de dados agregados é `useHomeDashboard` + `useLancamentosRealizados` e `useMonthlyGoals` para metas.
- **Componentes:** 15+ componentes de UI; 2 locais (CategoryGoalItem, DemoCardWrapper).
- **Migração visual:** introduzir BalanceCard e QuickActions; reorganizar layout em 2 colunas (desktop) e 1 coluna (mobile); skeletons; eliminar cores hardcoded em favor de tokens; datas e moeda em pt-BR.
