import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ClipboardCheck,
  Heart,
  GraduationCap,
  PiggyBank,
  Scale,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Paperclip,
  Plus,
  Infinity,
  HelpCircle,
  Settings2,
  ExternalLink,
  Users,
  Ban,
  Calculator,
  FileText,
  Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Comprovante } from '@/hooks/useFiscalOrganizer';
import { useFinancial } from '@/contexts/FinancialContext';
import { useSeguros } from '@/hooks/useSeguros';
import { calculateInsuranceIRTotals } from '@/types/seguro';
import { cn } from '@/lib/utils';
import { PGBLSimulatorDialog } from './PGBLSimulatorDialog';

interface DocumentChecklistProps {
  comprovantes: Comprovante[];
  onAddByCategory?: (categoryId: string) => void;
}

interface CategoryConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  deductionLimitPerPerson?: number;
  description: string;
  helpTitle: string;
  helpContent: string;
  canBeNotApplicable?: boolean;
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    id: 'saude',
    label: 'Saúde',
    icon: <Heart className="h-4 w-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    description: 'Sem limite de dedução',
    helpTitle: 'Despesas com Saúde',
    helpContent: 'Gastos médicos são 100% dedutíveis, sem limite. Inclui consultas, exames, internações, planos de saúde, dentistas, psicólogos e fisioterapeutas. Guarde todos os recibos com CPF/CNPJ do prestador. Impacto: cada R$ 1.000 em despesas médicas pode reduzir até R$ 275 do imposto (alíquota 27,5%).',
  },
  {
    id: 'educacao',
    label: 'Educação',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    deductionLimitPerPerson: 3561.50,
    description: 'Limite R$ 3.561,50/pessoa',
    helpTitle: 'Despesas com Educação',
    helpContent: 'Limite de R$ 3.561,50 por pessoa (você + cada dependente). Inclui educação infantil, fundamental, médio, técnico, superior e pós-graduação. NÃO inclui cursos livres, idiomas ou material escolar. Impacto: limite máximo de economia de R$ 979 por pessoa na alíquota máxima.',
  },
  {
    id: 'previdencia',
    label: 'Previdência (PGBL)',
    icon: <PiggyBank className="h-4 w-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Até 12% da renda tributável',
    helpTitle: 'Previdência Privada PGBL',
    helpContent: 'Contribuições para PGBL podem ser deduzidas até o limite de 12% da renda bruta tributável anual. Só funciona para quem faz declaração completa. VGBL não é dedutível. Impacto: se sua renda tributável é R$ 100.000, pode deduzir até R$ 12.000, economizando até R$ 3.300 de imposto.',
  },
  {
    id: 'pensao',
    label: 'Pensão Alimentícia',
    icon: <Scale className="h-4 w-4" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Judicial: sem limite',
    helpTitle: 'Pensão Alimentícia Judicial',
    helpContent: 'Pagamentos de pensão alimentícia determinados judicialmente ou por escritura pública são 100% dedutíveis. O beneficiário deve ser informado como alimentando na declaração. Acordos informais não são dedutíveis. Impacto: dedução integral do valor pago.',
    canBeNotApplicable: true,
  },
  {
    id: 'profissional',
    label: 'Livro Caixa',
    icon: <Briefcase className="h-4 w-4" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'Autônomos e profissionais liberais',
    helpTitle: 'Livro Caixa (Autônomos)',
    helpContent: 'Para profissionais autônomos e liberais que recebem de pessoas físicas. Permite deduzir despesas necessárias à atividade: aluguel do consultório/escritório, materiais de consumo, anuidade de conselho, funcionários. Impacto: reduz a base de cálculo do carnê-leão mensal.',
    canBeNotApplicable: true,
  },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const DocumentChecklist: React.FC<DocumentChecklistProps> = ({ comprovantes, onAddByCategory }) => {
  const { config } = useFinancial();
  const { userProfile } = config;
  const { segurosAtivos } = useSeguros();
  
  // Derive values from user profile
  const dependentsCount = (userProfile.dependentsCount ?? 0) + 1; // +1 for the user themselves
  const notApplicableCategories = new Set(userProfile.irNotApplicableCategories || []);
  const pgblLimit = userProfile.pgblLimit ?? 0;

  // Calculate total education limit based on dependents
  const totalEducationLimit = 3561.50 * dependentsCount;

  // Calculate insurance contributions to health category
  const insuranceIRTotals = calculateInsuranceIRTotals(segurosAtivos);
  const insuranceHealthTotal = insuranceIRTotals.deductible.reduce((sum, s) => sum + s.premio_anual, 0);
  const insuranceHealthCount = insuranceIRTotals.deductible.length;

  // Aggregate comprovantes by category
  const categoryStats = CATEGORY_CONFIG.map(category => {
    const isNotApplicable = notApplicableCategories.has(category.id);
    const categoryComprovantes = comprovantes.filter(c => c.categoria === category.id);
    let totalValue = categoryComprovantes.reduce((sum, c) => sum + c.valor, 0);
    const attachmentCount = categoryComprovantes.filter(c => c.arquivo_path).length;
    
    // Add insurance contributions to health category
    let insuranceContribution = 0;
    if (category.id === 'saude') {
      insuranceContribution = insuranceHealthTotal;
      totalValue += insuranceContribution;
    }
    
    const hasDocuments = categoryComprovantes.length > 0 || insuranceContribution > 0;
    
    // Calculate progress percentage and opportunity
    let progressPercent: number | null = null;
    let opportunity: number | null = null;
    let opportunityLabel = '';
    let limitLabel = '';
    let currentLimit: number | null = null;
    let isUnlimited = false;
    
    if (category.id === 'saude') {
      isUnlimited = true;
      if (totalValue === 0 && !isNotApplicable) {
        opportunityLabel = 'Adicione comprovantes';
      }
    } else if (category.id === 'educacao' && category.deductionLimitPerPerson) {
      currentLimit = totalEducationLimit;
      progressPercent = Math.min((totalValue / currentLimit) * 100, 100);
      limitLabel = formatCurrency(currentLimit);
      if (totalValue < currentLimit) {
        opportunity = currentLimit - totalValue;
        opportunityLabel = `${formatCurrency(opportunity)} disponível`;
      } else {
        opportunityLabel = 'Limite atingido';
      }
    } else if (category.id === 'previdencia') {
      // Use PGBL limit from user profile if available
      if (pgblLimit > 0) {
        currentLimit = pgblLimit;
        progressPercent = Math.min((totalValue / currentLimit) * 100, 100);
        limitLabel = formatCurrency(currentLimit);
        if (totalValue < currentLimit) {
          opportunity = currentLimit - totalValue;
          opportunityLabel = `${formatCurrency(opportunity)} disponível`;
        } else {
          opportunityLabel = 'Limite atingido';
        }
      } else {
        isUnlimited = true;
        if (totalValue === 0 && !isNotApplicable) {
          opportunityLabel = 'Simule seu limite';
        }
      }
    } else if (category.id === 'pensao') {
      isUnlimited = true;
      if (totalValue === 0 && !isNotApplicable) {
        opportunityLabel = 'Requer decisão judicial';
      }
    } else if (category.id === 'profissional') {
      isUnlimited = true;
      if (totalValue === 0 && !isNotApplicable) {
        opportunityLabel = 'Para autônomos';
      }
    }
    
    return {
      ...category,
      count: categoryComprovantes.length,
      attachmentCount,
      totalValue,
      hasDocuments,
      progressPercent,
      opportunity,
      opportunityLabel,
      limitLabel,
      currentLimit,
      isUnlimited,
      isNotApplicable,
      insuranceContribution,
      insuranceCount: category.id === 'saude' ? insuranceHealthCount : 0,
    };
  });

  const applicableCategories = categoryStats.filter(c => !c.isNotApplicable);
  const totalDocuments = comprovantes.length;
  const totalValue = comprovantes.reduce((sum, c) => sum + c.valor, 0);
  const totalAttachments = comprovantes.filter(c => c.arquivo_path).length;

  // Helper to get progress bar color
  const getProgressColor = (percent: number | null, isUnlimited: boolean) => {
    if (isUnlimited) return '[&>div]:bg-gradient-to-r [&>div]:from-muted-foreground/30 [&>div]:to-muted-foreground/50';
    if (percent === null || percent === 0) return '[&>div]:bg-muted-foreground/30';
    if (percent >= 100) return '[&>div]:bg-green-500';
    return '[&>div]:bg-primary';
  };

  // Helper to get status text and color
  const getStatusDisplay = (category: typeof categoryStats[0]) => {
    if (category.isNotApplicable) {
      return { text: 'Não aplicável', color: 'text-muted-foreground' };
    }
    if (category.isUnlimited) {
      if (category.hasDocuments) {
        return { text: 'Sem limite', color: 'text-muted-foreground', icon: <Infinity className="h-3 w-3" /> };
      }
      return { text: category.opportunityLabel || 'Sem limite', color: 'text-amber-600' };
    }
    if (category.progressPercent !== null) {
      if (category.progressPercent >= 100) {
        return { text: 'Limite atingido', color: 'text-green-600', icon: <CheckCircle2 className="h-3 w-3" /> };
      }
      return { 
        text: `${category.progressPercent.toFixed(0)}% · ${category.opportunityLabel}`, 
        color: 'text-muted-foreground' 
      };
    }
    return { text: 'Adicione comprovantes', color: 'text-amber-600' };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Resumo de Deduções
          </CardTitle>
          <div className="flex items-center gap-1">
            <PGBLSimulatorDialog 
              trigger={
                <Button 
                  variant={pgblLimit > 0 ? "ghost" : "outline"} 
                  size="sm" 
                  className={cn(
                    "h-7 px-2 gap-1",
                    pgblLimit > 0 
                      ? "text-green-600 hover:text-green-700" 
                      : "border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  )}
                >
                  {pgblLimit > 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Calculator className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs">PGBL</span>
                  {pgblLimit === 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-amber-500/20 text-amber-700">
                      Pendente
                    </Badge>
                  )}
                </Button>
              }
            />
            <Link to="/configuracoes-fiscais">
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                <Settings2 className="h-3.5 w-3.5" />
                <span className="text-xs">Configurar</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Card-based category list */}
        <div className="space-y-2">
          {categoryStats.map((category) => {
            const statusDisplay = getStatusDisplay(category);
            
            return (
              <div
                key={category.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  category.isNotApplicable && "opacity-50 bg-muted/30",
                  !category.hasDocuments && !category.isNotApplicable && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                {/* Header: Icon + Name + Help + Docs Badge + Value + Add button */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={cn("p-1.5 rounded shrink-0", category.bgColor)}>
                      <span className={category.color}>{category.icon}</span>
                    </div>
                    <span className="font-medium text-sm">{category.label}</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 shrink-0">
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <span className={category.color}>{category.icon}</span>
                            {category.helpTitle}
                          </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {category.helpContent}
                        </p>
                      </DialogContent>
                    </Dialog>
                    {category.count > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5 shrink-0">
                        <FileText className="h-3 w-3" />
                        {category.count}
                        {category.attachmentCount > 0 && (
                          <Paperclip className="h-2.5 w-2.5 ml-0.5" />
                        )}
                      </Badge>
                    )}
                    {category.insuranceCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5 shrink-0 bg-primary/10 text-primary border-primary/20">
                        <Shield className="h-3 w-3" />
                        {category.insuranceCount} seguro{category.insuranceCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!category.isNotApplicable && (
                      <span className={cn(
                        "font-medium text-sm",
                        category.totalValue > 0 ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {formatCurrency(category.totalValue)}
                      </span>
                    )}
                    {onAddByCategory && !category.isNotApplicable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onAddByCategory(category.id)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {category.isNotApplicable && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Ban className="h-3 w-3" />
                        N/A
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Description/Limit line */}
                <p className="text-xs text-muted-foreground mb-2 ml-9">
                  {category.id === 'educacao' 
                    ? `Limite ${formatCurrency(totalEducationLimit)} (${dependentsCount} pessoa${dependentsCount > 1 ? 's' : ''})`
                    : category.id === 'previdencia' && pgblLimit > 0
                      ? `Limite ${formatCurrency(pgblLimit)} (12% da renda tributável)`
                      : category.description
                  }
                </p>

                {/* Progress bar + Status */}
                {!category.isNotApplicable && (
                  <div className="flex items-center gap-3 ml-9">
                    <Progress 
                      value={
                        category.isUnlimited 
                          ? (category.hasDocuments ? 100 : 0) 
                          : (category.progressPercent ?? 0)
                      } 
                      className={cn(
                        "flex-1 h-2",
                        getProgressColor(category.progressPercent, category.isUnlimited)
                      )}
                    />
                    <div className={cn(
                      "flex items-center gap-1 text-xs whitespace-nowrap shrink-0",
                      statusDisplay.color
                    )}>
                      {statusDisplay.icon}
                      <span>{statusDisplay.text}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{totalDocuments}</strong> comprovantes
            </span>
            <span>
              <strong className="text-foreground">{totalAttachments}</strong> com anexo
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Dedutível</p>
            <p className="font-semibold text-green-600">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        {/* Opportunity Alert */}
        {totalDocuments === 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700">Oportunidade de Economia</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Adicione comprovantes de despesas médicas, educação e previdência para 
                  reduzir seu imposto ou aumentar sua restituição.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
