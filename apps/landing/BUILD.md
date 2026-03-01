# Build da apps/landing

## Alterações já feitas no projeto

- **package.json**: `react` e `react-dom` fixados em `19.2.4`; `next` em `14.2.18`.
- **Raiz (package.json)**: `overrides` para `react` e `react-dom` em `19.2.4` (evita conflito no monorepo).
- **FeaturePreviewDialog.tsx**: ícones Lucide usam `React.createElement` para evitar erro de tipo com React 18/19.

## Como fazer o build

### 1. Instalar dependências (na raiz do monorepo)

```bash
cd /caminho/para/rxfin_unico
npm install --legacy-peer-deps
```

Se der erro `ENOTEMPTY` ou `ENOENT` em `node_modules`, feche IDEs/terminais que usem o repo, apague `node_modules` e o `package-lock.json` da raiz e rode de novo:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install --legacy-peer-deps
```

### 2. Build da landing

```bash
cd apps/landing
npm run build
```

Ou a partir da raiz:

```bash
npm run build --workspace=landing
```

### 3. Saída estática

O export estático fica em:

```
apps/landing/out/
```

(Configurado com `output: 'export'` em `next.config.mjs`.)

## Se o build falhar com "Cannot find module '../build/output/log'"

```powershell
cd apps/landing
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install next@14.2.18 --legacy-peer-deps
npm install --legacy-peer-deps
npm run build
```

## Se o build falhar com React #527 (react 19.2.0 vs react-dom 19.2.4)

Confirme que na **raiz** do monorepo o `package.json` tem:

```json
"overrides": {
  "react": "19.2.4",
  "react-dom": "19.2.4"
}
```

Depois, na raiz:

```bash
npm install --legacy-peer-deps
```

Em seguida, em `apps/landing`, rode `npm run build` de novo.
