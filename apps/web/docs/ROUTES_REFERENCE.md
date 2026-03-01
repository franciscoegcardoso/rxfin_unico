# Rotas do apps/web (referência)

## Rotas públicas (sem login)

| Path | Página | Notas |
|------|--------|--------|
| /login | Login | |
| /signup | Signup | |
| /planos | Planos | Planos e preços (get_subscription_plans_public) |
| /termos-de-uso, /politica-privacidade, /politica-cookies | LegalDocument | |

## Rotas protegidas — novas (esqueleto + RPC)

| Path | Página | RPC |
|------|--------|-----|
| /alertas | Alertas | get_smart_alerts |
| /recorrentes | Recorrentes | get_recurring_expenses_overview |
| /notificacoes | Notificacoes | get_notifications_page |
| /lixeira | Lixeira | get_trash_items |

## Aliases (mesmo componente)

| Path | Redireciona / componente |
|------|---------------------------|
| /instituicoes | InstituicoesFinanceiras (mesmo que /instituicoes-financeiras) |
| /dados | DadosFinanceiros (mesmo que /dados-financeiros) |
| /rxsplit | RXSplit (mesmo que /rx-split) |
| /compras | RegistroCompras (mesmo que /registro-compras) |

## Navegação (menu)

O menu lateral vem do banco (Admin > Páginas). Para exibir as novas rotas no menu, cadastre-as no admin com os slugs/paths desejados (ex.: alertas, recorrentes, notificacoes, lixeira, instituicoes, dados, rxsplit, compras).
