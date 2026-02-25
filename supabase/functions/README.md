# Edge Functions

Este diretório contém as Edge Functions do Supabase.

## Como usar

As Edge Functions são deployadas automaticamente via GitHub Actions quando há mudanças neste diretório.

- Push em `develop` → deploy para staging (`rxefngokspcaibkvbjtt`)
- Push em `main` → deploy para produção (`kneaniaifzgqibpajyji`)

## Estrutura

Cada função tem seu próprio diretório com um `index.ts`:

```
functions/
├── auth-email-hook/
│   └── index.ts
├── pluggy-sync/
│   └── index.ts
├── send-email-n8n/
│   └── index.ts
└── ...
```

## Importante

⚠️ O Lovable também deploya Edge Functions via `rxfin_supabase`.
Quando editar funções aqui, verifique se não há conflito com o Lovable.

**Regra:** Edge Functions novas → criar aqui. Edge Functions existentes → verificar se o Lovable usa antes de editar.
