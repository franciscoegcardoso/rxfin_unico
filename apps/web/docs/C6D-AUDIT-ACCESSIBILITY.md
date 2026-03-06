# C6D — Auditoria de Acessibilidade e Touch Targets

## Resultado do Lighthouse

O comando `npx lighthouse http://localhost:8080 --only-categories=accessibility --output=json` foi executado, mas a página não carregou no contexto headless (Chrome interstitial). **Execute manualmente** com o dev server rodando em `http://localhost:5173` ou `http://localhost:8080` e cole o JSON em `lighthouse-report.json` para análise de contraste e tap targets.

## Auditoria proativa no código

### 1. Touch targets (44px)

- **Button (ui/button.tsx):** Os tamanhos `icon` e `icon-sm` já possuem `min-h-[44px] min-w-[44px]`, atendendo ao critério.
- **Overrides:** Vários usos passam `className="h-8 w-8"` ou `h-7 w-7`; como `min-h-[44px]` vem do variant, o botão permanece ≥ 44px, exceto se houver `min-h-0` no className.
- **Recomendação:** Evitar `min-h-0 min-w-0` em botões ícone. Onde houver `<button>` ou `<a>` não-Button com área clicável pequena, adicionar `min-h-[44px] min-w-[44px]` ou usar `Button size="icon"`.

### 2. Botões só com ícone (aria-label)

Arquivos com botão ícone **sem** `aria-label` nem `title` (correção: adicionar `aria-label` descritivo):

| Arquivo | Linha aprox. | Sugestão aria-label |
|---------|--------------|----------------------|
| AddInstitutionFlowDialog.tsx | 169 | "Voltar" |
| BensInvestimentosLayout.tsx | 270, 373 | "Alternar tema" / "Menu" conforme contexto |
| HourlyCostSimulatorOldCompleta.tsx | 967, 1698 | "Ajuda" / "Remover" |
| AIFeedback.tsx | 406 | "Abrir ação" ou específico |
| Presentes.tsx | 792, 795, 798, 897, 900, 906 | "Atribuir" / "Editar" / "Excluir" conforme ação |
| IndicacoesTab.tsx | 255, 258 | Já tem title; adicionar aria-label igual ao title |
| CrmAutomations.tsx | 280 | "Editar regra" |
| MinhaContaLayout.tsx | 99 | "Voltar" |
| Sonhos.tsx / views/Sonhos.tsx | 602, 605, 611, 616 | "Salvar" / "Cancelar" / "Editar" / "Excluir" |
| BensInvestimentos.tsx (pages) | 792, 905 | Conforme ação |
| PatrimonioTab.tsx | 196, 199, 273, 276 | "Editar ativo" / "Excluir ativo" |
| BlockC.tsx (onboarding) | 274 | "Remover meta" |
| ConnectionStatusSection.tsx | 359 | "Ação" ou específico |
| InstituicoesFinanceiras.tsx | 203 | "Editar instituição" |
| GiftCalendar.tsx | 208 | "Mês anterior" (e próximo se houver) |
| VehicleFipeSelector.tsx | 175, 458 | "Remover favorito" / contexto |
| RecorrentesSection.tsx | 190, 198 | "Editar" / "Excluir" |
| CampaignEditor.tsx | 250 | "Fechar" |
| TireCostCalculator.tsx | 266 | Conforme ação |
| BlockB.tsx | 231, 322 | "Remover ativo" / "Remover dívida" |
| RegistroCompras (RegistroCompras) | 446, 451 | "Abrir" / "Excluir" |
| AdminAfiliados.tsx | 273, 360 | "Remover tier" / "Editar" |
| EmergencyReserveCard.tsx | 112 | "Ajuda" ou contexto |
| ThemeToggle.tsx | 97-98 | "Alternar tema" |
| Sidebar.tsx (design-system) | 130 | "Recolher menu" ou "Expandir menu" |
| PageHelpSlideDialog.tsx | 340, 372 | "Próximo" / "Fechar" |
| ReceiptCaptureDialog.tsx | 325 | Conforme ação |
| WelcomeDenied, WelcomeStarter, WelcomePro | ícones decorativos | Não são botões; verificar se há botões sem label |

### 3. Contraste (AA 4.5:1)

- O projeto migrou para tokens (`text-muted-foreground`, `text-foreground`, etc.). Revisar no Lighthouse quais nós falham e ajustar apenas esses (ex.: trocar `text-muted-foreground` por variante mais escura onde for texto de corpo).
- Evitar `text-gray-400` / `text-white/70` em texto essencial; preferir tokens do design system.

### 4. Inputs e labels (id / htmlFor)

- **Padrão:** Sempre que houver `<Label>` associado a um input, usar `<Label htmlFor="id">` e `<Input id="id">`.
- Arquivos com `<Label>` sem `htmlFor` (verificar se o input irmão tem `id` e associar): FGTSManagementDialog.tsx, SendNotificationForm (parte), CLTInputForm.tsx, DescontoJustoSimulator.tsx, vários em Parametros e formulários de onboarding.

---

## Alterações já aplicadas (resumo)

- **components/ui/button.tsx:** `size="icon"` e `icon-sm` já com `min-h-[44px] min-w-[44px]` — nenhuma alteração.
- **AddInstitutionFlowDialog.tsx:** Botão voltar: `aria-label="Voltar"` + `min-h-[44px] min-w-[44px]`.
- **MinhaContaLayout.tsx:** Botão voltar: `aria-label="Voltar"` + `min-h-[44px] min-w-[44px]`.
- **ConnectionStatusSection.tsx:** Botão opções: `aria-label="Abrir opções de conexão"` + min 44px.
- **IndicacoesTab.tsx:** Botões Copiar link e Compartilhar: `aria-label` igual ao `title`.
- **RecorrentesSection.tsx:** Editar/Excluir recorrente: `aria-label` + `min-h-[44px] min-w-[44px]`.
- **Sonhos.tsx:** Salvar, Cancelar, Editar sonho, Excluir sonho: `aria-label` em cada botão ícone.
- **InstituicoesFinanceiras.tsx:** Editar instituição: `aria-label="Editar instituição"` + min 44px.
- **ThemeToggle.tsx:** `aria-label="Alternar tema"` + `min-h-[44px] min-w-[44px]`.
- **TopNavbar.tsx:** Botões de itens desabilitados do menu: `aria-label={item.label}`, `type="button"`, `min-h-[44px] min-w-[44px]`.
- **SendNotificationForm.tsx:** Labels com `htmlFor` e inputs com `id`: notif-title, notif-priority, notif-message, notif-action-url; SelectTrigger com `id="notif-priority"` e `aria-label="Prioridade"`.
