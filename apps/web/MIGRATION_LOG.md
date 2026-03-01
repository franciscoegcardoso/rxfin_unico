# RESUMO DA MIGRAÇÃO NOTURNA - RXFin Next.js

## Fase 1 - Estabilização
- **Build inicial:** `npm run build` passou sem erros (76 rotas, todas dinâmicas).
- **Providers:** Confirmados em `AppProviders.tsx`: TooltipProvider, AuthProvider, ImpersonationProvider, FinancialProvider, VisibilityProvider, TourProvider, TrackingProvider, SyncProvider, AccountPendingChangesProvider, AdminPendingChangesProvider (já estavam).
- **Guards SSR:**
  - `ControlOnboardingBanner.tsx`: estado inicial e `handleDismiss` protegidos com `typeof sessionStorage !== 'undefined'`.
  - `useTrackingParams.ts`: `readFromStorage()` e `saveToStorage()` com guard `typeof window === 'undefined'` (retorno antecipado / return).
- **Nota:** useSimulatorContext e ImpersonationContext já tinham guards aplicados anteriormente.

## Fase 2 - Redirects
- Adicionada função `async redirects()` em `next.config.ts` com 20 redirects legados.
- **Mantidos** o alias webpack e turbopack para `react-router-dom` (shim).
- Redirects: `/` → `/inicio`, `/app`, `/dashboard` → `/inicio`, `/contas`, `/fluxo-financeiro` → `/lancamentos`, `/configuracoes`, `/perfil` → `/minha-conta`, `/planos` → `/financeiro/planos`, `/historico-pagamentos` → `/financeiro/pagamentos`, `/minhas-indicacoes` → `/financeiro/minhas-indicacoes`, simuladores legados → novos paths, `/balanco-patrimonial` → `/bens-investimentos`, `/regras-categoria` → `/parametros`, `/admin-secure` → `/admin/audit`.

## Fase 3 - Layout global (Sidebar + TopNav)
- Criado `apps/web/src/app/(protected)/layout.tsx` com `AppLayout` (TopNavbar, DemoDataBanner, PageTransition, MobileBottomNav, etc.).
- Movidas **29 rotas protegidas** para `app/(protected)/`: inicio, parametros, lancamentos, cartao-credito, planejamento, planejamento-anual, registro-compras, pacotes-orcamento, sonhos, minha-conta, configuracoes-hub, configuracoes-fiscais, instituicoes-financeiras, dados-financeiros, gestao-veiculos, seguros, presentes, rx-split, dividir-conta, meu-ir, bens-investimentos, onboarding, bem-vindo, simulador-fipe, simuladores (e sub-rotas), financeiro (e sub-rotas), renegociacao-dividas (e sub-rotas), admin (e sub-rotas).
- Rotas **não movidas** (auth/públicas): login, signup, reset-password, update-password, verificar-email, auth/callback, termos-de-uso, politica-privacidade, politica-cookies, 403, page.tsx (raiz), not-found.

## Fase 4 - Tema e estilos
- **ThemeProvider** (next-themes) adicionado em `layout.tsx`: `<ThemeProvider attribute="class" defaultTheme="light" enableSystem>` envolvendo QueryProvider e AppProviders.
- **Toaster** (sonner) adicionado em `layout.tsx`: `<Toaster richColors position="top-center" />` dentro do body.
- **Fonte Inter:** substituídas Geist e Geist_Mono por `Inter({ subsets: ['latin'] })` e aplicada ao body com `className={inter.className}`.
- **html:** `lang="pt-BR"` e `suppressHydrationWarning` para evitar flash com next-themes.

## Fase 5 - Validação
- **Build status:** PASS (`npm run build` concluído com sucesso).
- **Erros restantes:** Nenhum.
- Todas as rotas continuam a ser listadas no output do build (incluindo as que estão em `(protected)`).

---

## NOTAS PARA O FRANCISCO
- A raiz `/` tem redirect 308 para `/inicio`; o ficheiro `app/page.tsx` (template Next.js) ainda existe mas não é usado quando o redirect está ativo.
- Se quiser que rotas protegidas exijam login antes de mostrar o layout, será preciso um middleware ou um guard (ex.: ProtectedRoute) dentro de `(protected)/layout.tsx` que redirecione para `/login` quando não autenticado.
- AppLayout usa hooks (useIsMobile, usePhoneCompletion, useDemoMode, useAutoConsolidation) que dependem dos providers já presentes no layout raiz; não foi necessário alterar ordem de providers.
