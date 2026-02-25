import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, XCircle, RefreshCw, FileCode, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Lista de arquivos TSX conhecidos em src/pages (gerada manualmente)
// Esta lista deve ser atualizada quando novos arquivos forem adicionados
const KNOWN_TSX_FILES: { file: string; expectedSlug: string }[] = [
  // Páginas públicas
  { file: 'LandingPage.tsx', expectedSlug: 'landing' },
  { file: 'Login.tsx', expectedSlug: 'login' },
  { file: 'Signup.tsx', expectedSlug: 'signup' },
  { file: 'ResetPassword.tsx', expectedSlug: 'reset-password' },
  { file: 'UpdatePassword.tsx', expectedSlug: 'update-password' },
  { file: 'VerificarEmail.tsx', expectedSlug: 'verificar-email' },
  { file: 'LegalDocument.tsx', expectedSlug: 'termos-de-uso' },
  { file: 'SimuladorFipe.tsx', expectedSlug: 'simulador-fipe' },
  
  // Menu Principal
  { file: 'Inicio.tsx', expectedSlug: 'inicio' },
  { file: 'Dashboard.tsx', expectedSlug: 'dashboard' },
  { file: 'Parametros.tsx', expectedSlug: 'parametros' },
  { file: 'Planos.tsx', expectedSlug: 'planos' },
  
  // Lançamentos
  { file: 'Lancamentos.tsx', expectedSlug: 'lancamentos' },
  { file: 'CartaoCredito.tsx', expectedSlug: 'cartao-credito' },
  
  // Patrimônio
  { file: 'BensInvestimentos.tsx', expectedSlug: 'bens-investimentos' },
  { file: 'GestaoVeiculos.tsx', expectedSlug: 'gestao-veiculos' },
  { file: 'Seguros.tsx', expectedSlug: 'seguros' },
  
  // Planejamento
  { file: 'Planejamento.tsx', expectedSlug: 'planejamento' },
  { file: 'PlanejamentoAnual.tsx', expectedSlug: 'planejamento-anual' },
  { file: 'MetasMensais.tsx', expectedSlug: 'metas-mensais' },
  { file: 'RegistroCompras.tsx', expectedSlug: 'registro-compras' },
  { file: 'PacotesOrcamento.tsx', expectedSlug: 'pacotes-orcamento' },
  { file: 'Sonhos.tsx', expectedSlug: 'sonhos' },
  { file: 'Presentes.tsx', expectedSlug: 'presentes' },
  { file: 'MeuIR.tsx', expectedSlug: 'meu-ir' },
  
  // Simuladores
  { file: 'Simuladores.tsx', expectedSlug: 'simuladores' },
  { file: 'SimuladorFinanciamento.tsx', expectedSlug: 'financiamento-consorcio' },
  { file: 'SimuladorCustoHora.tsx', expectedSlug: 'simulador-custo-hora' },
  { file: 'SimuladorCustoOportunidadeCarro.tsx', expectedSlug: 'simulador-custo-oportunidade-carro' },
  { file: 'SimuladorCarroAB.tsx', expectedSlug: 'simulador-carro-ab' },
  { file: 'SimuladorDescontoJusto.tsx', expectedSlug: 'simulador-desconto-justo' },
  { file: 'SimuladorComparativoCarro.tsx', expectedSlug: 'simulador-comparativo-carro' },
  { file: 'RenegociacaoDividas.tsx', expectedSlug: 'renegociacao-dividas' },
  { file: 'EconoGraph.tsx', expectedSlug: 'econograph' },
  
  // Configurações
  { file: 'ConfiguracoesHub.tsx', expectedSlug: 'configuracoes-hub' },
  { file: 'ConfiguracoesFiscais.tsx', expectedSlug: 'configuracoes-fiscais' },
  { file: 'InstituicoesFinanceiras.tsx', expectedSlug: 'instituicoes-financeiras' },
  { file: 'MinhaConta.tsx', expectedSlug: 'minha-conta' },
  
  // Admin
  { file: 'admin/Admin.tsx', expectedSlug: 'admin' },
];

// Arquivos que são utilitários e não precisam de registro no banco
const UTILITY_FILES = [
  'Index.tsx',              // Redirecionador
  'NotFound.tsx',           // Página 404
  'ComingSoon.tsx',         // Placeholder
  'BemVindo.tsx',           // Onboarding
  'Onboarding2.tsx',        // Onboarding alternativo
  'BalancoPatrimonial.tsx', // Relatório interno
  'PlanejamentoCartao.tsx', // Componente interno
  'SimuladorDinamico.tsx',  // Componente interno
  'DadosFinanceiros.tsx',   // Gestão de dados consolidados
  'RegrasCategoria.tsx',    // Redirect para parametros?tab=regras
  'AuthCallback.tsx',       // Callback de autenticação
];

// Slugs no banco que são apenas redirects (não possuem arquivo próprio)
const REDIRECT_SLUGS = [
  'contas',            // Redirect → /lancamentos
  'fluxo-financeiro',  // Redirect → /lancamentos
];

interface PageRecord {
  id: string;
  slug: string;
  path: string;
  title: string;
  is_active_users: boolean;
  is_active_admin: boolean;
}

interface HealthCheckResult {
  filesWithoutRecord: { file: string; expectedSlug: string }[];
  recordsWithoutFile: PageRecord[];
  matchedRecords: { file: string; slug: string; record: PageRecord }[];
  utilityFiles: string[];
}

const HealthCheck: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar todos os registros de páginas do banco
      const { data: pages, error: fetchError } = await supabase
        .from('pages')
        .select('id, slug, path, title, is_active_users, is_active_admin')
        .order('order_index');

      if (fetchError) throw fetchError;

      const dbPages = pages || [];
      const dbSlugs = new Set(dbPages.map(p => p.slug));
      const fileSlugs = new Set(KNOWN_TSX_FILES.map(f => f.expectedSlug));

      // Arquivos sem registro no banco
      const filesWithoutRecord = KNOWN_TSX_FILES.filter(
        f => !dbSlugs.has(f.expectedSlug)
      );

      // Registros no banco sem arquivo correspondente (excluindo redirects conhecidos)
      const recordsWithoutFile = dbPages.filter(
        p => !fileSlugs.has(p.slug) && !REDIRECT_SLUGS.includes(p.slug)
      );

      // Registros que possuem match
      const matchedRecords = KNOWN_TSX_FILES
        .filter(f => dbSlugs.has(f.expectedSlug))
        .map(f => ({
          file: f.file,
          slug: f.expectedSlug,
          record: dbPages.find(p => p.slug === f.expectedSlug)!,
        }));

      setResult({
        filesWithoutRecord,
        recordsWithoutFile,
        matchedRecords,
        utilityFiles: UTILITY_FILES,
      });
    } catch (err) {
      console.error('Health check error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao executar health check');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const getOverallStatus = () => {
    if (!result) return 'loading';
    if (result.filesWithoutRecord.length === 0 && result.recordsWithoutFile.length === 0) {
      return 'healthy';
    }
    if (result.filesWithoutRecord.length > 0 || result.recordsWithoutFile.length > 0) {
      return 'warning';
    }
    return 'error';
  };

  const status = getOverallStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Health Check de Páginas</h2>
          <p className="text-muted-foreground">
            Comparação entre arquivos TSX e registros no banco de dados
          </p>
        </div>
        <Button onClick={runHealthCheck} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !result && (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Executando health check...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Status Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                Status Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {result.matchedRecords.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Sincronizados</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">
                    {result.filesWithoutRecord.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Arquivos sem registro</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">
                    {result.recordsWithoutFile.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Registros sem arquivo</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {result.utilityFiles.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Utilitários (ignorados)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arquivos sem registro */}
          {result.filesWithoutRecord.length > 0 && (
            <Card className="border-yellow-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <FileCode className="h-5 w-5" />
                  Arquivos TSX sem Registro no Banco
                </CardTitle>
                <CardDescription>
                  Estes arquivos existem em src/pages mas não possuem registro na tabela pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {result.filesWithoutRecord.map((item) => (
                      <div
                        key={item.file}
                        className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-yellow-600" />
                          <code className="text-sm">{item.file}</code>
                        </div>
                        <Badge variant="outline" className="text-yellow-600">
                          slug esperado: {item.expectedSlug}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Registros sem arquivo */}
          {result.recordsWithoutFile.length > 0 && (
            <Card className="border-orange-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Database className="h-5 w-5" />
                  Registros no Banco sem Arquivo Correspondente
                </CardTitle>
                <CardDescription>
                  Estes registros existem na tabela pages mas não possuem arquivo TSX mapeado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {result.recordsWithoutFile.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{record.title}</span>
                          <code className="text-xs text-muted-foreground">{record.path}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">slug: {record.slug}</Badge>
                          {!record.is_active_users && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Registros sincronizados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Páginas Sincronizadas
              </CardTitle>
              <CardDescription>
                Arquivos TSX com registro correspondente no banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {result.matchedRecords.map((item) => (
                    <div
                      key={item.slug}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div className="flex flex-col">
                          <code className="text-sm">{item.file}</code>
                          <span className="text-xs text-muted-foreground">
                            {item.record.title} • {item.record.path}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600">
                          {item.slug}
                        </Badge>
                        {item.record.is_active_users ? (
                          <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Arquivos utilitários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <FileCode className="h-5 w-5" />
                Arquivos Utilitários (Ignorados)
              </CardTitle>
              <CardDescription>
                Arquivos que são utilitários do sistema e não precisam de registro no banco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.utilityFiles.map((file) => (
                  <Badge key={file} variant="secondary">
                    {file}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default HealthCheck;
