import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Heart,
  GraduationCap,
  PiggyBank,
  Briefcase,
  FileText,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ComprovanteStats } from '@/hooks/useFiscalOrganizer';

interface FiscalProgressDashboardProps {
  stats: ComprovanteStats;
}

const CATEGORIA_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  limite?: number;
  limiteTipo?: string;
}> = {
  saude: {
    label: 'Saúde',
    icon: <Heart className="h-4 w-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  educacao: {
    label: 'Educação',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    limite: 3561.50,
    limiteTipo: 'por pessoa',
  },
  previdencia: {
    label: 'Previdência',
    icon: <PiggyBank className="h-4 w-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    limite: 12,
    limiteTipo: '% da renda bruta',
  },
  profissional: {
    label: 'Livro Caixa',
    icon: <Briefcase className="h-4 w-4" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  outros: {
    label: 'Outros',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const FiscalProgressDashboard: React.FC<FiscalProgressDashboardProps> = ({ stats }) => {
  const { totalByCategoria, countByCategoria, totalDedutivel, totalNaoDedutivel, anoAtual } = stats;
  
  const totalComprovantes = Object.values(countByCategoria).reduce((a, b) => a + b, 0);
  const categorias = Object.keys(CATEGORIA_CONFIG);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Potencial de Dedução</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalDedutivel)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comprovantes {anoAtual}</p>
                <p className="text-lg font-bold">{totalComprovantes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Não Dedutíveis</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(totalNaoDedutivel)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Progress */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Progresso por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorias.map((cat) => {
            const config = CATEGORIA_CONFIG[cat];
            const total = totalByCategoria[cat] || 0;
            const count = countByCategoria[cat] || 0;
            
            // Calculate progress for categories with limits
            let progressPercent = 0;
            let progressLabel = '';
            
            if (config.limite && config.limiteTipo === 'por pessoa') {
              progressPercent = Math.min((total / config.limite) * 100, 100);
              progressLabel = `${formatCurrency(total)} de ${formatCurrency(config.limite)} (limite)`;
            }

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${config.bgColor}`}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    <span className="text-sm font-medium">{config.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {count} {count === 1 ? 'doc' : 'docs'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(total)}</span>
                </div>
                
                {config.limite && config.limiteTipo === 'por pessoa' && count > 0 && (
                  <div className="space-y-1">
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground">{progressLabel}</p>
                  </div>
                )}
                
                {config.limite && config.limiteTipo === '% da renda bruta' && count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Limite: {config.limite}% da renda bruta anual
                  </p>
                )}
                
                {cat === 'saude' && count > 0 && (
                  <p className="text-xs text-green-600">
                    ✓ Sem limite de dedução
                  </p>
                )}
              </div>
            );
          })}
          
          {totalComprovantes === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum comprovante arquivado ainda</p>
              <p className="text-xs">Use o chat para começar a organizar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
