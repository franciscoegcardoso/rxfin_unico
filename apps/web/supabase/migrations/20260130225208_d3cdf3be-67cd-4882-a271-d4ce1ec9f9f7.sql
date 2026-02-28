-- Tabela principal para documentos legais
CREATE TABLE public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS: Leitura pública, escrita apenas admin
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública dos documentos legais" ON public.legal_documents
  FOR SELECT USING (true);

CREATE POLICY "Apenas admin pode inserir documentos legais" ON public.legal_documents
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Apenas admin pode atualizar documentos legais" ON public.legal_documents
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Apenas admin pode deletar documentos legais" ON public.legal_documents
  FOR DELETE USING (is_admin(auth.uid()));

-- Tabela de histórico para versionamento automático
CREATE TABLE public.legal_documents_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.legal_documents(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_date DATE NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id)
);

-- RLS para histórico: leitura pública, sem escrita direta
ALTER TABLE public.legal_documents_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública do histórico legal" ON public.legal_documents_history
  FOR SELECT USING (true);

-- Trigger para salvar versão anterior antes de UPDATE
CREATE OR REPLACE FUNCTION public.archive_legal_document()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.legal_documents_history 
    (document_id, slug, title, content, version, effective_date, archived_by)
  VALUES 
    (OLD.id, OLD.slug, OLD.title, OLD.content, OLD.version, OLD.effective_date, auth.uid());
  
  -- Atualiza updated_at automaticamente
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER legal_document_version_trigger
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.archive_legal_document();

-- Inserir conteúdo inicial dos Termos de Uso
INSERT INTO public.legal_documents (slug, title, content, version, effective_date)
VALUES (
  'termos-de-uso',
  'Termos de Uso',
  '# Termos de Uso

**Última atualização:** Janeiro de 2026

## 1. Aceitação dos Termos

Ao acessar e usar a plataforma RXFin ("Serviço"), você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar o Serviço.

## 2. Descrição do Serviço

O RXFin é uma plataforma de gestão financeira pessoal que oferece:
- Simuladores financeiros (custo de veículos, financiamentos, etc.)
- Ferramentas de planejamento orçamentário
- Análise de investimentos e patrimônio
- Organização fiscal e tributária

## 3. Cadastro e Conta

### 3.1 Elegibilidade
Você deve ter pelo menos 18 anos de idade para usar este Serviço.

### 3.2 Responsabilidade da Conta
Você é responsável por manter a confidencialidade de sua conta e senha, e por restringir o acesso ao seu computador ou dispositivo.

### 3.3 Precisão das Informações
Você concorda em fornecer informações precisas, atuais e completas durante o processo de registro.

## 4. Uso Aceitável

Você concorda em não:
- Usar o Serviço para qualquer finalidade ilegal
- Tentar obter acesso não autorizado a qualquer parte do Serviço
- Interferir ou interromper o Serviço ou servidores conectados
- Transmitir vírus ou código malicioso

## 5. Propriedade Intelectual

Todo o conteúdo, recursos e funcionalidades do Serviço são de propriedade exclusiva do RXFin e estão protegidos por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual.

## 6. Isenção de Responsabilidade

### 6.1 Informações Financeiras
As informações fornecidas pelo RXFin são apenas para fins educacionais e informativos. **Não constituem aconselhamento financeiro, jurídico ou tributário profissional.**

### 6.2 Precisão dos Cálculos
Embora nos esforcemos para fornecer cálculos precisos, não garantimos a exatidão de todas as simulações e projeções.

### 6.3 Decisões Financeiras
Você é o único responsável por suas decisões financeiras. Recomendamos consultar profissionais qualificados antes de tomar decisões importantes.

## 7. Limitação de Responsabilidade

Em nenhuma circunstância o RXFin será responsável por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos resultantes do uso ou incapacidade de uso do Serviço.

## 8. Modificações dos Termos

Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação. O uso continuado do Serviço após as alterações constitui aceitação dos novos termos.

## 9. Rescisão

Podemos encerrar ou suspender seu acesso ao Serviço imediatamente, sem aviso prévio, por qualquer violação destes Termos de Uso.

## 10. Lei Aplicável

Estes termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil, sem consideração a conflitos de princípios legais.

## 11. Contato

Para questões sobre estes Termos de Uso, entre em contato:
- **Email:** contato@rxfin.com.br

---

*Este documento deve ser revisado por um advogado antes de ser considerado definitivo.*',
  '1.0',
  CURRENT_DATE
);

-- Inserir conteúdo inicial da Política de Privacidade
INSERT INTO public.legal_documents (slug, title, content, version, effective_date)
VALUES (
  'politica-privacidade',
  'Política de Privacidade',
  '# Política de Privacidade

**Última atualização:** Janeiro de 2026

## 1. Introdução

Esta Política de Privacidade descreve como o RXFin ("nós", "nosso" ou "Serviço") coleta, usa e protege suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

## 2. Dados que Coletamos

### 2.1 Dados Fornecidos por Você
- **Dados de cadastro:** nome, email, telefone
- **Dados financeiros:** informações que você insere nos simuladores e ferramentas
- **Dados de perfil:** preferências e configurações

### 2.2 Dados Coletados Automaticamente
- **Dados de uso:** páginas visitadas, funcionalidades utilizadas
- **Dados do dispositivo:** tipo de navegador, sistema operacional
- **Cookies e tecnologias similares**

## 3. Como Usamos Seus Dados

Utilizamos suas informações para:
- Fornecer e melhorar nossos serviços
- Personalizar sua experiência
- Enviar comunicações relevantes (com seu consentimento)
- Garantir a segurança da plataforma
- Cumprir obrigações legais

## 4. Base Legal para Processamento (LGPD)

Processamos seus dados com base em:
- **Consentimento:** quando você opta por usar nossos serviços
- **Execução de contrato:** para fornecer os serviços solicitados
- **Interesse legítimo:** para melhorar nossos serviços
- **Obrigação legal:** para cumprir requisitos regulatórios

## 5. Compartilhamento de Dados

**Não vendemos seus dados pessoais.** Podemos compartilhar dados apenas com:
- Prestadores de serviços essenciais (hospedagem, análise)
- Autoridades legais quando exigido por lei
- Com seu consentimento explícito

## 6. Seus Direitos (LGPD)

Você tem direito a:
- **Acesso:** solicitar cópia de seus dados
- **Correção:** atualizar dados incorretos
- **Exclusão:** solicitar remoção de seus dados
- **Portabilidade:** receber seus dados em formato estruturado
- **Revogação:** retirar consentimento a qualquer momento
- **Oposição:** contestar processamento de dados

Para exercer seus direitos, entre em contato pelo email: privacidade@rxfin.com.br

## 7. Segurança dos Dados

Implementamos medidas técnicas e organizacionais para proteger seus dados:
- Criptografia em trânsito (HTTPS/TLS)
- Controles de acesso rigorosos
- Monitoramento contínuo de segurança
- Backups regulares

## 8. Cookies

Utilizamos cookies para:
- Manter sua sessão ativa
- Lembrar suas preferências
- Analisar o uso da plataforma

Você pode gerenciar cookies nas configurações do seu navegador.

## 9. Retenção de Dados

Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para:
- Fornecer nossos serviços
- Cumprir obrigações legais
- Resolver disputas

## 10. Menores de Idade

Nosso Serviço não é direcionado a menores de 18 anos. Não coletamos intencionalmente dados de menores.

## 11. Transferência Internacional

Seus dados podem ser processados em servidores localizados fora do Brasil. Garantimos que tais transferências cumpram a LGPD e ofereçam proteção adequada.

## 12. Alterações nesta Política

Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas por email ou aviso no Serviço.

## 13. Encarregado de Dados (DPO)

Para questões relacionadas à proteção de dados:
- **Email:** dpo@rxfin.com.br

## 14. Contato

Para questões gerais sobre privacidade:
- **Email:** privacidade@rxfin.com.br

---

*Este documento deve ser revisado por um advogado antes de ser considerado definitivo.*',
  '1.0',
  CURRENT_DATE
);