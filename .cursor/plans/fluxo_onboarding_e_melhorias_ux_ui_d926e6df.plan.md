---
name: Fluxo onboarding e melhorias UX/UI
overview: Documentação do fluxo atual de onboarding (múltiplas rotas, banners e estados) e sugestões de melhoria de UX/UI com base nas inconsistências encontradas no código.
todos: []
isProject: false
---

# Fluxo atual de onboarding e sugestões de melhoria UX/UI

## 1. Fluxo atual (como funciona hoje)

Existem **três** fluxos distintos que usam a palavra "onboarding" no código, com fontes de verdade diferentes.

### 1.1 Rotas e telas


| Rota                   | Componente                                                                                        | O que faz                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/onboarding`          | [OnboardingScreen](apps/web/src/design-system/components/OnboardingScreen.tsx)                    | 3 slides de valor (controle, FIPE, conectar bancos). "Pular" ou concluir → `markOnboardingComplete(profiles)` + localStorage + navega para `/inicio`. **Não** usa `onboarding_phase`.                                       |
| `/onboarding2`         | [Onboarding2](apps/web/src/pages/Onboarding2.tsx)                                                 | Formulário único: nome, email, telefone, data nascimento, marketing. Submit → `profiles.onboarding_completed = true` → tela de boas-vindas → botões para `/inicio`. Se já `onboarding_completed` → redirect `/simuladores`. |
| `/onboarding-controle` | [OnboardingControlWizard](apps/web/src/components/onboarding-control/OnboardingControlWizard.tsx) | Wizard em 6 passos: intro (StepTransition), Planejamento, Fluxo, Cartão, Metas, Patrimônio, Grand Finale. Usa `onboarding_control_phase` e `onboarding_control_done` em `profiles`. Ao concluir → `/inicio`.                |


### 1.2 Estados e fontes de verdade

- **Raio-X (demo / progresso):** `profiles.onboarding_phase` + `onboarding_state.onboarding_phase` (prioridade state). Valores: `not_started` → `started` → `block_a_done` → `block_b_done` → `block_c_done` → `completed`.
- **Demo mode:** [useDemoMode](apps/web/src/hooks/useDemoMode.ts) — demo ativo quando fase **não** está em `['block_b_done','block_c_done','completed']`.
- **Control tour:** `profiles.onboarding_control_phase` e `profiles.onboarding_control_done`. Usado apenas pelo wizard de controle.

### 1.3 Como o usuário chega a cada fluxo

```mermaid
flowchart LR
  subgraph auth [Pós-auth]
    AC[AuthCallback]
    Signup[Signup]
    PR[ProtectedRoute]
  end
  subgraph routes [Rotas]
    O1["/onboarding\n3 slides"]
    O2["/onboarding2\nPerfil"]
    OC["/onboarding-controle\n6 steps"]
  end
  subgraph banners [Banners no app]
    Demo[DemoDataBanner vermelho]
    Progress[OnboardingProgressBanner verde]
    Control[ControlOnboardingBanner azul]
  end
  AC -->|onboarding_completed false| O1
  Signup -->|emailRedirectTo| O1
  PR -->|em alguns casos| O1
  Demo -->|"Começar Raio-X"| O2
  Progress -->|"Continuar Raio-X"| O2
  Control -->|"Continuar tour"| OC
  O1 -->|Concluir/Pular| Inicio[/inicio]
  O2 -->|Submit + Welcome| Inicio
  OC -->|Completar 6 steps| Inicio
```



- **AuthCallback:** Se `onboarding_completed !== true` (via RPC `get_user_profile_settings`) ou não existe `localStorage rxfin-onboarding-done` → redireciona para `/onboarding`.
- **DemoDataBanner (vermelho):** Visível em modo demo. Clicar em "Começar Raio-X" → `advancePhase('started')` + `navigate('/onboarding2')`.
- **OnboardingProgressBanner (verde):** Visível quando `currentPhase` ∈ {started, block_a_done, block_b_done, block_c_done}. "Continuar Raio-X" → `/onboarding2`. Exibe "Bloco 1/4" … "Bloco 4/4" conforme a fase.
- **ControlOnboardingBanner (azul):** Em [Inicio](apps/web/src/pages/Inicio.tsx) quando `currentPhase === 'completed' && !controlDone`. "Continuar tour" → `/onboarding-controle`.

### 1.4 Inconsistência crítica (Raio-X vs UI)

- **OnboardingWizardV3** (Bloco A/B/C/D) é o único componente que chama `advancePhase('block_a_done')`, `advancePhase('block_b_done')`, etc., mas **não está em nenhuma rota** em [App.tsx](apps/web/src/App.tsx). Só `/onboarding` e `/onboarding2` e `/onboarding-controle` existem.
- Consequência: o usuário pode ficar em `started` para sempre. O banner verde sempre mostra "Bloco 1/4" e leva para `/onboarding2`, que é só o formulário de perfil e **não** avança para block_a_done. As fases `block_a_done` … `block_c_done` nunca são alcançadas pela UI atual.

---

## 2. Resumo do funcionamento atual

1. **Primeiro acesso:** AuthCallback ou Signup levam para `/onboarding` (3 slides) ou, dependendo de config, poderia ser `/onboarding2` (uso de `first_login_route` em [useAppSettings](apps/web/src/hooks/useAppSettings.ts) não está unificado com AuthCallback que usa `/onboarding`).
2. **Após slides:** "Concluir" marca onboarding completo e vai para `/inicio`. Não há coleta de perfil (nome, telefone, nascimento) nesse caminho.
3. **Modo demo:** Usuário vê dados fictícios e o banner vermelho. "Começar Raio-X" → fase `started` + vai para `/onboarding2`. Preenche perfil → `onboarding_completed = true` → boas-vindas → `/inicio`. Fase continua `started` (ou o que estiver); nunca avança para Bloco 2/3/4 pela UI.
4. **Banner verde:** Aparece enquanto fase ∈ {started, block_a_done, block_b_done, block_c_done} e leva para `/onboarding2`, que não reflete "Blocos" nem avança fases.
5. **Tour de controle:** Quando fase Raio-X = `completed` e control não concluído, o banner azul convida para `/onboarding-controle`. Conclusão do wizard define `onboarding_control_done` e redireciona para `/inicio`.

---

## 3. Sugestões de melhoria (UX e UI)

### 3.1 Alinhar Raio-X com a UI (crítico)

- **Opção A (recomendada):** Expor o wizard de blocos numa rota e fazer o banner verde apontar para ele.
  - Ex.: Nova rota `/onboarding/raio-x` que renderiza [OnboardingWizardV3](apps/web/src/components/onboarding/OnboardingWizardV3.tsx).
  - DemoDataBanner e OnboardingProgressBanner: "Começar Raio-X" / "Continuar Raio-X" → `/onboarding/raio-x` em vez de `/onboarding2`.
  - Assim o usuário avança de fato por Bloco 1 → 2 → 3 → 4 e as fases no backend passam a refletir o que a UI mostra.
- **Opção B:** Remover o conceito de "Blocos" da UI e do banner verde: tratar apenas "perfil completo" (ex. só `/onboarding2`) e demo on/off por outro critério (ex. `onboarding_completed`), sem usar `block_a_done` etc. no front.

### 3.2 Unificar primeiro acesso

- Definir uma única regra: primeiro login vai para **ou** `/onboarding` (slides) **ou** `/onboarding2` (perfil), não os dois de forma ambígua.
- Ex.: AuthCallback e useAuthRedirect usarem o mesmo alvo (ex. `first_login_route` de app_settings: `/onboarding2` ou `/onboarding`) e remover o fallback por `localStorage rxfin-onboarding-done` se redundante.

### 3.3 Ordem lógica: perfil → valor → tour

- **Perfil primeiro:** Garantir coleta de nome/telefone/nascimento antes de considerar onboarding "completo" (ex. após slides, redirecionar para um passo de perfil único, ou fazer `/onboarding2` ser o primeiro passo após signup).
- **Depois valor:** Slides ou equivalente (como hoje em `/onboarding`) ou integrados num único wizard.
- **Por último tour:** Manter o tour de 6 passos como "conhecer módulos" após Raio-X completo, como hoje com ControlOnboardingBanner.

### 3.4 UI/UX dos componentes

- **Onboarding2:** Barra de progresso atual é um único segmento; considerar indicar "Passo 1 de 2" (perfil + boas-vindas) ou integrar numa barra global se unificar com outros passos.
- **OnboardingProgressBanner:** Só mostrar "Bloco X/4" quando a rota de destino realmente tiver blocos; caso contrário, usar texto genérico ("Continuar configuração") ou esconder o label de bloco.
- **ControlOnboardingBanner:** Pode ser dismissível (sessionStorage); considerar também persistir "não mostrar de novo" por usuário (backend) para não repetir para quem já rejeitou.
- **OnboardingScreen (3 slides):** Incluir indicador de progresso (bolinhas ou "1/3", "2/3", "3/3") e gestos de swipe já suportados; garantir que "Pular" deixe claro que o usuário pode configurar depois (ex. "Pular e configurar depois").

### 3.5 Consistência de nomenclatura

- Evitar misturar "Raio-X", "tour", "configuração" e "onboarding" sem contexto. Ex.: banner verde = "Raio-X"; banner azul = "Tour dos módulos" ou "Conhecer ferramentas"; primeiro fluxo = "Complete seu perfil" ou "Bem-vindo".
- Em [OnboardingProgressBanner](apps/web/src/components/shared/OnboardingProgressBanner.tsx) e [DemoDataBanner](apps/web/src/components/shared/DemoDataBanner.tsx), manter os mesmos termos que na rota de destino.

### 3.6 Acessibilidade e feedback

- Em formulários (Onboarding2, steps do Control): `aria-label` em campos obrigatórios, mensagens de erro associadas aos inputs e foco no primeiro erro após submit.
- Após avançar fase ou concluir passo: toast ou feedback visual breve (já existe em vários pontos; garantir que todo avanço de etapa tenha feedback).

---

## 4. Arquivos principais envolvidos


| Papel                       | Arquivo(s)                                                                                                                                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rotas onboarding            | [App.tsx](apps/web/src/App.tsx) (OnboardingRoute, /onboarding2, /onboarding-controle)                                                                                                                                                                           |
| Estado e fases              | [useOnboardingCheckpoint.ts](apps/web/src/hooks/useOnboardingCheckpoint.ts), [useDemoMode.ts](apps/web/src/hooks/useDemoMode.ts)                                                                                                                                |
| Banners                     | [DemoDataBanner.tsx](apps/web/src/components/shared/DemoDataBanner.tsx), [OnboardingProgressBanner.tsx](apps/web/src/components/shared/OnboardingProgressBanner.tsx), [ControlOnboardingBanner.tsx](apps/web/src/components/shared/ControlOnboardingBanner.tsx) |
| Telas                       | [Onboarding2.tsx](apps/web/src/pages/Onboarding2.tsx), [OnboardingScreen.tsx](apps/web/src/design-system/components/OnboardingScreen.tsx), [OnboardingControlWizard.tsx](apps/web/src/components/onboarding-control/OnboardingControlWizard.tsx)                |
| Wizard Blocos (não roteado) | [OnboardingWizardV3.tsx](apps/web/src/components/onboarding/OnboardingWizardV3.tsx), blocks BlockA–D                                                                                                                                                            |
| Redirect pós-login          | [AuthCallback.tsx](apps/web/src/pages/AuthCallback.tsx), [useAuthRedirect.ts](apps/web/src/hooks/useAuthRedirect.ts)                                                                                                                                            |


---

## 5. Próximos passos sugeridos (prioridade)

1. **Decisão de produto:** Manter os 4 blocos do Raio-X (Block A/B/C/D) como fluxo principal ou simplificar para perfil + tour?
2. **Se manter blocos:** Adicionar rota para `OnboardingWizardV3` e fazer os banners "Raio-X" apontarem para ela; ajustar Onboarding2 para ser apenas "perfil inicial" (ex. antes dos blocos) ou tela de boas-vindas após blocos.
3. **Se simplificar:** Remover referências a "Bloco 1/4" no banner verde e usar apenas "Complete seu perfil" → `/onboarding2`, e desligar demo por `onboarding_completed` (ou critério único).
4. Unificar AuthCallback e useAuthRedirect para um único destino de primeiro login.
5. Pequenas melhorias de UI: indicadores de progresso, labels e acessibilidade nos formulários e banners listados acima.

