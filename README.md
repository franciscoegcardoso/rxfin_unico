# RXfin

Plataforma brasileira de finanças pessoais.

## Estrutura do Monorepo

```
rxfin_unico/
├── apps/
│   └── mobile/          → App React Native (Expo)
├── packages/
│   └── shared/          → Tipos TypeScript compartilhados
├── supabase/
│   └── functions/       → Edge Functions (deploy via GitHub Actions)
├── n8n/
│   └── workflows/       → Backup dos workflows n8n Cloud
├── .github/
│   └── workflows/       → CI/CD (GitHub Actions)
└── docs/                → Documentação e ADRs
```

## Quick Start

```bash
# Instalar dependências
npm install

# Rodar o app mobile
npm run dev:mobile

# Deploy Edge Functions (staging)
npm run supabase:functions:deploy:staging
```

## Ambientes

| Ambiente | Supabase | Branch |
|----------|----------|--------|
| Produção | `kneaniaifzgqibpajyji` | `main` |
| Staging | `rxefngokspcaibkvbjtt` | `develop` |

## Documentação

- [CONTEXT.md](./CONTEXT.md) — Contexto completo do projeto (para IA e devs)
- [docs/guides/deploy.md](./docs/guides/deploy.md) — Guia de deploy
- [docs/adr/](./docs/adr/) — Decisões de arquitetura

## Frontend Web

O frontend web é gerenciado pelo **Lovable** no repositório `rxfin_supabase`.
Ele NÃO faz parte deste monorepo (ainda).
