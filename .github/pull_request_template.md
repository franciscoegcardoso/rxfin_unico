## O que muda neste PR

<!-- Descreva o que foi alterado e por quê -->

## Tipo

- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correção de bug
- [ ] `chore` — config / dependências / limpeza
- [ ] `refactor` — sem mudança de comportamento
- [ ] `style` — CSS / Design System
- [ ] `docs` — documentação

## Pre-Deploy Checklist ✅

**Build & tipos**
- [ ] `pnpm --filter web build` passa sem erros
- [ ] `pnpm --filter web exec tsc --noEmit` sem erros de tipo
- [ ] CI verde no GitHub Actions

**Banco de dados**
- [ ] Migrações em `supabase/migrations/` commitadas — ou N/A
- [ ] Migrações aplicadas no Supabase (MCP ou dashboard) — ou N/A
- [ ] Edge Functions redeployadas se alteradas — ou N/A

**Ambiente**
- [ ] `.env.example` atualizado se novas variáveis — ou N/A
- [ ] Variáveis adicionadas no Vercel dashboard — ou N/A

**Smoke test (Preview URL)**
- [ ] `/inicio` carrega, KPIs corretos
- [ ] **Gráfico Fluxo de Caixa com barras verdes e vermelhas visíveis** ← crítico
- [ ] `/movimentacoes` renderiza
- [ ] `/bens-investimentos` abre
- [ ] Cibélia responde
- [ ] Tema claro ↔ escuro OK (se CSS alterado)

**Paridade**
- [ ] Delta intencional documentado abaixo
- [ ] Sem divergências silenciosas

## Delta intencional

<!-- Mudanças em local/preview que divergem intencionalmente de prod -->

_Nenhum_ / ou:
-

## Screenshots

| Antes | Depois |
|-------|--------|
|  |  |
