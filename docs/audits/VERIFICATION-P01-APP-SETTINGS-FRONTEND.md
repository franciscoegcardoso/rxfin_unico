# Verificação P0-1 — app_settings no frontend (pós-RLS)

**Contexto:** Após a migration `p0_1_protect_app_settings_sensitive_keys`, keys sensíveis (`pluggy_api_token`, *token*, *secret*, *api_key*, *credential*) só são retornadas para admins. Usuários autenticados leem apenas settings não sensíveis. Anon lê apenas: `maintenance_mode`, `feature_flags`, `app_version`, `signup_enabled`, `public_announcement`.

---

## Busca: `from('app_settings')` no frontend

### apps/web/src

| Arquivo | setting_key(s) lidas | Sensível? | Comportamento pós-RLS |
|---------|----------------------|-----------|------------------------|
| `pages/AuthCallback.tsx` | `returning_user_route` | Não | ✅ Autenticado lê |
| `hooks/useAppSettings.ts` | `DEFAULT_SETTINGS`: routes, onboarding, notifications | Não | ✅ Autenticado lê |
| `hooks/useAffiliateOffer.ts` | `affiliate_offer` | Não | ✅ Autenticado lê |
| `components/admin/email-campaigns/EmailSettingsCard.tsx` | `email_settings` (leitura/escrita) | Não (config email) | ✅ Admin lê/escreve tudo |
| `hooks/useAdminDeferredMutations.ts` | upsert genérico (admin) | — | ✅ Admin |

**Nenhum componente em apps/web/src lê `pluggy_api_token`.** O token é obtido apenas pelas Edge Functions (ex.: `pluggy-connect`) via service_role.

### apps/landing/src

| Arquivo | setting_key(s) | Comportamento pós-RLS |
|---------|----------------|------------------------|
| `pages/LandingPage.tsx` | `landing_lead_gate_enabled` | Anon: key não está na lista “Anon can read”. Query pode retornar vazio; código usa `if (data)` e default do ref. |
| `components/landing/ExitIntentPopup.tsx` | `landing_exit_popup_enabled` | Idem. |
| `components/landing/WhatsAppButton.tsx` | `landing_whatsapp_number`, `landing_whatsapp_message` | Idem. |

**Nota:** Se a RLS anon permitir apenas as 5 keys listadas, as keys `landing_*` não serão retornadas para visitantes. O código atual trata “sem dados” com defaults (ex.: lead gate habilitado quando não há dado). Se for desejado que visitantes vejam essas configs, a migration no backend precisa incluir essas keys na policy “Anon can read public settings”.

---

## Conclusão

- **pluggy_api_token:** não é lido em nenhum lugar do frontend (web/landing). ✅  
- **Demais leituras de app_settings:** usam apenas keys não sensíveis ou contexto admin. ✅  
- **Ação no código frontend:** nenhuma alteração necessária para P0-1 (credenciais Pluggy e proteção de app_settings).

---

*Verificação Cursor — P0-1, Março 2026*
