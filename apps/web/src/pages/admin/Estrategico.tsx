import React, { useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Target,
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  Repeat,
  Share2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAdminStrategicDashboard } from '@/hooks/admin/useAdminStrategicDashboard';
import { useAdminUnitEconomics, CAC_META } from '@/hooks/admin/useAdminUnitEconomics';
import type { RoadmapPhase, ValuationData, AarrrData, SimulatorsData, CronogramaData, CampaignRow } from '@/hooks/admin/useAdminStrategicDashboard';

const ARR_TARGET = 1_000_000;
const MRR_TARGET = 83_333;

function ValuationHeader({ v }: { v: ValuationData }) {
  const arrPct = (v.arr_target ?? ARR_TARGET) > 0
    ? Math.min(100, ((v.current_arr ?? 0) / (v.arr_target ?? ARR_TARGET)) * 100)
    : 0;
  const mrrTarget = v.mrr_target ?? MRR_TARGET;
  const mrrPct = mrrTarget > 0 ? Math.min(100, ((v.current_mrr ?? 0) / mrrTarget) * 100) : 0;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-bold">Meta: Valuation R$ 10M (10x ARR)</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">ARR Atual / Alvo</p>
            <p className="font-semibold">{formatCurrency(v.current_arr ?? 0)} / {formatCurrency(v.arr_target ?? ARR_TARGET)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="font-semibold">{formatCurrency(v.current_mrr ?? 0)} / {formatCurrency(mrrTarget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pagantes / Free</p>
            <p className="font-semibold">{v.paying_users ?? 0} / {(v.paying_target ?? 3333)} · {v.free_users ?? 0} / {(v.free_target ?? 66600)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conversão</p>
            <p className="font-semibold">{(v.conversion_rate ?? 0).toFixed(1)}% / {(v.conversion_target_pct ?? 5)}%</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Caminho para ARR alvo</span>
            <span>{arrPct.toFixed(0)}%</span>
          </div>
          <Progress value={arrPct} className="h-3" />
        </div>
        {v.arpu != null && (
          <p className="text-xs text-muted-foreground mt-2">ARPU: {formatCurrency(v.arpu)}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RoadmapPhaseCard({ phase }: { phase: RoadmapPhase }) {
  const statusBadge = {
    ativa: { label: 'ATIVA', className: 'bg-green-600' },
    proxima: { label: 'PRÓXIMA', className: 'bg-blue-600' },
    completada: { label: 'COMPLETADA', className: 'bg-muted' },
    estendida: { label: 'ESTENDIDA', className: 'bg-amber-500' },
  }[phase.status ?? 'proxima'] ?? { label: phase.status ?? '—', className: 'bg-muted' };

  const t = phase.targets ?? {};
  const a = phase.actuals ?? {};
  const pct = (key: keyof typeof t) => {
    const target = Number(t[key as keyof typeof t] ?? 0);
    const actual = Number(a[key as keyof typeof a] ?? 0);
    return target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  };

  return (
    <Card className="flex-1 min-w-[280px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{phase.name}</CardTitle>
          <Badge className={cn('text-xs', statusBadge.className)}>{statusBadge.label}</Badge>
        </div>
        {phase.period && <p className="text-xs text-muted-foreground">{phase.period}</p>}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {phase.status === 'ativa' && (
          <>
            <div className="flex justify-between text-xs">
              <span>{phase.progress_pct ?? 0}% do tempo</span>
              {phase.days_remaining != null && <span>{phase.days_remaining} dias restantes</span>}
            </div>
            <Progress value={phase.progress_pct ?? 0} className="h-1.5" />
          </>
        )}
        {phase.status !== 'ativa' && phase.status !== 'completada' && (
          <p className="text-xs text-muted-foreground">Aguardando</p>
        )}
        {t.users != null && (
          <div>
            <div className="flex justify-between"><span>Users</span><span>{a.users ?? 0} / {t.users} ({(pct('users')).toFixed(0)}%)</span></div>
            <Progress value={pct('users')} className="h-1" />
          </div>
        )}
        {t.leads != null && (
          <div>
            <div className="flex justify-between"><span>Leads</span><span>{a.leads ?? 0} / {t.leads}</span></div>
            <Progress value={pct('leads')} className="h-1" />
          </div>
        )}
        {t.subs != null && (
          <div>
            <div className="flex justify-between"><span>Subs</span><span>{a.subs ?? 0} / {t.subs}</span></div>
            <Progress value={pct('subs')} className="h-1" />
          </div>
        )}
        {t.mrr != null && (
          <div>
            <div className="flex justify-between"><span>MRR</span><span>{formatCurrency(a.mrr ?? 0)} / {formatCurrency(t.mrr)}</span></div>
            <Progress value={pct('mrr')} className="h-1" />
          </div>
        )}
        {t.nps != null && <p className="text-xs">NPS: {a.nps ?? '—'} / {t.nps}</p>}
        {t.cac != null && <p className="text-xs">CAC: {a.cac != null ? formatCurrency(a.cac) : '—'} / {formatCurrency(t.cac)}</p>}
      </CardContent>
    </Card>
  );
}

function AarrrCard({
  title,
  icon: Icon,
  colorClass,
  children,
}: {
  title: string;
  icon: React.ElementType;
  colorClass: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('overflow-hidden', colorClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">{children}</CardContent>
    </Card>
  );
}

function SimulatorsSection({ s }: { s: SimulatorsData }) {
  const actual = (s.conversions_total ?? 0) / Math.max(1, s.page_views_total ?? 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Funil Simuladores — Isca → Cadastro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Page views (7d / total)</p>
            <p className="font-semibold">{s.page_views_7d ?? 0} / {s.page_views_total ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unique visitors 7d</p>
            <p className="font-semibold">{s.unique_visitors_7d ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conversões 7d / total</p>
            <p className="font-semibold">{s.conversions_7d ?? 0} / {s.conversions_total ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Completion rate (meta 60%)</p>
            <p className="font-semibold">{(actual * 100).toFixed(1)}%</p>
          </div>
        </div>
        {s.top_simulators && s.top_simulators.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top simuladores</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.top_simulators.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.page}</TableCell>
                    <TableCell>{row.views}</TableCell>
                    <TableCell>{row.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CronogramaSection({ c }: { c: CronogramaData }) {
  const milestones = c?.milestones ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cronograma 2026</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-baseline">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">{m.label}</span>
              <span className="text-xs text-muted-foreground">{m.date}{m.target ? ` → ${m.target}` : ''}</span>
              {i < milestones.length - 1 && <span className="text-muted-foreground">·</span>}
            </div>
          ))}
        </div>
        {c?.today && <p className="text-xs text-muted-foreground mt-2">Hoje: {c.today}</p>}
      </CardContent>
    </Card>
  );
}

const UNIT_ECONOMICS_MONTHS = [1, 3, 6] as const;

function UnitEconomicsSection() {
  const [months, setMonths] = useState<number>(3);
  const { data, isLoading, error, refetch } = useAdminUnitEconomics(months);

  const ratio = data?.ltv_cac_ratio ?? 0;
  const ratioStatus = ratio >= 3 ? 'green' : ratio >= 1 ? 'yellow' : 'red';

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <DollarSign className="h-4 w-4" /> Unit Economics
      </h2>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_ECONOMICS_MONTHS.map((m) => (
              <SelectItem key={m} value={String(m)}>{m}m</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? 'Carregando...' : 'Atualizar'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive mb-2">{(error as Error).message}</p>
      )}
      {isLoading && !data ? (
        <Skeleton className="h-32 w-full" />
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CAC vs meta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{formatCurrency(data.cac ?? 0)}</p>
              <p className="text-xs text-muted-foreground">Meta: R$ {CAC_META}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">LTV</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{formatCurrency(data.ltv ?? 0)}</p>
              <p className="text-xs text-muted-foreground">ARPU × tempo vida</p>
            </CardContent>
          </Card>
          <Card className={cn(
            'border-2',
            ratioStatus === 'green' && 'border-green-500 bg-green-500/10',
            ratioStatus === 'yellow' && 'border-amber-500 bg-amber-500/10',
            ratioStatus === 'red' && 'border-red-500 bg-red-500/10'
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">LTV/CAC</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{(ratio).toFixed(2)}×</p>
              <p className="text-xs text-muted-foreground">
                {ratioStatus === 'green' && '≥3× saudável'}
                {ratioStatus === 'yellow' && '1–3× atenção'}
                {ratioStatus === 'red' && '<1× crítico'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Marketing spend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{formatCurrency(data.marketing_spend ?? 0)}</p>
              <p className="text-xs text-muted-foreground">Total {months} mês(es)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Novos pagantes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{data.new_payers ?? 0}</p>
              <p className="text-xs text-muted-foreground">Últimos {months} mês(es)</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] }) {
  const totals = campaigns.reduce(
    (acc, c) => ({
      budget: acc.budget + (c.budget ?? 0),
      gasto: acc.gasto + (c.gasto ?? 0),
      leads: acc.leads + (c.leads ?? 0),
      conversoes: acc.conversoes + (c.conversoes ?? 0),
    }),
    { budget: 0, gasto: 0, leads: 0, conversoes: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Campanhas de Marketing</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Onda</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Gasto</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>CPL</TableHead>
              <TableHead>Conversões</TableHead>
              <TableHead>CPA</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c, i) => (
              <TableRow key={i}>
                <TableCell>{c.nome ?? '—'}</TableCell>
                <TableCell>{c.canal ?? '—'}</TableCell>
                <TableCell>{c.onda ?? '—'}</TableCell>
                <TableCell>{c.budget != null ? formatCurrency(c.budget) : '—'}</TableCell>
                <TableCell>{c.gasto != null ? formatCurrency(c.gasto) : '—'}</TableCell>
                <TableCell>{c.leads ?? '—'}</TableCell>
                <TableCell>{c.cpl != null ? formatCurrency(c.cpl) : '—'}</TableCell>
                <TableCell>{c.conversoes ?? '—'}</TableCell>
                <TableCell>{c.cpa != null ? formatCurrency(c.cpa) : '—'}</TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{c.status ?? '—'}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-medium">Total</TableCell>
              <TableCell>{formatCurrency(totals.budget)}</TableCell>
              <TableCell>{formatCurrency(totals.gasto)}</TableCell>
              <TableCell>{totals.leads}</TableCell>
              <TableCell colSpan={2}>{totals.conversoes}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function Estrategico() {
  const { data, isLoading, error } = useAdminStrategicDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Dashboard Estratégico" description="KPIs do plano Go-to-Market" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Dashboard Estratégico" description="KPIs do plano Go-to-Market" />
        <Card className="border-destructive/50">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
            <div>
              <p className="font-medium">Erro ao carregar dados</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const v = data?.valuation;
  const roadmap = data?.roadmap ?? [];
  const aarrr = data?.aarrr ?? {};
  const simulators = data?.simulators;
  const cronograma = data?.cronograma;
  const campaigns = data?.campaigns ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard Estratégico"
        description="KPIs do plano Go-to-Market — meta valuation R$ 10M (10x ARR)"
      />

      {/* A) Meta Valuation */}
      {v && <ValuationHeader v={v} />}

      {/* B) Roadmap */}
      {roadmap.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" /> Roadmap — 4 Fases
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {roadmap.map((phase, i) => (
              <RoadmapPhaseCard key={i} phase={phase} />
            ))}
          </div>
        </section>
      )}

      {/* C) AARRR */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Métricas AARRR
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <AarrrCard title="Acquisition" icon={Users} colorClass="border-blue-500/30 bg-blue-500/5">
            <p>Total Users: {aarrr.acquisition?.total_users ?? 0}</p>
            <p className="text-xs">New 7d / 30d: {aarrr.acquisition?.new_7d ?? 0} / {aarrr.acquisition?.new_30d ?? 0}</p>
            <p className="text-xs">Leads: {aarrr.acquisition?.total_leads ?? 0} · Lead→Signup: {(aarrr.acquisition?.lead_to_signup_rate ?? 0).toFixed(1)}%</p>
          </AarrrCard>
          <AarrrCard title="Activation" icon={TrendingUp} colorClass="border-green-500/30 bg-green-500/5">
            <p>Onboarding Rate: {(aarrr.activation?.onboarding_rate ?? 0).toFixed(1)}%</p>
            <p className="text-xs">Lançamentos / CC / Assets: {aarrr.activation?.has_lancamentos ?? 0} / {aarrr.activation?.has_cc ?? 0} / {aarrr.activation?.has_assets ?? 0}</p>
            <p className="text-xs">Activation Rate: {(aarrr.activation?.activation_rate ?? 0).toFixed(1)}%</p>
          </AarrrCard>
          <AarrrCard title="Revenue" icon={DollarSign} colorClass="border-emerald-500/30 bg-emerald-500/5">
            <p>MRR: {formatCurrency(aarrr.revenue?.mrr ?? 0)}</p>
            <p className="text-xs">Paying: {aarrr.revenue?.paying_users ?? 0} · Free→Paid: {(aarrr.revenue?.free_to_paid_conversion ?? 0).toFixed(1)}%</p>
            {aarrr.revenue?.mix_by_plan && aarrr.revenue.mix_by_plan.length > 0 && (
              <div className="text-xs mt-1">
                {aarrr.revenue.mix_by_plan.slice(0, 3).map((m, i) => (
                  <div key={i}>{m.plan}: {m.count} · {formatCurrency(m.mrr)}</div>
                ))}
              </div>
            )}
          </AarrrCard>
          <AarrrCard title="Retention" icon={Repeat} colorClass="border-amber-500/30 bg-amber-500/5">
            <p>DAU / WAU / MAU: {aarrr.retention?.dau ?? 0} / {aarrr.retention?.wau ?? 0} / {aarrr.retention?.mau ?? 0}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-xs cursor-help border-b border-dotted border-muted-foreground">
                    DAU/MAU: {(aarrr.retention?.dau_mau_ratio ?? 0).toFixed(2)}
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>Razão entre usuários ativos diários (DAU) e mensais (MAU). Quanto mais próximo de 1, maior a retenção e o engajamento diário.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs">Churn 30d: {aarrr.retention?.churn_30d ?? 0}{aarrr.retention?.churn_rate != null ? ` · Taxa: ${(Number(aarrr.retention.churn_rate) * 100).toFixed(1)}%` : ''}</p>
            {(aarrr.retention?.at_risk ?? 0) > 0 && (
              <Badge variant="destructive" className="animate-pulse mt-1">
                {aarrr.retention?.at_risk ?? 0} usuários em risco
              </Badge>
            )}
          </AarrrCard>
          <AarrrCard title="Referral" icon={Share2} colorClass="border-purple-500/30 bg-purple-500/5">
            <p>Total referrals: {aarrr.referral?.total_referrals ?? 0}</p>
            <p className="text-xs">Referral signups: {aarrr.referral?.referral_signups ?? 0}</p>
          </AarrrCard>
        </div>
      </section>

      {/* C2) Unit Economics */}
      <UnitEconomicsSection />

      {/* D) Simuladores */}
      {simulators && <SimulatorsSection s={simulators} />}

      {/* E) Cronograma */}
      {cronograma && (cronograma.milestones?.length ?? 0) > 0 && <CronogramaSection c={cronograma} />}

      {/* F) Campanhas */}
      {campaigns.length > 0 ? (
        <CampaignsTable campaigns={campaigns} />
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhuma campanha registrada. Adicione via Admin → Marketing.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
