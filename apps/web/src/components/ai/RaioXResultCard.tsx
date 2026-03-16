import { useEffect, useRef } from 'react';
import { PieChart, TrendingUp, ShoppingCart, Lightbulb, BarChart3, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface RaioXResultCardProps {
  formato: 'concentracao' | 'top_ofensor' | 'frequencia' | 'sem_dados';
  dados: {
    total_despesas: number;
    top2_categorias?: Array<{ categoria: string; total: number; percentual: number }>;
    top2_concentracao_pct?: number;
    maior_variavel?: { nome: string; categoria: string; valor: number };
    compras_pequenas?: { categoria: string; qtd: number; total: number };
    month: string;
    gerado_em: string;
  };
  userId?: string;
  sessionId?: string | null;
  onRegisterEvent?: (evento: string) => void;
  onSendMessage?: (msg: string) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[idx] ?? month} ${year}`;
}

export function RaioXResultCard({ formato, dados, userId, sessionId, onRegisterEvent, onSendMessage }: RaioXResultCardProps) {
  const navigate = useNavigate();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!userId || !sessionId || hasTrackedRef.current) return;
    if (!dados || !formato || formato === 'sem_dados') return;
    hasTrackedRef.current = true;

    const checkAndInsert = async () => {
      const { data: existing } = await supabase
        .from('ai_onboarding_events')
        .select('id')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('event_type', 'raio_x_generated')
        .gte('created_at', new Date(Date.now() - 60000).toISOString())
        .limit(1);

      if (!existing?.length) {
        await supabase.from('ai_onboarding_events').insert({
          user_id: userId,
          session_id: sessionId,
          event_type: 'raio_x_generated',
          metadata: { source: 'raio_x_result', timestamp: new Date().toISOString() },
        });
      }
    };

    checkAndInsert();
    onRegisterEvent?.('raio_x_generated');
  }, [userId, sessionId]);

  // sem_dados
  if (formato === 'sem_dados') {
    return (
      <div className="animate-fade-in">
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Ainda não temos dados suficientes para gerar seu Raio-X.</p>
                <p className="text-xs text-muted-foreground">
                  Cadastre seus gastos ou conecte seu banco para começar.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/movimentacoes/extrato')}>
              Cadastrar primeiro gasto
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* ── Factual Card ── */}
      <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: '#1A56A0' }}>
        <CardContent className="p-4 space-y-3">
          {/* Concentração */}
          {formato === 'concentracao' && dados.top2_categorias && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <PieChart className="h-4 w-4" style={{ color: '#1A56A0' }} />
                Concentração de gastos
              </div>
              <p className="text-xs text-muted-foreground">
                TOP 2 categorias = {dados.top2_concentracao_pct?.toFixed(0)}% do total
              </p>
              {/* Gradient bar */}
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.min(dados.top2_concentracao_pct ?? 0, 100)}%`,
                    background: 'linear-gradient(90deg, #1A56A0, #3B82F6)',
                  }}
                />
              </div>
              <div className="space-y-1.5">
                {dados.top2_categorias.map((cat, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{cat.categoria}</span>
                    <span className="font-medium">
                      {formatCurrency(cat.total)}{' '}
                      <span className="text-muted-foreground text-xs">({cat.percentual.toFixed(0)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1 border-t">
                Total geral: {formatCurrency(dados.total_despesas)}
              </p>
            </>
          )}

          {/* Top ofensor */}
          {formato === 'top_ofensor' && dados.maior_variavel && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" style={{ color: '#1A56A0' }} />
                Maior despesa do mês
              </div>
              <div className="text-center py-2 space-y-1">
                <Badge variant="secondary" className="text-xs">
                  {dados.maior_variavel.categoria}
                </Badge>
                <p className="text-sm font-medium">{dados.maior_variavel.nome}</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(dados.maior_variavel.valor)}
                </p>
              </div>
            </>
          )}

          {/* Frequência */}
          {formato === 'frequencia' && dados.compras_pequenas && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="h-4 w-4" style={{ color: '#1A56A0' }} />
                Compras frequentes pequenas
              </div>
              <p className="text-sm">{dados.compras_pequenas.categoria}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{dados.compras_pequenas.qtd} compras</span>
                <span>·</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(dados.compras_pequenas.total)}
                </span>
              </div>
              {/* Mini horizontal bar */}
              <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.min(
                      dados.total_despesas > 0
                        ? (dados.compras_pequenas.total / dados.total_despesas) * 100
                        : 0,
                      100
                    )}%`,
                    background: 'linear-gradient(90deg, #1A56A0, #3B82F6)',
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Interpretation Card ── */}
      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F0F7FF' }}>
        <div className="flex items-start gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="dark:text-foreground">
            {formato === 'concentracao' &&
              `💡 Análise: Você concentra ${dados.top2_concentracao_pct?.toFixed(0)}% dos seus gastos em apenas 2 categorias. Quer ver quais são e como reduzir?`}
            {formato === 'top_ofensor' && dados.maior_variavel &&
              `💡 Análise: Sua maior despesa variável este mês foi ${dados.maior_variavel.categoria} (${formatCurrency(dados.maior_variavel.valor)}). Isso é seu padrão habitual?`}
            {formato === 'frequencia' && dados.compras_pequenas &&
              `💡 Análise: Você fez ${dados.compras_pequenas.qtd} compras pequenas em ${dados.compras_pequenas.categoria} este mês. Elas somam ${formatCurrency(dados.compras_pequenas.total)} — muitas vezes passam despercebidas.`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {formato === 'concentracao' && (
            <Button size="sm" variant="outline" onClick={() => navigate('/movimentacoes/extrato')}>
              <BarChart3 className="h-3 w-3 mr-1" /> Ver detalhes por categoria
            </Button>
          )}
          {formato === 'top_ofensor' && (
            <>
              <Button size="sm" variant="outline">Sim, é normal</Button>
              <Button
                size="sm"
                onClick={() => onSendMessage?.('Quero entender melhor essa despesa')}
              >
                Quero analisar
              </Button>
            </>
          )}
          {formato === 'frequencia' && (
            <Button size="sm" variant="outline" onClick={() => navigate('/movimentacoes/extrato')}>
              Ver todas essas compras
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground text-center">
        Baseado nos seus dados de {formatMonth(dados.month)} · Gerado em{' '}
        {new Date(dados.gerado_em).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}
