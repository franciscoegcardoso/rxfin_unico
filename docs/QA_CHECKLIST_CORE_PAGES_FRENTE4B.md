# QA Checklist — Páginas Core (Frente 4, Bloco 4B)

**Projeto:** RXFin · **App:** https://app.rxfin.com.br · **Supabase:** kneaniaifzgqibpajyji  
**Dados de referência:** 12 usuários beta, 1.296 transactions, 251 budget_items, 10 assets, 2 pluggy_connections, 3 pluggy_accounts, 1.266 pluggy_transactions, 7 notifications.

---

## Critérios de aprovação globais (todas as páginas)

| Critério | Descrição |
|----------|-----------|
| ✅ Carregamento | Página carrega sem tela branca ou erro 500 |
| ✅ Dados reais | Dados reais aparecem (não mock/placeholder) |
| ✅ Layout | Layout não quebra em 1280px (desktop padrão) |
| ✅ Console | Nenhum erro no console do browser (F12) |
| ✅ Persistência | Operações de escrita (criar/editar/deletar) funcionam e persistem no Supabase |

---

## Tarefa 1 — Checklist de QA por página

### Alta prioridade (dados reais existentes)

| Página | Rota | O que testar | Critério de aprovação | Dado esperado |
|--------|------|--------------|------------------------|---------------|
| Dashboard (Início) | `/inicio` ou `/dashboard` → redireciona para `/inicio` | KPIs do mês, saldo, gráficos, metas, resumo de cartão | Valores numéricos preenchidos; gráficos renderizam; sem "0" ou vazio indevido | RPC `get_home_dashboard` retorna `month_summary`, `expenses_by_category`; totais coerentes com 1.296 transactions |
| Lançamentos | `/lancamentos` | Lista de lançamentos, filtros por mês/tipo, criar/editar/deletar, marcar como pago | Lista carrega; filtros funcionam; CRUD persiste; sem travamento com muitos itens | 1.296 registros acessíveis (com paginação ou virtualização se houver); `useLancamentosRealizados` + RPCs de CRUD |
| Open Finance (Bens e Investimentos) | `/bens-investimentos` | Conexões Pluggy, contas sincronizadas, investimentos, transações | 2 conexões e 3 contas visíveis; seção Open Finance com dados | Tabelas `pluggy_connections`, `pluggy_accounts`; componentes usam essas tabelas (não `pluggy_items`) |
| Cartão de Crédito | `/cartao-credito` | Faturas, lançamentos por fatura, sincronização Open Finance | Faturas listadas; transações por fatura; botão conectar/sincronizar funciona | Dados de `credit_card_bills` e transações; integração Pluggy cartão |
| Planejamento Mensal | `/planejamento` | Abas (visão mensal, metas, análises), 251 itens de orçamento | Itens de orçamento carregam; abas navegam; totais corretos | `budget_items`; 251 registros refletidos na UI |
| Contas a Pagar/Receber | `/contas` | Lista de contas, CRUD, status de pagamento | Lista carrega; criar/editar/excluir persiste | `contas_pagar_receber`; operações via hooks/RPCs |
| Fluxo Financeiro | `/fluxo-financeiro` | Gráfico entradas vs saídas, período | Gráfico renderiza com dados do período; eixo e legendas corretos | Dados derivados de lançamentos/transactions |
| Relatório Financeiro | `/financeiro` | Abas (planos, pagamentos, indicações), exportação, totais | Navegação entre abas; exportação gera arquivo; totais corretos | Dados de planos e pagamentos; export sem erro |

### Média prioridade

| Página | Rota | O que testar | Critério de aprovação | Dado esperado |
|--------|------|--------------|------------------------|---------------|
| Gestão de Veículos | `/gestao-veiculos` | Lista de veículos, registros, abas (registros, relatórios) | 10 assets do tipo vehicle aparecem; CRUD de veículo/registro persiste | `user_assets` com `type = 'vehicle'` (10 no banco); não usar tabela `vehicles` |
| Simulador FIPE | `/simuladores/veiculos/simulador-fipe` | Seleção marca/modelo/ano, tabela FIPE, gráfico histórico, safra | Cascata funciona; preços FIPE carregam; gráfico e safra exibem dados | RPCs `get_fipe_price_history`, `get_fipe_safra_analysis`; ano inteiro (ex.: 2023 de "2023-5") |
| Meu IR | `/meu-ir` (ou rota equivalente) | Relatório fiscal, bens e direitos | Página carrega; dados fiscais exibidos conforme config | Integração IR; dados de bens/ativos |
| Metas Mensais | `/metas-mensais` ou `/planejamento?tab=metas` | Metas do mês, progresso | Metas listadas; progresso calculado | Redirecionamento ou aba metas em planejamento |
| Planejamento Anual | `/planejamento-anual` | Visão anual, projeções | Página carrega; dados anuais coerentes | Dados agregados por ano |
| Notificações | `/notificacoes` | Lista de notificações, marcar como lida, filtros | 7 notificações acessíveis; marcar lida atualiza lista e badge | Tabela `notifications`; RPCs `get_notifications_page`, `mark_notification_read` |

### Configurações e Auth

| Página | Rota | O que testar | Critério de aprovação | Dado esperado |
|--------|------|--------------|------------------------|---------------|
| Minha Conta | `/minha-conta` | Editar perfil (nome, email, etc.), salvar | Campos editáveis; salvar persiste; sem erro 500 | `profiles`, `profile_preferences` atualizados |
| Configurações Hub | `/configuracoes-hub` | Navegação para subconfigurações | Links/abas funcionam; páginas filhas carregam | Rotas de configuração acessíveis |
| Fluxo Auth | Login → Dashboard → Logout → Login | Login com email/senha; redirecionamento pós-login; logout; novo login | Login sucesso → `/inicio`; logout limpa sessão; novo login funciona | Supabase Auth; redirect pós-login correto |

---

## Tarefa 3 — Template de bug report para Cursor

Use este bloco ao reportar um bug para o Cursor (copiar e preencher):

```
PÁGINA: [nome e rota, ex.: Lançamentos /lancamentos]
SEVERIDADE: [crítico / alto / médio / baixo]
DESCRIÇÃO: [o que está errado em 1 linha]
COMPORTAMENTO ATUAL: [o que acontece]
COMPORTAMENTO ESPERADO: [o que deveria acontecer]
DADO DE TESTE: [ex: usuário beta X, transação Y]
SCREENSHOT: [descrever o que está visível]
```

---

## Tarefa 4 — Prompts Cursor pré-prontos para bugs prováveis

### Bug A — Dashboard (Início) com KPIs zerados

**Possível causa:** A RPC `get_home_dashboard` ou a view que consome `transactions`/lançamentos não está somando corretamente após migração de schemas (ex.: `search_path` ou tabela referenciada incorreta).

**Prompt Cursor (cirúrgico):**

```
O Dashboard (página Início) está exibindo KPIs zerados (receita, despesa, saldo do mês). O hook useHomeDashboard em apps/web/src/hooks/useHomeDashboard.ts chama a RPC get_home_dashboard(p_month). 

Tarefas:
1. Verificar no Supabase (SQL) se a função get_home_dashboard existe e se ela lê da tabela correta de transações/lançamentos (ex.: public.transactions ou a view/tabela usada pelo app).
2. Se a RPC estiver correta, verificar em apps/web/src/pages/Inicio.tsx onde month_summary (total_income, total_expense, balance) é exibido e se os campos do objeto retornado batem com o que a RPC retorna (nomes de propriedades, aninhamento).
3. Corrigir apenas o necessário: ou a definição da RPC no banco (se tiver acesso às migrations), ou o mapeamento no frontend em Inicio.tsx / componentes de resumo (ex.: BudgetInsightsSummary, MonthSummaryCard).

Restrição: não alterar schemas de tabelas; apenas queries, RPC ou mapeamento no frontend.
```

---

### Bug B — Open Finance mostrando 0 contas

**Possível causa:** Algum componente referencia tabela `pluggy_items` (inexistente); as tabelas corretas são `pluggy_connections`, `pluggy_accounts`, `pluggy_transactions`, `pluggy_investments`.

**Prompt Cursor (cirúrgico):**

```
Na página Open Finance / Bens e Investimentos, a seção de contas/conexões Pluggy mostra 0 contas. No banco existem 2 pluggy_connections e 3 pluggy_accounts.

Tarefas:
1. Buscar em apps/web/src por referências a "pluggy_items" ou qualquer tabela que não seja pluggy_connections, pluggy_accounts, pluggy_transactions ou pluggy_investments.
2. Corrigir para usar as tabelas corretas: pluggy_connections para conexões e pluggy_accounts para contas (com join em connection_id). Os serviços em apps/web/src/core/services/pluggy.ts já usam essas tabelas — garantir que todos os componentes/hooks que exibem contas Open Finance usem esses serviços ou as mesmas tabelas.
3. Arquivos mais prováveis: componentes em apps/web/src/components/bens/ (ex.: BalancoPatrimonialSection.tsx, InvestimentosPluggy), apps/web/src/hooks/usePluggyConnect.ts e usePluggyInvestments.ts. Ajustar apenas o necessário, 1 arquivo por vez se possível.

Restrição: não alterar schemas; apenas frontend e nomes de tabelas nas queries.
```

---

### Bug C — Lançamentos sem paginação ou travando com muitos registros

**Possível causa:** A lista de lançamentos carrega todos os registros de uma vez (ex.: 1.296); não há LIMIT nem paginação/virtualização.

**Prompt Cursor (cirúrgico):**

```
A página de Lançamentos (/lancamentos) está travando ou muito lenta com muitos registros (ex.: 1.296). É necessário implementar paginação no servidor e na UI.

Tarefas:
1. Em apps/web/src/core/services/lancamentos.ts: na função que busca lançamentos (ex.: fetchLancamentos ou equivalente que chama Supabase), adicionar parâmetros de paginação (limit, offset ou page/pageSize) e usar .range(offset, offset+limit-1) ou .limit(limit). Tamanho de página sugerido: 50.
2. No hook apps/web/src/hooks/useLancamentosRealizados.ts: passar parâmetros de página e manter estado de página atual; ou substituir por useInfiniteQuery (TanStack Query) para "carregar mais" com 50 itens por página.
3. Na UI (apps/web/src/pages/Lancamentos.tsx ou apps/web/src/views/Lancamentos.tsx): exibir apenas a página atual; adicionar controles "Próxima" / "Anterior" ou botão "Carregar mais". Manter filtros existentes (mês, tipo) aplicados antes da paginação.

Restrição: não remover funcionalidade existente; apenas adicionar paginação. Máximo 1–2 arquivos por alteração se possível.
```

---

### Bug D — Gestão de Veículos não encontrando assets

**Possível causa:** Algum código busca em tabela `vehicles` (inexistente). Os veículos estão em `user_assets` com `type = 'vehicle'`. O app já usa `config.assets` do FinancialContext (useUserAssets → `user_assets`); verificar se há outro caminho que use tabela errada.

**Prompt Cursor (cirúrgico):**

```
A página Gestão de Veículos (/gestao-veiculos) não lista os 10 veículos que existem no banco. Os veículos estão na tabela user_assets com type = 'vehicle' (não existe tabela "vehicles").

Tarefas:
1. Em apps/web/src/pages/GestaoVeiculos.tsx e apps/web/src/views/GestaoVeiculos.tsx: confirmar que a lista de veículos vem de config.assets.filter(a => a.type === 'vehicle') (FinancialContext → useUserAssets → user_assets). Se houver qualquer query direta a Supabase usando .from('vehicles'), remover e usar apenas config.assets.
2. Buscar em apps/web/src por .from('vehicles') ou referências à tabela "vehicles". Se existir, corrigir para usar user_assets com filtro asset_type = 'vehicle' ou, no app, config.assets filtrado por type === 'vehicle'.
3. O hook useUserAssets em apps/web/src/hooks/useUserAssets.ts já lê de user_assets — garantir que nenhum outro componente de Gestão de Veículos faça fetch direto em tabela incorreta.

Restrição: não alterar schema; apenas corrigir tabela/query no frontend.
```

---

## Resumo

- **Checklist:** usar a tabela por página para testar cada rota no browser (incluindo aba anônima após deploy).
- **Bug report:** preencher o template acima para cada problema encontrado.
- **Prompts:** usar o prompt correspondente (A, B, C ou D) conforme o sintoma; se o bug for outro, reportar com o template e descrever o arquivo/trecho suspeito.

Documento gerado para a Frente 4, Bloco 4B — QA Core Pages.
