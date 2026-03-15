# RXFin Mobile — Checklist QA v1.0

## Fluxo de Autenticação
- [ ] Login com e-mail/senha válidos → redireciona para (tabs)
- [ ] Login com credenciais inválidas → Alert "E-mail ou senha incorretos"
- [ ] Campos de login com validação inline (erro aparece abaixo do campo)
- [ ] "Esqueci senha" → tela de recuperação → "E-mail enviado"
- [ ] Registro novo usuário → Alert de confirmação de e-mail
- [ ] Sair da conta → volta para tela de login
- [ ] Re-abrir app com sessão ativa → vai direto para (tabs)

## Dashboard
- [ ] Receitas e despesas mostram valores reais (não R$ 0,00)
- [ ] Saldo exibe cor verde (positivo) ou vermelho (negativo)
- [ ] Pull-to-refresh atualiza os dados
- [ ] Cartões de crédito aparecem com valor e badge de status
- [ ] "Próximas contas" lista despesas dos próximos 7 dias
- [ ] Saldo bancário aparece se banco conectado
- [ ] EmptyState correto quando sem dados

## Lançamentos
- [ ] Lista carrega transações reais
- [ ] "+" para receitas (verde), "-" para despesas (vermelho)
- [ ] Scroll até o fim carrega mais itens (paginação)
- [ ] Pull-to-refresh funciona
- [ ] EmptyState correto quando sem lançamentos

## Planejamento
- [ ] Barra de progresso do mês exibe % correto
- [ ] Metas de receita, despesa, economia, cartão aparecem
- [ ] Barra vermelha quando despesa acima da meta
- [ ] EmptyState correto quando sem metas

## Aba Mais
- [ ] Nome e e-mail do usuário exibidos
- [ ] Badge do plano (Free, Pro, etc.)
- [ ] Menu de seções com "Em breve" funcional
- [ ] Botão "Sair" abre Alert de confirmação

## Layout
- [ ] Sem borda branca no fundo de nenhuma tela (iOS)
- [ ] Conteúdo não fica atrás do notch (SafeAreaView)
- [ ] Pull-to-refresh funciona em todas as telas com scroll
- [ ] Bottom tab bar visível e com 5 abas
- [ ] Tema dark/light respeita preferência do sistema

## Dispositivos para testar
- [ ] iPhone 14 (iOS 17) — simulador ou device
- [ ] iPhone SE 3ª geração — tela menor
- [ ] Android (Pixel 6 ou Samsung S22) — emulador
