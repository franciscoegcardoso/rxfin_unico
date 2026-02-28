import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Info,
  TrendingDown,
  FileText,
  ChevronDown,
  ExternalLink,
  Heart,
  Stethoscope,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSeguros } from '@/hooks/useSeguros';
import { 
  Insurance, 
  InsuranceType,
  insuranceTypeLabels, 
  insuranceIRMapping,
  calculateInsuranceIRTotals,
} from '@/types/seguro';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface InsuranceIRSummaryProps {
  /** Ano fiscal de referência */
  anoFiscal?: number;
  /** Variante de exibição */
  variant?: 'card' | 'inline' | 'compact';
}

export const InsuranceIRSummary: React.FC<InsuranceIRSummaryProps> = ({ 
  anoFiscal = new Date().getFullYear(),
  variant = 'card',
}) => {
  const { seguros, segurosAtivos, isLoading } = useSeguros();
  const [isOpen, setIsOpen] = React.useState(false);

  if (isLoading) {
    return null;
  }

  const irTotals = calculateInsuranceIRTotals(segurosAtivos);
  
  // Se não há seguros ativos ou dedutíveis, não exibe
  if (segurosAtivos.length === 0) {
    return null;
  }

  // Variante compacta para o DocumentChecklist
  if (variant === 'compact') {
    if (irTotals.deductible.length === 0) return null;
    
    return (
      <div className="flex items-center justify-between p-2 bg-green-500/5 rounded-lg border border-green-500/20">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-600" />
          <span className="text-sm">
            Seguros Dedutíveis ({irTotals.deductible.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-green-600">
            {formatCurrency(irTotals.totalDeductibleAnnual)}/ano
          </span>
          <Link to="/seguros">
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Variante inline (para mostrar dentro de outras seções)
  if (variant === 'inline') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Seguros para IR</p>
                <p className="text-xs text-muted-foreground">
                  {irTotals.deductible.length} dedutíveis · {irTotals.nonDeductible.length} informativos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {irTotals.totalDeductibleAnnual > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Economia estimada</p>
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(irTotals.taxSavingsEstimate)}
                  </p>
                </div>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-3">
            <InsuranceIRTable seguros={segurosAtivos} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Variante card (padrão)
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Resumo da Declaração
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs gap-1">
                  <Info className="h-3 w-3" />
                  Ano-calendário {anoFiscal}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">
                  Valores estimados com base nos seguros ativos. 
                  Confirme com seu contador.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Tabela de Mapeamento */}
        <InsuranceIRTable seguros={segurosAtivos} />

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Dedutíveis */}
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Dedutíveis</span>
            </div>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(irTotals.totalDeductibleAnnual)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {irTotals.deductible.length} seguro(s) · Economia: ~{formatCurrency(irTotals.taxSavingsEstimate)}
            </p>
          </div>

          {/* Não Dedutíveis */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Informativos</span>
            </div>
            <p className="text-lg font-bold text-muted-foreground">
              {formatCurrency(irTotals.totalNonDeductibleAnnual)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {irTotals.nonDeductible.length} seguro(s) · Sem abatimento
            </p>
          </div>
        </div>

        {/* Nota Importante */}
        <div className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 text-xs">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-amber-700">
            <strong>Atenção:</strong> A dedução de despesas com saúde (planos) não tem limite de valor, 
            mas exige comprovação documental (notas fiscais ou informe de pagamentos da operadora).
          </div>
        </div>

        {/* Link para Seguros */}
        <div className="flex justify-end">
          <Link to="/seguros">
            <Button variant="outline" size="sm" className="gap-2">
              <Shield className="h-3.5 w-3.5" />
              Gerenciar Seguros
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

// Subcomponente: Tabela de Mapeamento IR
const InsuranceIRTable: React.FC<{ seguros: Insurance[] }> = ({ seguros }) => {
  if (seguros.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Nenhum seguro ativo para declarar
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo de Seguro</TableHead>
            <TableHead>Onde Declarar</TableHead>
            <TableHead className="text-center">Dedutível?</TableHead>
            <TableHead className="text-right">Valor Anual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seguros.map((seguro) => {
            const config = insuranceIRMapping[seguro.tipo];
            return (
              <TableRow key={seguro.id}>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-2 cursor-help">
                        <span className="font-medium text-sm">{seguro.nome}</span>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[250px]">
                        <p className="text-xs">{config.declarationNote}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-xs text-muted-foreground">
                    {insuranceTypeLabels[seguro.tipo]} · {seguro.seguradora}
                  </p>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{config.declarationLabel}</span>
                  {config.irCode && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (cód. {config.irCode})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {config.isDeductible ? (
                    <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-500/30">
                      Sim
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground">
                      Não
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-medium",
                    config.isDeductible ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {formatCurrency(seguro.premio_anual)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default InsuranceIRSummary;
