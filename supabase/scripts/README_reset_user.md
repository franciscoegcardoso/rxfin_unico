# Reset de dados do usuário para onboarding do zero

## Script: `reset_user_data_for_onboarding.sql`

Remove **todos os dados inseridos** (CRUD e dados reais) do usuário **franciscoegcardoso@gmail.com**, para que o onboarding possa ser refeito do zero.

### O que é preservado

- **Conta**: o registro em `auth.users` e a linha em `public.profiles` (identidade mínima).
- **Privilégios de admin**: a tabela `public.user_roles` **não é alterada**; o usuário continua com role `admin`.

### O que é apagado / resetado

- Estado de onboarding (`onboarding_state`, campos de onboarding em `profiles`).
- Entradas mensais e metas (`user_monthly_entries`, `monthly_goals`, `user_kv_store`).
- Lançamentos, contas a pagar/receber, cartão de crédito (bills, imports, transactions).
- Dados de AI (onboarding events, chat, feedback).
- Consórcios, financiamentos, bill splits, pacotes de orçamento, audit logs.
- Leituras e dismissals de notificações do usuário.

O script ainda **reseta** em `profiles`: `onboarding_phase = 'not_started'`, `onboarding_completed = false`, `onboarding_control_done = false`, `onboarding_control_phase = 'not_started'`, `birth_date = null`.

### Como executar

1. Abra o **Supabase Dashboard** do projeto.
2. Vá em **SQL Editor**.
3. Cole o conteúdo de `reset_user_data_for_onboarding.sql`.
4. Execute (Run).

Se alguma tabela não existir no seu banco (ex.: `relation "public.xxx" does not exist`), comente ou remova a linha `DELETE FROM public.xxx ...` correspondente e execute de novo.

### Alvo

O script usa o email **franciscoegcardoso@gmail.com** para obter o `user_id` em `auth.users`. Para outro email, altere o valor na linha:

```sql
WHERE email = 'franciscoegcardoso@gmail.com';
```
