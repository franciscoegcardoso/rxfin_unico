import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared/EmptyState';
import ShareModal from '@/components/financeiro/ShareModal';
import {
  Megaphone,
  Copy,
  Share2,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  MessageSquareQuote,
  Gift,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useComissoesAfiliados } from '@/hooks/useAffiliateData';
import { useAffiliateReferrals } from '@/hooks/useAffiliateReferrals';
import { useToast } from '@/hooks/use-toast';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

/* ── Status config ── */
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  em_garantia: { label: 'Em Garantia', variant: 'secondary' },
  disponivel: { label: 'Disponível', variant: 'default' },
  pago: { label: 'Pago', variant: 'outline' },
  estornado: { label: 'Estornado', variant: 'destructive' },
  pendente: { label: 'Pendente', variant: 'secondary' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ── Metric Card ── */
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}> = ({ icon, label, value, hint, accent }) => (
  <Card className={accent}>
    <CardContent className="py-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>
    </CardContent>
  </Card>
);

const referralStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  visitou: { label: 'Visitou', variant: 'outline' },
  cadastrou: { label: 'Cadastrou', variant: 'secondary' },
  free: { label: 'Plano Free', variant: 'secondary' },
  ativo: { label: 'Plano Ativo', variant: 'default' },
  cancelou: { label: 'Cancelou', variant: 'destructive' },
  ja_cliente: { label: 'Já é Cliente', variant: 'outline' },
};

function maskEmail(email: string | null): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 3);
  return `${visible}***@${domain}`;
}

/* ── Main Component ── */
const IndicacoesTab: React.FC = () => {
  const { user } = useAuth();
  const { data: comissoes, isLoading } = useComissoesAfiliados();
  const { data: referrals, isLoading: referralsLoading } = useAffiliateReferrals();
  const { toast } = useToast();
  const { isFree, loading: planLoading } = usePlanAccess();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  const hasActivePlan = !isFree;

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '';
  const referralLink = `https://app.rxfin.com.br/signup?aff=${user?.id ?? ''}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: 'Link copiado!', description: 'Compartilhe com seus contatos.' });
  };

  /* Calculations */
  const list = comissoes ?? [];
  const totalRecebido = list.filter(c => c.status_comissao === 'pago').reduce((s, c) => s + c.valor_comissao, 0);
  const aReceber = list.filter(c => c.status_comissao === 'em_garantia' || c.status_comissao === 'disponivel').reduce((s, c) => s + c.valor_comissao, 0);
  const indicacoesAtivas = list.filter(c => c.status_comissao !== 'estornado' && c.status_comissao !== 'cancelado').length;
  const totalEstornado = list.filter(c => c.status_comissao === 'estornado').reduce((s, c) => s + c.valor_comissao, 0);
  const hasData = list.length > 0;

  return (
    <div className="space-y-10">
      {/* ─── 0. Plan required alert ─── */}
      {!planLoading && !hasActivePlan && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Plano ativo necessário</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span>Para ser elegível ao programa de indicações e receber comissões, você precisa ter um plano ativo.</span>
            <Button size="sm" variant="destructive" onClick={() => navigate('/financeiro/planos')} className="shrink-0 w-fit">
              Ver planos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ─── 1. Hero ─── */}
      <section className="text-center space-y-5 pt-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight tracking-tight">
          Indique o RXFin e ganhe R$&nbsp;67<br className="hidden sm:block" /> por cliente ativo
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
          Ajude outras pessoas a organizarem a vida financeira — e seja recompensado por isso.
        </p>
        <p className="text-xs text-muted-foreground">
          Quem você indicar pode testar o RXFin gratuitamente por 7 dias.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => setShareOpen(true)} className="gap-2 px-8">
            <Share2 className="h-4 w-4" />
            Compartilhar agora
          </Button>
          <Button size="lg" variant="outline" onClick={copyLink} className="gap-2 px-8">
            <Copy className="h-4 w-4" />
            Copiar link
          </Button>
        </div>
      </section>

      {/* ─── 2. Social proof ─── */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-5 flex items-start gap-3">
          <MessageSquareQuote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm italic text-foreground leading-relaxed">
              "Já indiquei para amigos e alguns já estão usando."
            </p>
            <p className="text-xs text-muted-foreground mt-1">— Usuário RXFin</p>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. O que a pessoa indicada recebe ─── */}
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="py-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">O que a pessoa indicada recebe</span>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground pl-6 list-disc">
            <li><span className="text-foreground font-medium">7 dias grátis</span> para testar o sistema completo</li>
            <li>Acesso aos <span className="text-foreground font-medium">simuladores gratuitos</span> (troca de carro, financiamento, desconto justo)</li>
            <li>Integração com contas bancárias e IR</li>
            <li>Categorização automática de gastos com IA</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            Você ganha <span className="font-semibold text-foreground">R$&nbsp;67 por cliente ativo</span> que contratar um plano.
          </p>
        </CardContent>
      </Card>

      {/* ─── 4. Como funciona (accordion) ─── */}
      <Accordion type="single" collapsible>
        <AccordionItem value="how" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Como funciona
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Para cada indicação que contratar um plano RXFin usando seu link, você ganha{' '}
              <span className="font-semibold text-foreground">R$&nbsp;67</span> por cliente ativo indicado.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><span className="font-medium text-foreground">Plano anual:</span> você recebe R$&nbsp;67 em até 31 dias após a contratação.</li>
              <li><span className="font-medium text-foreground">Plano mensal:</span> você recebe R$&nbsp;5,58 a cada 30 dias, a partir de 31 dias da contratação.</li>
              <li>Se a indicação cancelar o plano, o valor pago é estornado e entra como saldo negativo.</li>
            </ul>
            <p className="text-xs">
              <Link to="/termos-de-uso" className="text-primary hover:text-primary/80 underline">
                Saiba mais sobre a política de afiliados
              </Link>
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ─── 5. Link de indicação ─── */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Seu link de indicação</p>
        <div className="flex gap-2">
          <Input readOnly value={referralLink} className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={copyLink} title="Copiar link">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShareOpen(true)} title="Compartilhar">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── 6. Métricas ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="py-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <MetricCard
              icon={<Clock className="h-4 w-4 text-primary" />}
              label="A Receber"
              value={formatBRL(aReceber)}
              hint="Disponível após período de validação"
              accent="border-primary/20 bg-primary/[0.03]"
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4 text-primary" />}
              label="Total Recebido"
              value={formatBRL(totalRecebido)}
              hint="Atualizado em tempo real"
            />
            <MetricCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              label="Indicações Ativas"
              value={String(indicacoesAtivas)}
              hint="Clientes ativos indicados"
            />
            <MetricCard
              icon={<AlertTriangle className="h-4 w-4 text-warning" />}
              label="Total Estornado"
              value={formatBRL(totalEstornado)}
              hint="Valor estornado por cancelamentos"
            />
          </>
        )}
      </div>

      {/* ─── 7. Acompanhamento de indicações ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Acompanhamento de indicações</h3>
        </div>
        {referralsLoading ? (
          <Card><CardContent className="py-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        ) : referrals && referrals.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => {
                      const cfg = referralStatusConfig[r.status] ?? { label: r.status, variant: 'outline' as const };
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="px-4 py-3">{r.referred_name || '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs">{maskEmail(r.referred_email)}</td>
                          <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd/MM/yyyy')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma pessoa acessou seu link ainda. Compartilhe e acompanhe aqui!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading ? (
        <Card><CardContent className="py-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      ) : hasData ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Indicação</th>
                    <th className="px-4 py-3 font-medium">Plano</th>
                    <th className="px-4 py-3 font-medium">Comissão</th>
                    <th className="px-4 py-3 font-medium">Data Prevista</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => {
                    const id = c.venda_guru_id ?? '-';
                    const masked = id.length > 8 ? `${id.slice(0, 8)}...` : id;
                    const cfg = statusConfig[c.status_comissao ?? ''] ?? { label: c.status_comissao ?? '-', variant: 'outline' as const };
                    const dataLib = c.data_liberacao ? format(new Date(c.data_liberacao), 'dd/MM/yyyy') : '-';
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-xs">{masked}</td>
                        <td className="px-4 py-3">{c.tipo_plano ?? '-'}</td>
                        <td className="px-4 py-3">{formatBRL(c.valor_comissao)}</td>
                        <td className="px-4 py-3">{dataLib}</td>
                        <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<Megaphone className="h-6 w-6 text-muted-foreground" />}
          description="Você ainda não tem indicações. Compartilhe seu link e comece a ganhar!"
          actionLabel="Compartilhar agora"
          onAction={() => setShareOpen(true)}
        />
      )}

      {/* Rodapé legal */}
      <p className="text-xs text-muted-foreground text-center">
        Ao participar do programa de indicações, você concorda com nossos{' '}
        <Link to="/termos-de-uso" className="underline text-primary hover:text-primary/80">
          Termos de Uso
        </Link>.
      </p>

      {/* Share Modal */}
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        referralLink={referralLink}
        userName={userName}
      />
    </div>
  );
};

export default IndicacoesTab;
