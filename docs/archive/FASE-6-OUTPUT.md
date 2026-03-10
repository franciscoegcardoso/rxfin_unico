# Fase 6 — Regressão e deploy — Output

Documento gerado pela execução da **Fase 6** do plano de refatoração. Inclui checklist de validação, notas sobre o console e orientações de deploy.

---

## Objetivo da Fase 6

Validar fluxos principais e garantir deploy controlado (preview e produção) sem regressões críticas de menu ou backend.

---

## 6.1 Checklist de fluxos

Executar manualmente em **preview** e/ou **produção** após o deploy. Marcar conforme validar.

### Autenticação e onboarding
- [ ] **Login:** acessar `/login`, fazer login e ser redirecionado para `/inicio` (ou `/onboarding` se não concluído).
- [ ] **Onboarding:** usuário novo ou sem onboarding concluído é enviado para `/onboarding`; ao concluir, redireciona para `/inicio` e não volta a pedir onboarding.
- [ ] **Redirect pós-login:** usuário já com onboarding concluído vai para `/inicio`.

### Navegação desktop (TopNavbar)
- [ ] **Início:** item "Início" no menu principal leva a `/inicio` e a página carrega.
- [ ] **Bens e Investimentos:** item "Bens e Investimentos" leva a `/bens-investimentos`; abas (Consolidado, Patrimônio, Investimentos, etc.) funcionam.
- [ ] **Lançamentos:** item "Lançamentos" leva a `/lancamentos` e a página carrega.
- [ ] **Dropdown Planejamento:** abre; links para Planejamento Mensal, Planejamento Anual, Metas Mensais levam às rotas corretas.
- [ ] **Dropdown Controles:** abre; Recorrentes e Contas a pagar/receber levam a `/recorrentes` e `/contas`.
- [ ] **Dropdown Simuladores:** abre; Hub Simuladores e Simulador FIPE levam a `/simuladores` e `/simuladores/veiculos/simulador-fipe`.
- [ ] **Dropdown Configurações:** abre; Minha Conta, Assinatura, Meu IR levam a `/minha-conta`, `/planos`, `/meu-ir`.

### Páginas específicas
- [ ] **Lixeira:** se ativa no menu ou via rota direta `/lixeira`, a página carrega sem 404.
- [ ] **Notificações:** acessível (sino no topo ou rota) e sem 404.
- [ ] **Simulador FIPE:** `/simuladores/veiculos/simulador-fipe` carrega e permite consulta.
- [ ] **Minha Conta:** `/minha-conta` carrega; abas (Perfil, Assinatura, etc.) funcionam.

### Mobile
- [ ] **Bottom nav:** exibe Início, Lançamentos, Bens e Invest., Simuladores, Minha Conta com labels corretos e links funcionando.
- [ ] **Menu / drawer:** ao abrir “mais” ou drawer, os mesmos destinos (Planejamento, Controles, Simuladores, Configurações) aparecem e os links funcionam.

---

## 6.2 Console do navegador

### Objetivo
Sem erros **404 / 403 / 500** em chamadas críticas (Supabase REST, RPC, Edge Functions). Avisos conhecidos já tratados ou documentados.

### Avisos conhecidos (não bloqueantes)
- **Sentry DSN:** se `VITE_SENTRY_DSN` não estiver configurada no ambiente, o Sentry não envia eventos; o código não exibe mais aviso no console (tratado na Fase 3 / refatoração anterior).
- **page_views 403:** em ambientes onde a política RLS de INSERT em `page_views` ainda não foi aplicada, o POST pode retornar 403; o frontend trata com `.catch(() => {})` e não quebra a UI.
- **deletion_audit_log:** se a tabela ou view não existir no ambiente, a lixeira pode não registrar auditoria; o hook trata o erro e não propaga para o console de forma agressiva.
- **pluggy-sync 401:** pode ocorrer se a Edge Function for chamada antes da sessão estar pronta; o guard com `session?.access_token` no `OutdatedConnectionBanner` reduz chamadas prematuras.

### O que validar
- [ ] Após login e navegação pelas páginas principais, **não** aparecem erros 404/403/500 em chamadas a `*.supabase.co` que impeçam o uso (ex.: carregar lançamentos, páginas do menu).
- [ ] Erros pontuais já documentados acima podem aparecer; confirmar que a aplicação continua utilizável (sem tela quebrada ou loop de redirect).

---

## 6.3 Deploy

### Build verificado
- **Data da execução Fase 6:** build do app web executado com sucesso (`npm run build` em `apps/web`).
- **Resultado:** build concluído em ~1m18s; sem erros de compilação. Avisos de chunk size e import dinâmico (sonner, useUserKV) são conhecidos e não impedem o deploy.

### Fluxo recomendado
1. **Preview:** fazer deploy de um branch (ex.: `main` ou branch de release) e validar a URL de preview com o **checklist da seção 6.1** e a **checagem de console da seção 6.2**.
2. **Produção:** promover o mesmo commit para produção (merge em `main` + push ou “Promote to production” no Vercel) e garantir que o domínio principal (ex.: `app.rxfin.com.br`) aponte para esse deploy.
3. **Pós-deploy:** rodar novamente o checklist em produção (login, menu, uma página de cada grupo, mobile) e conferir o console.

### Observação
- O último push em `main` (commit da Fase 4/5) já dispara o deploy de produção no Vercel, se o projeto estiver configurado para isso. A Fase 6 formaliza o checklist e a validação para garantir que não haja regressões.

---

## Critérios de validação Fase 6

- [ ] Todos os itens do **checklist de fluxos (6.1)** passam em preview (e, após deploy, em produção).
- [ ] **Produção** atualizada e sem regressões críticas de menu ou backend (rotas corretas, labels alinhados à estrutura canônica, sem 404/403/500 bloqueantes).

---

## Resumo das fases do plano (referência)

| Fase | Nome                         | Status / entregável |
|------|------------------------------|---------------------|
| 1    | Menu: fonte única e labels   | Concluído — nav-config, useNavMenuPages |
| 2    | Backend: inventário          | Concluído — FASE-2-OUTPUT.md |
| 3    | Backend: correções pontuais | Concluído — migrations + aplicação manual/MCP |
| 4    | Backend: schemas e convenções| Concluído — FASE-4-OUTPUT.md |
| 5    | DB: páginas e grupos do menu | Concluído — migração aplicada via MCP; FASE-5-OUTPUT.md |
| 6    | Regressão e deploy          | Este documento — checklist + build OK; validação manual em preview/produção |
