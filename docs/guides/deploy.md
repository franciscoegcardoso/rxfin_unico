# Guia de Deploy

## Edge Functions

### Deploy Automático (recomendado)
1. Editar a função em `supabase/functions/nome-da-funcao/index.ts`
2. Commit e push para `develop` → deploya em staging automaticamente
3. Testar no staging
4. Merge para `main` → deploya em produção automaticamente

### Deploy Manual (emergência)
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy de uma função específica
supabase functions deploy nome-da-funcao --project-ref kneaniaifzgqibpajyji

# Deploy de todas
supabase functions deploy --project-ref kneaniaifzgqibpajyji
```

### Deploy via Claude (MCP Supabase)
No chat do Claude, pedir diretamente:
> "Faça deploy da Edge Function X para staging"

O Claude usa o MCP Supabase para fazer o deploy direto.

## Migrations

### Via Claude (recomendado para desenvolvimento)
> "Crie uma migration para adicionar coluna X na tabela Y"

O Claude aplica via MCP Supabase.

### Via Supabase CLI
```bash
# Criar migration
supabase migration new nome_da_migration

# Aplicar em staging
supabase db push --project-ref rxefngokspcaibkvbjtt

# Aplicar em produção
supabase db push --project-ref kneaniaifzgqibpajyji
```

## App Mobile

### Build via EAS
```bash
cd apps/mobile
eas build --platform ios
eas build --platform android
```

### Publicar update OTA
```bash
cd apps/mobile
eas update --branch production
```

## Ambientes

| Ambiente | Supabase Project ID | Uso |
|----------|-------------------|-----|
| Staging | `rxefngokspcaibkvbjtt` | Testes antes de produção |
| Produção | `kneaniaifzgqibpajyji` | Usuários reais |
