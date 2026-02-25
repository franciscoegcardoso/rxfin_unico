# RXFin - Documentação Legal Completa
## Pré-Requisitos, Segurança e Disclaimers

**Versão:** 2.0  
**Data de Elaboração:** 05 de Fevereiro de 2026  
**Documento de Referência para Termos de Uso e Política de Privacidade**

---

## SUMÁRIO

1. [Pré-Requisitos Técnicos](#1-pré-requisitos-técnicos)
2. [Características de Segurança](#2-características-de-segurança-implementadas)
3. [Disclaimers e Isenções](#3-disclaimers-e-isenções-de-responsabilidade)
4. [Conformidade LGPD](#4-conformidade-lgpd)
5. [Textos Prontos para Uso](#5-textos-prontos-para-inserção)

---

## 1. PRÉ-REQUISITOS TÉCNICOS

### 1.1 Requisitos do Navegador

**Navegadores Suportados:**
- Google Chrome (versão 90 ou superior)
- Mozilla Firefox (versão 88 ou superior)
- Microsoft Edge (versão 90 ou superior)
- Safari (versão 14 ou superior)
- Navegadores móveis modernos (Chrome Mobile, Safari Mobile)

**Requisitos Técnicos:**
- JavaScript habilitado
- Cookies habilitados
- LocalStorage disponível
- Conexão HTTPS (automática)

### 1.2 Requisitos de Conta

- **Idade mínima:** 18 anos completos
- **Email:** Endereço de email válido e acessível para confirmação
- **Senha:** Mínimo de 6 caracteres
- **Consentimento:** Aceitação explícita dos Termos de Uso e Política de Privacidade

### 1.3 Requisitos de Conectividade

- Conexão à internet estável (banda larga recomendada)
- Capacidade de receber emails (para confirmação de conta e recuperação de senha)
- Acesso a serviços de autenticação terceiros (Google, Facebook) se optar por login social

---

## 2. CARACTERÍSTICAS DE SEGURANÇA IMPLEMENTADAS

### 2.1 Autenticação e Controle de Acesso

| Recurso | Tecnologia | Descrição |
|---------|------------|-----------|
| Autenticação Multi-Provider | Supabase Auth | Email/senha, Google OAuth 2.0, Facebook OAuth |
| Confirmação de Email | Token único | Verificação obrigatória antes do primeiro acesso |
| Recuperação de Senha | Link temporário | Links de reset com expiração de 24 horas |
| Proteção contra Força Bruta | Rate Limiting | Bloqueio após 5 tentativas falhas em 15 minutos |
| Gerenciamento de Sessão | JWT + Refresh Token | Tokens seguros com renovação automática |
| Logout Seguro | Cache Clearing | Limpeza completa de dados de sessão |

### 2.2 Isolamento de Dados (Row Level Security)

**Implementação:**
Todas as tabelas contendo dados financeiros do usuário implementam políticas de Row Level Security (RLS) em nível de banco de dados PostgreSQL.

**Regra Fundamental:**
```
auth.uid() = user_id
```

**Tabelas Protegidas:**
- `profiles` - Dados de perfil do usuário
- `workspaces` - Espaços de trabalho
- `consorcios` - Registros de consórcios
- `financiamentos` - Registros de financiamentos
- `contas_pagar_receber` - Contas a pagar e receber
- `lancamentos_realizados` - Lançamentos financeiros
- `credit_card_transactions` - Transações de cartão de crédito
- `credit_card_bills` - Faturas de cartão
- `budget_packages` - Pacotes de orçamento
- `gift_assignments` - Atribuições de presentes
- `ir_comprovantes` - Comprovantes de IR
- `seguros` - Registros de seguros
- `purchase_registry` - Registro de compras
- `monthly_goals` - Metas mensais
- `user_vehicles` - Veículos do usuário
- `pluggy_connections` - Conexões Open Finance

### 2.3 Criptografia e Proteção de Dados

| Camada | Tecnologia | Aplicação |
|--------|------------|-----------|
| Dados em Trânsito | TLS 1.3 / HTTPS | Toda comunicação cliente-servidor |
| Dados em Repouso | AES-256 | Banco de dados Supabase |
| Chaves de API | PGP Simétrico | `pgp_sym_encrypt` para tokens sensíveis |
| Senhas | Bcrypt | Hash irreversível via Supabase Auth |
| Tokens JWT | HS256 | Assinatura de tokens de sessão |

### 2.4 Sistema de Auditoria

**Tabela `audit_logs`:**
- `user_id` - Identificador do usuário
- `action` - Ação realizada
- `resource_type` - Tipo de recurso afetado
- `resource_id` - ID do recurso
- `ip_address` - Endereço IP de origem
- `user_agent` - Navegador/dispositivo
- `severity` - Nível de severidade
- `metadata` - Dados adicionais em JSON
- `created_at` - Timestamp automático

**Tabela `deletion_audit_log`:**
- Registro permanente de todas as exclusões
- Contagem de registros dependentes excluídos
- Detalhes completos da entidade excluída

### 2.5 Funções de Segurança (Security Definer)

Todas as funções críticas utilizam `SECURITY DEFINER` com `SET search_path = 'public'`:

- `is_admin()` - Verificação de status administrativo
- `has_role()` - Controle de permissões por workspace
- `check_login_attempts()` - Proteção contra brute force
- `log_audit_action()` - Registro de auditoria
- `encrypt_api_key()` - Criptografia de chaves de API
- `decrypt_api_key()` - Descriptografia segura
- `admin_delete_user()` - Exclusão com anonimização

---

## 3. DISCLAIMERS E ISENÇÕES DE RESPONSABILIDADE

### 3.1 Natureza do Serviço

O RXFin é uma ferramenta de **organização e simulação financeira pessoal** de caráter exclusivamente **informativo e educacional**.

**O serviço NÃO constitui:**
- Aconselhamento financeiro profissional
- Consultoria de investimentos
- Assessoria jurídica ou tributária
- Serviço de contabilidade
- Recomendação de produtos financeiros

**O serviço NÃO substitui:**
- Contadores e profissionais de contabilidade
- Advogados especializados
- Planejadores financeiros certificados (CFP)
- Consultores de investimentos registrados na CVM
- Assessores de investimentos autorizados

### 3.2 Precisão de Cálculos e Projeções

**Limitações reconhecidas:**

1. **Simulações de Financiamento:** Os cálculos são estimativas baseadas em modelos matemáticos (Price, SAC) que podem divergir das condições reais oferecidas por instituições financeiras.

2. **Simulações de Consórcio:** Projeções de parcelas e contemplação são aproximadas e não consideram todas as variáveis de cada administradora.

3. **Depreciação de Veículos:** Utiliza dados da Tabela FIPE obtidos de fontes terceiras, sujeitos a atraso ou variações regionais.

4. **Projeções de Longo Prazo:** Planejamentos de 30 anos são especialmente sensíveis a variações econômicas imprevisíveis (inflação, taxas de juros, crises).

5. **Índices Econômicos:** Selic, CDI, IPCA e outros indicadores são coletados de fontes públicas e podem apresentar defasagem.

### 3.3 Responsabilidade por Decisões

**O usuário reconhece expressamente que:**

1. É o **único e exclusivo responsável** por todas as decisões financeiras tomadas com base em informações do RXFin.

2. Deve buscar **orientação profissional qualificada e independente** antes de realizar operações financeiras significativas.

3. O RXFin, seus sócios, funcionários, colaboradores e afiliados **não são responsáveis** por quaisquer perdas, danos, prejuízos ou consequências adversas decorrentes de decisões tomadas com base nas informações da plataforma.

4. **Resultados simulados não garantem resultados reais.** Projeções passadas ou futuras são meramente ilustrativas.

### 3.4 Segurança de Dados

**Medidas implementadas:**
O RXFin emprega medidas técnicas de segurança em conformidade com as melhores práticas da indústria, incluindo criptografia, isolamento de dados e controles de acesso.

**Limitações reconhecidas:**

1. **Nenhum sistema é 100% seguro.** Vulnerabilidades de segurança, ataques cibernéticos e falhas técnicas podem ocorrer.

2. **Responsabilidade do usuário:**
   - Manter credenciais de acesso em sigilo
   - Utilizar senhas fortes e únicas
   - Não compartilhar acesso com terceiros
   - Proteger seus dispositivos pessoais

3. **O RXFin não se responsabiliza por acessos não autorizados decorrentes de:**
   - Senhas fracas ou reutilizadas
   - Compartilhamento de credenciais
   - Dispositivos comprometidos por malware
   - Ataques de phishing ou engenharia social
   - Vulnerabilidades em redes públicas ou domésticas

### 3.5 Disponibilidade do Serviço

O RXFin é fornecido **"como está" (AS IS)** e **"conforme disponível" (AS AVAILABLE)**.

**Não garantimos:**
- Disponibilidade ininterrupta 24/7
- Ausência de erros, bugs ou falhas técnicas
- Compatibilidade com todos os dispositivos ou navegadores
- Manutenção de funcionalidades específicas em versões futuras
- Velocidade ou performance constante

**Reservamo-nos o direito de:**
- Modificar funcionalidades a qualquer momento
- Suspender temporariamente o serviço para manutenção
- Descontinuar funcionalidades mediante aviso prévio quando possível
- Encerrar o serviço como um todo

### 3.6 Integrações de Terceiros

**Open Finance (Pluggy):**
- A conexão com instituições financeiras é realizada por provedores terceiros certificados pelo Banco Central
- O RXFin **não armazena** credenciais bancárias do usuário
- Tokens de acesso são criptografados e têm validade limitada
- Não nos responsabilizamos por indisponibilidade do provedor

**Tabela FIPE:**
- Dados de precificação veicular são obtidos de fontes externas
- Podem apresentar variações em relação a valores reais de mercado
- Atualizações dependem da fonte original

**Indicadores Econômicos:**
- Taxas Selic, CDI, IPCA e outros índices são coletados de APIs públicas
- Podem apresentar defasagem em relação a valores oficiais
- Sujeitos a alterações sem aviso prévio

---

## 4. CONFORMIDADE LGPD

### 4.1 Dados Coletados

**Dados de Cadastro:**
- Nome completo
- Endereço de email
- Senha (armazenada como hash)
- Data de nascimento (opcional)
- Telefone (opcional)

**Dados Financeiros (inseridos pelo usuário):**
- Rendas e receitas
- Despesas e gastos
- Ativos e patrimônio
- Dívidas e financiamentos
- Metas e objetivos financeiros

**Dados de Uso:**
- Logs de acesso
- Ações realizadas na plataforma
- Preferências de configuração

**Dados Técnicos:**
- Endereço IP
- User Agent (navegador/dispositivo)
- Cookies de sessão

### 4.2 Bases Legais

| Finalidade | Base Legal (Art. 7º LGPD) |
|------------|---------------------------|
| Prestação do serviço | Execução de contrato |
| Comunicações essenciais | Execução de contrato |
| Segurança e prevenção a fraudes | Legítimo interesse |
| Marketing (com opt-in) | Consentimento |
| Cumprimento legal | Obrigação legal |

### 4.3 Direitos do Titular

O usuário pode exercer os seguintes direitos:
- **Acesso:** Solicitar cópia de seus dados pessoais
- **Correção:** Retificar dados incompletos ou incorretos
- **Exclusão:** Solicitar eliminação de dados (direito ao esquecimento)
- **Portabilidade:** Receber dados em formato estruturado
- **Revogação:** Retirar consentimento para marketing
- **Oposição:** Opor-se a tratamento baseado em legítimo interesse

### 4.4 Retenção e Exclusão

**Período de Retenção:**
- Dados ativos: Enquanto a conta estiver ativa
- Dados excluídos: 30 dias na lixeira (recuperáveis)
- Logs de auditoria: 5 anos (obrigação legal)

**Processo de Exclusão:**
1. Soft delete inicial (dados movidos para lixeira)
2. Período de recuperação de 30 dias
3. Anonimização de dados pessoais identificáveis
4. Exclusão permanente de dados não-auditáveis

### 4.5 Compartilhamento

**Não compartilhamos dados pessoais com terceiros, exceto:**
- Provedores de infraestrutura (Supabase, Vercel)
- Provedores de pagamento (quando aplicável)
- Autoridades mediante ordem judicial
- Provedores de Open Finance (mediante consentimento explícito)

---

## 5. TEXTOS PRONTOS PARA INSERÇÃO

### 5.1 Para Termos de Uso

#### Seção: Requisitos Técnicos

> **1. REQUISITOS PARA USO DA PLATAFORMA**
>
> 1.1. Para utilizar o RXFin adequadamente, o Usuário deve dispor de:
> a) Navegador web atualizado (Chrome, Firefox, Edge ou Safari em suas versões mais recentes);
> b) Conexão estável à internet;
> c) JavaScript e cookies habilitados;
> d) Capacidade de receber emails para confirmação de conta.
>
> 1.2. Não garantimos o funcionamento adequado em navegadores desatualizados, não suportados ou com extensões que interfiram no funcionamento normal da aplicação.
>
> 1.3. O Usuário declara ter no mínimo 18 (dezoito) anos completos e capacidade civil plena para aceitar estes Termos.

#### Seção: Natureza do Serviço

> **2. NATUREZA DO SERVIÇO**
>
> 2.1. O RXFin é uma ferramenta de organização e simulação financeira pessoal de caráter exclusivamente INFORMATIVO E EDUCACIONAL.
>
> 2.2. As informações, simulações, projeções e relatórios gerados pela plataforma:
> a) NÃO CONSTITUEM aconselhamento financeiro, jurídico, tributário, contábil ou de investimentos profissional;
> b) NÃO SUBSTITUEM a consulta a profissionais habilitados como contadores, advogados, planejadores financeiros certificados ou consultores de investimentos registrados na CVM;
> c) São baseados em dados inseridos pelo próprio Usuário e em parâmetros de mercado que podem não refletir condições reais ou futuras.
>
> 2.3. O Usuário reconhece e aceita que é o ÚNICO E EXCLUSIVO RESPONSÁVEL por todas as decisões financeiras tomadas com base em informações obtidas no RXFin.

#### Seção: Limitação de Responsabilidade

> **3. LIMITAÇÃO DE RESPONSABILIDADE**
>
> 3.1. O RXFin, seus sócios, funcionários, colaboradores e afiliados NÃO SERÃO RESPONSÁVEIS por:
> a) Quaisquer perdas, danos, prejuízos financeiros ou consequências adversas decorrentes de decisões tomadas com base nas informações da plataforma;
> b) Imprecisões nos cálculos de financiamento, consórcio, depreciação ou projeções futuras;
> c) Variações entre valores simulados e valores reais praticados pelo mercado;
> d) Indisponibilidade temporária ou permanente do serviço;
> e) Perda de dados decorrente de falhas técnicas, ataques cibernéticos ou caso fortuito;
> f) Acessos não autorizados decorrentes de negligência do Usuário com suas credenciais.
>
> 3.2. Em qualquer hipótese, a responsabilidade total do RXFin estará limitada ao valor efetivamente pago pelo Usuário nos 12 (doze) meses anteriores ao evento danoso, quando aplicável.

#### Seção: Disponibilidade

> **4. DISPONIBILIDADE DO SERVIÇO**
>
> 4.1. O RXFin é fornecido "COMO ESTÁ" (AS IS) e "CONFORME DISPONÍVEL" (AS AVAILABLE).
>
> 4.2. Não garantimos:
> a) Disponibilidade ininterrupta do serviço;
> b) Ausência de erros, bugs ou falhas técnicas;
> c) Compatibilidade com todos os dispositivos ou navegadores;
> d) Manutenção de funcionalidades específicas em versões futuras.
>
> 4.3. Reservamo-nos o direito de, a nosso exclusivo critério:
> a) Modificar, suspender ou descontinuar funcionalidades;
> b) Realizar manutenções programadas ou emergenciais;
> c) Encerrar o serviço como um todo, mediante aviso prévio de 30 (trinta) dias quando possível.

### 5.2 Para Política de Privacidade

#### Seção: Segurança

> **5. SEGURANÇA DOS DADOS**
>
> 5.1. Implementamos medidas técnicas e organizacionais de segurança em conformidade com as melhores práticas da indústria, incluindo:
> a) Criptografia de dados em trânsito (TLS 1.3/HTTPS) e em repouso (AES-256);
> b) Isolamento de dados por usuário em nível de banco de dados (Row Level Security);
> c) Autenticação robusta com suporte a provedores seguros (Google, Facebook);
> d) Proteção contra tentativas de login por força bruta;
> e) Hash irreversível de senhas (Bcrypt);
> f) Criptografia de chaves de API e tokens sensíveis;
> g) Sistema de auditoria e registro de ações.
>
> 5.2. NENHUM SISTEMA É 100% SEGURO. Apesar de nossos esforços, reconhecemos que vulnerabilidades de segurança, ataques cibernéticos e falhas técnicas podem ocorrer.
>
> 5.3. O Usuário é responsável por:
> a) Manter suas credenciais de acesso em sigilo absoluto;
> b) Utilizar senhas fortes e únicas para o RXFin;
> c) Não compartilhar seu acesso com terceiros;
> d) Proteger seus dispositivos contra malware e acessos não autorizados;
> e) Reportar imediatamente qualquer uso suspeito de sua conta.
>
> 5.4. Não nos responsabilizamos por acessos não autorizados decorrentes de:
> a) Senhas fracas, reutilizadas ou compartilhadas pelo Usuário;
> b) Dispositivos comprometidos por vírus, malware ou acesso físico não autorizado;
> c) Ataques de phishing ou engenharia social direcionados ao Usuário;
> d) Vulnerabilidades em redes públicas, domésticas ou corporativas do Usuário.

#### Seção: Integrações

> **6. INTEGRAÇÕES COM TERCEIROS**
>
> 6.1. O RXFin pode integrar-se com serviços de terceiros para aprimorar suas funcionalidades:
>
> 6.2. Open Finance (Pluggy):
> a) A conexão com instituições financeiras é realizada por provedores terceiros certificados pelo Banco Central do Brasil;
> b) O RXFin NÃO ARMAZENA credenciais bancárias (login, senha, tokens de banco) do Usuário;
> c) Tokens de acesso ao Open Finance são criptografados e têm validade limitada;
> d) O Usuário pode revogar o acesso a qualquer momento.
>
> 6.3. Tabela FIPE:
> a) Dados de precificação veicular são obtidos de fontes externas;
> b) Podem apresentar variações em relação a valores reais de mercado;
> c) Atualizações dependem da disponibilidade da fonte original.
>
> 6.4. Indicadores Econômicos:
> a) Taxas Selic, CDI, IPCA e outros índices são coletados de APIs públicas;
> b) Podem apresentar defasagem em relação a divulgações oficiais.
>
> 6.5. Não nos responsabilizamos por indisponibilidade, imprecisão ou alterações unilaterais destes serviços terceiros.

---

## ANEXO: CHECKLIST DE IMPLEMENTAÇÃO

### Para o Jurídico/Compliance:

- [ ] Revisar textos para adequação ao contexto específico da empresa
- [ ] Validar conformidade com legislação vigente (CDC, Marco Civil, LGPD)
- [ ] Definir foro competente para resolução de conflitos
- [ ] Incluir dados de contato do Encarregado de Dados (DPO)
- [ ] Estabelecer política de cookies específica (se necessário)

### Para o Desenvolvimento:

- [ ] Atualizar documentos na tabela `legal_documents`
- [ ] Incrementar versão para 2.0
- [ ] Definir `effective_date` apropriado
- [ ] Configurar notificação para usuários existentes (se necessário)
- [ ] Testar fluxo de aceite de novos termos

### Para Comunicação:

- [ ] Preparar comunicado sobre atualização dos termos
- [ ] Definir estratégia de notificação (email, in-app, ambos)
- [ ] Estabelecer prazo para aceite dos novos termos

---

*Documento gerado automaticamente pelo RXFin em 05/02/2026*
*Este documento é de uso interno e serve como referência para elaboração dos documentos legais oficiais.*
