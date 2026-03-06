# Plano de trabalho: padronização de layout desktop (RXFin)

## Objetivo

Estabelecer um **padrão único de visualização** para todas as páginas do RXFin na versão desktop, de forma que:
1. O conteúdo **ocupe a largura útil da tela** (sentido horizontal), sem faixas vazias desnecessárias.
2. **Todas as páginas** compartilhem o mesmo critério de largura, padding e estrutura de área de conteúdo.

---

## Diagnóstico atual

### Onde está o layout hoje

| Camada | Arquivo | Comportamento atual |
|--------|---------|---------------------|
| Shell desktop | `DesktopShell.tsx` | `main` com `flex-1 overflow-y-auto pt-14` — sem max-width. |
| Wrapper do app | `AppLayout.tsx` | `main` com `w-full max-w-full`, padding `px-4 md:px-6 lg:px-8`. Conteúdo dentro de `div` com `w-full max-w-full`. |
| Conteúdo por página | Variado | Cada página usa estrutura própria: algumas só `space-y-6`, outras `PageContainer` (95% / 1800px), outras `max-w-7xl`, outras sem wrapper. |

### Inconsistências identificadas

- **AppLayout** já permite largura total (`max-w-full`), mas várias páginas ou componentes internos limitam de novo a largura:
  - `PageContainer` (default): `xl:max-w-[95%] 2xl:max-w-[1800px]` — usado em quem importa esse componente.
  - `SettingsLayout`: `max-w-full xl:max-w-[95%] 2xl:max-w-[1800px]`.
  - Admin: `AdminSecureLayout` usa `max-w-7xl mx-auto`; algumas telas (ex.: AdminCRM) usam `max-w-[1600px]`.
  - Hub Simuladores: `max-w-7xl mx-auto`.
  - Planos (view): `max-w-full xl:max-w-[95%] 2xl:max-w-[1800px]`.
- Páginas que **não** usam nenhum wrapper (ex.: Início, Lançamentos, BensInvestimentos) dependem só do AppLayout; o “tamanho” vem do conteúdo (grids/colunas), mas não há um padrão explícito de “área de conteúdo” igual para todas.

### Consequência

- Falta de **padronização de tamanho**: algumas telas ficam “estreitas” (max-w-7xl, 1800px, 95%), outras “largas”.
- **Espaço horizontal** não é usado de forma uniforme e, em várias telas, sobra área vazia à direita.

---

## Padrão de visualização proposto

### Regras únicas para desktop (≥ md)

1. **Largura da área de conteúdo**
   - **Padrão:** ocupar **100% da largura útil** do `main` (já considerando o padding lateral do AppLayout).
   - **Opcional (telas muito largas):** em 2xl (ex.: 1536px+), pode-se aplicar um `max-w` generoso (ex.: 1920px ou 90vw) apenas para leitura/conforto, **centralizado**, desde que seja o mesmo valor em todas as páginas.

2. **Padding horizontal**
   - Manter o que já existe no `AppLayout`: `px-4 md:px-6 lg:px-8` para todas as páginas dentro do shell. Nenhuma página deve reduzir ou ampliar esse padding de forma diferente.

3. **Estrutura interna da página**
   - Cada página deve ter um único wrapper de conteúdo (ex.: `div` ou `PageContainer` com `fullWidth`) com:
     - `w-full`
     - `max-w-full` (ou, se adotado, o mesmo `max-w` opcional para 2xl).
   - Conteúdo interno (cards, grids, tabelas) deve usar **grids responsivos** (ex.: `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`) para preencher a largura, em vez de uma coluna fixa estreita.

4. **Páginas “especiais”**
   - **Formulários longos / leitura (ex.: termos, onboarding):** permitir `max-w-4xl` ou `max-w-5xl` **só nessa página**, mantendo padding do AppLayout.
   - **Admin:** pode manter um `max-w-7xl` ou valor único (ex.: 1600px) **em todas as telas admin**, desde que seja documentado e igual em todas.

---

## Inventário de páginas e uso atual

### Dentro do AppShell (DesktopShell + AppLayout)

| Página / Rota | Layout / wrapper atual | Observação |
|---------------|------------------------|------------|
| Início | `div.space-y-6` | Sem max-width; já usa grids. |
| Lançamentos | `AppLayout` + conteúdo com grids | Sem wrapper de largura extra. |
| Contas | `AppLayout` + `PageHeader` | Sem PageContainer. |
| Bens e Investimentos | `AppLayout` + `PageHeader` + tabs | Sem PageContainer. |
| Planejamento (layout + abas) | `PlanejamentoLayout` | Verificar se há max-width interno. |
| Planejamento Anual | Verificar | — |
| Cartão de crédito | Verificar | — |
| Registro de compras | `AppLayout` + `PageHeader` | Sem PageContainer. |
| Pacotes orçamento | Verificar | — |
| Sonhos | Verificar | — |
| Minha Conta | Verificar | — |
| Financeiro (planos, pagamentos, indicações) | `FinanceiroLayout` | Verificar wrapper. |
| Parâmetros | Verificar | — |
| Fluxo financeiro | Verificar | — |
| Recorrentes | Verificar | — |
| Notificações | Verificar | — |
| Alertas | Verificar | — |
| Lixeira | Verificar | — |
| Seguros | Verificar | — |
| Instituições financeiras | Verificar | — |
| Dados financeiros | Verificar | — |
| Configurações fiscais | Verificar | — |
| Configurações hub | Verificar | — |
| Gestão de veículos | `AppLayout` em layout | — |
| Meu IR | Verificar | — |
| Presentes | Verificar | — |
| RX Split / Dividir conta | Verificar | — |
| Simuladores (Hub) | `max-w-7xl mx-auto` | Reduz largura. |
| Simuladores (categorias e ferramentas) | Variado | Auditar. |
| Histórico de pagamentos | Verificar | — |
| Onboarding | Pode usar narrow | Manter foco em leitura. |

### Fora do AppShell (rotas protegidas com layout próprio)

| Página | Layout atual | Observação |
|--------|--------------|------------|
| Configurações hub | `ProtectedRoute` + componente | Verificar wrapper. |
| Configurações fiscais | Idem | — |
| Instituições / Dados financeiros | Idem | — |
| Admin (todas) | `AdminSecureLayout` (`max-w-7xl`) | Padronizar entre si. |

---

## Plano de execução (fases)

### Fase 1 — Definir e aplicar o padrão na raiz (1–2 dias)

1. **Documentar o padrão** neste arquivo (já feito na seção “Padrão de visualização proposto”).
2. **Criar um componente compartilhado** (ou consolidar uso do existente):
   - Opção A: `PageContent` — wrapper único com `className="w-full max-w-full"` (e, se aprovado, `2xl:max-w-[1920px] 2xl:mx-auto`). Usado por todas as páginas do app.
   - Opção B: Garantir que `PageContainer` com `fullWidth={true}` seja o padrão para páginas de conteúdo (não formulários longos) e que não haja outro wrapper com max-width a menos que seja exceção documentada.
3. **AppLayout:** manter `w-full max-w-full` no wrapper do conteúdo; não reintroduzir `max-w-[95%]` ou `1800px` no fluxo principal.
4. **DesktopShell:** manter `main` sem max-width.

Entregável: padrão definido + componente/wrapper único aplicado no AppLayout ou disponível para uso em todas as páginas.

---

### Fase 2 — Auditoria por página (1 dia)

1. Listar **todas** as rotas que renderizam dentro do AppShell (desktop).
2. Para cada uma, verificar:
   - Se usa `PageContainer` e com quais props (`narrow`, `fullWidth`).
   - Se usa `max-w-*` ou `max-w-[...]` no primeiro nível de conteúdo.
   - Se o conteúdo interno usa grid/cols responsivos ou uma única coluna.
3. Preencher uma tabela (ou atualizar a tabela deste doc) com: rota, wrapper atual, ajuste necessário (ex.: “usar PageContent / fullWidth”, “remover max-w-7xl”, “manter max-w-5xl por ser formulário”).

Entregável: lista de ajustes por arquivo/rota.

---

### Fase 3 — Ajustes por grupo de páginas (2–4 dias)

Aplicar em lotes para facilitar revisão e deploy:

1. **Lote 1 — Páginas principais (Início, Lançamentos, Bens e Investimentos, Contas, Planejamento)**  
   - Garantir que usem o wrapper padrão (PageContent ou PageContainer fullWidth).  
   - Revisar grids (lg/xl/2xl) para uso da largura.

2. **Lote 2 — Controles e configurações (Recorrentes, Parâmetros, Minha Conta, Financeiro, Configurações hub, etc.)**  
   - Mesmo critério de wrapper e remoção de max-width desnecessário.  
   - Exceções: abas “formulário longo” com max-w-4xl/5xl documentado.

3. **Lote 3 — Simuladores (Hub e subpáginas)**  
   - Substituir `max-w-7xl mx-auto` por largura total (ou pelo mesmo padrão opcional 2xl).  
   - Ajustar grids internos para preencher a tela.

4. **Lote 4 — Demais (Sonhos, Alertas, Notificações, Seguros, Gestão veículos, Meu IR, etc.)**  
   - Aplicar o mesmo padrão e exceções apenas onde fizer sentido (ex.: leitura).

5. **Lote 5 — Admin**  
   - Definir um único max-width para todo o admin (ex.: `max-w-7xl` ou `1600px`) e aplicar em `AdminSecureLayout` e em qualquer tela que use outro valor (ex.: AdminCRM `max-w-[1600px]`).

Entregável: todas as páginas do app (e admin) aderentes ao padrão documentado.

---

### Fase 4 — Revisão e critérios de aceite (0,5–1 dia)

1. **Desktop (≥ 1024px):** em cada página, verificar que:
   - Não há faixa vazia fixa à direita (exceto se houver um max-width único e documentado para 2xl).
   - O padding horizontal é o do AppLayout.
   - Cards/listas usam mais de uma coluna quando a tela é larga (lg/xl).
2. **Tablet (768px–1023px):** comportamento coerente (ex.: 2 colunas onde fizer sentido).
3. **Mobile:** sem alteração de comportamento atual (layout em coluna).
4. **Regressão:** navegação e conteúdo visíveis em todas as rotas principais.

Entregável: checklist executado e anotações de ajustes finos, se houver.

---

### Fase 5 — Documentação e manutenção

1. Atualizar este documento com o resultado da auditoria (tabela preenchida) e com a decisão final sobre:
   - Nome do componente de wrapper (PageContent vs PageContainer fullWidth).
   - Valor de max-width opcional em 2xl, se houver.
   - Exceções (quais páginas usam narrow ou max-w-4xl/5xl e por quê).
2. Incluir no guia de estilo ou no README do front uma seção curta: “Layout desktop — padrão de largura e uso de tela”.

Entregável: doc atualizado + regra clara para novas páginas.

---

## Resumo

| Fase | Atividade | Entregável |
|------|-----------|------------|
| 1 | Definir padrão + componente/wrapper único na raiz | Padrão + AppLayout/PageContent alinhados |
| 2 | Auditoria de todas as páginas desktop | Lista de ajustes por rota |
| 3 | Ajustes em lotes (principais → controles → simuladores → demais → admin) | Páginas aderentes ao padrão |
| 4 | Revisão e aceite (desktop/tablet/mobile) | Checklist e ajustes finos |
| 5 | Documentação e regra para novas páginas | Doc atualizado + guia |

Com isso, todas as páginas do RXFin passam a seguir um **padrão único de visualização** e a **ocupar o tamanho da tela** no sentido horizontal de forma consistente na versão desktop.

---

## Resultado da execução do plano

### Fase 1 (concluída)
- **PageContainer** (shared + components): padrão alterado para `fullWidth = true`; default passa a ser largura total (`w-full max-w-full min-w-0`). Uso de `narrow={true}` para páginas de formulário/leitura quando necessário.
- **AppLayout** e **DesktopShell**: mantidos com `w-full max-w-full`; sem alteração.

### Fase 2 + 3 (ajustes aplicados)
| Arquivo | Ajuste |
|---------|--------|
| `SettingsLayout.tsx` | Inner wrapper: `max-w-full xl:max-w-[95%] 2xl:max-w-[1800px]` → `w-full max-w-full min-w-0` |
| `pages/simuladores/Hub.tsx` | `main`: `max-w-7xl mx-auto` → `w-full max-w-full` |
| `pages/financeiro/PlanosTab.tsx` | Removido `xl:max-w-[95%] 2xl:max-w-[1800px]`; uso de `w-full max-w-full min-w-0` |
| `views/financeiro/PlanosTab.tsx` | Idem |
| `views/Planos.tsx` | Idem |
| `pages/admin/AdminCRM.tsx` | `max-w-[1600px]` → `w-full max-w-full` (AdminSecureLayout mantém `max-w-7xl`) |
| `views/admin/AdminCRM.tsx` | Idem |

### Exceções mantidas (conforme plano)
- **Admin**: `AdminSecureLayout` mantém `max-w-7xl mx-auto` para todas as telas admin.
- **Landing (marketing)**: mantido `max-w-7xl` nas seções; não faz parte do app autenticado.
- **DemoDataBanner**: mantido `max-w-[1800px]` apenas no conteúdo interno do banner (não na área de páginas).

### Fase 4 — Checklist de aceite (para validação manual)
- [ ] Desktop (≥1024px): sem faixa vazia fixa à direita nas páginas do app (Início, Lançamentos, Bens, Contas, Planejamento, Financeiro, Simuladores Hub, Configurações, etc.).
- [ ] Tablet (768–1023px): 2 colunas onde aplicável.
- [ ] Mobile: layout em coluna preservado.
- [ ] Navegação e conteúdo visíveis em todas as rotas principais.

### Fase 5 — Decisão documentada
- **Wrapper padrão**: `PageContainer` com default `fullWidth={true}` (não foi criado componente `PageContent` separado).
- **Max-width opcional 2xl**: não adotado; conteúdo usa 100% da largura útil.
- **Exceções**: Admin = `max-w-7xl` no layout; formulários longos podem usar `PageContainer narrow` ou `max-w-4xl`/`max-w-5xl` na página quando necessário.
