import React, { useState, useRef, useEffect } from 'react';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { toast } from '@/hooks/use-toast';
import { IRImportData } from '@/hooks/useIRImport';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building,
  Car,
  Banknote,
  FileText,
  AlertCircle,
  Lightbulb,
  Send,
  User,
  Bot,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IRComparisonReportProps {
  imports: IRImportData[];
}

interface VariacaoData {
  valor: number;
  percentual: number;
  direcao: 'aumento' | 'reducao' | 'estavel';
}

interface MudancaItem {
  tipo: string;
  descricao: string;
  valor: number;
  impacto: 'positivo' | 'negativo' | 'neutro';
}

interface AnalysisResult {
  resumoGeral: string;
  variacaoPatrimonio: VariacaoData;
  variacaoRendimentos: VariacaoData;
  variacaoDividas: VariacaoData;
  principaisMudancas: MudancaItem[];
  oquePermaneceuIgual: string[];
  insightsFinanceiros: string[];
  alertas: string[];
}

interface AnalysisResponse {
  success: boolean;
  anoAtual: number;
  anoAnterior: number;
  analysis: AnalysisResult;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const getMudancaIcon = (tipo: string) => {
  if (tipo.includes('bem') || tipo.includes('imovel')) return <Building className="h-4 w-4" />;
  if (tipo.includes('veiculo')) return <Car className="h-4 w-4" />;
  if (tipo.includes('investimento')) return <Banknote className="h-4 w-4" />;
  if (tipo.includes('divida')) return <AlertCircle className="h-4 w-4" />;
  if (tipo.includes('renda')) return <TrendingUp className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const getImpactoColor = (impacto: string) => {
  if (impacto === 'positivo') return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
  if (impacto === 'negativo') return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
  return 'text-muted-foreground bg-muted/50 border-muted';
};

export const IRComparisonReport: React.FC<IRComparisonReportProps> = ({ imports }) => {
  const { session } = useAuth();
  const { isHidden } = useVisibility();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    if (isHidden) return '••%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchAnalysis = async () => {
    if (!session?.access_token || imports.length < 2) return;

    setIsLoading(true);
    setError(null);

    try {
      const declarations = imports.slice(0, 2).map(ir => ({
        anoExercicio: ir.anoExercicio,
        anoCalendario: ir.anoCalendario,
        bensDireitos: ir.bensDireitos,
        rendimentosTributaveis: ir.rendimentosTributaveis,
        rendimentosIsentos: ir.rendimentosIsentos,
        dividas: ir.dividas,
      }));

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/ir-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ declarations }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao analisar declarações');
      }

      setAnalysis(data);
      
      // Initialize chat with context
      setChatMessages([{
        role: 'assistant',
        content: `Analisei suas declarações de ${data.anoAnterior} e ${data.anoAtual}. ${data.analysis.resumoGeral}\n\nPosso ajudar a esclarecer algum ponto específico da análise?`
      }]);
    } catch (err) {
      console.error('Analysis error:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast({
        title: 'Erro na análise',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAndOpen = async () => {
    setIsDialogOpen(true);
    if (!analysis) {
      await fetchAnalysis();
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading || !analysis) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      // Build context from analysis
      const analysisContext = JSON.stringify({
        anoAtual: analysis.anoAtual,
        anoAnterior: analysis.anoAnterior,
        ...analysis.analysis
      });

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/ir-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            chatMode: true,
            analysisContext,
            chatHistory: chatMessages,
            userMessage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar mensagem');
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, não consegui processar sua pergunta. Tente novamente.' 
      }]);
    } finally {
      setIsChatLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Don't show if less than 2 imports
  if (imports.length < 2) {
    return null;
  }

  const renderVariacao = (label: string, data: VariacaoData | undefined, icon: React.ReactNode) => {
    if (!data) return null;

    const isPositive = data.direcao === 'aumento';
    const isNegative = data.direcao === 'reducao';
    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const trendColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground';

    return (
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{formatCurrency(Math.abs(data.valor))}</span>
          <Badge variant="outline" className={cn('text-xs gap-1', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            {formatPercent(data.percentual)}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Trigger Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Análise Comparativa com IA</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Compare suas duas últimas declarações de IR
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAndOpen}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Gerar Análise
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Clique em "Gerar Análise" para comparar suas declarações
            </p>
            <p className="text-xs text-muted-foreground">
              A IA irá identificar as principais mudanças entre {imports[0]?.anoExercicio} e {imports[1]?.anoExercicio}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Análise Comparativa com IA</DialogTitle>
                {analysis && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Comparando {analysis.anoAnterior} → {analysis.anoAtual}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Scrollable Content */}
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {isLoading && (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Skeleton className="h-14" />
                      <Skeleton className="h-14" />
                      <Skeleton className="h-14" />
                    </div>
                    <Skeleton className="h-32 w-full" />
                  </div>
                )}

                {error && !isLoading && (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchAnalysis} className="mt-4">
                      Tentar novamente
                    </Button>
                  </div>
                )}

                {analysis && !isLoading && (
                  <>
                    {/* Header com anos */}
                    <div className="flex items-center justify-center gap-3 text-sm py-2">
                      <Badge variant="secondary" className="font-mono">{analysis.anoAnterior}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="default" className="font-mono">{analysis.anoAtual}</Badge>
                    </div>

                    {/* Variações */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {renderVariacao('Patrimônio', analysis.analysis.variacaoPatrimonio, <Building className="h-4 w-4 text-blue-500" />)}
                      {renderVariacao('Rendimentos', analysis.analysis.variacaoRendimentos, <Banknote className="h-4 w-4 text-green-500" />)}
                      {renderVariacao('Dívidas', analysis.analysis.variacaoDividas, <AlertCircle className="h-4 w-4 text-orange-500" />)}
                    </div>

                    {/* Principais Mudanças */}
                    {analysis.analysis.principaisMudancas?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Principais Mudanças
                        </h4>
                        <div className="space-y-2">
                          {analysis.analysis.principaisMudancas.map((mudanca, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                'flex items-start gap-3 p-3 rounded-lg border',
                                getImpactoColor(mudanca.impacto)
                              )}
                            >
                              <div className="mt-0.5">{getMudancaIcon(mudanca.tipo)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">{mudanca.descricao}</p>
                                {mudanca.valor > 0 && (
                                  <p className="text-xs mt-1 font-medium">{formatCurrency(mudanca.valor)}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* O que permaneceu igual */}
                    {analysis.analysis.oquePermaneceuIgual?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          O que permaneceu estável
                        </h4>
                        <ul className="space-y-1">
                          {analysis.analysis.oquePermaneceuIgual.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Minus className="h-3 w-3" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Insights */}
                    {analysis.analysis.insightsFinanceiros?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Insights
                        </h4>
                        <ul className="space-y-2">
                          {analysis.analysis.insightsFinanceiros.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200 dark:border-yellow-800">
                              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Alertas */}
                    {analysis.analysis.alertas?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          Pontos de Atenção
                        </h4>
                        <ul className="space-y-2">
                          {analysis.analysis.alertas.map((alerta, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-orange-50 dark:bg-orange-900/10 rounded border border-orange-200 dark:border-orange-800">
                              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                              <span>{alerta}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Chat Messages */}
                    {chatMessages.length > 0 && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Bot className="h-4 w-4 text-primary" />
                          Conversa
                        </h4>
                        {chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'flex gap-2',
                              msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                          >
                            {msg.role === 'assistant' && (
                              <div className="p-1.5 rounded-full bg-primary/10 h-fit">
                                <Bot className="h-3.5 w-3.5 text-primary" />
                              </div>
                            )}
                            <div
                              className={cn(
                                'max-w-[80%] p-3 rounded-lg text-sm',
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                              <div className="p-1.5 rounded-full bg-muted h-fit">
                                <User className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="flex gap-2">
                            <div className="p-1.5 rounded-full bg-primary/10 h-fit">
                              <Bot className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            {analysis && !isLoading && (
              <div className="p-4 border-t shrink-0 bg-background">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Faça uma pergunta sobre a análise..."
                    disabled={isChatLoading}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Pergunte sobre suas declarações, como otimizar impostos ou entender mudanças específicas
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
