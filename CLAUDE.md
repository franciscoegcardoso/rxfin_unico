# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RXFin is a Brazilian personal finance platform. Monorepo managed with Turborepo + npm workspaces.

## Commands

```bash
# Install dependencies (root)
npm install

# Dev servers
npm run dev:web          # Web app (Vite) — http://localhost:8080
npm run dev:landing      # Landing page
npm run dev:mobile       # Expo mobile app

# Build
npm run build:web        # Production build → apps/web/dist
npm run build:all        # All workspaces

# Lint & typecheck
npm run lint
npm run typecheck

# Tests (Vitest, jsdom)
npm run test                                      # All workspaces via Turbo
cd apps/web && npx vitest run                     # Web app tests
cd apps/web && npx vitest run src/path/file.test.ts  # Single test file

# Generate Supabase types
npm run gen:types        # Outputs to apps/web/src/types/supabase.ts

# Deploy edge functions
npm run supabase:functions:deploy   # Requires SUPABASE_PROJECT_ID env var
```

## Architecture

### Monorepo Structure

- **apps/web/** — Main React SPA (Vite + React 18 + TypeScript)
- **apps/landing/** — Landing page (Vite + React)
- **apps/mobile/** — React Native / Expo (early stage)
- **packages/shared/** — Shared TypeScript types
- **supabase/functions/** — Edge Functions deployed via CI/CD (3 functions)
- **apps/web/supabase/functions/** — Full set of 50+ Edge Functions (pending consolidation to root)
- **n8n/workflows/** — n8n Cloud workflow backups
- **docs/adr/** — Architecture Decision Records

### Web App (apps/web) Stack

| Layer | Technology |
|-------|-----------|
| UI Components | shadcn/ui (Radix UI + Tailwind CSS + CVA) |
| Routing | react-router-dom v6 (BrowserRouter, lazy routes) |
| Data Fetching | @tanstack/react-query v5 |
| State | React Context (Auth, Financial, Sync, Visibility, etc.) + Zustand (onboarding) |
| Forms | react-hook-form + zod validation |
| Charts | Recharts |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions, Storage, Realtime) |
| Analytics | PostHog + Sentry |
| Styling | Tailwind CSS 3, tailwind-merge, framer-motion |

### Web App src/ Layout

- `pages/` — Route-level components (Portuguese names: Inicio, Contas, Lancamentos, etc.)
- `components/` — Feature components organized by domain (ui/, auth/, admin/, sync/, etc.)
- `design-system/` — Layout shells (AppShell) and reusable design components
- `hooks/` — Custom hooks, heavily used for Supabase RPC calls and data fetching
- `contexts/` — React Context providers (AuthContext, FinancialContext, SyncContext, etc.)
- `integrations/` — Supabase client setup and auto-generated types
- `services/` — Business logic services
- `store/` — Zustand stores
- `lib/` — Utility libraries
- `utils/` — Helper functions
- `constants/` — App-wide constants (paths, config)
- `test/` — Test setup, mocks, utilities

### Path Alias

`@/` maps to `apps/web/src/` (configured in vite.config.ts and tsconfig).

### Supabase

- **Production:** `kneaniaifzgqibpajyji` (sa-east-1)
- **Staging:** `rxefngokspcaibkvbjtt` (sa-east-1)
- Client initialized in `apps/web/src/integrations/client.ts`
- Auto-generated types in `apps/web/src/integrations/types.ts`
- RLS active on all tables (85+ tables)
- Edge Functions: Deno/TypeScript, kebab-case English names
- RPCs accept `p_user_id uuid DEFAULT auth.uid()`
- SECURITY DEFINER functions must `SET search_path TO 'public'`

### Deploy

- **Web:** Vercel (root repo). Build: `npm run build:web`, output: `apps/web/dist`. SPA rewrite to `/index.html`.
- **Edge Functions:** GitHub Actions workflows (production + staging)
- **CI/CD:** 4 GitHub Actions workflows: `deploy.yml`, `pr-checks.yml`, `deploy-functions-production.yml`, `deploy-functions-staging.yml`

## Conventions

### Commits
- Conventional Commits in Portuguese: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`, `perf:`
- Include `[skip ci]` by default unless user explicitly wants a Vercel deploy
- Branches: `main` (prod), `develop` (staging), `feature/*`, `fix/*`, `hotfix/*`

### Naming
- DB tables: `snake_case` Portuguese (e.g., `lancamentos_realizados`)
- Edge Functions: `kebab-case` English (e.g., `pluggy-sync-accounts`)
- React components: `PascalCase`
- Variables/functions: `camelCase`

### Database Patterns
- Use `apply_migration` for DDL changes, `execute_sql` for reads and CREATE INDEX
- Never use CONCURRENTLY inside migrations
- `cron.unschedule()` before `cron.schedule()`
- Schemas: `public` (RPCs + views), `fipe`, `audit`, `jobs`
- Diagnose before fixing: run `execute_sql` before `apply_migration`

### npm
- `.npmrc` has `legacy-peer-deps=true`
- Package manager: npm 10.x, Node >= 18
