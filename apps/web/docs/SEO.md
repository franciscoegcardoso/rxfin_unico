# SEO — Canonical, 404 e URLs limpas

## Stack

- **React + Vite** (SPA). Não é Next.js; o `<head>` é controlado no cliente.

## Subdomínios (canonical por ambiente)

| Ambiente   | Domínio           | Uso da canonical / meta |
|-----------|--------------------|--------------------------|
| **Landing** | `https://rxfin.com.br`   | `apps/landing` — canonical e og:url em `index.html` apontam para `rxfin.com.br`. |
| **App**     | `https://app.rxfin.com.br` | `apps/web` — `CanonicalLink` e `index.html` usam **sempre** `app.rxfin.com.br`. |

Assim a landing e o app **não disputam** a mesma URL canônica: cada deploy aponta para o próprio subdomínio.

- **App:** defina `VITE_CANONICAL_BASE=https://app.rxfin.com.br` no `.env` do `apps/web` (ou deixe o fallback; o default já é `app.rxfin.com.br`). **Não use** `rxfin.com.br` no app.
- **Landing:** não usa `VITE_CANONICAL_BASE`; o canonical e og:url estão fixos em `apps/landing/index.html` como `https://rxfin.com.br/`.

## 1. Tags canônicas (app)

- **Onde:** `src/components/seo/CanonicalLink.tsx` — atualiza `<link rel="canonical" href="...">` no `<head>` conforme a rota.
- **Integração:** Dentro de `BrowserRouter` em `App.tsx`.
- **URL base (app):**  
  - `VITE_CANONICAL_BASE` no `.env` (recomendado: `https://app.rxfin.com.br`).  
  - Se não existir, usa `window.location.origin`.  
  - Fallback em build: `https://app.rxfin.com.br` (nunca `rxfin.com.br`).
- **Comportamento:** `base + pathname` sem barra final (ex.: `https://app.rxfin.com.br/inicio`).
- **Fallback estático:** Em `apps/web/index.html`, `<link rel="canonical" href="https://app.rxfin.com.br/">`.

Nenhum pacote extra é necessário; a tag é injetada via `document.head`.

## 2. Tratamento de 404 (Soft 404)

- **Problema:** Em SPA no Vercel, todas as rotas recebem `index.html` com **HTTP 200**. Rotas inexistentes ainda retornam 200 e o React exibe a página 404, o que o Google pode classificar como “Soft 404”.
- **O que foi feito:** Na página `NotFound` (`src/pages/NotFound.tsx`) é definido `<meta name="robots" content="noindex, nofollow">` via `useEffect`. Assim o Google não indexa essa resposta como página válida.
- **HTTP 404 “real”:** Para devolver status **404** no servidor seria preciso:
  - Listar todas as rotas válidas e, no edge/hosting, responder 404 para o resto (ex.: Vercel Edge Middleware ou regras no painel), **ou**
  - Ter um backend que sirva o HTML e defina o status 404 para rotas inexistentes.  
  No modelo atual (SPA com rewrite único para `index.html`), o status continua 200; o `noindex` reduz o impacto no Search Console.

## 3. URLs limpas

- **Redirect barra final:** Em `vercel.json` (raiz do monorepo) foi adicionado redirect permanente `/(.+)/` → `/$1`, ou seja, URLs com barra no final (ex.: `/inicio/`) redirecionam para a mesma URL sem barra (`/inicio`), evitando duplicidade de conteúdo.
- **HTTP → HTTPS:** O Vercel já redireciona HTTP para HTTPS; não é necessário configurar nada extra.

## Variável de ambiente (app)

No projeto **apps/web**, em `.env` ou `.env.production`:

```bash
# Base da URL canônica do app (deploy em app.rxfin.com.br)
VITE_CANONICAL_BASE=https://app.rxfin.com.br
```

**Não use** `https://rxfin.com.br` no app — esse domínio é da landing (`apps/landing`). Cada ambiente no seu próprio subdomínio evita disputa de canonical no Search Console.
