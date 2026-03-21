# Knip (`apps/web`)

## Comando recomendado

```bash
npm run knip
```

Usa `knip.json` com `--include files,exports,types` e `--no-config-hints`. O relatório completo de **dependências** não é o foco (muito ruído / limites do resolver); para limpeza de deps use revisão manual ou outras ferramentas.

## Segunda ronda (grep)

```bash
npm run knip:verify
```

Corre Knip só em **ficheiros** (JSON) e cruza candidatos com `git grep` no `apps/web/src` (paths relativos ao **root do repositório git**). Lista **confirmados** vs **revisar** — **não apaga** ficheiros.

Limitações: imports dinâmicos, strings geradas e falsos positivos/negativos são possíveis; integrações (Supabase, Pluggy, etc.) só devem ser removidas com prova no grafo de imports ou após confirmação explícita.
