# RXFin Mobile — Assets para loja (App Store / Play Store)

## Ícone do app

| Uso | Tamanho | Caminho atual | Observação |
|-----|---------|----------------|------------|
| iOS / genérico | **1024×1024 px** | `./assets/icon.png` | Obrigatório para App Store. PNG sem transparência. |
| Android adaptive | 1024×1024 (foreground) | `./assets/android-icon-foreground.png` | Foreground; fundo em `android-icon-background.png` |
| Android monochrome | 1024×1024 | `./assets/android-icon-monochrome.png` | Ícone monocromático (Android 13+) |

**Checklist ícone:**
- [ ] Gerar/exportar ícone 1024×1024 no branding RXFin (logo oficial)
- [ ] Substituir `assets/icon.png` (Expo usa para iOS e fallback)
- [ ] Se usar adaptive icon: atualizar `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`

## Splash

| Campo | Valor atual | Observação |
|-------|------------|------------|
| Imagem | `./assets/splash-icon.png` | Centralizada, `resizeMode: contain` |
| Cor de fundo | `#1A1A2E` | Definida em `app.json` |

**Checklist splash:**
- [ ] Splash com logo RXFin centralizado; fundo `#1A1A2E` já configurado

## Screenshots (obrigatórios para publicação)

### App Store (Apple)
- **iPhone 6.7"**: 1290×2796 px (ex.: iPhone 14 Pro Max)
- **iPhone 6.5"**: 1284×2778 px (ex.: iPhone 14 Plus)
- Opcional: iPad se suporte tablet for ativado
- Máx. 10 capturas por dispositivo; formatos atuais aceitos: PNG ou JPEG

### Google Play (Android)
- **Telefone**: mínimo 320px, máximo 3840px no lado maior. Recomendado: 1080×1920 ou 1440×2560
- **Tablet** (opcional): 1200×1920 ou maior
- Mínimo 2 screenshots; recomendado 4–8

**Sugestão de telas para capturar:**
1. Login / boas-vindas
2. Dashboard (resumo receitas/despesas/saldo)
3. Lançamentos (lista)
4. Planejamento (metas do mês)
5. Aba Mais (perfil e menu)

**Checklist screenshots:**
- [ ] Capturar em simulador/emulador ou device real (modo claro e, se possível, escuro)
- [ ] Incluir no upload da App Store Connect e da Play Console no momento do submit

## Onde os assets já estão referenciados

- **app.json**: `icon`, `splash.image`, `android.adaptiveIcon.*`
- Arquivos em `apps/mobile/assets/` já existem; substituir pelos definitivos quando tiver o kit de marca.

## Próximo passo

Depois de ter ícone 1024×1024 e screenshots, seguir o guia em `PROXIMOS-PASSOS-LOJA.md` (build → submit).
