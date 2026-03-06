# Plano de ajuste UX/UI — pós-refatoração RXFin

Com base nos anexos (estado atual vs. versão original desejada), este documento descreve os três ajustes prioritários e como implementá-los.

---

## 1. Logo RXFin

**Problema:** A logo (ícone verde circular com $ + texto “RXFin”) não aparece no layout atual; só o texto “RXFin” é exibido na sidebar.

**Situação no código:**
- **TopNavbar** (`components/layout/TopNavbar.tsx`) já usa a logo em imagem: `logo-rxfin-icon.png` e `logo-rxfin-white.png` (assets).
- **Sidebar** (`design-system/layouts/Sidebar.tsx`) usa apenas texto (“RX” / “RXFin”), sem imagem.

**Ajuste proposto:**
- Incluir a mesma logo (ícone + texto) na **Sidebar**: importar `logo-rxfin-icon.png` / `logo-rxfin-white.png` (ou um componente compartilhado que já use esses assets) e exibir no cabeçalho da sidebar no lugar do texto sozinho.
- Manter ícone + “RXFin” no estado colapsado (ex.: só ícone ou “RX”) para não poluir.

**Arquivos a alterar:**
- `apps/web/src/design-system/layouts/Sidebar.tsx` — área do logo (cabeçalho).

---

## 2. Barra vermelha (modo demo)

**Problema:** A barra de “dados fictícios” / “COMEÇAR SEU RAIO-X FINANCEIRO AGORA!” ocupa muito espaço e parece “no meio da tela”, sobrepondo visualmente o conteúdo importante.

**Situação no código:**
- **DemoDataBanner** (`components/DemoDataBanner.tsx` ou `components/shared/DemoDataBanner.tsx`) é a barra vermelha.
- Já existe estado “minimizado” (gravado em `sessionStorage`); quando minimizada vira uma faixa fina com “DADOS FICTÍCIOS” e “COMEÇAR RAIO-X →”.

**Ajustes propostos (escolher um ou combinar):**
- **Opção A:** Iniciar **sempre minimizada por padrão** (ou na primeira visita), para não dominar a tela.
- **Opção B:** Reduzir altura e densidade da barra **expandida** (menos padding, texto mais compacto, botão menor).
- **Opção C:** Manter barra no topo, mas **integrar ao header** (ex.: uma linha fina abaixo do TopNavbar/Sidebar), em vez de um bloco grande entre header e conteúdo.

**Arquivos a alterar:**
- `apps/web/src/components/DemoDataBanner.tsx` ou `apps/web/src/components/shared/DemoDataBanner.tsx` — lógica de estado inicial (minimizada por padrão) e/ou estilos.
- Se a barra for integrada ao header: `AppLayout.tsx` e eventualmente `TopNavbar`/`DesktopShell` para posicionamento.

---

## 3. Estrutura dos menus (versão original)

**Problema:** A estrutura atual (sidebar com poucos itens + barra inferior no mobile) não corresponde à “versão original” do anexo 2.

**Versão original (anexo 2):**
- **Barra superior horizontal** com logo + itens:
  - Início  
  - Bens e Investimentos  
  - Lançamentos  
  - Planejamento (dropdown)  
  - Controles (dropdown)  
  - Simuladores (dropdown)  
  - Configurações (dropdown)

**Situação no código:**
- **Desktop:** hoje o app usa **DesktopShell** com **Sidebar** vertical e `nav-config.tsx` com 5 itens: Home, Lançamentos, Investimentos, FIPE, Perfil.
- **TopNavbar** já implementa barra horizontal com logo e menu vindo de **useNavMenuPages** (DB + fallback estático com Início, Bens e Investimentos, Lançamentos, Planejamento, Configurações, etc.).
- Quando `insideShell === true`, o **AppLayout** não renderiza o TopNavbar; só o conteúdo (DemoDataBanner + children). O “chrome” desktop vem só da Sidebar.

**Ajuste proposto:**
- **Desktop:** usar a **mesma estrutura do anexo 2**, ou seja, **barra superior horizontal (TopNavbar)** em vez da Sidebar.
  - Trocar **DesktopShell** para renderizar **TopNavbar + área principal** (Outlet), em vez de **Sidebar + área principal**.
  - Manter **AppLayout** com `insideShell`: apenas conteúdo (sem duplicar TopNavbar), para que o TopNavbar seja o único menu no desktop.
- **Menu:** Garantir que **useNavMenuPages** (e, se necessário, o fallback em `useNavMenuPages.ts`) exponha a estrutura desejada: Início, Bens e Investimentos, Lançamentos, Planejamento (dropdown), Controles (dropdown), Simuladores (dropdown), Configurações (dropdown). Ajustar slugs/ordem/grupos no backend ou no fallback para bater com o anexo 2.
- **Mobile:** Manter bottom nav e menu hamburger como hoje; apenas garantir que os mesmos destinos existam (a partir do mesmo uso de useNavMenuPages ou da mesma fonte de verdade).

**Arquivos a alterar:**
- `apps/web/src/design-system/layouts/DesktopShell.tsx` — substituir `<Sidebar ... />` por um layout com **TopNavbar** + `<main><Outlet /></main>` (e incluir DemoDataBanner no fluxo desejado, se for o caso).
- `apps/web/src/design-system/layouts/AppShell.tsx` — sem mudança de contrato; apenas DesktopShell muda internamente.
- `apps/web/src/hooks/useNavMenuPages.ts` — revisar fallback e mapeamento para refletir: Início, Bens e Investimentos, Lançamentos, Planejamento, Controles, Simuladores, Configurações (com dropdowns onde estiver no anexo 2).
- Opcional: remover ou deixar de usar `nav-config.tsx` no desktop se toda a navegação passar a vir do TopNavbar/useNavMenuPages.

---

## Ordem sugerida de implementação

1. **Logo** — alterar só a Sidebar (ou, se já migrarmos desktop para TopNavbar, a logo já estará correta; nesse caso este item pode ser só “garantir logo no header”).  
2. **Barra vermelha** — comportamento minimizado por padrão e/ou redução de altura/impacto visual.  
3. **Menus** — trocar desktop de Sidebar para TopNavbar e alinhar itens/dropdowns ao anexo 2.

---

## Resumo dos arquivos

| Objetivo        | Arquivos principais                                                                 |
|-----------------|--------------------------------------------------------------------------------------|
| Logo            | `design-system/layouts/Sidebar.tsx` (ou header usado no desktop)                    |
| Barra vermelha  | `components/DemoDataBanner.tsx` ou `shared/DemoDataBanner.tsx`, `AppLayout.tsx`     |
| Estrutura menus | `DesktopShell.tsx`, `useNavMenuPages.ts`, eventualmente `nav-config.tsx` / TopNavbar |

Nenhuma alteração em hooks de dados, queries ou regras de negócio — apenas layout, componentes de UI e configuração de navegação.
