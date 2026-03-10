# ADR 001: Adoção de Monorepo

## Status
Aceito (2026-02-24)

## Contexto
O RXfin tinha dois repositórios separados:
- Frontend web + Edge Functions (origem histórica em ferramenta externa)
- `rxfin_mobile`: app React Native/Expo

Isso causava fragmentação de contexto, dificuldade de busca, e impossibilidade de CI/CD unificado.

## Decisão
Criar monorepo `rxfin_unico` usando Turborepo com fresh start (sem preservar histórico).
O monorepo concentra frontend web (apps/web), mobile, Edge Functions (CI/CD), documentação e workflows n8n.

## Estrutura
```
rxfin_unico/
├── apps/mobile/          ← app Expo
├── packages/shared/      ← tipos compartilhados
├── supabase/functions/   ← Edge Functions (CI/CD)
├── n8n/workflows/        ← backup versionado
├── .github/workflows/    ← GitHub Actions
└── docs/                 ← documentação
```

## Consequências

### Positivas
- Um único lugar para buscar código (VS Code)
- CI/CD unificado via GitHub Actions
- Tipos compartilhados entre mobile e backend
- Documentação junto ao código

### Negativas
- Migração única de código e histórico para o monorepo

### Riscos Mitigados
- Repos antigos ficam arquivados (não deletados)
