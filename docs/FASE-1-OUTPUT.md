# Fase 1 — Menu: fonte única e labels corretos (UI) — Output

Documento que descreve o que foi executado na **Fase 1** do plano de refatoração e o resultado (output) das alterações.

---

## Objetivo da Fase 1

Uma única fonte de verdade para a estrutura do menu; labels e agrupamentos alinhados à estrutura desejada: **Início**, **Bens e Investimentos**, **Lançamentos** como itens principais; grupos **Planejamento**, **Controles**, **Simuladores**, **Configurações** com as páginas corretas.

---

## O que foi feito

### 1. `apps/web/src/design-system/layouts/nav-config.tsx`

**Alterações em `NAV_ITEMS` (usado pela bottom nav mobile e pela Sidebar):**

| Antes (label) | Depois (label) | path        |
|---------------|----------------|-------------|
| Home          | **Início**     | /inicio     |
| Lançamentos   | Lançamentos    | /lancamentos |
| Investimentos | **Bens e Invest.** | /bens-investimentos |
| FIPE          | **Simuladores**    | /simuladores |
| Perfil        | **Minha Conta**   | /minha-conta |

- Foi adicionado um comentário JSDoc em `NAV_ITEMS` descrevendo a estrutura canônica.
- **TITLE_MAP** não foi alterado; já estava correto (ex.: "Bens e Investimentos", "Minha Conta", "Simuladores").
- `getPageTitle()` e `isNavActive()` seguem iguais; continuam usando `NAV_ITEMS` e `TITLE_MAP` como antes.

**Arquivos que consomem `nav-config`:**
- `MobileShell.tsx` — bottom nav (labels exibidos = `NAV_ITEMS[].label`).
- `Sidebar.tsx` — itens laterais (labels = `NAV_ITEMS[].label`).
- `getPageTitle()` — título do header no mobile (usa `TITLE_MAP` primeiro; fallback em `NAV_ITEMS`).

**Resultado:** No mobile e na sidebar, os 5 itens passam a exibir: **Início**, **Lançamentos**, **Bens e Invest.**, **Simuladores**, **Minha Conta**.

---

### 2. `apps/web/src/hooks/useNavMenuPages.ts`

**Alterações em `getStaticFallbackItems()` (fallback quando a query de páginas retorna vazio):**

1. **`mainItems` (itens principais do desktop):**
   - **Antes:** 4 itens — Início, Bens e Investimentos, Lançamentos, **Meu IR**.
   - **Depois:** 3 itens — **Início**, **Bens e Investimentos**, **Lançamentos** (apenas esses três como “principal”).
   - **Meu IR** foi removido dos itens principais e passou a existir apenas dentro de um grupo.

2. **`groupedSections` (dropdowns):**
   - **Planejamento:** inalterado (Planejamento Mensal, Planejamento Anual, Metas Mensais).
   - **Controles:** inalterado (Recorrentes, Contas a pagar/receber).
   - **Simuladores:** inalterado (Hub Simuladores, Simulador FIPE).
   - **Configurações:** **Meu IR** adicionado como terceiro item — Minha Conta, Assinatura, **Meu IR**.

3. Foi adicionado um comentário no fallback descrevendo a estrutura canônica (3 itens principais + 4 grupos).

**Resultado:** Quando o menu desktop usa o fallback (DB vazio ou sem páginas), a barra superior mostra só **Início**, **Bens e Investimentos** e **Lançamentos**; os dropdowns mostram Planejamento, Controles, Simuladores e Configurações, com **Meu IR** em Configurações. A rota `/meu-ir` já existe em `App.tsx` e continua acessível pelo menu.

---

## Resumo do output

| Camada        | Fonte                    | Alteração |
|---------------|--------------------------|-----------|
| **Mobile**    | `nav-config.tsx` → `NAV_ITEMS` | Labels: Home→Início, Investimentos→Bens e Invest., FIPE→Simuladores, Perfil→Minha Conta. |
| **Sidebar**   | `nav-config.tsx` → `NAV_ITEMS` | Mesmos labels acima. |
| **Desktop**   | `useNavMenuPages` → fallback     | mainItems com 3 itens (Início, Bens e Investimentos, Lançamentos); Meu IR só no grupo Configurações. |

---

## Critérios de validação (checklist)

- [x] **Desktop:** Com fallback, o menu mostra "Bens e Investimentos", "Lançamentos" e os dropdowns Planejamento, Controles, Simuladores, Configurações com as páginas corretas (incluindo Meu IR em Configurações).
- [x] **Mobile:** Bottom nav com labels **Início**, **Lançamentos**, **Bens e Invest.**, **Simuladores**, **Minha Conta**; links inalterados.
- [x] **Sidebar:** Mesmos labels do mobile quando usar `NAV_ITEMS`.
- [x] Nenhuma rota do menu foi removida; `/meu-ir` continua em `App.tsx` e acessível pelo grupo Configurações no fallback.

---

## Arquivos modificados

1. **`apps/web/src/design-system/layouts/nav-config.tsx`** — Ajuste de labels em `NAV_ITEMS` e comentário.
2. **`apps/web/src/hooks/useNavMenuPages.ts`** — Redução de `mainItems` para 3 itens, inclusão de Meu IR em Configurações no fallback e comentário.

Nenhum outro arquivo foi alterado. **AdminSidebar** usa seu próprio `NAV_ITEMS` local (admin); não foi tocado.

---

## Próximo passo (Fase 2)

Conforme o plano: **Backend — inventário e tabelas/RPCs críticos** (listar referências a `supabase.from` / `supabase.rpc` e confrontar com o schema). O inventário da Parte A já está em `docs/PARTE-A-DIAGNOSTICO-RESULTADO.md`.
