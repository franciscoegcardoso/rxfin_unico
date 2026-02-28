# RxFin – Gestão Financeira Pessoal

Plataforma completa de finanças pessoais: controle de receitas, despesas, cartões de crédito, financiamentos, consórcios, simulador FIPE, metas orçamentárias, Open Finance (Pluggy) e muito mais.

🔗 **Produção:** [https://rxfin.lovable.app](https://rxfin.lovable.app)

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Framer Motion |
| Estado / Data | TanStack React Query, React Hook Form, Zod |
| Backend | Supabase (Auth, Database, Edge Functions, Storage) |
| Open Finance | Pluggy Connect (conexão bancária) |
| Gráficos | Recharts |
| Testes | Vitest, Testing Library |
| Analytics | PostHog |
| Outros | date-fns, xlsx, DOMPurify, react-joyride |

---

## Arquitetura do Projeto

```
├── public/                        # Assets estáticos servidos diretamente
│   ├── images/                    # Imagens públicas (logos, ícones)
│   └── lovable-uploads/           # Uploads via Lovable
│
├── src/
│   ├── assets/                    # Assets importados via ES6 modules
│   ├── components/                # Componentes React organizados por domínio
│   │   ├── admin/                 # Painel administrativo
│   │   ├── ai/                    # Chat IA (Raio-X Financeiro)
│   │   ├── auth/                  # Autenticação (ProtectedRoute, login)
│   │   ├── bens-investimentos/    # Patrimônio, investimentos, crédito
│   │   ├── cartao/                # Cartão de crédito
│   │   ├── configuracoes/         # Configurações do usuário
│   │   ├── dashboard/             # Widgets do Início
│   │   ├── financeiro/            # Planos, pagamentos, indicações
│   │   ├── ir/                    # Imposto de renda
│   │   ├── lancamentos/           # Lançamentos financeiros
│   │   ├── metas/                 # Metas orçamentárias
│   │   ├── onboarding/            # Fluxo de onboarding
│   │   ├── openfinance/           # Pluggy Connect integration
│   │   ├── parametros/            # Parâmetros e categorias
│   │   ├── planejamento/          # Planejamento mensal/anual
│   │   ├── presentes/             # Gestão de presentes
│   │   ├── seguros/               # Seguros
│   │   ├── simuladores/           # Simuladores financeiros
│   │   ├── sonhos/                # Metas de longo prazo
│   │   ├── sync/                  # Indicador de sincronização
│   │   ├── theme/                 # Theme provider (dark/light)
│   │   ├── tour/                  # Tour guiado (react-joyride)
│   │   ├── ui/                    # shadcn/ui primitivos
│   │   └── veiculos/              # Gestão de veículos
│   │
│   ├── contexts/                  # Context Providers globais
│   │   ├── AuthContext.tsx         # Autenticação e sessão
│   │   ├── FinancialContext.tsx    # Dados financeiros centralizados
│   │   ├── VisibilityContext.tsx   # Ocultar/mostrar valores
│   │   ├── TourContext.tsx         # Estado do tour guiado
│   │   ├── ImpersonationContext.tsx # Admin impersonation
│   │   ├── SyncContext.tsx         # Sincronização em tempo real
│   │   ├── TrackingContext.tsx     # Analytics (PostHog)
│   │   ├── BensInvestimentosContext.tsx
│   │   ├── GestaoVeiculosContext.tsx
│   │   ├── AccountPendingChangesContext.tsx
│   │   └── AdminPendingChangesContext.tsx
│   │
│   ├── core/                      # Serviços, adapters e tipos do domínio
│   │   ├── depreciation/          # Motor de depreciação veicular
│   │   └── ...
│   │
│   ├── data/                      # Dados estáticos e referências
│   │
│   ├── hooks/                     # Hooks customizados
│   │   ├── useIsMobile.ts         # Detecção mobile (responsividade)
│   │   ├── useFinancialData.ts    # Dados financeiros
│   │   └── ...
│   │
│   ├── integrations/              # Cliente e tipos do Supabase
│   │   └── supabase/
│   │       ├── client.ts          # createClient configurado
│   │       └── types.ts           # Tipos gerados automaticamente
│   │
│   ├── lib/                       # Utilidades compartilhadas
│   │   └── utils.ts               # cn(), formatCurrency(), etc.
│   │
│   ├── pages/                     # Páginas (1 arquivo = 1 rota)
│   │   ├── bens-investimentos/    # Layout + tabs do patrimônio
│   │   ├── financeiro/            # Layout + tabs financeiro
│   │   ├── planejamento/          # Layout + tabs planejamento
│   │   ├── renegociacao/          # Sub-páginas renegociação
│   │   ├── admin/                 # Páginas administrativas
│   │   └── *.tsx                  # Páginas standalone
│   │
│   ├── test/                      # Setup de testes (vitest)
│   ├── utils/                     # Funções de cálculo e regras de negócio
│   │
│   ├── App.tsx                    # Roteamento e providers
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Design tokens (Tailwind)
│
├── supabase/
│   ├── functions/                 # Edge Functions (Deno)
│   │   ├── pluggy-connect/        # Token de conexão Pluggy
│   │   ├── pluggy-sync*/          # Sincronização de dados bancários
│   │   ├── fipe-*/                # Motor FIPE (preços veiculares)
│   │   ├── parse-*/               # Parsers de documentos (OCR/AI)
│   │   ├── ir-*/                  # Imposto de renda
│   │   ├── send-*/                # Envio de emails
│   │   ├── guru-webhook/          # Webhook de vendas
│   │   └── ...                    # +30 funções ativas
│   └── migrations/                # Migrations do banco (SQL)
│
├── docs/
│   ├── legal/                     # Documentação legal
│   └── depreciation-engine-v6.3.md # Motor de depreciação (versão atual)
│
└── .lovable/
    └── plan.md                    # Plano de implementação atual
```

---

## Mapa de Rotas

### Públicas (sem autenticação)

| Rota | Página |
|---|---|
| `/login` | Login |
| `/signup` | Signup |
| `/reset-password` | ResetPassword |
| `/update-password` | UpdatePassword |
| `/verificar-email` | VerificarEmail |
| `/auth/callback` | AuthCallback |
| `/bem-vindo/:plan` | BemVindo |
| `/termos-de-uso` | LegalDocument |
| `/politica-privacidade` | LegalDocument |
| `/politica-cookies` | LegalDocument |
| `/simuladores/:category` | Simuladores (hub) |
| `/simuladores/veiculos/simulador-fipe` | SimuladorFipe |
| `/simuladores/:category/:slug` | SimuladorDinamico |

### Protegidas (autenticação obrigatória)

| Rota | Página |
|---|---|
| `/inicio` | Inicio (home) |
| `/parametros` | Parametros |
| `/lancamentos` | Lancamentos |
| `/bens-investimentos/*` | BensInvestimentosLayout (consolidado, patrimonio, investimentos, credito, seguros) |
| `/cartao-credito` | CartaoCredito |
| `/planejamento/*` | PlanejamentoLayout (visao-mensal, metas, analises) |
| `/planejamento-anual` | PlanejamentoAnual |
| `/registro-compras` | RegistroCompras |
| `/pacotes-orcamento` | PacotesOrcamento |
| `/sonhos` | Sonhos |
| `/minha-conta` | MinhaConta |
| `/configuracoes-hub` | ConfiguracoesHub |
| `/configuracoes-fiscais` | ConfiguracoesFiscais |
| `/instituicoes-financeiras` | InstituicoesFinanceiras |
| `/dados-financeiros` | DadosFinanceiros |
| `/financeiro/*` | FinanceiroLayout (planos, pagamentos, minhas-indicacoes) |
| `/simuladores/veiculos/simulador-carro-ab` | SimuladorCarroAB |
| `/simuladores/veiculos/simulador-custo-oportunidade-carro` | SimuladorCustoOportunidadeCarro |
| `/simuladores/dividas/renegociacao-dividas` | RenegociacaoDividas |
| `/simuladores/dividas/financiamento-consorcio` | SimuladorFinanciamento |
| `/simuladores/planejamento/simulador-custo-hora` | SimuladorCustoHora |
| `/simuladores/planejamento/simulador-desconto-justo` | SimuladorDescontoJusto |
| `/simuladores/planejamento/econograph` | EconoGraph |
| `/renegociacao-dividas/*` | Renegociação (quitação, parcelamento, portabilidade, consolidação) |
| `/gestao-veiculos` | GestaoVeiculos |
| `/seguros` | Seguros |
| `/presentes` | Presentes |
| `/meu-ir` | MeuIR |
| `/onboarding2` | Onboarding2 |

### Admin (requer role admin)

| Rota | Página |
|---|---|
| `/admin` | Admin |
| `/admin/fipe-sync` | FipeSync |
| `/admin/marketing` | AdminMarketing |
| `/admin/ai-feedback` | AIFeedback |
| `/admin/ai-metrics` | AIMetrics |

---

## Provedores Globais (hierarquia)

```
QueryClientProvider
  └── ThemeProvider
        └── AuthProvider
              └── FinancialProvider
                    └── VisibilityProvider
                          └── TourProvider
                                └── ImpersonationProvider
                                      └── TooltipProvider
                                            └── SyncProvider
                                                  └── BrowserRouter
                                                        └── TrackingProvider
                                                              └── MagicLinkHandler
                                                                    └── <Routes />
```

---

## Integração com Supabase

### Auth
- Email/password + Magic Link + Google OAuth
- Verificação de email via OTP customizado (`send-email-verification`, `verify-email-otp`)
- Reset de senha via edge function (`send-password-reset`)
- Session gerenciada pelo `AuthContext`

### Database
- PostgreSQL com RLS (Row Level Security) em todas as tabelas
- Views materializadas para relatórios (`v_lancamentos_full`, `v_user_plan`, etc.)
- Tipos gerados automaticamente em `src/integrations/supabase/types.ts`

### Edge Functions
- **Pluggy**: `pluggy-connect`, `pluggy-sync`, `pluggy-sync-accounts`, `pluggy-sync-bills`, `pluggy-sync-transactions`, `pluggy-worker`, `pluggy-trigger-sync`
- **FIPE**: `fipe-proxy`, `fipe-full-history`, `fipe-history-v2`, `fipe-bulk-import`, `fipe-orchestrator`, `fipe-monthly-sync`, etc.
- **IA/OCR**: `parse-credit-card-statement`, `parse-receipt`, `parse-income-document`, `categorize-transactions`, `ir-analysis`, `budget-insights`
- **Email**: `send-campaign-email`, `send-email-n8n`, `send-invitation`, `send-email-verification`
- **Webhook**: `guru-webhook` (vendas)
- **Conta**: `delete-own-account`, `save-user-cpf`, `creditos`

### Storage
- Bucket para importação de extratos de cartão
- Bucket para documentos fiscais (IR)

---

## Integração Pluggy (Open Finance)

### Fluxo de conexão

1. Usuário clica em "Conectar banco" → `PluggyConnectButton`
2. Frontend solicita `connect_token` via edge function `pluggy-connect`
3. Se CPF não cadastrado → dialog para inserção do CPF (`save-user-cpf`)
4. Script externo do Pluggy é carregado com proteção DOM (`MutationObserver`)
5. Widget Pluggy abre em iframe/modal
6. Após conexão bem-sucedida → `pluggy-trigger-sync` inicia sincronização
7. `pluggy-worker` processa: contas, transações, faturas de cartão
8. Dados sincronizados aparecem em Lançamentos e Cartão de Crédito

### Arquivos-chave
- `src/components/openfinance/PluggyConnectButton.tsx` — botão + lógica de abertura
- `src/hooks/usePluggyConnect.ts` — hook com estado do widget
- `supabase/functions/pluggy-connect/` — geração do token
- `supabase/functions/pluggy-sync*/` — sincronização de dados

---

## Variáveis de Ambiente

| Variável | Tipo | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Pública | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Pública | Chave anon (publishable) |
| `VITE_POSTHOG_KEY` | Pública | Chave do PostHog (analytics) |
| `VITE_POSTHOG_HOST` | Pública | Host do PostHog |

> Segredos privados (Pluggy API keys, chaves de email, etc.) ficam nas **secrets do Supabase** e são usados apenas nas Edge Functions.

---

## Como Rodar Localmente

```bash
# 1. Clone o repositório
git clone <URL_DO_REPO>
cd <NOME_DO_PROJETO>

# 2. Instale as dependências
npm install

# 3. Configure o .env
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:5173`.

---

## Guia de Migração para App Mobile

### Opção 1: PWA (Progressive Web App)

- Instalável direto do navegador (Share → Adicionar à Tela Inicial)
- Funciona em iOS e Android sem app store
- Setup rápido com `vite-plugin-pwa`
- Limitação: acesso restrito a push notifications no iOS

### Opção 2: Capacitor (App Nativo)

Recomendado para publicação na App Store / Google Play.

#### Setup

```bash
# Instalar dependências
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# Inicializar
npx cap init

# Adicionar plataformas
npx cap add ios
npx cap add android

# Build + sync
npm run build
npx cap sync

# Rodar
npx cap run ios      # Requer Mac + Xcode
npx cap run android  # Requer Android Studio
```

#### Configuração (`capacitor.config.ts`)

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.7b0a0a5442bb44a3b4036a99e5f75d58',
  appName: 'rxfin',
  webDir: 'dist',
  server: {
    // Para dev com hot-reload, apontar para o preview:
    // url: 'https://7b0a0a54-42bb-44a3-b403-6a99e5f75d58.lovableproject.com?forceHideBadge=true',
    // cleartext: true
  }
};
```

### Considerações para Migração

#### OAuth / Deep Linking
- O Supabase Auth usa redirect URLs — no Capacitor, configurar **custom URL scheme** (`app.lovable.rxfin://`)
- Registrar o scheme no `capacitor.config.ts` e no Supabase Dashboard (Authentication → URL Configuration)
- Usar `@capacitor/app` para capturar deep links

#### Pluggy Connect no WebView
- O widget Pluggy usa iframe/popup — no WebView do Capacitor, pode exigir:
  - `allowNavigation` para domínios do Pluggy (`*.pluggy.ai`)
  - Ajustes no `MutationObserver` (proteção DOM) para ambiente nativo
  - Teste extensivo do fluxo de CPF → abertura do widget → callback

#### Responsividade
- O app já usa `useIsMobile()` hook para layouts responsivos
- Navegação mobile: `MobileBottomNav` já implementado
- Componentes shadcn/ui com `Drawer` para mobile e `Dialog` para desktop

#### Funcionalidades Nativas (Capacitor Plugins)
- **Push Notifications**: `@capacitor/push-notifications`
- **Camera** (scan de documentos): `@capacitor/camera`
- **Biometria**: `@capacitor-community/biometric-auth`
- **Status Bar**: `@capacitor/status-bar`
- **Splash Screen**: `@capacitor/splash-screen`

#### Checklist de Migração

- [ ] Instalar Capacitor e adicionar plataformas
- [ ] Configurar deep linking para OAuth (Supabase + Google)
- [ ] Testar fluxo Pluggy Connect no WebView
- [ ] Ajustar splash screen e ícones nativos
- [ ] Configurar push notifications
- [ ] Testar offline behavior
- [ ] Submeter para App Store / Google Play

---

## Licença

Projeto privado – todos os direitos reservados.
