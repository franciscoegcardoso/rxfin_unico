# Screenshots para App Store e Play Store

Os screenshots **não** vão no build do app; são enviados direto nas plataformas no momento do **submit** (App Store Connect e Google Play Console).

## Como capturar

### iOS (Simulador)
1. Abra o app no simulador: `npx expo run:ios` ou EAS build instalado.
2. Use um device **iPhone 14 Pro Max** (6.7") para o tamanho principal.
3. Navegue até cada tela desejada e use **Cmd + S** (ou File → Save Screen) para salvar.
4. As imagens ficam na Área de Trabalho; renomeie e coloque aqui em pastas por tipo:
   - **ios-6.7**: 1290×2796 px (iPhone 14 Pro Max)
   - **ios-6.5**: 1284×2778 px (iPhone 14 Plus) — opcional

### Android (Emulador ou device)
1. Abra o app no emulador ou device.
2. Recomendado: resolução 1080×1920 ou 1440×2560.
3. **Emulador**: ícone de câmera na barra lateral ou **Ctrl + S** (Windows/Linux).
4. **Device**: `adb shell screencap -p /sdcard/screen.png` e `adb pull /sdcard/screen.png`.

## Tamanhos exigidos

| Plataforma | Tamanho (px) | Uso |
|------------|--------------|-----|
| App Store (iPhone 6.7") | 1290×2796 | Obrigatório |
| App Store (iPhone 6.5") | 1284×2778 | Opcional |
| Google Play (telefone) | 1080×1920 ou 1440×2560 | Mín. 2; recomendado 4–8 |

## Telas sugeridas
1. Login / boas-vindas  
2. Dashboard (resumo receitas/despesas/saldo)  
3. Lançamentos  
4. Planejamento  
5. Aba Mais (perfil e menu)

Guarde as imagens nesta pasta (ex.: `ios-dashboard.png`, `android-dashboard.png`) e faça o upload nas respectivas lojas no passo de submit.
