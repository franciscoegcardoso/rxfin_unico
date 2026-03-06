# Fase 5 — Banco de dados: página e grupos do menu — Output

Documento gerado pela execução da **Fase 5** do plano de refatoração. Garante que, quando o menu vier do backend (`pages` + `page_groups`), os dados reflitam a estrutura canônica definida na Fase 1.

---

## Objetivo da Fase 5

Garantir que os dados em `page_groups` e `pages` no Supabase reflitam a mesma estrutura canônica do menu: **3 itens principais** (Início, Bens e Investimentos, Lançamentos) e **grupos** Planejamento, Controles, Simuladores, Configurações (e Administração).

---

## 5.1 Page groups (revisão e ordem)

Grupos esperados e `order_index` aplicado na migração:

| slug           | name           | order_index |
|----------------|----------------|-------------|
| menu-principal | Menu Principal | 0           |
| lancamentos    | Lançamentos    | 1           |
| controles      | Controles      | 2           |
| planejamento   | Planejamento   | 3           |
| simuladores    | Simuladores    | 4           |
| configuracoes  | Configurações  | 5           |
| administracao   | Administração  | 6           |

- O grupo **controles** é criado pela migração se não existir (`INSERT ... WHERE NOT EXISTS`).
- Demais grupos são apenas reordenados com `UPDATE ... SET order_index = N WHERE slug = '...'`.

---

## 5.2 Pages (revisão e alinhamento)

### Menu principal (grupo `menu-principal`)

Apenas **3 páginas** devem aparecer como itens principais (barra superior desktop):

| slug               | path                | title                 | order_in_group |
|--------------------|---------------------|-----------------------|----------------|
| inicio             | /inicio             | Início                | 0              |
| bens-investimentos | /bens-investimentos | Bens e Investimentos   | 1              |
| lancamentos        | /lancamentos        | Lançamentos           | 2              |

- **dashboard**, **parametros**, **planos** (se ainda estiverem em `menu-principal`) passam a `is_active_users = false` para não aparecerem na barra principal (continuam no banco para uso em Admin ou redirecionamentos).

### Grupo Controles

| slug       | path         | title                     | order_in_group |
|------------|--------------|---------------------------|----------------|
| recorrentes | /recorrentes | Recorrentes               | 0              |
| contas     | /contas      | Contas a pagar/receber    | 1              |

- A página **recorrentes** é inserida pela migração se não existir.
- A página **contas** é atualizada para o grupo `controles` e título "Contas a pagar/receber".

### Grupo Planejamento

| slug               | title               | order_in_group |
|--------------------|---------------------|----------------|
| planejamento       | Planejamento Mensal | 0              |
| planejamento-anual | Planejamento Anual  | 1              |
| metas-mensais      | Metas Mensais       | 2              |

- **Meu IR** foi movido para o grupo **Configurações** (estrutura canônica Fase 1).

### Grupo Simuladores

| slug           | path                                      | title            | order_in_group |
|----------------|-------------------------------------------|------------------|----------------|
| simuladores    | /simuladores                              | Hub Simuladores  | 0              |
| simulador-fipe | /simuladores/veiculos/simulador-fipe      | Simulador FIPE   | 1              |

### Grupo Configurações

| slug        | path          | title       | order_in_group |
|-------------|---------------|-------------|----------------|
| minha-conta | /minha-conta  | Minha Conta | 0              |
| assinatura  | /planos       | Assinatura  | 1              |
| meu-ir      | /meu-ir       | Meu IR      | 2              |

- **minha-conta**: atualizada para grupo `configuracoes`, ordem 0.
- **assinatura**: inserida pela migração se não existir (path `/planos`, título "Assinatura").
- **meu-ir**: movido do grupo planejamento para `configuracoes`, ordem 2.

---

## 5.3 Migração criada

**Arquivo:** `apps/web/supabase/migrations/20260328100000_fase5_page_groups_pages_canonical.sql`

**Conteúdo resumido:**

1. **page_groups:** `UPDATE` de `order_index` para cada slug; `INSERT` do grupo `controles` se não existir.
2. **Menu principal:** `UPDATE` em `inicio`, `bens-investimentos`, `lancamentos` (group_id = menu-principal, order_in_group 0/1/2, títulos corretos); `UPDATE` em dashboard/parametros/planos para `is_active_users = false` quando em menu-principal.
3. **Controles:** `INSERT` de `recorrentes` se não existir; `UPDATE` de `contas` para grupo controles e título.
4. **Planejamento:** `UPDATE` de títulos e ordem para planejamento, planejamento-anual, metas-mensais.
5. **Simuladores:** `UPDATE` de simuladores e simulador-fipe (títulos, path canônico do FIPE, ordem).
6. **Configurações:** `UPDATE` de minha-conta (grupo e ordem); `INSERT` de assinatura se não existir; `UPDATE` de meu-ir para grupo configuracoes e ordem 2.

A migração usa `(SELECT id FROM page_groups WHERE slug = '...' LIMIT 1)` para `group_id`, sem UUIDs fixos, para funcionar em qualquer ambiente.

---

## Critérios de validação Fase 5

- [ ] **Com menu vindo do DB:** desktop e mobile exibem a mesma estrutura (3 itens principais + grupos) e labels corretos (Início, Bens e Investimentos, Lançamentos, Planejamento, Controles, Simuladores, Configurações).
- [ ] **Fallback:** `getStaticFallbackItems()` só é usado quando a query retorna 0 resultados; quando o DB retorna dados, o resultado é equivalente à estrutura canônica.

**Como validar após aplicar a migração:**

1. Aplicar a migração no projeto Supabase (SQL Editor com o conteúdo do arquivo ou `supabase db push` se o histórico estiver alinhado).
2. No app, com usuário logado, abrir o menu desktop (TopNavbar): devem aparecer **Início**, **Bens e Investimentos**, **Lançamentos** como itens principais e os dropdowns **Planejamento**, **Controles**, **Simuladores**, **Configurações** com as páginas listadas acima.
3. Mobile: bottom nav e menu “mais” devem refletir os mesmos destinos e labels (via `nav-config` e, quando aplicável, dados do DB).

---

## Observações

- **Rota /assinatura:** A página "Assinatura" no menu usa `path = /planos` (componente Planos). Se no futuro existir rota dedicada `/assinatura`, basta atualizar o path na tabela `pages` (slug `assinatura`).
- **Administração:** O grupo `administracao` e suas páginas não foram alterados; continuam apenas com `order_index` 6.
- **Páginas já desativadas:** Migrações anteriores (ex.: dashboard, metas-mensais com `is_active_users = false`) são preservadas; a Fase 5 apenas garante a estrutura canônica e oculta itens antigos do menu principal quando ainda estão no grupo menu-principal.
