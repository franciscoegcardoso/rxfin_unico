# Plano de trabalho — Ajuste de UX/UI (layout e navegação)

## Problema atual

- **Página `/minha-conta`**: exibe **menu horizontal superior** (TopNavbar) **e** **menu vertical à esquerda** (sidebar “Configurações”) porque usa `SettingsLayout`, que monta seu próprio layout completo (TopNavbar + aside + main) **dentro** do `AppShell`.
- **Demais páginas** (ex.: Início, Lançamentos, Planejamento): ficam só com o **menu vertical à esquerda** (sidebar do app), pois usam `AppLayout`, que dentro do shell apenas envolve o conteúdo, sem nova barra superior nem segunda sidebar.
- **Efeito**: em `/minha-conta` (e em outras rotas que usam `SettingsLayout`) o usuário vê **dois níveis de chrome** (sidebar do app + TopNavbar + sidebar de Configurações), enquanto no resto do app vê só a sidebar do app. Inconsistência e sensação de “refatoração ruim”.

---

## Visão alvo (por viewport)

| Viewport   | Comportamento desejado |
|-----------|-------------------------|
| **Desktop** (≥1024px) | Uma única **sidebar à esquerda** (nav principal do app). Sem TopNavbar nas páginas internas. Páginas de “configurações” (Minha Conta, Parâmetros, Instituições, etc.) podem ter **subnav ou tabs no conteúdo**, mas não uma segunda sidebar nem barra superior própria. |
| **Tablet** (768px–1023px) | Sidebar colapsável ou em drawer; **sem duplicar** barra superior + sidebar. Opção: top bar única (título + ações) + conteúdo; ou sidebar que vira overlay. |
| **Mobile** (<768px) | **Bottom nav** como navegação principal; header contextual (título + ícone notificações). Páginas de configuração em fluxo de lista → drill-down, **sem** TopNavbar + sidebar de configurações ao mesmo tempo. |

---

## Arquitetura atual (resumo)

```
AppShell (rotas autenticadas)
├── Mobile (< md 1024):  MobileShell = header (título) + main + bottom nav
│                        Outlet = página (algumas usam AppLayout, outras SettingsLayout)
│                        SettingsLayout em mobile: TopNavbar + main + MobileBottomNav → duplica nav
└── Desktop (≥ md):      DesktopShell = Sidebar (app) + main > Outlet
                         Outlet = MinhaConta → SettingsLayout = TopNavbar + aside (Config) + main
                         Outlet = Inicio etc → AppLayout (insideShell) = só content
```

- **SettingsLayout** é usado por: MinhaConta, Parametros, InstituicoesFinanceiras, ConfiguracoesFiscais, DadosFinanceiros, FinanceiroLayout, HistoricoPagamentos (e views correspondentes).
- **AppLayout** é usado pela maioria das páginas (Inicio, Lancamentos, Sonhos, etc.).

---

## Plano de trabalho (fases)

### Fase 1 — Unificar layout no desktop (sem TopNavbar duplicado)

**Objetivo:** Em desktop, todas as páginas dentro do AppShell terem **apenas** a sidebar à esquerda. Nenhuma página interna desenha sua própria TopNavbar nem segunda sidebar “full-width”.

1. **Ajustar `SettingsLayout` (desktop)**
   - **Não** renderizar `TopNavbar` quando já estiver dentro do AppShell (desktop).
   - Manter apenas o **aside** de “Configurações” (Minha Conta, Parâmetros, Instituições, etc.) como **segunda coluna** ao lado do conteúdo, ou transformar em **tabs horizontais** no topo do bloco de conteúdo (evitar duas sidebars visuais).
   - Critério: usar `useShell()` / `ShellContext` (já existe `insideShell`) para saber se está dentro do shell e, nesse caso, não montar TopNavbar nem layout “full page” em desktop.

2. **Garantir que rotas “settings” vivam dentro do AppShell**
   - Confirmar que MinhaConta, Parametros, InstituicoesFinanceiras, ConfiguracoesFiscais, DadosFinanceiros, FinanceiroLayout, HistoricoPagamentos estão todas sob `<Route element={<AppShell />}>` (já estão).
   - Remover qualquer uso de `SettingsLayout` que desenhe um layout completo (TopNavbar + aside) quando `insideShell === true` em desktop.

3. **Decisão de desenho (desktop) para páginas “settings”**
   - **Opção A:** Sidebar do app + **sidebar secundária** (Configurações) só para esse grupo de rotas, sem TopNavbar — manter uma única “barra superior” implícita (ou nenhuma), e o restante do espaço para sidebar app + sidebar config + conteúdo.
   - **Opção B:** Sidebar do app + **tabs horizontais** no topo do conteúdo (Minha Conta, Parâmetros, etc.) em vez de segunda sidebar — conteúdo abaixo das tabs.
   - Documentar escolha (A ou B) e aplicar de forma consistente em todas as páginas que hoje usam SettingsLayout.

**Entregáveis:** SettingsLayout refatorado para desktop; zero TopNavbar nas páginas internas do app em desktop; uma única sidebar (ou sidebar + tabs) coerente.

---

### Fase 2 — Tablet (768px–1023px): breakpoint e comportamento

**Objetivo:** Tratar tablet como viewport distinto, com regras claras (sidebar colapsável/drawer ou top bar única), sem duplicar menu superior e lateral.

1. **Introduzir breakpoint “tablet”**
   - Criar hook ou constantes (ex.: `useViewport()` ou `LAYOUT_BREAKPOINTS`) com: `mobile < 768`, `tablet 768–1023`, `desktop ≥ 1024`.
   - Atualizar `use-mobile.ts` ou criar `useBreakpoint()` para expor `isMobile`, `isTablet`, `isDesktop` conforme esses intervalos.

2. **Comportamento no AppShell para tablet**
   - **Opção recomendada:** Sidebar vira **drawer/overlay** (abre por ícone no header); header único com título da página + menu + notificações; conteúdo em full width. Assim não há “menu horizontal + vertical” ao mesmo tempo.
   - Alternativa: manter sidebar fixa mas mais estreita (apenas ícones) em tablet.

3. **SettingsLayout em tablet**
   - **Não** usar o mesmo layout que em desktop (duas colunas: sidebar config + conteúdo). Usar:
     - Header com título + “Voltar” (se aplicável); **tabs horizontais** ou lista vertical no conteúdo para trocar entre Minha Conta, Parâmetros, etc.; ou
     - Navegação “settings” dentro do drawer da sidebar do app (seção “Configurações” com subitens), sem segunda sidebar.

**Entregáveis:** Breakpoint tablet definido e usado; AppShell e SettingsLayout com comportamento específico para tablet; sem duplicação de barras.

---

### Fase 3 — Mobile (<768px): bottom nav e fluxos “settings”

**Objetivo:** Em mobile, uma única navegação principal (bottom nav); páginas de configuração em fluxo lista → detalhe, sem TopNavbar + sidebar.

1. **MobileShell como única fonte de chrome em mobile**
   - Garantir que, em mobile, **nenhuma** página interna renderize TopNavbar ou sidebar. O único chrome deve ser: header contextual (título + notificações) + bottom nav.
   - Se hoje `SettingsLayout` em mobile desenha TopNavbar + main + MobileBottomNav, **remover** o TopNavbar e usar só o header do MobileShell (ou um header mínimo por página) + conteúdo + bottom nav.

2. **Páginas “settings” em mobile**
   - Manter fluxo atual de lista (hub) → drill-down (ex.: Minha Conta → abas/telas) com botão “Voltar”.
   - Não adicionar segunda barra superior; no máximo um header da própria página (título + voltar), sem duplicar o header do MobileShell.

3. **Consistência com outras páginas**
   - Páginas que usam AppLayout em mobile já recebem apenas o conteúdo (e o shell dá header + bottom nav). Garantir que as que usam SettingsLayout se comportem igual: conteúdo + voltar quando em drill-down, sem layout “full page” com TopNavbar.

**Entregáveis:** Em mobile, uma única barra superior (do shell ou contextual) e uma única bottom nav; fluxos de configuração sem TopNavbar duplicado.

---

### Fase 4 — Ajustes finos e documentação

1. **Testes manuais por viewport**
   - Desktop: Início, Minha Conta, Parâmetros, uma página de Financeiro, uma de conteúdo (ex.: Lançamentos). Verificar: uma sidebar (ou sidebar + tabs), sem TopNavbar.
   - Tablet: mesmo conjunto; verificar drawer/overlay ou sidebar estreita, sem duas barras.
   - Mobile: mesmo conjunto; verificar bottom nav + header único, fluxo de configuração sem TopNavbar.

2. **Acessibilidade e toque**
   - Áreas clicáveis ≥ 44px em mobile/tablet; ordem de foco e labels para navegação.

3. **Documentação**
   - Atualizar `.cursorrules` ou doc de arquitetura com: quando usar `AppLayout` vs `SettingsLayout`; regras por viewport (desktop/tablet/mobile); que “settings” não desenham layout completo dentro do shell.

---

## Ordem sugerida de implementação

| # | Tarefa | Viewport | Prioridade |
|---|--------|----------|------------|
| 1 | SettingsLayout: não renderizar TopNavbar em desktop quando insideShell | Desktop | Alta |
| 2 | SettingsLayout: em desktop, manter só aside “Config” ou migrar para tabs no conteúdo | Desktop | Alta |
| 3 | Garantir MinhaConta e demais “settings” sem layout duplicado em desktop | Desktop | Alta |
| 4 | Breakpoint tablet (768–1023) + hook/constantes | Tablet | Média |
| 5 | AppShell: comportamento sidebar em tablet (drawer/overlay ou ícones) | Tablet | Média |
| 6 | SettingsLayout em tablet: tabs ou nav no conteúdo, sem segunda sidebar | Tablet | Média |
| 7 | SettingsLayout em mobile: remover TopNavbar, usar só shell header + conteúdo | Mobile | Alta |
| 8 | Revisão de todas as rotas que usam SettingsLayout (mobile/tablet/desktop) | Todos | Média |
| 9 | Testes manuais e acessibilidade | Todos | Média |
| 10 | Documentação (layout e convenções) | — | Baixa |

---

## Arquivos principais a tocar

- `apps/web/src/components/layout/SettingsLayout.tsx` — condicionar TopNavbar e aside por viewport e `insideShell`.
- `apps/web/src/design-system/layouts/AppShell.tsx` — eventualmente tratar tablet (sidebar drawer/overlay).
- `apps/web/src/design-system/layouts/DesktopShell.tsx` — se for preciso comportamento diferente em tablet.
- `apps/web/src/hooks/use-mobile.tsx` ou novo `useBreakpoint.ts` — breakpoints mobile / tablet / desktop.
- `apps/web/src/pages/MinhaConta.tsx` — garantir que não dependa de “full layout” do SettingsLayout em desktop.
- Demais páginas que usam `SettingsLayout`: Parametros, InstituicoesFinanceiras, ConfiguracoesFiscais, DadosFinanceiros, FinanceiroLayout, HistoricoPagamentos (e views).

---

## Critério de sucesso

- **Desktop:** Uma única navegação lateral (sidebar do app); páginas de configuração com subnav/tabs no conteúdo, sem TopNavbar nem segunda sidebar “full page”.
- **Tablet:** Navegação clara (drawer ou sidebar reduzida) sem menu horizontal superior + vertical ao mesmo tempo.
- **Mobile:** Bottom nav + header contextual único; fluxos de configuração em lista/drill-down, sem TopNavbar duplicado.

Isso elimina a sensação de “refatoração ruim” e deixa o comportamento da `/minha-conta` alinhado ao restante do app nas três versões (desktop, tablet, mobile).
