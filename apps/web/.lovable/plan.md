

## Plano: Hardening de Segurança Admin — Frontend

### 1. Code Splitting das rotas admin (lazy loading)

**Arquivo:** `src/App.tsx`

- Adicionar `lazy` e `Suspense` aos imports do React
- Converter os 5 imports estáticos admin para `lazy()`:
  - `Admin`, `FipeSync`, `AdminMarketing`, `AIFeedback`, `AIMetrics`
- Envolver as rotas admin (`/admin/*`) com `<Suspense fallback={<RXFinLoadingSpinner />}>`
- Resultado: usuários comuns nunca baixam o bundle admin (~200KB+ de código)

### 2. Badge "Sessão Admin" no TopNavbar

**Arquivo:** `src/components/layout/TopNavbar.tsx`

- Ao lado do botão Admin existente (que já aparece quando `isAdmin=true`), adicionar um badge fixo na barra:
```
<Badge variant="warning" className="...">
  <ShieldCheck className="h-3 w-3" />
  Admin
</Badge>
```
- Usar cores amber/yellow consistentes com o tema admin existente (`bg-amber-500/10 text-amber-600`)
- Posicionar no bloco "Right side actions", antes do NotificationBell

### 3. Hook useAdminAudit

**Arquivo novo:** `src/hooks/useAdminAudit.ts`

- Chama a RPC `log_admin_action` já existente no Supabase (confirmada em `types.ts` linhas 5884-5892)
- Assinatura da RPC: `{ _action, _resource_type, _resource_id?, _metadata?, _severity? }`
- O hook expõe `logAction(action, resourceType, resourceId?, metadata?, severity?)` que faz `supabase.rpc('log_admin_action', ...)` de forma fire-and-forget (sem bloquear a UI)
- Inclui tratamento de erro silencioso (console.error apenas, não exibe toast)

### 4. Integração do audit nas ações admin

**Arquivos afetados:**

- **`src/hooks/useAdminUsers.ts`** — adicionar `logAction` nos `onSuccess` de:
  - `updateUser` → `logAction('UPDATE_USER', 'profiles', id, updates)`
  - `toggleUserActive` → `logAction('TOGGLE_USER_ACTIVE', 'profiles', id, { is_active })`
  - `updateSubscriptionRole` → `logAction('UPDATE_PLAN', 'workspaces', id, { planSlug })`
  - `grantAdminRole` → `logAction('GRANT_ADMIN', 'user_roles', userId, {}, 'critical')`
  - `revokeAdminRole` → `logAction('REVOKE_ADMIN', 'user_roles', userId, {}, 'critical')`

- **`src/components/admin/email-campaigns/CampaignEditor.tsx`** — no `handleSendCampaign`, após sucesso, chamar `logAction('SEND_CAMPAIGN', 'email_campaigns', campaignId, { segment, title })`

- **`src/components/admin/AdminInviteUsersTab.tsx`** — ao convidar como admin, chamar `logAction('INVITE_ADMIN', 'user_roles', null, { email }, 'critical')`

### Detalhes técnicos

- A RPC `log_admin_action` usa `auth.uid()` internamente, então o `user_id` é preenchido automaticamente
- O hook `useAdminAudit` não usa `useMutation` — é uma função simples async que não precisa invalidar cache
- O `logAction` é chamado no `onSuccess` das mutations, nunca no `mutationFn`, para não bloquear a operação principal
- Severity padrão: `'medium'`; ações de role escalation usam `'critical'`

### Arquivos criados/alterados

| Arquivo | Ação |
|---|---|
| `src/App.tsx` | Lazy loading das 5 rotas admin |
| `src/components/layout/TopNavbar.tsx` | Badge "Admin" amber |
| `src/hooks/useAdminAudit.ts` | **Novo** — hook wrapper da RPC |
| `src/hooks/useAdminUsers.ts` | Integrar logAction em 5 mutations |
| `src/components/admin/email-campaigns/CampaignEditor.tsx` | logAction no envio |
| `src/components/admin/AdminInviteUsersTab.tsx` | logAction no convite admin |

