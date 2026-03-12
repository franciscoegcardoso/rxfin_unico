import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Building,
  Banknote,
  AlertCircle,
  Trash2,
  Calendar,
  Upload,
  FileCode,
  Download,
  Link2,
  Link2Off,
  Check,
  Car,
  Search,
  Wallet,
  HelpCircle,
} from 'lucide-react';
import { useIRImport, IRImportData, BemDireito } from '@/hooks/useIRImport';
import { useVisibility } from '@/contexts/VisibilityContext';
import { cn } from '@/lib/utils';
import { IRTutorialGuide } from './IRTutorialGuide';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { IRLinkingDialog } from './IRLinkingDialog';
import { IRComparisonReport } from './IRComparisonReport';
import { FGTSIRSummary } from './FGTSIRSummary';
import { CurrencyInput } from '@/components/ui/currency-input';

interface MeuIRSectionProps {
  onOpenImport: () => void;
  /** Quando muda, a seção refaz o fetch das importações (ex.: após importação bem-sucedida no dialog) */
  refreshKey?: number;
}

interface ValorReal {
  [key: string]: number;
}

interface ItemVinculado {
  [key: string]: boolean;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getBemCategoria = (codigo: string | number): { label: string; icon: React.ReactNode; color: string; filterValue: string } => {
  const codigoNum = typeof codigo === 'number' ? codigo : parseInt(codigo);
  
  if (codigoNum >= 1 && codigoNum <= 19) {
    return { label: 'Imóvel', icon: <Building className="h-4 w-4" />, color: 'text-blue-500', filterValue: 'imovel' };
  }
  if (codigoNum >= 21 && codigoNum <= 29) {
    return { label: 'Veículo', icon: <Car className="h-4 w-4" />, color: 'text-orange-500', filterValue: 'veiculo' };
  }
  if (codigoNum >= 31 && codigoNum <= 99) {
    return { label: 'Investimento', icon: <Banknote className="h-4 w-4" />, color: 'text-green-500', filterValue: 'investimento' };
  }
  
  return { label: 'Outro', icon: <FileText className="h-4 w-4" />, color: 'text-muted-foreground', filterValue: 'outro' };
};

export const MeuIRSection: React.FC<MeuIRSectionProps> = ({ onOpenImport, refreshKey }) => {
  const { imports, fetchImports, deleteImport, downloadFile, isLoading } = useIRImport();
  const { isHidden } = useVisibility();
  const [expandedYear, setExpandedYear] = useState<string | undefined>();
  const [linkingDialogData, setLinkingDialogData] = useState<IRImportData | null>(null);
  const [linkingSingleItemIndex, setLinkingSingleItemIndex] = useState<number | null>(null);
  const [valoresReais, setValoresReais] = useState<ValorReal>({});
  const [itensVinculados, setItensVinculados] = useState<ItemVinculado>({});
  const [activeTab, setActiveTab] = useState<string>('resumo');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  useEffect(() => {
    fetchImports();
  }, [refreshKey]);

  useEffect(() => {
    if (imports.length > 0 && !expandedYear) {
      setExpandedYear(imports[0].anoExercicio.toString());
    }
  }, [imports]);

  useEffect(() => {
    const initialValues: ValorReal = {};
    imports.forEach(ir => {
      ir.bensDireitos.forEach((bem, idx) => {
        const key = `${ir.id}-${idx}`;
        if (valoresReais[key] === undefined) {
          initialValues[key] = bem.situacaoAtual;
        }
      });
    });
    if (Object.keys(initialValues).length > 0) {
      setValoresReais(prev => ({ ...prev, ...initialValues }));
    }
  }, [imports]);

  const handleValorRealChange = (irId: string, bemIndex: number, value: number) => {
    const key = `${irId}-${bemIndex}`;
    setValoresReais(prev => ({ ...prev, [key]: value }));
  };

  const getValorReal = (irId: string, bemIndex: number, defaultValue: number): number => {
    const key = `${irId}-${bemIndex}`;
    return valoresReais[key] !== undefined ? valoresReais[key] : defaultValue;
  };

  const isItemVinculado = (irId: string, bemIndex: number): boolean => {
    const key = `${irId}-${bemIndex}`;
    return itensVinculados[key] || false;
  };

  const toggleItemVinculo = (irData: IRImportData, bemIndex: number) => {
    setLinkingDialogData(irData);
    setLinkingSingleItemIndex(bemIndex);
  };

  const countVinculados = (irId: string, totalBens: number): number => {
    let count = 0;
    for (let i = 0; i < totalBens; i++) {
      if (isItemVinculado(irId, i)) count++;
    }
    return count;
  };

  const openFullLinkingDialog = (irData: IRImportData) => {
    setLinkingDialogData(irData);
    setLinkingSingleItemIndex(null);
  };

  const handleLinkingDialogClose = (open: boolean) => {
    if (!open) {
      setLinkingDialogData(null);
      setLinkingSingleItemIndex(null);
    }
  };

  const handleLinkingSaved = (irId: string, bemIndex: number, linked: boolean) => {
    const key = `${irId}-${bemIndex}`;
    setItensVinculados(prev => ({ ...prev, [key]: linked }));
  };

  if (imports.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma declaração importada</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Importe suas declarações de Imposto de Renda para visualizar o histórico 
              de bens, rendimentos e evolução patrimonial.
            </p>
            <Button onClick={onOpenImport} className="gap-2">
              <Upload className="h-4 w-4" />
              Importar Declaração
            </Button>
          </CardContent>
        </Card>

        <CollapsibleModule
          title="Como baixar sua declaração do IR"
          description="Passo a passo para obter o arquivo no portal Gov.br"
          icon={<HelpCircle className="h-4 w-4 text-primary" />}
          useDialogOnDesktop
          defaultOpen
          highlight
        >
          <IRTutorialGuide />
        </CollapsibleModule>
      </div>
    );
  }

  const filterBens = (bens: BemDireito[]) => {
    return bens.filter((bem) => {
      const cat = getBemCategoria(bem.codigo);
      const matchesTipo = filterTipo === 'todos' || cat.filterValue === filterTipo;
      const matchesSearch = searchTerm === '' || 
        bem.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bem.discriminacao?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTipo && matchesSearch;
    });
  };

  return (
    <div className="space-y-6">
      {/* Análise Comparativa com IA */}
      <IRComparisonReport imports={imports} />

      {/* Resumo Geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Declarações</p>
                <p className="text-lg font-bold">{imports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Building className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Último Patrimônio</p>
                <p className="text-sm font-semibold truncate">
                  {formatCurrency(imports[0]?.bensDireitos.reduce((s, b) => s + b.situacaoAtual, 0) || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Banknote className="h-4 w-4 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Últimos Rendimentos</p>
                <p className="text-sm font-semibold truncate">
                  {formatCurrency(imports[0]?.rendimentosTributaveis.reduce((s, r) => s + r.valor, 0) || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Últimas Dívidas</p>
                <p className="text-sm font-semibold truncate">
                  {formatCurrency(imports[0]?.dividas.reduce((s, d) => s + d.situacaoAtual, 0) || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Declarações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-4">
          <CardTitle className="text-lg">Declarações Importadas</CardTitle>
          <div className="flex items-center gap-2">
            <IRTutorialGuide variant="dialog" />
            <Button variant="outline" size="sm" onClick={onOpenImport} className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Importação</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Accordion 
            type="single" 
            collapsible 
            value={expandedYear}
            onValueChange={(value) => {
              setExpandedYear(value);
              setActiveTab('resumo');
              setFilterTipo('todos');
              setSearchTerm('');
            }}
          >
            {imports.map((ir) => {
              const totalBens = ir.bensDireitos.reduce((s, b) => s + b.situacaoAtual, 0);
              const totalRend = ir.rendimentosTributaveis.reduce((s, r) => s + r.valor, 0);
              const totalRendIsentos = ir.rendimentosIsentos.reduce((s, r) => s + r.valor, 0);
              const totalDiv = ir.dividas.reduce((s, d) => s + d.situacaoAtual, 0);

              const totalReal = ir.bensDireitos.reduce((s, bem, idx) => {
                return s + getValorReal(ir.id, idx, bem.situacaoAtual);
              }, 0);

              const bensPorCategoria = ir.bensDireitos.reduce((acc, bem) => {
                const cat = getBemCategoria(bem.codigo);
                if (!acc[cat.label]) {
                  acc[cat.label] = { items: [], total: 0, ...cat };
                }
                acc[cat.label].items.push(bem);
                acc[cat.label].total += bem.situacaoAtual;
                return acc;
              }, {} as Record<string, { items: BemDireito[]; total: number; label: string; icon: React.ReactNode; color: string }>);

              const filteredBens = filterBens(ir.bensDireitos);
              const vinculadosCount = countVinculados(ir.id, ir.bensDireitos.length);

              return (
                <AccordionItem key={ir.id} value={ir.anoExercicio.toString()} className="border rounded-lg mb-2 px-1">
                  <AccordionTrigger className="hover:no-underline py-3 px-3">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="font-mono text-sm px-2.5 py-0.5">
                          {ir.anoExercicio}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          Ano-calendário {ir.anoCalendario}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {ir.sourceType.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {ir.bensDireitos.length} bens
                        </span>
                        <span className="font-semibold text-primary text-sm">
                          {formatCurrency(totalBens)}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full grid grid-cols-3 mb-4">
                        <TabsTrigger value="resumo" className="text-xs sm:text-sm">
                          <Wallet className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                          Resumo
                        </TabsTrigger>
                        <TabsTrigger value="patrimonio" className="text-xs sm:text-sm">
                          <Building className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                          Patrimônio
                        </TabsTrigger>
                        <TabsTrigger value="rendimentos" className="text-xs sm:text-sm">
                          <Banknote className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                          Rendimentos
                        </TabsTrigger>
                      </TabsList>

                      {/* Tab Resumo */}
                      <TabsContent value="resumo" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Card Bens e Direitos */}
                          <Card className="border-border/60">
                            <CardHeader className="pb-2 pt-4 px-4">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Building className="h-4 w-4 text-blue-500" />
                                Bens e Direitos
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                              <div className="space-y-2">
                                {Object.values(bensPorCategoria).map((cat) => (
                                  <div key={cat.label} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className={cat.color}>{cat.icon}</span>
                                      <span className="text-muted-foreground">{cat.label}</span>
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {cat.items.length}
                                      </Badge>
                                    </div>
                                    <span className="font-medium text-sm">{formatCurrency(cat.total)}</span>
                                  </div>
                                ))}
                                <Separator className="my-2" />
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-sm">Total Declarado</span>
                                  <span className="text-primary">{formatCurrency(totalBens)}</span>
                                </div>
                                {totalReal !== totalBens && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Total Real</span>
                                    <span className="text-green-600 font-medium">{formatCurrency(totalReal)}</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Card Rendimentos */}
                          <Card className="border-border/60">
                            <CardHeader className="pb-2 pt-4 px-4">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-green-500" />
                                Rendimentos
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Tributáveis</span>
                                  <span className="font-medium">{formatCurrency(totalRend)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Isentos</span>
                                  <span className="font-medium">{formatCurrency(totalRendIsentos)}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-sm">Total</span>
                                  <span className="text-green-600">{formatCurrency(totalRend + totalRendIsentos)}</span>
                                </div>
                                {ir.rendimentosTributaveis.length > 0 && (
                                  <p className="text-xs text-muted-foreground pt-1">
                                    {ir.rendimentosTributaveis.length} fonte(s) pagadora(s)
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Card Dívidas */}
                          <Card className="border-border/60">
                            <CardHeader className="pb-2 pt-4 px-4">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                Dívidas e Ônus
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                              {ir.dividas.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{ir.dividas.length} dívida(s)</span>
                                    <span className="font-medium text-orange-600">{formatCurrency(totalDiv)}</span>
                                  </div>
                                  <Separator className="my-2" />
                                  <div className="flex items-center justify-between font-semibold">
                                    <span className="text-sm">Total</span>
                                    <span className="text-orange-600">{formatCurrency(totalDiv)}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  Nenhuma dívida declarada
                                </p>
                              )}
                            </CardContent>
                          </Card>
                          
                          {/* FGTS Summary */}
                          <FGTSIRSummary anoCalendario={ir.anoCalendario} />
                        </div>
                      </TabsContent>

                      {/* Tab Patrimônio */}
                      <TabsContent value="patrimonio" className="mt-0 space-y-4">
                        {/* Header com filtros */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Select value={filterTipo} onValueChange={setFilterTipo}>
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue placeholder="Filtrar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="imovel">Imóveis</SelectItem>
                                <SelectItem value="veiculo">Veículos</SelectItem>
                                <SelectItem value="investimento">Investimentos</SelectItem>
                                <SelectItem value="outro">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="relative flex-1 sm:w-48">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-xs"
                              />
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs whitespace-nowrap"
                            onClick={() => openFullLinkingDialog(ir)}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Vincular Todos
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                              {vinculadosCount}/{ir.bensDireitos.length}
                            </Badge>
                          </Button>
                        </div>

                        {/* Tabela de bens */}
                        <div className="border rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="w-10"></TableHead>
                                  <TableHead className="w-20">Tipo</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead className="w-28 text-right">Declarado</TableHead>
                                  <TableHead className="w-32 text-right">Valor Real</TableHead>
                                  <TableHead className="w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredBens.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                      Nenhum bem encontrado com os filtros aplicados
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  filteredBens.map((bem, idx) => {
                                    const originalIdx = ir.bensDireitos.indexOf(bem);
                                    const cat = getBemCategoria(bem.codigo);
                                    const valorDeclarado = bem.situacaoAtual;
                                    const valorReal = getValorReal(ir.id, originalIdx, valorDeclarado);
                                    const vinculado = isItemVinculado(ir.id, originalIdx);
                                    const hasValueDifference = valorReal !== valorDeclarado;
                                    
                                    return (
                                      <TableRow key={originalIdx} className="group">
                                        <TableCell className="py-2">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <button
                                                  onClick={() => toggleItemVinculo(ir, originalIdx)}
                                                  className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                                                >
                                                  {vinculado ? (
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10">
                                                      <Check className="h-3.5 w-3.5 text-green-500" />
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted hover:bg-primary/10">
                                                      <Link2Off className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </div>
                                                  )}
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {vinculado ? 'Clique para desvincular' : 'Clique para vincular'}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className={cat.color}>{cat.icon}</span>
                                            <span className="text-xs hidden sm:inline">{cat.label}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <div className="max-w-xs">
                                            <p className="font-medium text-sm truncate">
                                              {bem.descricao || `Bem código ${bem.codigo}`}
                                            </p>
                                            {bem.discriminacao && (
                                              <p className="text-xs text-muted-foreground line-clamp-1">
                                                {bem.discriminacao}
                                              </p>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right py-2 text-sm">
                                          {formatCurrency(valorDeclarado)}
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                          <CurrencyInput
                                            value={valorReal}
                                            onChange={(value) => handleValorRealChange(ir.id, originalIdx, value)}
                                            compact
                                            className={cn(
                                              "h-7 text-right w-24 ml-auto text-xs",
                                              hasValueDifference && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                            )}
                                          />
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Badge variant="outline" className="font-mono text-[10px] px-1">
                                                  {String(bem.codigo).padStart(2, '0')}
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent>Código do bem no IR</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* Footer com totais */}
                        <div className="flex justify-end gap-6 pt-2 border-t">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Declarado</p>
                            <p className="font-semibold text-sm">{formatCurrency(totalBens)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Real</p>
                            <p className={cn(
                              "font-semibold text-sm",
                              totalReal !== totalBens && "text-green-600"
                            )}>
                              {formatCurrency(totalReal)}
                            </p>
                          </div>
                          {totalReal !== totalBens && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Diferença</p>
                              <p className={cn(
                                "font-semibold text-sm",
                                totalReal > totalBens ? "text-green-600" : "text-red-600"
                              )}>
                                {totalReal > totalBens ? '+' : ''}{formatCurrency(totalReal - totalBens)}
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Tab Rendimentos */}
                      <TabsContent value="rendimentos" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Rendimentos Tributáveis */}
                          <Card className="border-border/60">
                            <CardHeader className="pb-2 pt-4 px-4">
                              <CardTitle className="text-sm font-medium">Rendimentos Tributáveis</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                              {ir.rendimentosTributaveis.length > 0 ? (
                                <div className="space-y-2">
                                  {ir.rendimentosTributaveis.map((rend, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                                      <span className="text-muted-foreground truncate max-w-[200px]" title={rend.nomeFonte}>
                                        {rend.nomeFonte}
                                      </span>
                                      <span className="font-medium">{formatCurrency(rend.valor)}</span>
                                    </div>
                                  ))}
                                  <Separator className="my-2" />
                                  <div className="flex items-center justify-between font-semibold">
                                    <span className="text-sm">Total</span>
                                    <span className="text-green-600">{formatCurrency(totalRend)}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  Nenhum rendimento tributável
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          {/* Rendimentos Isentos */}
                          <Card className="border-border/60">
                            <CardHeader className="pb-2 pt-4 px-4">
                              <CardTitle className="text-sm font-medium">Rendimentos Isentos</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                              {ir.rendimentosIsentos.length > 0 ? (
                                <div className="space-y-2">
                                  {ir.rendimentosIsentos.map((rend, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                                      <span className="text-muted-foreground truncate max-w-[200px]" title={rend.tipo || rend.nomeFonte}>
                                        {rend.tipo || rend.nomeFonte}
                                      </span>
                                      <span className="font-medium">{formatCurrency(rend.valor)}</span>
                                    </div>
                                  ))}
                                  <Separator className="my-2" />
                                  <div className="flex items-center justify-between font-semibold">
                                    <span className="text-sm">Total</span>
                                    <span className="text-green-600">{formatCurrency(totalRendIsentos)}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  Nenhum rendimento isento
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Footer discreto */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>Importado em {formatDate(ir.importedAt)}</span>
                        </div>
                        {ir.fileName && ir.filePath && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => downloadFile(ir.filePath!, ir.fileName!)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Baixar
                          </Button>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 text-destructive hover:text-destructive text-xs">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remover
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover declaração?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Os dados da declaração {ir.anoExercicio} serão removidos permanentemente.
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteImport(ir.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Linking Dialog */}
      {linkingDialogData && (
        <IRLinkingDialog
          open={!!linkingDialogData}
          onOpenChange={handleLinkingDialogClose}
          irData={linkingDialogData}
          singleItemIndex={linkingSingleItemIndex}
          onItemLinked={handleLinkingSaved}
        />
      )}
    </div>
  );
};
