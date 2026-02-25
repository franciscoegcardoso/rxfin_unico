import React, { useState, useMemo } from 'react';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Landmark, 
  TrendingUp, 
  Shield, 
  PiggyBank, 
  BarChart3, 
  Building2, 
  Bitcoin, 
  Globe, 
  Wallet,
  Sparkles,
  Link2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2
} from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useIRImport } from '@/hooks/useIRImport';
import { useAuth } from '@/contexts/AuthContext';
import { financialInstitutions, investmentTypes } from '@/data/defaultData';
import { InvestmentType, Asset } from '@/types/financial';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Ícones por tipo de investimento
const investmentIcons: Record<InvestmentType, React.ReactNode> = {
  fgts: <Landmark className="h-4 w-4" />,
  reserva_emergencia: <Shield className="h-4 w-4" />,
  dinheiro_especie: <Wallet className="h-4 w-4" />,
  metais_preciosos: <Wallet className="h-4 w-4" />,
  aplicacao_financeira: <PiggyBank className="h-4 w-4" />,
  renda_fixa: <PiggyBank className="h-4 w-4" />,
  fundos_investimento: <BarChart3 className="h-4 w-4" />,
  coe: <Wallet className="h-4 w-4" />,
  renda_variavel: <TrendingUp className="h-4 w-4" />,
  fii: <Building2 className="h-4 w-4" />,
  etf: <BarChart3 className="h-4 w-4" />,
  ofertas_publicas: <TrendingUp className="h-4 w-4" />,
  clubes_investimento: <Wallet className="h-4 w-4" />,
  investimento_global: <Globe className="h-4 w-4" />,
  previdencia_privada: <Shield className="h-4 w-4" />,
  previdencia_corporativa: <Building2 className="h-4 w-4" />,
  seguro: <Shield className="h-4 w-4" />,
  criptoativos: <Bitcoin className="h-4 w-4" />,
  debentures: <Landmark className="h-4 w-4" />,
  cri_cra: <Landmark className="h-4 w-4" />,
  outros: <Wallet className="h-4 w-4" />,
};

// Cores por tipo de investimento
const investmentColors: Record<InvestmentType, string> = {
  fgts: 'bg-blue-700',
  reserva_emergencia: 'bg-emerald-600',
  dinheiro_especie: 'bg-green-500',
  metais_preciosos: 'bg-yellow-600',
  aplicacao_financeira: 'bg-blue-400',
  renda_fixa: 'bg-blue-500',
  fundos_investimento: 'bg-purple-500',
  coe: 'bg-indigo-500',
  renda_variavel: 'bg-green-500',
  fii: 'bg-orange-500',
  etf: 'bg-teal-500',
  ofertas_publicas: 'bg-cyan-500',
  clubes_investimento: 'bg-pink-500',
  investimento_global: 'bg-sky-500',
  previdencia_privada: 'bg-amber-500',
  previdencia_corporativa: 'bg-violet-600',
  seguro: 'bg-emerald-500',
  criptoativos: 'bg-yellow-500',
  debentures: 'bg-rose-500',
  cri_cra: 'bg-lime-500',
  outros: 'bg-gray-500',
};

interface IRSuggestion {
  investmentType: InvestmentType;
  irItems: {
    codigo: string;
    descricao: string;
    discriminacao: string;
    situacaoAtual: number;
    confidence: number;
    reason: string;
  }[];
}

interface InstitutionInvestmentTypesCardProps {
  onAddInvestment: (institutionId: string, investmentType: InvestmentType) => void;
}

export const InstitutionInvestmentTypesCard: React.FC<InstitutionInvestmentTypesCardProps> = ({
  onAddInvestment
}) => {
  const { config } = useFinancial();
  const { session } = useAuth();
  const { imports } = useIRImport();
  const [expandedInstitution, setExpandedInstitution] = useState<string | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, IRSuggestion[]>>({});

  // Filtrar instituições com investimentos habilitados
  const institutionsWithInvestments = useMemo(() => {
    return config.financialInstitutions.filter(fi => fi.hasInvestments);
  }, [config.financialInstitutions]);

  // Obter nome da instituição
  const getInstitutionName = (userInst: typeof institutionsWithInvestments[0]) => {
    if (userInst.customName) return userInst.customName;
    const defaultInst = financialInstitutions.find(i => i.id === userInst.institutionId);
    return defaultInst?.name || 'Instituição';
  };

  // Obter investimentos existentes por instituição e tipo
  const getExistingInvestments = (institutionId: string, investmentType: InvestmentType): Asset[] => {
    return config.assets.filter(
      a => a.type === 'investment' && 
           a.investmentInstitutionId === institutionId && 
           a.investmentType === investmentType
    );
  };

  // Buscar sugestões de IA para uma instituição
  const fetchAISuggestions = async (institutionId: string) => {
    if (!session?.access_token) {
      toast.error('Você precisa estar logado');
      return;
    }

    // Buscar a declaração mais recente
    const latestImport = imports[0];
    if (!latestImport) {
      toast.error('Nenhuma declaração de IR importada para associar');
      return;
    }

    // Filtrar apenas itens de investimento (códigos 31-99)
    const investmentItems = latestImport.bensDireitos.filter(bem => {
      const codigoNum = parseInt(bem.codigo);
      return codigoNum >= 31 && codigoNum <= 99;
    });

    if (investmentItems.length === 0) {
      toast.info('Nenhum investimento encontrado na declaração de IR');
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/ir-investment-type-suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            irItems: investmentItems,
            institutionId,
            investmentTypes: investmentTypes.map(t => ({
              value: t.value,
              label: t.label,
              description: t.description
            }))
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao buscar sugestões');
      }

      const data = await response.json();
      setSuggestions(prev => ({
        ...prev,
        [institutionId]: data.suggestions
      }));

      toast.success(`${data.suggestions.length} tipos de investimento sugeridos`);
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar sugestões');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const toggleInstitution = (institutionId: string) => {
    if (expandedInstitution === institutionId) {
      setExpandedInstitution(null);
    } else {
      setExpandedInstitution(institutionId);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (institutionsWithInvestments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          Investimentos por Instituição
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {institutionsWithInvestments.map(institution => {
          const institutionName = getInstitutionName(institution);
          const isExpanded = expandedInstitution === institution.id;
          const institutionSuggestions = suggestions[institution.id] || [];
          const hasIRData = imports.length > 0;

          return (
            <div key={institution.id} className="border rounded-lg overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggleInstitution(institution.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{institutionName}</p>
                    <p className="text-xs text-muted-foreground">
                      {investmentTypes.length} tipos de investimento disponíveis
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasIRData && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <FileText className="h-3 w-3" />
                      IR {imports[0]?.anoExercicio}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Content expandido */}
              {isExpanded && (
                <div className="border-t p-4 space-y-4">
                  {/* Botão de buscar sugestões via IA */}
                  {hasIRData && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Associar com Declaração IR</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchAISuggestions(institution.id)}
                        disabled={isLoadingSuggestions}
                        className="gap-2"
                      >
                        {isLoadingSuggestions ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Buscar Sugestões
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Lista de tipos de investimento */}
                  <ScrollArea className="max-h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {investmentTypes.map(invType => {
                        const existingAssets = getExistingInvestments(institution.id, invType.value);
                        const hasAssets = existingAssets.length > 0;
                        const totalValue = existingAssets.reduce((sum, a) => sum + a.value, 0);
                        
                        // Verificar se há sugestões da IA para este tipo
                        const suggestion = institutionSuggestions.find(s => s.investmentType === invType.value);
                        const hasSuggestion = suggestion && suggestion.irItems.length > 0;

                        return (
                          <div
                            key={invType.value}
                            className={cn(
                              "p-3 rounded-lg border transition-all",
                              hasAssets && "bg-primary/5 border-primary/20",
                              hasSuggestion && !hasAssets && "bg-yellow-500/5 border-yellow-500/20"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0",
                                  investmentColors[invType.value]
                                )}>
                                  {investmentIcons[invType.value]}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{invType.label}</p>
                                  <p className="text-xs text-muted-foreground truncate">{invType.description}</p>
                                </div>
                              </div>
                              {hasAssets ? (
                                <div className="text-right shrink-0">
                                  <Badge variant="secondary" className="gap-1 mb-1">
                                    <Check className="h-3 w-3" />
                                    {existingAssets.length}
                                  </Badge>
                                  <p className="text-xs font-medium text-primary">{formatCurrency(totalValue)}</p>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={hasSuggestion ? "default" : "ghost"}
                                  onClick={() => onAddInvestment(institution.id, invType.value)}
                                  className={cn(
                                    "shrink-0",
                                    hasSuggestion && "gap-1"
                                  )}
                                >
                                  {hasSuggestion ? (
                                    <>
                                      <Link2 className="h-3 w-3" />
                                      Vincular
                                    </>
                                  ) : (
                                    '+ Adicionar'
                                  )}
                                </Button>
                              )}
                            </div>

                            {/* Sugestões do IR */}
                            {hasSuggestion && (
                              <div className="mt-2 pt-2 border-t border-dashed space-y-1">
                                <p className="text-xs font-medium text-yellow-600 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Sugestões do IR:
                                </p>
                                {suggestion.irItems.slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="text-xs bg-muted/50 p-2 rounded">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono text-muted-foreground">Cód. {item.codigo}</span>
                                      <Badge 
                                        variant={item.confidence >= 80 ? "default" : "outline"} 
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {item.confidence}%
                                      </Badge>
                                    </div>
                                    <p className="truncate mt-0.5">{item.descricao || item.discriminacao}</p>
                                    <p className="font-medium text-primary">{formatCurrency(item.situacaoAtual)}</p>
                                  </div>
                                ))}
                                {suggestion.irItems.length > 2 && (
                                  <p className="text-xs text-muted-foreground text-center">
                                    +{suggestion.irItems.length - 2} mais itens
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
