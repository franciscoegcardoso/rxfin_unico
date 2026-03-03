# RXFin Landing Page

Landing page do RXFin integrada ao monorepo. App independente (Vite + React + Tailwind) que pode ser deployado separadamente.

## Stack

- Vite 5 + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (Radix)
- Supabase (mesmo projeto do app principal)
- Framer Motion, Recharts

## Desenvolvimento

```bash
npm install
npm run dev
```

Abre em **http://localhost:3001** (porta diferente do app principal 8080).

## Build

```bash
npm run build
```

Saída em `dist/`.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

- `VITE_SUPABASE_URL` – URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` – Chave anônima
- `VITE_APP_URL` – URL do app principal (ex: https://app.rxfin.com.br)

## Links para o app principal

Os CTAs usam `VITE_APP_URL`:

- Simular agora → `${VITE_APP_URL}/simuladores/veiculos/simulador-fipe`
- Ver simuladores → `${VITE_APP_URL}/simuladores`
- Cadastrar → `${VITE_APP_URL}/auth`

## Conteúdo da landing (rxfinlp)

Para usar o conteúdo completo da landing Lovable (rxfinlp-main), copie os arquivos de `landing/rxfinlp-main/` para esta pasta, mantendo a estrutura:

- `src/components/landing/` – componentes da landing
- `src/pages/` – páginas
- `src/assets/` – logos e imagens
