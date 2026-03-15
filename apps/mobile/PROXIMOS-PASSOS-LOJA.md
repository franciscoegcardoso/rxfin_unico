# RXFin Mobile — Próximos passos para publicar na loja

## 1. Contas de desenvolvedor

| Loja | Custo | Link |
|------|--------|-----|
| **Apple Developer** | US$ 99/ano | [developer.apple.com](https://developer.apple.com) |
| **Google Play Console** | US$ 25 (única vez) | [play.google.com/console](https://play.google.com/console) |

Sem essas contas não é possível publicar nas lojas.

---

## 2. Preencher credenciais no `eas.json`

Antes do submit, substituir os placeholders em `apps/mobile/eas.json`:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "SEU_EMAIL_APPLE@email.com",
      "ascAppId": "ID_DO_APP_NO_APP_STORE_CONNECT",
      "appleTeamId": "ID_DO_TEAM_NA_APPLE"
    },
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    }
  }
}
```

- **iOS**: criar o app no [App Store Connect](https://appstoreconnect.apple.com) e anotar o App ID; Team ID no [Apple Developer](https://developer.apple.com/account).
- **Android**: em Play Console → Configurações → Conta de serviço, criar chave JSON e salvar como `apps/mobile/google-service-account.json` (e adicionar ao `.gitignore` se ainda não estiver).

---

## 3. Build de produção

Na pasta do app mobile:

```bash
cd apps/mobile
npx eas build --profile production --platform all
```

Ou por plataforma:

```bash
npx eas build --profile production --platform ios
npx eas build --profile production --platform android
```

- É necessário estar logado: `npx eas login`.
- O primeiro build pode pedir configurações (bundle ID, etc.); o EAS usa o que está em `app.json`.
- **Credenciais (primeira vez)**: rode o build **sem** `--non-interactive` para o EAS configurar:
  - **Android**: geração do Keystore
  - **iOS**: Distribution Certificate e Provisioning Profile
  Depois disso, builds com `--non-interactive` podem funcionar.
- **Monorepo**: o `package.json` na raiz do repositório inclui `react-native` em devDependencies para o Metro resolver corretamente no EAS Build.
- Os artefatos ficam no EAS; o link aparece no terminal ao terminar.

---

## 4. Enviar para as lojas (submit)

Depois que o build concluir com sucesso:

```bash
cd apps/mobile
npx eas submit --profile production --platform all
```

O EAS pede o build mais recente (ou você informa o ID). Para iOS é necessário ter preenchido `appleId`, `ascAppId` e `appleTeamId` no `eas.json`. Para Android, o arquivo `google-service-account.json` deve existir no caminho indicado.

---

## 5. Resumo da ordem

1. Contas Apple e Google criadas/ativas.
2. Assets: ícone 1024×1024 e screenshots (ver `apps/mobile/.cursor/store-assets.md`).
3. Placeholders do `eas.json` substituídos (e `google-service-account.json` no lugar).
4. `npx eas build --profile production --platform all`.
5. Nas consoles (App Store Connect e Play Console): preencher descrição, screenshots, classificação etária, etc.
6. `npx eas submit --profile production --platform all` (ou por plataforma).

---

## Comandos úteis

```bash
cd apps/mobile

# Login EAS (se ainda não fez)
npx eas login

# Ver builds
npx eas build:list

# Ver configuração do projeto
npx eas project:info
```
