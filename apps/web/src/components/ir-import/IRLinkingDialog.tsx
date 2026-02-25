import React, { useState, useMemo, useEffect } from 'react';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Check,
  X,
  Plus,
  Building,
  Car,
  TrendingUp,
  Banknote,
  Link2,
  Sparkles,
  AlertCircle,
  Edit2,
  Save,
  Package,
  CheckSquare,
  Square,
  Loader2,
  Wand2,
  Landmark,
  PiggyBank,
  BarChart3,
  Bitcoin,
  Globe,
  Shield,
} from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { IRImportData, BemDireito, Rendimento } from '@/hooks/useIRImport';
import { Asset, IncomeItem, AssetType, InvestmentType } from '@/types/financial';
import { cn } from '@/lib/utils';
import { AddAssetDialog } from '@/components/bens/AddAssetDialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { financialInstitutions, investmentTypes } from '@/data/defaultData';
import { useUserKV } from '@/hooks/useUserKV';

interface IRLinkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  irData: IRImportData;
  singleItemIndex?: number | null;
  onItemLinked?: (irId: string, bemIndex: number, linked: boolean) => void;
}

interface LinkSuggestion {
  irItem: BemDireito | Rendimento;
  irItemType: 'bem' | 'rendimento';
  suggestedMatch: Asset | IncomeItem | null;
  matchType: 'asset' | 'income';
  confidence: number;
  matchReason: string;
}

interface AISuggestion {
  bemIndex: number;
  suggestedAssetId: string | null;
  confidence: number;
  reason: string;
}

const getLinksKVKey = (irId: string) => `ir-links-${irId}`;

interface PersistedLinks {
  bens: Record<string, string>;
  rendimentos: Record<string, string>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getAssetTypeFromIRCode = (codigo: string): AssetType | null => {
  const codigoNum = parseInt(codigo);
  if (codigoNum >= 1 && codigoNum <= 19) return 'property';
  if (codigoNum >= 21 && codigoNum <= 29) return 'vehicle';
  if (codigoNum >= 31 && codigoNum <= 99) return 'investment';
  return 'other';
};

const isInvestmentCode = (codigo: string): boolean => {
  const codigoNum = parseInt(codigo);
  return codigoNum >= 31 && codigoNum <= 99;
};

const getAssetIcon = (type: AssetType) => {
  switch (type) {
    case 'property': return <Building className="h-4 w-4" />;
    case 'vehicle': return <Car className="h-4 w-4" />;
    case 'investment': return <TrendingUp className="h-4 w-4" />;
    case 'company': return <Banknote className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
};

const getAssetTypeColor = (type: AssetType) => {
  switch (type) {
    case 'property': return "bg-blue-100 text-blue-600";
    case 'vehicle': return "bg-orange-100 text-orange-600";
    case 'investment': return "bg-green-100 text-green-600";
    case 'company': return "bg-purple-100 text-purple-600";
    default: return "bg-gray-100 text-gray-600";
  }
};

// Get investment type icon
const getInvestmentTypeIcon = (type?: InvestmentType): React.ReactNode => {
  switch (type) {
    case 'reserva_emergencia': return <Shield className="h-3 w-3" />;
    case 'renda_fixa': return <PiggyBank className="h-3 w-3" />;
    case 'renda_variavel': return <TrendingUp className="h-3 w-3" />;
    case 'fundos_investimento': return <BarChart3 className="h-3 w-3" />;
    case 'fii': return <Building className="h-3 w-3" />;
    case 'etf': return <BarChart3 className="h-3 w-3" />;
    case 'criptoativos': return <Bitcoin className="h-3 w-3" />;
    case 'investimento_global': return <Globe className="h-3 w-3" />;
    case 'previdencia_privada': return <Shield className="h-3 w-3" />;
    default: return <TrendingUp className="h-3 w-3" />;
  }
};

const getInvestmentTypeLabel = (type?: InvestmentType): string => {
  if (!type) return 'Investimento';
  const found = investmentTypes.find(t => t.value === type);
  return found?.label || 'Investimento';
};

const stringSimilarity = (str1: string | undefined | null, str2: string | undefined | null): number => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  return Math.min(70, (commonWords.length / Math.max(words1.length, words2.length)) * 100);
};

const valueSimilarity = (v1: number, v2: number): number => {
  if (v1 === 0 && v2 === 0) return 100;
  if (v1 === 0 || v2 === 0) return 0;
  const diff = Math.abs(v1 - v2) / Math.max(v1, v2);
  return Math.max(0, 100 - diff * 100);
};

export const IRLinkingDialog: React.FC<IRLinkingDialogProps> = ({
  open,
  onOpenChange,
  irData,
  singleItemIndex = null,
  onItemLinked,
}) => {
  const isSingleItemMode = singleItemIndex !== null;
  const { config, addIncomeItem } = useFinancial();
  const { session } = useAuth();

  // Get institutions with investments enabled
  const institutionsWithInvestments = useMemo(() => {
    return config.financialInstitutions
      .filter(fi => fi.hasInvestments)
      .map(fi => fi.id);
  }, [config.financialInstitutions]);

  // Filter available assets based on IR code type
  const getAvailableAssetsForCode = (codigo: string): Asset[] => {
    if (isInvestmentCode(codigo)) {
      // For investments (31-99), only show assets linked to institutions with investments
      return config.assets.filter(a => 
        a.type === 'investment' && 
        a.investmentInstitutionId &&
        institutionsWithInvestments.includes(a.investmentInstitutionId)
      );
    }
    // For properties and vehicles, show non-investment assets
    return config.assets.filter(a => a.type !== 'investment');
  };

  // Get institution name for an asset
  const getInstitutionNameForAsset = (asset: Asset): string | null => {
    if (!asset.investmentInstitutionId) return null;
    const institution = config.financialInstitutions.find(fi => fi.id === asset.investmentInstitutionId);
    if (!institution) return null;
    if (institution.customName) return institution.customName;
    const defaultInst = financialInstitutions.find(i => i.id === institution.institutionId);
    return defaultInst?.name || institution.institutionId;
  };

  // Get ALL institutions with investments enabled (even without assets)
  const allInstitutionsWithInvestments = useMemo(() => {
    return config.financialInstitutions
      .filter(fi => fi.hasInvestments)
      .map(fi => {
        let instName = 'Instituição';
        if (fi.customName) {
          instName = fi.customName;
        } else {
          const defaultInst = financialInstitutions.find(i => i.id === fi.institutionId);
          instName = defaultInst?.name || fi.institutionId;
        }
        
        // Get assets for this institution
        const assets = config.assets.filter(
          a => a.type === 'investment' && a.investmentInstitutionId === fi.id
        );
        
        return {
          id: fi.id,
          institutionId: fi.institutionId,
          name: instName,
          assets,
        };
      });
  }, [config.assets, config.financialInstitutions]);

  const getInvestmentsGroupedByInstitution = useMemo(() => {
    const investments = config.assets.filter(
      a => a.type === 'investment' && 
           a.investmentInstitutionId &&
           institutionsWithInvestments.includes(a.investmentInstitutionId)
    );

    const grouped: Record<string, { name: string; assets: Asset[] }> = {};
    
    investments.forEach(asset => {
      const instId = asset.investmentInstitutionId!;
      if (!grouped[instId]) {
        const userInst = config.financialInstitutions.find(fi => fi.id === instId);
        let instName = 'Instituição';
        if (userInst) {
          if (userInst.customName) {
            instName = userInst.customName;
          } else {
            const defaultInst = financialInstitutions.find(i => i.id === userInst.institutionId);
            instName = defaultInst?.name || userInst.institutionId;
          }
        }
        grouped[instId] = { name: instName, assets: [] };
      }
      grouped[instId].assets.push(asset);
    });

    return grouped;
  }, [config.assets, config.financialInstitutions, institutionsWithInvestments]);
  
  const loadPersistedLinks = (): PersistedLinks => {
    try {
      const stored = localStorage.getItem(getLinksKVKey(irData.id));
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load persisted links', e);
    }
    // TODO: Future migration to useUserKV for IR linking persistence
    return { bens: {}, rendimentos: {} };
  };

  const [linkedBens, setLinkedBens] = useState<Record<string, string>>({});
  const [linkedRendimentos, setLinkedRendimentos] = useState<Record<string, string>>({});
  const [editingBem, setEditingBem] = useState<number | null>(null);
  const [editingRendimento, setEditingRendimento] = useState<number | null>(null);
  const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
  const [pendingBemIndex, setPendingBemIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Multi-select state
  const [selectedBens, setSelectedBens] = useState<Set<number>>(new Set());
  const [selectedRendimentos, setSelectedRendimentos] = useState<Set<number>>(new Set());
  const [batchAssetId, setBatchAssetId] = useState<string>("");
  const [batchIncomeId, setBatchIncomeId] = useState<string>("");
  
  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasAppliedAI, setHasAppliedAI] = useState(false);

  // Fetch AI suggestions
  const fetchAISuggestions = async () => {
    if (!session?.access_token) {
      toast.error('Você precisa estar logado');
      return;
    }

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/ir-link-suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            bens: isSingleItemMode && singleItemIndex !== null 
              ? [irData.bensDireitos[singleItemIndex]]
              : irData.bensDireitos,
            assets: config.assets,
            financialInstitutions: config.financialInstitutions,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error('Limite de requisições atingido. Tente novamente em alguns minutos.');
        }
        if (response.status === 402) {
          throw new Error('Créditos insuficientes. Adicione créditos à sua conta.');
        }
        throw new Error(errorData.error || 'Erro ao obter sugestões');
      }

      const data = await response.json();
      
      // If single item mode, adjust the index
      if (isSingleItemMode && singleItemIndex !== null && data.suggestions.length > 0) {
        data.suggestions[0].bemIndex = singleItemIndex;
      }
      
      setAiSuggestions(data.suggestions || []);
      toast.success('Sugestões da IA carregadas!');
    } catch (error) {
      console.error('AI suggestions error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao obter sugestões';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Apply AI suggestions as default links
  const applyAISuggestions = () => {
    const newLinkedBens: Record<string, string> = { ...linkedBens };
    let appliedCount = 0;
    
    aiSuggestions.forEach(suggestion => {
      if (suggestion.suggestedAssetId && suggestion.confidence >= 50) {
        newLinkedBens[suggestion.bemIndex.toString()] = suggestion.suggestedAssetId;
        appliedCount++;
      }
    });
    
    setLinkedBens(newLinkedBens);
    setHasChanges(true);
    setHasAppliedAI(true);
    toast.success(`${appliedCount} vínculo(s) sugerido(s) aplicado(s)!`);
  };

  // Get AI suggestion for a specific item
  const getAISuggestion = (bemIndex: number): AISuggestion | undefined => {
    return aiSuggestions.find(s => s.bemIndex === bemIndex);
  };

  useEffect(() => {
    if (open) {
      const persisted = loadPersistedLinks();
      setLinkedBens(persisted.bens);
      setLinkedRendimentos(persisted.rendimentos);
      setHasChanges(false);
      setSelectedBens(new Set());
      setSelectedRendimentos(new Set());
      setBatchAssetId("");
      setBatchIncomeId("");
      setAiSuggestions([]);
      setAiError(null);
      setHasAppliedAI(false);
      
      // Auto-fetch AI suggestions on open if assets exist
      if (config.assets.length > 0 && irData.bensDireitos.length > 0) {
        // Small delay to let dialog render first
        setTimeout(() => fetchAISuggestions(), 500);
      }
    }
  }, [open, irData.id]);

  const bensSuggestions = useMemo(() => {
    const itemsToProcess = isSingleItemMode && singleItemIndex !== null
      ? [{ bem: irData.bensDireitos[singleItemIndex], originalIdx: singleItemIndex }]
      : irData.bensDireitos.map((bem, idx) => ({ bem, originalIdx: idx }));
    
    return itemsToProcess.map(({ bem, originalIdx }): LinkSuggestion & { originalIndex: number } => {
      let bestMatch: Asset | null = null;
      let bestScore = 0;
      let matchReason = '';
      
      for (const asset of config.assets) {
        const nameScore = stringSimilarity(bem.descricao, asset.name);
        const descScore = stringSimilarity(bem.discriminacao, asset.description);
        const valueScore = valueSimilarity(bem.situacaoAtual, asset.value);
        const totalScore = Math.max(nameScore, descScore) * 0.6 + valueScore * 0.4;
        
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = asset;
          if (nameScore > 60 || descScore > 60) matchReason = 'Nome/descrição similar';
          else if (valueScore > 80) matchReason = 'Valor similar';
          else matchReason = 'Possível correspondência';
        }
      }
      
      return {
        irItem: bem,
        irItemType: 'bem',
        suggestedMatch: bestScore > 40 ? bestMatch : null,
        matchType: 'asset',
        confidence: Math.round(bestScore),
        matchReason,
        originalIndex: originalIdx,
      };
    });
  }, [irData.bensDireitos, config.assets, isSingleItemMode, singleItemIndex]);

  const rendimentosSuggestions = useMemo(() => {
    return irData.rendimentosTributaveis.map((rend): LinkSuggestion => {
      let bestMatch: IncomeItem | null = null;
      let bestScore = 0;
      let matchReason = '';
      
      for (const income of config.incomeItems.filter(i => i.enabled)) {
        const nameScore = stringSimilarity(rend.nomeFonte, income.name);
        if (nameScore > bestScore) {
          bestScore = nameScore;
          bestMatch = income;
          matchReason = nameScore > 60 ? 'Nome da fonte similar' : 'Possível correspondência';
        }
      }
      
      return {
        irItem: rend,
        irItemType: 'rendimento',
        suggestedMatch: bestScore > 30 ? bestMatch : null,
        matchType: 'income',
        confidence: Math.round(bestScore),
        matchReason,
      };
    });
  }, [irData.rendimentosTributaveis, config.incomeItems]);

  // Toggle selection
  const toggleBemSelection = (idx: number) => {
    setSelectedBens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  };

  const toggleRendimentoSelection = (idx: number) => {
    setSelectedRendimentos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  };

  // Select/deselect all
  const toggleAllBens = () => {
    if (selectedBens.size === irData.bensDireitos.length) {
      setSelectedBens(new Set());
    } else {
      setSelectedBens(new Set(irData.bensDireitos.map((_, i) => i)));
    }
  };

  const toggleAllRendimentos = () => {
    if (selectedRendimentos.size === irData.rendimentosTributaveis.length) {
      setSelectedRendimentos(new Set());
    } else {
      setSelectedRendimentos(new Set(irData.rendimentosTributaveis.map((_, i) => i)));
    }
  };

  // Batch link
  const handleBatchLinkBens = () => {
    if (!batchAssetId || selectedBens.size === 0) return;
    
    const newLinked = { ...linkedBens };
    selectedBens.forEach(idx => {
      newLinked[idx.toString()] = batchAssetId;
    });
    setLinkedBens(newLinked);
    setHasChanges(true);
    setSelectedBens(new Set());
    setBatchAssetId("");
    toast.success(`${selectedBens.size} item(s) vinculado(s)!`);
  };

  const handleBatchLinkRendimentos = () => {
    if (!batchIncomeId || selectedRendimentos.size === 0) return;
    
    const newLinked = { ...linkedRendimentos };
    selectedRendimentos.forEach(idx => {
      newLinked[idx.toString()] = batchIncomeId;
    });
    setLinkedRendimentos(newLinked);
    setHasChanges(true);
    setSelectedRendimentos(new Set());
    setBatchIncomeId("");
    toast.success(`${selectedRendimentos.size} item(s) vinculado(s)!`);
  };

  const handleLinkBem = (bemIndex: number, assetId: string | null) => {
    if (assetId === null) {
      const newLinked = { ...linkedBens };
      delete newLinked[bemIndex.toString()];
      setLinkedBens(newLinked);
    } else {
      setLinkedBens(prev => ({ ...prev, [bemIndex.toString()]: assetId }));
    }
    setHasChanges(true);
    setEditingBem(null);
  };

  const handleLinkRendimento = (rendIndex: number, incomeId: string | null) => {
    if (incomeId === null) {
      const newLinked = { ...linkedRendimentos };
      delete newLinked[rendIndex.toString()];
      setLinkedRendimentos(newLinked);
    } else {
      setLinkedRendimentos(prev => ({ ...prev, [rendIndex.toString()]: incomeId }));
    }
    setHasChanges(true);
    setEditingRendimento(null);
  };

  const handleCreateAsset = (bemIndex: number) => {
    setPendingBemIndex(bemIndex);
    setShowAddAssetDialog(true);
  };

  const handleCreateIncome = (rend: Rendimento, index: number) => {
    addIncomeItem({
      name: (rend.nomeFonte || 'Nova Receita').substring(0, 50),
      enabled: true,
      method: 'net',
    });
    toast.success('Nova receita criada!');
    setHasChanges(true);
  };

  const handleSave = () => {
    const links: PersistedLinks = { bens: linkedBens, rendimentos: linkedRendimentos };
    localStorage.setItem(getLinksKVKey(irData.id), JSON.stringify(links));
    
    // Notify parent about linked items in single item mode
    if (isSingleItemMode && singleItemIndex !== null && onItemLinked) {
      const isLinked = linkedBens[singleItemIndex.toString()] !== undefined;
      onItemLinked(irData.id, singleItemIndex, isLinked);
    }
    
    toast.success('Vinculações salvas com sucesso!');
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      const persisted = loadPersistedLinks();
      setLinkedBens(persisted.bens);
      setLinkedRendimentos(persisted.rendimentos);
    }
    onOpenChange(false);
  };

  const handleAssetDialogClose = (isOpen: boolean) => {
    if (!isOpen && pendingBemIndex !== null) {
      const lastAsset = config.assets[config.assets.length - 1];
      if (lastAsset) {
        handleLinkBem(pendingBemIndex, lastAsset.id);
        toast.success('Novo bem criado e vinculado!');
      }
      setPendingBemIndex(null);
    }
    setShowAddAssetDialog(isOpen);
  };

  const linkedCount = Object.keys(linkedBens).length + Object.keys(linkedRendimentos).length;
  const totalItems = irData.bensDireitos.length + irData.rendimentosTributaveis.length;

  const getLinkedAsset = (assetId: string) => config.assets.find(a => a.id === assetId);
  const getLinkedIncome = (incomeId: string) => config.incomeItems.find(i => i.id === incomeId);

  return (
    <>
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="max-w-4xl max-h-[85vh] w-[95vw] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Vincular Declaração {irData.anoExercicio}
            </DialogTitle>
            <DialogDescription>
              {isSingleItemMode 
                ? 'Vincule este item a um bem do seu patrimônio.'
                : 'Selecione múltiplos itens para vincular de uma vez, ou vincule individualmente.'}
            </DialogDescription>
          </DialogHeader>

          {!isSingleItemMode && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Link2 className="h-3 w-3" />
                {linkedCount} de {totalItems} vinculado(s)
              </Badge>
              {hasChanges && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
                  <AlertCircle className="h-3 w-3" />
                  Alterações não salvas
                </Badge>
              )}
              
              {/* AI Suggestions button */}
              <div className="ml-auto flex items-center gap-2">
                {isLoadingAI ? (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analisando...
                  </Badge>
                ) : aiSuggestions.length > 0 && !hasAppliedAI ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                    onClick={applyAISuggestions}
                  >
                    <Wand2 className="h-3 w-3" />
                    Aplicar sugestões da IA ({aiSuggestions.filter(s => s.suggestedAssetId && s.confidence >= 50).length})
                  </Button>
                ) : hasAppliedAI ? (
                  <Badge variant="secondary" className="gap-1 text-green-600 bg-green-50">
                    <Check className="h-3 w-3" />
                    Sugestões aplicadas
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={fetchAISuggestions}
                    disabled={isLoadingAI || config.assets.length === 0}
                  >
                    <Sparkles className="h-3 w-3" />
                    Sugerir com IA
                  </Button>
                )}
              </div>
            </div>
          )}

          {isSingleItemMode ? (
            // Single item mode - show only the specific item without tabs
            <div className="mt-2">
              {/* AI loading state */}
              {isLoadingAI && (
                <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg mb-4">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="text-sm text-muted-foreground">Analisando com IA...</span>
                </div>
              )}
              
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-2">
                  {bensSuggestions.map((suggestion) => {
                    const bem = suggestion.irItem as BemDireito;
                    const idx = suggestion.originalIndex;
                    const assetType = getAssetTypeFromIRCode(bem.codigo);
                    const linkedAssetId = linkedBens[idx.toString()];
                    const linkedAsset = linkedAssetId ? getLinkedAsset(linkedAssetId) : null;
                    const aiSuggestion = getAISuggestion(idx);
                    const suggestedAsset = aiSuggestion?.suggestedAssetId 
                      ? config.assets.find(a => a.id === aiSuggestion.suggestedAssetId)
                      : null;

                    return (
                      <Card key={idx} className={cn("transition-colors", linkedAsset && "border-primary/50 bg-primary/5")}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {/* IR Item Info */}
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded shrink-0", getAssetTypeColor(assetType || 'other'))}>
                                {getAssetIcon(assetType || 'other')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm line-clamp-2">{bem.descricao || `Bem código ${bem.codigo}`}</p>
                                {bem.discriminacao && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{bem.discriminacao}</p>
                                )}
                                <p className="text-sm font-semibold text-primary mt-2">{formatCurrency(bem.situacaoAtual)}</p>
                              </div>
                            </div>

                            {/* AI Suggestion */}
                            {aiSuggestion && suggestedAsset && aiSuggestion.confidence >= 50 && !linkedAsset && (
                              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Wand2 className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Sugestão da IA</span>
                                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                                    {aiSuggestion.confidence}% confiança
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="gap-1">
                                      {getAssetIcon(suggestedAsset.type)}
                                      {suggestedAsset.name} - {formatCurrency(suggestedAsset.value)}
                                    </Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="gap-1 bg-purple-600 hover:bg-purple-700"
                                    onClick={() => handleLinkBem(idx, suggestedAsset.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                    Aceitar sugestão
                                  </Button>
                                </div>
                                {aiSuggestion.reason && (
                                  <p className="text-xs text-purple-600 mt-2">{aiSuggestion.reason}</p>
                                )}
                              </div>
                            )}

                            {/* Linking controls */}
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">
                                {linkedAsset ? 'Vínculo atual:' : 'Vincular manualmente:'}
                              </p>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={linkedAssetId || "__none__"}
                                  onValueChange={(val) => handleLinkBem(idx, val === "__none__" ? null : val)}
                                >
                                  <SelectTrigger className="h-9 flex-1">
                                    <SelectValue placeholder={isInvestmentCode(bem.codigo) ? "Selecione um investimento..." : "Selecione um bem..."} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover max-h-[300px]">
                                    <SelectItem value="__none__">Nenhum (desvincular)</SelectItem>
                                    {isInvestmentCode(bem.codigo) ? (
                                      // For investment codes, show all institutions with investments enabled
                                      allInstitutionsWithInvestments.length === 0 ? (
                                        <div className="p-2 text-xs text-muted-foreground text-center">
                                          Cadastre uma instituição financeira com investimentos em Configurações → Instituições Financeiras
                                        </div>
                                      ) : (
                                        allInstitutionsWithInvestments.map((inst) => (
                                          <SelectGroup key={inst.id}>
                                            <SelectLabel className="flex items-center gap-2 text-xs font-semibold">
                                              <Landmark className="h-3 w-3" />
                                              {inst.name}
                                            </SelectLabel>
                                            {inst.assets.length > 0 ? (
                                              inst.assets.map((asset) => (
                                                <SelectItem key={asset.id} value={asset.id}>
                                                  <span className="flex items-center gap-2">
                                                    {getInvestmentTypeIcon(asset.investmentType)}
                                                    <span className="truncate">{asset.name}</span>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                      {getInvestmentTypeLabel(asset.investmentType)}
                                                    </Badge>
                                                    <span className="font-medium">{formatCurrency(asset.value)}</span>
                                                  </span>
                                                </SelectItem>
                                              ))
                                            ) : (
                                              <div className="px-2 py-1 text-xs text-muted-foreground italic">
                                                Nenhum investimento cadastrado nesta instituição
                                              </div>
                                            )}
                                          </SelectGroup>
                                        ))
                                      )
                                    ) : (
                                      // For non-investment codes, show regular assets
                                      getAvailableAssetsForCode(bem.codigo).map((asset) => (
                                        <SelectItem key={asset.id} value={asset.id}>
                                          <span className="flex items-center gap-2">
                                            {getAssetIcon(asset.type)}
                                            {asset.name} - {formatCurrency(asset.value)}
                                          </span>
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-9 gap-1 shrink-0" 
                                  onClick={() => handleCreateAsset(idx)}
                                >
                                  <Plus className="h-4 w-4" />
                                  {isInvestmentCode(bem.codigo) ? 'Novo Investimento' : 'Novo Bem'}
                                </Button>
                              </div>
                              {linkedAsset && (
                                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                                  <Check className="h-4 w-4 text-primary" />
                                  <span className="text-sm">
                                    Vinculado a: <strong>{linkedAsset.name}</strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : (
            // Full mode with tabs
            <Tabs defaultValue="bens" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bens" className="gap-2">
                  <Building className="h-4 w-4" />
                  Bens ({irData.bensDireitos.length})
                </TabsTrigger>
                <TabsTrigger value="rendimentos" className="gap-2">
                  <Banknote className="h-4 w-4" />
                  Rendimentos ({irData.rendimentosTributaveis.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bens">
              {/* Batch action bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs shrink-0"
                    onClick={toggleAllBens}
                  >
                    {selectedBens.size === irData.bensDireitos.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {selectedBens.size === irData.bensDireitos.length ? 'Desmarcar' : 'Selecionar'} todos
                    </span>
                    <span className="sm:hidden">
                      {selectedBens.size === irData.bensDireitos.length ? 'Desmarcar' : 'Todos'}
                    </span>
                  </Button>
                  
                  {selectedBens.size > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground hidden sm:inline">|</span>
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {selectedBens.size} selecionado(s)
                      </Badge>
                    </>
                  )}
                </div>
                
                {selectedBens.size > 0 && (
                  <div className="flex items-center gap-2 flex-1">
                    <Select value={batchAssetId} onValueChange={setBatchAssetId}>
                      <SelectTrigger className="h-8 text-xs flex-1 sm:max-w-[200px]">
                        <SelectValue placeholder="Vincular a..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {config.assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            <span className="flex items-center gap-2">
                              {getAssetIcon(asset.type)}
                              {asset.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 gap-1 text-xs shrink-0"
                      onClick={handleBatchLinkBens}
                      disabled={!batchAssetId}
                    >
                      <Link2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Vincular</span>
                    </Button>
                  </div>
                )}
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-2">
                  {bensSuggestions.map((suggestion) => {
                    const bem = suggestion.irItem as BemDireito;
                    const idx = suggestion.originalIndex;
                    const assetType = getAssetTypeFromIRCode(bem.codigo);
                    const linkedAssetId = linkedBens[idx.toString()];
                    const linkedAsset = linkedAssetId ? getLinkedAsset(linkedAssetId) : null;
                    const isEditing = editingBem === idx;
                    const isSelected = selectedBens.has(idx);

                    return (
                      <Card
                        key={idx}
                        className={cn(
                          "transition-colors",
                          linkedAsset && "border-primary/50 bg-primary/5",
                          isSelected && "ring-2 ring-primary"
                        )}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2 sm:gap-3">
                            {/* Checkbox */}
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleBemSelection(idx)}
                              className="mt-1 shrink-0"
                            />
                            
                            <div className="flex-1 min-w-0 overflow-hidden">
                              {/* IR Item Info */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <div className={cn("p-1.5 rounded shrink-0", getAssetTypeColor(assetType || 'other'))}>
                                    {getAssetIcon(assetType || 'other')}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium line-clamp-2">{bem.descricao || `Bem código ${bem.codigo}`}</p>
                                    {bem.discriminacao && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                        {bem.discriminacao}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">Código IR: {bem.codigo}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0 text-right">
                                  <p className="text-sm font-semibold whitespace-nowrap">{formatCurrency(bem.situacaoAtual)}</p>
                                  <p className="text-xs text-muted-foreground whitespace-nowrap">Ant: {formatCurrency(bem.situacaoAnterior)}</p>
                                </div>
                              </div>

                              {/* Link status or controls */}
                              {linkedAsset && !isEditing ? (
                                <div className="flex items-center justify-between p-2 mt-2 bg-primary/10 rounded-lg">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-xs font-medium">Vinculado:</span>
                                    <Badge variant="secondary" className="gap-1 text-xs">
                                      {getAssetIcon(linkedAsset.type)}
                                      {linkedAsset.name}
                                    </Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 gap-1 text-xs"
                                    onClick={() => setEditingBem(idx)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 mt-2">
                                  {/* Show AI suggestion if available */}
                                  {(() => {
                                    const aiSuggestion = getAISuggestion(idx);
                                    const suggestedAsset = aiSuggestion?.suggestedAssetId 
                                      ? config.assets.find(a => a.id === aiSuggestion.suggestedAssetId)
                                      : null;
                                    
                                    if (aiSuggestion && suggestedAsset && aiSuggestion.confidence >= 50) {
                                      return (
                                        <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Wand2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                            <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Sugestão IA:</span>
                                            <Badge variant="secondary" className="gap-1 text-xs">
                                              {getAssetIcon(suggestedAsset.type)}
                                              {suggestedAsset.name}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300">
                                              {aiSuggestion.confidence}% confiança
                                            </Badge>
                                          </div>
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-6 gap-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700"
                                            onClick={() => handleLinkBem(idx, suggestedAsset.id)}
                                          >
                                            <Check className="h-3 w-3" />
                                            Aceitar
                                          </Button>
                                        </div>
                                      );
                                    }
                                    
                                    // Fallback to local suggestion
                                    if (suggestion.suggestedMatch && !linkedAsset) {
                                      return (
                                        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                                          <Sparkles className="h-3 w-3" />
                                          Sugestão: {(suggestion.suggestedMatch as Asset).name}
                                          <Badge variant="outline" className="ml-1 text-[10px]">{suggestion.confidence}%</Badge>
                                        </div>
                                      );
                                    }
                                    
                                    return null;
                                  })()}
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <Select
                                      value={linkedAssetId || ""}
                                      onValueChange={(value) => handleLinkBem(idx, value === "__none__" ? null : value)}
                                    >
                                      <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                                        <SelectValue placeholder={isInvestmentCode(bem.codigo) ? "Selecionar investimento..." : "Selecionar bem..."} />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover max-h-[300px]">
                                        <SelectItem value="__none__">Nenhum</SelectItem>
                                        {isInvestmentCode(bem.codigo) ? (
                                          // For investment codes, show all institutions with investments enabled
                                          allInstitutionsWithInvestments.length === 0 ? (
                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                              Cadastre uma instituição financeira com investimentos
                                            </div>
                                          ) : (
                                            allInstitutionsWithInvestments.map((inst) => (
                                              <SelectGroup key={inst.id}>
                                                <SelectLabel className="flex items-center gap-2 text-[10px] font-semibold">
                                                  <Landmark className="h-3 w-3" />
                                                  {inst.name}
                                                </SelectLabel>
                                                {inst.assets.length > 0 ? (
                                                  inst.assets.map((asset) => (
                                                    <SelectItem key={asset.id} value={asset.id}>
                                                      <span className="flex items-center gap-2 text-xs">
                                                        {getInvestmentTypeIcon(asset.investmentType)}
                                                        <span className="truncate max-w-[150px]">{asset.name}</span>
                                                        <span className="font-medium">{formatCurrency(asset.value)}</span>
                                                      </span>
                                                    </SelectItem>
                                                  ))
                                                ) : (
                                                  <div className="px-2 py-1 text-xs text-muted-foreground italic">
                                                    Sem investimentos cadastrados
                                                  </div>
                                                )}
                                              </SelectGroup>
                                            ))
                                          )
                                        ) : (
                                          // For non-investment codes, show regular assets
                                          getAvailableAssetsForCode(bem.codigo).map((asset) => (
                                            <SelectItem key={asset.id} value={asset.id}>
                                              <span className="flex items-center gap-2">
                                                {getAssetIcon(asset.type)}
                                                {asset.name} - {formatCurrency(asset.value)}
                                              </span>
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-1">
                                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs flex-1 sm:flex-none" onClick={() => handleCreateAsset(idx)}>
                                        <Plus className="h-3 w-3" />
                                        <span className="hidden sm:inline">{isInvestmentCode(bem.codigo) ? 'Novo Investimento' : 'Novo'}</span>
                                        <span className="sm:hidden">Criar</span>
                                      </Button>
                                      {isEditing && (
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingBem(null)}>
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="rendimentos">
              {/* Batch action bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs shrink-0"
                    onClick={toggleAllRendimentos}
                  >
                    {selectedRendimentos.size === irData.rendimentosTributaveis.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {selectedRendimentos.size === irData.rendimentosTributaveis.length ? 'Desmarcar' : 'Selecionar'} todos
                    </span>
                    <span className="sm:hidden">
                      {selectedRendimentos.size === irData.rendimentosTributaveis.length ? 'Desmarcar' : 'Todos'}
                    </span>
                  </Button>
                  
                  {selectedRendimentos.size > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground hidden sm:inline">|</span>
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {selectedRendimentos.size} selecionado(s)
                      </Badge>
                    </>
                  )}
                </div>
                
                {selectedRendimentos.size > 0 && (
                  <div className="flex items-center gap-2 flex-1">
                    <Select value={batchIncomeId} onValueChange={setBatchIncomeId}>
                      <SelectTrigger className="h-8 text-xs flex-1 sm:max-w-[200px]">
                        <SelectValue placeholder="Vincular a..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {config.incomeItems.filter(i => i.enabled).map((income) => (
                          <SelectItem key={income.id} value={income.id}>
                            {income.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 gap-1 text-xs shrink-0"
                      onClick={handleBatchLinkRendimentos}
                      disabled={!batchIncomeId}
                    >
                      <Link2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Vincular</span>
                    </Button>
                  </div>
                )}
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-2">
                  {rendimentosSuggestions.map((suggestion, idx) => {
                    const rend = suggestion.irItem as Rendimento;
                    const linkedIncomeId = linkedRendimentos[idx.toString()];
                    const linkedIncome = linkedIncomeId ? getLinkedIncome(linkedIncomeId) : null;
                    const isEditing = editingRendimento === idx;
                    const isSelected = selectedRendimentos.has(idx);

                    return (
                      <Card
                        key={idx}
                        className={cn(
                          "transition-colors",
                          linkedIncome && "border-primary/50 bg-primary/5",
                          isSelected && "ring-2 ring-primary"
                        )}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRendimentoSelection(idx)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <div className="p-1.5 rounded bg-green-100 text-green-600">
                                    <Banknote className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{rend.nomeFonte || 'Fonte não identificada'}</p>
                                    {rend.cnpjFonte && (
                                      <p className="text-xs text-muted-foreground font-mono">CNPJ: {rend.cnpjFonte}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-green-600">{formatCurrency(rend.valor)}</p>
                                  <p className="text-xs text-muted-foreground">ao ano</p>
                                </div>
                              </div>

                              {linkedIncome && !isEditing ? (
                                <div className="flex items-center justify-between p-2 mt-2 bg-primary/10 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-medium">Vinculado:</span>
                                    <Badge variant="secondary" className="text-xs">{linkedIncome.name}</Badge>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => setEditingRendimento(idx)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 mt-2">
                                  {suggestion.suggestedMatch && !linkedIncome && (
                                    <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                                      <Sparkles className="h-3 w-3" />
                                      Sugestão: {(suggestion.suggestedMatch as IncomeItem).name}
                                      <Badge variant="outline" className="ml-1 text-[10px]">{suggestion.confidence}%</Badge>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={linkedIncomeId || ""}
                                      onValueChange={(value) => handleLinkRendimento(idx, value === "__none__" ? null : value)}
                                    >
                                      <SelectTrigger className="h-7 text-xs flex-1">
                                        <SelectValue placeholder="Selecionar receita..." />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover">
                                        <SelectItem value="__none__">Nenhum</SelectItem>
                                        {config.incomeItems.filter(i => i.enabled).map((income) => (
                                          <SelectItem key={income.id} value={income.id}>{income.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={() => handleCreateIncome(rend, idx)}>
                                      <Plus className="h-3 w-3" />
                                      Nova
                                    </Button>
                                    {isEditing && (
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingRendimento(null)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {irData.rendimentosTributaveis.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">Nenhum rendimento tributável declarado</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Salvar Vinculação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddAssetDialog 
        open={showAddAssetDialog} 
        onOpenChange={handleAssetDialogClose}
        defaultType={pendingBemIndex !== null && irData.bensDireitos[pendingBemIndex] && isInvestmentCode(irData.bensDireitos[pendingBemIndex].codigo) ? 'investment' : getAssetTypeFromIRCode(irData.bensDireitos[pendingBemIndex]?.codigo || '') || 'other'}
      />
    </>
  );
};
