# Plano de refatoração: UI (menu/navegação) e revisão estrutural do backend

Este documento descreve o plano para recuperar a UI perdida nos últimos deploys, garantir que todas as páginas do menu estejam corretamente referenciadas, e realizar uma revisão estrutural do backend. O plano está particionado em fases com critérios de validação para execução passo a passo.

---

## Parte A — Diagnóstico atual

### A.1 Menu e navegação

| Camada | Fonte atual | Problema |
|--------|-------------|----------|
| **Desktop** | TopNavbar + useNavMenuPages (DB ou fallback) | Fallback está correto (Bens e Investimentos, Lançamentos, grupos). Se o DB retorna vazio ou com dados desatualizados, o menu pode estar incompleto ou errado. |
| **Mobile** | MobileShell + nav-config.tsx (NAV_ITEMS) | Labels errados: "Investimentos" (deveria ser "Bens e Invest."), "FIPE" (deveria estar dentro de Simuladores), "Perfil" (deveria estar em Configurações). Apenas 5 itens fixos, sem grupos. |
| **Sidebar** (se ainda usada) | nav-config.tsx | Mesmos 5 itens com labels incorretos. |

**Estrutura desejada (fonte de verdade):**

- **Itens principais (topo/barra):** Início, Bens e Investimentos, Lançamentos.
- **Grupos (dropdowns):**
  - **Planejamento:** Planejamento Mensal, Planejamento Anual, Metas Mensais.
  - **Controles:** Recorrentes, Contas a pagar/receber (e demais páginas de controle).
  - **Simuladores:** Hub Simuladores, Simulador FIPE, etc.
  - **Configurações:** Minha Conta, Assinatura, Instituições, etc.

### A.2 Backend — problemas conhecidos (últimos dias)

| Problema | Onde | Causa provável |
|----------|------|-----------------|
| Tabela `deletion_audit_log` não encontrada (PGRST205) | useUserTrash, Lixeira | Tabela nunca criada ou migração não aplicada no ambiente. |
| POST `page_views` 403 | Hub, SimuladorFipe, SimuladorCustoHora | RLS bloqueia insert (anon ou auth). |
| RPC `get_user_profile_settings` timeout/erro | ProtectedRoute, onboarding | RPC inexistente, lento ou com assinatura diferente. |
| pluggy-sync 401 | OutdatedConnectionBanner (já com guard de sessão no código novo) | Token/sessão não pronta no build antigo em cache. |
| Referências a tabelas/schemas | Diversos hooks e services | Mudança de “só tabelas” para “tabelas + schemas” ou renomeação de tabelas/colunas pode ter quebrado queries. |

### A.3 Backend — arquitetura de referência

- **Tabelas principais:** `pages`, `page_groups`, `profiles`, `subscription_plans`, etc., em `public`.
- **RPCs críticos:** `get_user_profile_settings`, `get_notifications_page`, `move_to_trash`, `restore_from_trash`, entre outros.
- **Frontend:** usa `supabase.from('table_name')` e `supabase.rpc('rpc_name')`; tipos em `integrations/supabase/types.ts` ou `integrations/types.ts`.

---

## Parte B — Plano de execução particionado

### Fase 1 — Menu: fonte única e labels corretos (UI)

**Objetivo:** Uma única fonte de verdade para a estrutura do menu; labels e agrupamentos alinhados à estrutura desejada (Bens e Investimentos, Lançamentos, Planejamento, Controles, Simuladores, Configurações).

**Passos:**

1. **1.1** Definir estrutura canônica em código (config estática ou constante):
   - Itens principais: Início, Bens e Investimentos, Lançamentos.
   - Grupos e filhos: Planejamento (Planejamento Mensal, Planejamento Anual, Metas Mensais), Controles (Recorrentes, Contas), Simuladores (Hub, Simulador FIPE, …), Configurações (Minha Conta, Assinatura, …).
   - Garantir que cada `path` exista em `App.tsx` (rota definida ou redirect).

2. **1.2** Alinhar **nav-config.tsx** à estrutura canônica:
   - Trocar "Investimentos" → "Bens e Investimentos" (path `/bens-investimentos`).
   - Trocar "FIPE" → "Simuladores" (path `/simuladores`) ou manter um item que leve ao hub de simuladores.
   - Trocar "Perfil" → "Minha Conta" (path `/minha-conta`) ou item que abra o grupo Configurações.
   - Manter número de itens do bottom nav mobile (ex.: 5) com os itens mais importantes; se "Perfil" for um deles, que aponte para Minha Conta.

3. **1.3** Alinhar **useNavMenuPages** (fallback estático):
   - Garantir que `getStaticFallbackItems()` tenha exatamente: mainItems (Início, Bens e Investimentos, Lançamentos) e groupedSections (Planejamento, Controles, Simuladores, Configurações) com os filhos corretos.
   - Remover ou ajustar "Meu IR" do mainItems se a regra for “só três itens principais”; caso Meu IR fique no menu, colocá-lo no grupo adequado (ex.: Planejamento ou Controles).

4. **1.4** (Opcional) Fazer o **mobile** usar a mesma fonte que o desktop:
   - Opção A: MobileShell continuar usando nav-config, mas nav-config já espelhar a estrutura canônica (feito em 1.2).
   - Opção B: MobileShell usar useNavMenuPages e exibir mainItems na bottom bar + drawer/menu para grupos (maior mudança de UX).

**Critérios de validação Fase 1:**

- [ ] Desktop: menu mostra "Bens e Investimentos", "Lançamentos", e dropdowns Planejamento, Controles, Simuladores, Configurações com as páginas corretas.
- [ ] Mobile: bottom nav com labels corretos (ex.: Bens e Invest., Simuladores, Minha Conta) e links funcionando.
- [ ] Nenhuma rota do menu retorna 404; páginas como Investimentos (aba), FIPE e Perfil acessíveis pelos itens corretos (Bens e Investimentos, Simuladores, Configurações).

---

### Fase 2 — Backend: inventário e tabelas/RPCs críticos

**Objetivo:** Listar todas as referências a tabelas e RPCs no frontend e conferir existência e assinaturas no backend.

**Passos:**

2. **2.1** Inventariar uso de Supabase no app:
   - Buscar `supabase.from('...')` e `supabase.rpc('...')` em `apps/web/src`.
   - Gerar lista: tabelas/views usadas, RPCs usados, arquivos onde aparecem.

2. **2.2** Confrontar com o schema do projeto:
   - Listar tabelas/views em `public` (migrations ou Supabase types).
   - Marcar: existente / não existente / nome diferente.
   - Para RPCs: listar funções em `public` (migrations ou schema) e comparar com a lista do frontend.

2. **2.3** Priorizar correções:
   - **Crítico:** tabelas/RPCs usados em fluxos principais (auth, onboarding, menu, lixeira, notificações, sync).
   - **Alto:** 404/403/500 conhecidos (ex.: deletion_audit_log, page_views, get_user_profile_settings).
   - **Médio:** restante.

**Critérios de validação Fase 2:**

- [ ] Documento ou planilha com: tabela/RPC, usado em (arquivos), existe no backend (sim/não), observação.
- [ ] Lista de itens “não existente” ou “assinatura diferente” com prioridade (crítico/alto/médio).

---

### Fase 3 — Backend: correções pontuais (tabelas e RPCs)

**Objetivo:** Resolver erros conhecidos que quebram a aplicação ou poluem o console.

**Passos:**

3. **3.1** Tabela `deletion_audit_log`:
   - Se a tabela deve existir: criar migração que cria `deletion_audit_log` com colunas esperadas por useUserTrash (id, user_id, action, entity_type, entity_id, entity_name, details, linked_records_deleted, created_at) e RLS adequado; aplicar no ambiente usado pelo app.
   - Se não deve existir (feature desativada): manter o código atual que trata PGRST205 e retorna lista vazia; não logar erro no console (já feito).

3. **3.2** Tabela `page_views`:
   - Revisar RLS: política de INSERT para usuários autenticados (e opcionalmente anon com session_id, se for o desenho).
   - Ajustar política ou payload (ex.: enviar user_id quando logado) para que o insert não retorne 403. Frontend já tem `.catch()` para não quebrar a UI.

3. **3.3** RPC `get_user_profile_settings`:
   - Confirmar que existe no schema e que retorna `{ profile: { onboarding_completed?: boolean } }` (ou o formato esperado pelo frontend).
   - Se não existir: criar migração com a função e permissões; se existir e for lento, otimizar ou manter timeout no frontend (já implementado).

3. **3.4** Outros RPCs/tabelas do inventário (Fase 2):
   - Para cada item prioritário “não existente” ou “assinatura diferente”: ou criar/alterar migração, ou ajustar o frontend para não chamar / chamar com a assinatura correta.

**Critérios de validação Fase 3:**

- [ ] Lixeira não gera erro no console por deletion_audit_log (tabela existe ou tratamento silencioso).
- [ ] page_views: insert não retorna 403 em ambiente alvo (ou 403 só em rede, sem impacto na UX).
- [ ] get_user_profile_settings responde no tempo esperado e onboarding não fica preso.
- [ ] Nenhum 404/500 novo em fluxos principais após as correções.

---

### Fase 4 — Backend: schemas e convenções

**Objetivo:** Garantir que referências a schema (ex.: `public`) e nomes de tabelas/colunas estejam consistentes entre migrations, types e frontend.

**Passos:**

4. **4.1** Revisar migrations recentes (últimos 30–60 dias):
   - Alterações de nome de tabela, coluna ou schema.
   - Uso de `public` vs outro schema.

4. **4.2** Revisar tipos TypeScript (integrations/supabase/types.ts ou equivalente):
   - Interfaces de tabelas e de retorno de RPCs.
   - Comparar com o schema real (migrations ou Supabase).

4. **4.3** Padronizar:
   - Todas as tabelas de app em `public` (salvo decisão explícita de usar outro schema).
   - Frontend usa apenas nomes que existem no schema; se algo foi movido de tabela para view ou RPC, atualizar chamadas e tipos.

**Critérios de validação Fase 4:**

- [ ] Nenhuma referência no código a tabela/coluna/schema que não exista no backend.
- [ ] Types alinhados ao schema (sem campos fantasmas ou obrigatórios a menos).

---

### Fase 5 — Banco de dados: página e grupos do menu

**Objetivo:** Garantir que, quando o menu vier do backend (pages + page_groups), os dados reflitam a mesma estrutura canônica definida na Fase 1.

**Passos:**

5. **5.1** Revisar page_groups no ambiente:
   - Grupos esperados: menu-principal, lancamentos, planejamento, controles, simuladores, configuracoes (e administracao se aplicável).
   - Ordem (order_index) e slugs corretos.

5. **5.2** Revisar pages no ambiente:
   - Cada rota usada no menu tem uma linha em `pages` com path e group_id corretos.
   - Páginas que devem aparecer no menu: is_active_users = true; ordem (order_in_group) coerente com a estrutura desejada.
   - Títulos e labels: “Bens e Investimentos”, “Minha Conta”, “Simulador FIPE”, etc.

5. **5.3** Migração de dados (se necessário):
   - Script ou migração SQL que insere/atualiza page_groups e pages para refletir a estrutura canônica (Fase 1), sem apagar dados de administração já existentes.

**Critérios de validação Fase 5:**

- [ ] Com menu vindo do DB, desktop e mobile exibem a mesma estrutura (itens principais + grupos) e labels corretos.
- [ ] Fallback (getStaticFallbackItems) só é usado quando o DB não retorna dados; quando retorna, o resultado é equivalente à estrutura canônica.

---

### Fase 6 — Regressão e deploy

**Objetivo:** Validar fluxos principais e fazer deploy controlado.

**Passos:**

6. **6.1** Checklist de fluxos:
   - Login / onboarding / redirect para /inicio.
   - Navegação: Início, Bens e Investimentos (e abas), Lançamentos, cada dropdown (Planejamento, Controles, Simuladores, Configurações) e uma página de cada grupo.
   - Lixeira (se ativa), notificações, simulador FIPE, Minha Conta.
   - Mobile: bottom nav e, se houver, drawer/menu com os mesmos destinos.

6. **6.2** Console do navegador:
   - Sem erros 404/403/500 em chamadas críticas; avisos conhecidos (ex.: Sentry DSN) já tratados ou documentados.

6. **6.3** Deploy:
   - Deploy em preview; validar com checklist.
   - Promover para produção ou fazer deploy de produção a partir do branch estável; garantir que o domínio principal (ex.: app.rxfin.com.br) aponte para o deploy que contém estas alterações.

**Critérios de validação Fase 6:**

- [ ] Todos os itens do checklist de fluxos passam em preview.
- [ ] Produção atualizada e sem regressões críticas de menu ou backend.

---

## Resumo da ordem de execução

| Fase | Nome | Entregável principal |
|------|------|----------------------|
| 1 | Menu: fonte única e labels | nav-config e useNavMenuPages alinhados; desktop e mobile com labels e rotas corretas. |
| 2 | Backend: inventário | Lista de tabelas/RPCs usados vs existentes; priorização. |
| 3 | Backend: correções pontuais | deletion_audit_log, page_views, get_user_profile_settings e outros itens prioritários resolvidos. |
| 4 | Backend: schemas e convenções | Código e types alinhados ao schema; sem referências a objetos inexistentes. |
| 5 | DB: páginas e grupos do menu | Dados em pages/page_groups consistentes com a estrutura canônica do menu. |
| 6 | Regressão e deploy | Checklist executado; deploy em preview e produção. |

---

## Arquivos principais envolvidos

- **Menu / UI:**  
  `apps/web/src/design-system/layouts/nav-config.tsx`,  
  `apps/web/src/hooks/useNavMenuPages.ts`,  
  `apps/web/src/components/layout/TopNavbar.tsx`,  
  `apps/web/src/design-system/layouts/MobileShell.tsx`,  
  `apps/web/src/design-system/layouts/Sidebar.tsx`,  
  `apps/web/src/App.tsx` (rotas).

- **Backend (frontend):**  
  `apps/web/src/integrations/supabase/client.ts`,  
  `apps/web/src/integrations/supabase/types.ts` (ou `integrations/types.ts`),  
  hooks e services que usam `supabase.from()` / `supabase.rpc()`.

- **Backend (schema):**  
  `apps/web/supabase/migrations/*.sql` (tabelas, RLS, RPCs).

Validação recomendada: após cada fase, marcar os critérios de validação e só então avançar para a próxima, ajustando o plano se surgirem novos problemas.
