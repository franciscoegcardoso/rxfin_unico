# RXFin

Plataforma brasileira de finanças pessoais.

## Estrutura do Monorepo

```
rxfin_unico/
├── apps/
│   ├── web/             → App principal (Vite + React) — deploy Vercel
│   ├── landing/         → Landing page (Vite + React)
│   └── mobile/          → App React Native (Expo)
├── packages/
│   └── shared/          → Tipos TypeScript compartilhados
├── supabase/
│   └── functions/       → Edge Functions
├── n8n/
│   └── workflows/       → Backup dos workflows n8n Cloud
├── .github/
│   └── workflows/       → CI/CD (GitHub Actions)
└── docs/                → Documentação e ADRs
```

## Quick Start

```bash
# Instalar dependências (raiz)
npm install

# App web (Vite)
npm run dev:web

# Landing page
npm run dev:landing

# App mobile (Expo)
npm run dev:mobile

# Build do app web (usado no Vercel)
npm run build:web
```

## Scripts principais

| Script | Descrição |
|--------|-----------|
| `dev:web` | Sobe o app principal (apps/web) em modo dev |
| `dev:landing` | Sobe a landing (apps/landing) em modo dev |
| `dev:mobile` | Sobe o app Expo (apps/mobile) |
| `build:web` | Build de produção do app web → `apps/web/dist` |
| `build:landing` | Build da landing |
| `build:all` | Build de todos os workspaces |
| `lint` | Lint (Turbo) |
| `typecheck` | Type check (Turbo) |
| `test` | Testes (Turbo) |
| `supabase:functions:deploy` | Deploy das Edge Functions (exige `SUPABASE_PROJECT_ID`) |

## Deploy

- **App web:** Vercel (raiz do repo). O `vercel.json` usa `buildCommand: npm run build:web` e `outputDirectory: apps/web/dist` (SPA com rewrite para `/index.html`).
- **Edge Functions:** `npm run supabase:functions:deploy` (configurar `SUPABASE_PROJECT_ID` no ambiente).

## Ambientes

| Ambiente | Supabase | Branch |
|----------|----------|--------|
| Produção | `kneaniaifzgqibpajyji` | `main` |
| Staging | `rxefngokspcaibkvbjtt` | `develop` |

## Documentação

- [CONTEXT.md](./CONTEXT.md) — Contexto completo do projeto (para IA e devs)
- [docs/guides/deploy.md](./docs/guides/deploy.md) — Guia de deploy
- [docs/adr/](./docs/adr/) — Decisões de arquitetura

## Requisitos

- **Node:** >= 18
- **npm:** 10.x (recomendado; `packageManager` no package.json)
- Instalação usa `--legacy-peer-deps` no Vercel; localmente o `.npmrc` na raiz define `legacy-peer-deps=true`.
