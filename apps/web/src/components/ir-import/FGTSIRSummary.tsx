import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Landmark, TrendingUp, Wallet, Info, Calendar } from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useFGTSEntries } from '@/hooks/useFGTSEntries';
import { useVisibility } from '@/contexts/VisibilityContext';
import { format, startOfYear, endOfYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FGTSIRSummaryProps {
  anoCalendario?: number;
}

export const FGTSIRSummary: React.FC<FGTSIRSummaryProps> = ({ anoCalendario }) => {
  const { config } = useFinancial();
  const { entries } = useFGTSEntries();
  const { isHidden } = useVisibility();
  
  const currentYear = anoCalendario || new Date().getFullYear() - 1;
  
  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  // Buscar ativos FGTS
  const fgtsAssets = useMemo(() => {
    return config.assets.filter(
      asset => asset.type === 'investment' && asset.investmentType === 'fgts'
    );
  }, [config.assets]);
  
  // Saldo total atual
  const saldoAtual = useMemo(() => {
    return fgtsAssets.reduce((sum, asset) => sum + asset.value, 0);
  }, [fgtsAssets]);
  
  // Filtrar entradas do ano calendário
  const entriesDoAno = useMemo(() => {
    const yearStart = `${currentYear}-01`;
    const yearEnd = `${currentYear}-12`;
    
    return entries.filter(entry => {
      return entry.month >= yearStart && entry.month <= yearEnd;
    });
  }, [entries, currentYear]);
  
  // Calcular totais do ano
  const totaisAno = useMemo(() => {
    const totalDepositos = entriesDoAno.reduce((sum, entry) => sum + (entry.deposit || 0), 0);
    const totalRendimentos = entriesDoAno.reduce((sum, entry) => sum + (entry.yield || 0), 0);
    
    // Saldo no início do ano (pegar a primeira entrada ou 0)
    const primeiraEntrada = entriesDoAno[entriesDoAno.length - 1];
    const saldoInicial = primeiraEntrada?.previous_balance || 0;
    
    // Saldo no final do ano (pegar a última entrada)
    const ultimaEntrada = entriesDoAno[0];
    const saldoFinal = ultimaEntrada?.final_balance || saldoAtual;
    
    return {
      depositos: totalDepositos,
      rendimentos: totalRendimentos,
      saldoInicial,
      saldoFinal,
      mesesRegistrados: entriesDoAno.length
    };
  }, [entriesDoAno, saldoAtual]);
  
  // Se não tem FGTS cadastrado, não mostrar
  if (fgtsAssets.length === 0) {
    return null;
  }
  
  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-blue-700" />
            FGTS - Declaração IR {currentYear + 1}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  O FGTS deve ser declarado no código 99 (Outros Bens e Direitos). 
                  Os rendimentos são isentos de IR.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Saldo para Declaração */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Bens e Direitos (Código 99)
          </h4>
          <div className="bg-card rounded-lg p-3 border border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Saldo em 31/12/{currentYear}</span>
              </div>
              <span className="text-lg font-bold text-blue-700">
                {formatCurrency(totaisAno.saldoFinal)}
              </span>
            </div>
            {totaisAno.saldoInicial > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Saldo em 31/12/{currentYear - 1}</span>
                <span>{formatCurrency(totaisAno.saldoInicial)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Rendimentos Isentos */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Rendimentos Isentos
          </h4>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm">Rendimentos FGTS {currentYear}</span>
              </div>
              <span className="text-lg font-bold text-green-700">
                {formatCurrency(totaisAno.rendimentos)}
              </span>
            </div>
            <p className="text-[10px] text-green-600 mt-1">
              Código 04 - Rendimentos de cadernetas de poupança e FGTS
            </p>
          </div>
        </div>
        
        {/* Resumo de Movimentações */}
        <Separator />
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Depósitos no ano</span>
            <span className="font-medium text-income">+{formatCurrency(totaisAno.depositos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rendimentos no ano</span>
            <span className="font-medium text-blue-600">+{formatCurrency(totaisAno.rendimentos)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Meses registrados
            </span>
            <span>{totaisAno.mesesRegistrados}/12</span>
          </div>
        </div>
        
        {totaisAno.mesesRegistrados < 12 && totaisAno.mesesRegistrados > 0 && (
          <div className="bg-amber-50 text-amber-700 text-[10px] rounded p-2 flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Registre as movimentações mensais no Gerenciador FGTS para ter o histórico completo 
              e facilitar a declaração.
            </span>
          </div>
        )}
        
        {totaisAno.mesesRegistrados === 0 && (
          <div className="bg-muted/50 text-muted-foreground text-[10px] rounded p-2 flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Nenhuma movimentação registrada para {currentYear}. 
              O saldo atual do FGTS será considerado para a declaração.
            </span>
          </div>
        )}
        
        {/* Contas FGTS */}
        {fgtsAssets.length > 1 && (
          <>
            <Separator />
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Contas cadastradas</h4>
              {fgtsAssets.map(asset => (
                <div key={asset.id} className="flex justify-between text-xs">
                  <span className="truncate max-w-[150px]">{asset.name}</span>
                  <span className="font-medium">{formatCurrency(asset.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
