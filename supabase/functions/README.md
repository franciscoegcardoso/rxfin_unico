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

Edge Functions são versionadas e deployadas a partir deste repositório (GitHub Actions em push para `develop`/`main`).
