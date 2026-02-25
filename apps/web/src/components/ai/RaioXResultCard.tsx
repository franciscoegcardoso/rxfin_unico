import { useEffect } from 'react';
import { PieChart, TrendingUp, ShoppingCart, Lightbulb, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

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
  onRegisterEvent?: (evento: string) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function RaioXResultCard({ formato, dados, onRegisterEvent }: RaioXResultCardProps) {
  const navigate = useNavigate();

  useEffect(() => {
    onRegisterEvent?.('raio_x_generated');
    onRegisterEvent?.('raio_x_formato');
  }, []);

  if (formato === 'sem_dados') {
    return (
      <Card className="border-l-4 border-l-muted-foreground">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Ainda não temos dados suficientes para gerar seu Raio-X. Continue registrando suas despesas!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Factual Card */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4 space-y-3">
          {formato === 'concentracao' && dados.top2_categorias && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <PieChart className="h-4 w-4 text-primary" />
                Concentração de gastos
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  TOP 2 categorias = {dados.top2_concentracao_pct?.toFixed(0)}% do total
                </p>
                <Progress value={dados.top2_concentracao_pct || 0} className="h-2" />
                {dados.top2_categorias.map((cat, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{cat.categoria}</span>
                    <span className="font-medium">
                      {formatCurrency(cat.total)} ({cat.percentual.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {formato === 'top_ofensor' && dados.maior_variavel && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                Maior despesa do mês
              </div>
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">{dados.maior_variavel.categoria}</p>
                <p className="text-sm">{dados.maior_variavel.nome}</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(dados.maior_variavel.valor)}
                </p>
              </div>
            </>
          )}

          {formato === 'frequencia' && dados.compras_pequenas && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Compras frequentes pequenas
              </div>
              <div className="space-y-1 text-sm">
                <p>{dados.compras_pequenas.categoria}</p>
                <p className="text-muted-foreground">
                  {dados.compras_pequenas.qtd} compras · Total: {formatCurrency(dados.compras_pequenas.total)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Interpretation Card */}
      <Card className="bg-accent/30 border-accent">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p>
              {formato === 'concentracao' &&
                `Análise: Você concentra ${dados.top2_concentracao_pct?.toFixed(0)}% dos seus gastos em apenas 2 categorias. Quer ver quais são e como reduzir?`}
              {formato === 'top_ofensor' && dados.maior_variavel &&
                `Análise: Sua maior despesa variável este mês foi ${dados.maior_variavel.categoria} (${formatCurrency(dados.maior_variavel.valor)}). Isso é seu padrão habitual?`}
              {formato === 'frequencia' && dados.compras_pequenas &&
                `Análise: Você fez ${dados.compras_pequenas.qtd} compras pequenas em ${dados.compras_pequenas.categoria} este mês. Elas somam ${formatCurrency(dados.compras_pequenas.total)} — muitas vezes passam despercebidas.`}
            </p>
          </div>

          <div className="flex gap-2">
            {formato === 'concentracao' && (
              <Button size="sm" variant="outline" onClick={() => navigate('/lancamentos')}>
                <BarChart3 className="h-3 w-3 mr-1" /> Ver detalhes por categoria
              </Button>
            )}
            {formato === 'top_ofensor' && (
              <>
                <Button size="sm" variant="outline">Sim, é normal</Button>
                <Button size="sm" variant="default">Quero analisar</Button>
              </>
            )}
            {formato === 'frequencia' && (
              <Button size="sm" variant="outline" onClick={() => navigate('/lancamentos')}>
                Ver todas essas compras
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center">
        Baseado em transações de {dados.month} · Gerado em {new Date(dados.gerado_em).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}
