import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Users, Trophy, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useVendasAnalytics, useComissoesAfiliados } from '@/hooks/useAffiliateData';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const channelColors: Record<string, string> = {
  'Google Ads': 'hsl(var(--primary))',
  'Meta Ads': '#3b82f6',
  'Orgânico': '#22c55e',
  'Afiliados': '#f59e0b',
};

const AdminMarketing: React.FC = () => {
  const isMobile = useIsMobile();
  const { data: vendas = [], isLoading: vendasLoading } = useVendasAnalytics();
  const { data: comissoes = [], isLoading: comissoesLoading } = useComissoesAfiliados();

  const isLoading = vendasLoading || comissoesLoading;

  // Total faturado
  const totalFaturado = vendas.reduce((sum, v) => sum + v.valor_venda, 0);
  const totalVendas = vendas.length;

  // Aggregate sales by channel
  const channelMap: Record<string, { vendas: number; receita: number }> = {};
  vendas.forEach((v) => {
    let channel = 'Orgânico';
    const src = v.utm_source || v.canal_origem || '';
    if (src === 'google') channel = 'Google Ads';
    else if (src === 'facebook' || src === 'instagram') channel = 'Meta Ads';
    else if (src === 'afiliado' || v.afiliado_id) channel = 'Afiliados';

    if (!channelMap[channel]) channelMap[channel] = { vendas: 0, receita: 0 };
    channelMap[channel].vendas += 1;
    channelMap[channel].receita += v.valor_venda;
  });

  const chartData = Object.entries(channelMap).map(([name, data]) => ({
    name,
    vendas: data.vendas,
    receita: data.receita,
  }));

  // Top affiliates
  const affiliateMap: Record<string, { name: string; vendas: number; comissao: number }> = {};
  comissoes.forEach((c) => {
    if (!affiliateMap[c.afiliado_id]) {
      affiliateMap[c.afiliado_id] = { name: c.afiliado_id, vendas: 0, comissao: 0 };
    }
    affiliateMap[c.afiliado_id].vendas += 1;
    affiliateMap[c.afiliado_id].comissao += c.valor_comissao;
  });

  const topAffiliates = Object.entries(affiliateMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.comissao - a.comissao);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Marketing & Campanhas"
        description="Visão geral de vendas por canal, afiliados e campanhas"
      />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Vendas</p>
                  {isLoading ? <Skeleton className="h-8 w-16" /> : (
                    <p className="text-2xl font-bold text-foreground">{totalVendas}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Faturado</p>
                  {isLoading ? <Skeleton className="h-8 w-24" /> : (
                    <p className="text-2xl font-bold text-foreground">R$ {totalFaturado.toFixed(2).replace('.', ',')}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Afiliados Ativos</p>
                  {isLoading ? <Skeleton className="h-8 w-12" /> : (
                    <p className="text-2xl font-bold text-foreground">{topAffiliates.length}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channel Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Faturamento por Canal de Origem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhuma venda registrada ainda.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                    <YAxis hide={isMobile} className="text-xs fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'receita' ? `R$ ${value.toFixed(2).replace('.', ',')}` : value,
                        name === 'receita' ? 'Receita' : 'Vendas',
                      ]}
                    />
                    <Bar dataKey="receita" name="receita" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={channelColors[entry.name] || 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Affiliates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Afiliados
              </CardTitle>
            </CardHeader>
            <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : topAffiliates.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum afiliado encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {topAffiliates.map((aff, i) => (
                    <div key={aff.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                        <div>
                          <p className="font-medium text-foreground text-sm">{aff.name.slice(0, 16)}</p>
                          <p className="text-xs text-muted-foreground">{aff.vendas} vendas</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                        R$ {aff.comissao.toFixed(2).replace('.', ',')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Campanhas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Campanha</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Fonte</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.filter(v => v.utm_campaign).map((v) => (
                      <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2 text-foreground">{v.utm_campaign}</td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-xs">{v.utm_source || v.canal_origem || '-'}</Badge>
                        </td>
                        <td className="py-2 px-2 text-right text-foreground">R$ {v.valor_venda.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default AdminMarketing;
